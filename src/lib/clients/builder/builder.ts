import { type, Type } from "arktype";
import { BehaviorSubject, concat, defer, EMPTY, from, Observable, of, throwError } from "rxjs";
import { concatMap, map, reduce, retry, share, switchMap, tap } from "rxjs/operators";
import type { ReadContext } from "./context";
import type { QueryOperator } from "./query";

export interface SchemaRegistryType {
  register<T>(name: string, schema: Type<T>): void;
  get<T>(name: string): Type<T> | undefined;
  validate<T>(name: string, value: unknown): T;
  list(): string[];
}

export interface StreamOptions {
  bufferSize?: number;
  throttleMs?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * Query condition for filtering.
 */
export interface QueryCondition<T> {
  field: keyof T;
  operator: QueryOperator;
  value: any;
}

/**
 * Sort specification.
 */
export interface SortSpec<T> {
  field: keyof T;
  direction: "asc" | "desc";
}

/**
 * Raw query configuration for escape hatch scenarios.
 */
export interface RawQueryConfig {
  query: string;
  params?: any[];
  skipValidation?: boolean;
}

/**
 * Batch configuration for streaming.
 */
export interface BatchConfig {
  bufferSize: number;
  throttleMs: number;
  retryCount: number;
  retryDelay: number;
}

/**
 * Helper function to validate data with ArkType schema.
 */
export function validateWithSchema<T>(schema: Type<T>, data: unknown): Observable<T> {
  const validated = schema(data);

  // ArkType returns an array of errors for invalid data
  if (Array.isArray(validated)) {
    // This means validation failed - ArkType returns errors as an array
    const errors = validated as any[];
    const errorMessages = errors.map((err) => err.message || err.problem || "Validation error").join(", ");
    return throwError(() => new Error(`Schema validation failed: ${errorMessages}`));
  }

  return of(validated as T);
}

/**
 * Reactive query builder with RxJS observables.
 */
export class QueryBuilder<T> {
  private context: ReadContext<T> = {
    conditions: [],
    sorts: [],
    includes: []
  };

  private rawQuery?: RawQueryConfig;
  private schema?: Type<T>;
  private contextSubject = new BehaviorSubject<ReadContext<T>>(this.context);

  constructor(
    private schemaName: string,
    private schemaRegistry: SchemaRegistryType,
    private executor: (context: ReadContext<T>) => Observable<T[]>,
    private rawExecutor?: (config: RawQueryConfig) => Observable<T[]>,
    schema?: Type<T>
  ) {
    this.schema = schema;
  }

  /**
   * Add a where condition with full type safety.
   */
  where<K extends keyof T>(field: K, operator: QueryOperator, value: T[K]): this {
    this.context.conditions.push({ field, operator, value });
    this.contextSubject.next(this.context);
    return this;
  }

  /**
   * Add sorting with type safety.
   */
  orderBy<K extends keyof T>(field: K, direction: "asc" | "desc" = "asc"): this {
    this.context.sorts.push({ field, direction });
    this.contextSubject.next(this.context);
    return this;
  }

  /**
   * Set result limit.
   */
  limit(count: number): this {
    this.context.limitValue = count;
    this.contextSubject.next(this.context);
    return this;
  }

  /**
   * Set result offset.
   */
  offset(count: number): this {
    this.context.offsetValue = count;
    this.contextSubject.next(this.context);
    return this;
  }

  /**
   * Include related entities.
   */
  include(...relations: string[]): this {
    this.context.includes.push(...relations);
    this.contextSubject.next(this.context);
    return this;
  }

  /**
   * Select specific fields with type inference.
   */
  select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>> {
    const newContext = { ...this.context, selectedFields: fields as (keyof T)[] };

    const executor = (ctx: ReadContext<Pick<T, K>>): Observable<Pick<T, K>[]> => {
      const mergedContext = {
        ...newContext,
        ...ctx,
        conditions: newContext.conditions,
        selectedFields: fields as (keyof T)[]
      };

      return this.executor(mergedContext as ReadContext<T>).pipe(
        map((results) =>
          results.map((item) => {
            const picked: any = {};
            for (const field of fields) {
              picked[field] = item[field];
            }
            return picked as Pick<T, K>;
          })
        )
      );
    };

    // Create projected schema if available
    let projectedSchema: Type<Pick<T, K>> | undefined;
    if (this.schema) {
      const schemaDefinition: any = {};
      for (const field of fields) {
        schemaDefinition[field as string] = "unknown";
      }
      projectedSchema = type(schemaDefinition) as unknown as Type<Pick<T, K>>;
    }

    const builder = new QueryBuilder<Pick<T, K>>(
      this.schemaName,
      this.schemaRegistry,
      executor,
      this.rawExecutor as any,
      projectedSchema
    );

    builder.context = newContext as any;
    return builder;
  }

  /**
   * Raw query escape hatch for complex scenarios.
   */
  raw(query: string, params?: any[], skipValidation = false): this {
    this.rawQuery = { query, params, skipValidation };
    return this;
  }

  /**
   * Stream results with automatic batching and backpressure.
   */
  stream(options?: StreamOptions): Observable<T> {
    const config: BatchConfig = {
      bufferSize: options?.bufferSize || 100,
      throttleMs: options?.throttleMs || 0,
      retryCount: options?.retryCount || 3,
      retryDelay: options?.retryDelay || 1000
    };

    return defer(() => {
      let offset = 0;
      let hasMore = true;

      const fetchBatch = (): Observable<T[]> => {
        if (!hasMore) return EMPTY;

        if (this.rawQuery) {
          if (!this.rawExecutor) {
            return throwError(() => new Error("Raw query executor not provided"));
          }
          return this.rawExecutor(this.rawQuery);
        }

        const batchContext = {
          ...this.context,
          limitValue: config.bufferSize,
          offsetValue: offset
        };

        return this.executor(batchContext).pipe(
          tap((results) => {
            offset += results.length;
            hasMore = results.length === config.bufferSize;
          })
        );
      };

      const streamBatches = (): Observable<T> => {
        return fetchBatch().pipe(
          switchMap((results) => {
            if (results.length === 0) {
              return EMPTY;
            }

            const validated$ =
              this.schema && !this.rawQuery?.skipValidation
                ? from(results).pipe(concatMap((result) => validateWithSchema(this.schema!, result)))
                : from(results);

            return hasMore
              ? concat(
                  validated$,
                  defer(() => streamBatches())
                )
              : validated$;
          })
        );
      };

      return streamBatches();
    }).pipe(retry({ count: config.retryCount, delay: config.retryDelay }), share());
  }

  /**
   * Execute the query and return all results as an observable.
   */
  execute(): Observable<T[]> {
    if (this.rawQuery) {
      if (!this.rawExecutor) {
        return throwError(() => new Error("Raw query executor not provided"));
      }

      const source$ = this.rawExecutor(this.rawQuery);

      return source$.pipe(
        switchMap((results) => {
          if (this.schema && !this.rawQuery?.skipValidation) {
            return from(results).pipe(
              concatMap((result) => validateWithSchema(this.schema!, result)),
              reduce((acc, validated) => [...acc, validated], [] as T[])
            );
          }
          return of(results);
        }),
        share()
      );
    }

    const source$ = this.executor(this.context);

    return source$.pipe(
      switchMap((results) => {
        if (this.schema) {
          return from(results).pipe(
            concatMap((result) => validateWithSchema(this.schema!, result)),
            reduce((acc, validated) => [...acc, validated], [] as T[])
          );
        }
        return of(results);
      }),
      share()
    );
  }

  /**
   * Execute the query and return the first result.
   */
  first(): Observable<T | null> {
    if (this.rawQuery) {
      return this.execute().pipe(map((results) => (results.length > 0 ? results[0]! : null)));
    }

    const limitedContext = { ...this.context, limitValue: 1 };

    return this.executor(limitedContext).pipe(
      switchMap((results) => {
        if (results.length === 0) {
          return of(null);
        }

        const result = results[0]!; // Non-null assertion since we checked length > 0

        if (this.schema) {
          return validateWithSchema(this.schema, result).pipe(map((validated) => validated as T));
        }

        return of(result);
      }),
      share()
    );
  }

  /**
   * Count matching records.
   */
  count(): Observable<number> {
    if (this.rawQuery) {
      return this.execute().pipe(map((results) => results.length));
    }

    // In a real implementation, this would execute a count query
    // For now, we'll execute the full query and count results
    return this.execute().pipe(map((results) => results.length));
  }

  /**
   * Get the current query context as an observable.
   */
  getContext(): Observable<ReadContext<T>> {
    return this.contextSubject.asObservable();
  }

  /**
   * Get the current schema for validation (if available).
   */
  getSchema(): Type<T> | undefined {
    return this.schema;
  }

  /**
   * Clone the current builder for reuse.
   */
  clone(): QueryBuilder<T> {
    const cloned = new QueryBuilder<T>(
      this.schemaName,
      this.schemaRegistry,
      this.executor,
      this.rawExecutor,
      this.schema
    );

    cloned.context = {
      conditions: [...this.context.conditions],
      sorts: [...this.context.sorts],
      includes: [...this.context.includes],
      limitValue: this.context.limitValue,
      offsetValue: this.context.offsetValue,
      selectedFields: this.context.selectedFields ? [...this.context.selectedFields] : undefined
    };

    if (this.rawQuery) {
      cloned.rawQuery = { ...this.rawQuery };
    }

    return cloned;
  }

  /**
   * Compose this query with another observable.
   */
  compose<R>(operator: (source: Observable<T[]>) => Observable<R>): Observable<R> {
    return this.execute().pipe(operator);
  }

  /**
   * Transform each result item.
   */
  map<R>(transform: (item: T) => R): Observable<R[]> {
    return this.execute().pipe(map((results) => results.map(transform)));
  }

  /**
   * Filter results.
   */
  filter(predicate: (item: T) => boolean): Observable<T[]> {
    return this.execute().pipe(map((results) => results.filter(predicate)));
  }

  /**
   * Take only the first n results.
   */
  take(count: number): Observable<T[]> {
    return this.execute().pipe(map((results) => results.slice(0, count)));
  }

  /**
   * Skip the first n results.
   */
  skip(count: number): Observable<T[]> {
    return this.execute().pipe(map((results) => results.slice(count)));
  }

  /**
   * Convert to a hot observable that shares the execution.
   */
  hot(): Observable<T[]> {
    return this.execute().pipe(share());
  }

  /**
   * Convert to a cold observable (default behavior).
   */
  cold(): Observable<T[]> {
    return this.execute();
  }
}

/**
 * Factory function to create a reactive query builder.
 */
export function createQueryBuilder<T>(
  schemaName: string,
  schemaRegistry: SchemaRegistryType,
  executor: (context: ReadContext<T>) => Observable<T[]>,
  rawExecutor?: (config: RawQueryConfig) => Observable<T[]>,
  schema?: Type<T>
): QueryBuilder<T> {
  return new QueryBuilder<T>(schemaName, schemaRegistry, executor, rawExecutor, schema);
}

/**
 * Utility functions for common query patterns.
 */
export const QueryUtils = {
  /**
   * Combine multiple queries with AND logic.
   */
  and<T>(...queries: Observable<T[]>[]): Observable<T[]> {
    return from(queries).pipe(
      concatMap((query) => query),
      reduce((acc, results) => {
        if (acc.length === 0) return results;
        return acc.filter((item) => results.some((result) => JSON.stringify(item) === JSON.stringify(result)));
      }, [] as T[])
    );
  },

  /**
   * Combine multiple queries with OR logic.
   */
  or<T>(...queries: Observable<T[]>[]): Observable<T[]> {
    return from(queries).pipe(
      concatMap((query) => query),
      reduce((acc, results) => {
        const combined = [...acc];
        results.forEach((result) => {
          if (!combined.some((item) => JSON.stringify(item) === JSON.stringify(result))) {
            combined.push(result);
          }
        });
        return combined;
      }, [] as T[])
    );
  },

  /**
   * Paginate results.
   */
  paginate<T>(source: Observable<T[]>, pageSize: number, pageNumber: number): Observable<T[]> {
    return source.pipe(
      map((results) => {
        const start = (pageNumber - 1) * pageSize;
        const end = start + pageSize;
        return results.slice(start, end);
      })
    );
  },

  /**
   * Batch process results.
   */
  batch<T, R>(source: Observable<T[]>, batchSize: number, processor: (batch: T[]) => Observable<R[]>): Observable<R[]> {
    return source.pipe(
      switchMap((results) => {
        const batches: T[][] = [];
        for (let i = 0; i < results.length; i += batchSize) {
          batches.push(results.slice(i, i + batchSize));
        }

        return from(batches).pipe(
          concatMap((batch) => processor(batch)),
          reduce((acc, batchResults) => [...acc, ...batchResults], [] as R[])
        );
      })
    );
  }
};

// Export types for external use
