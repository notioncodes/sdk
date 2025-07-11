import { ArkErrors, type, Type } from "arktype";
import { BehaviorSubject, Observable, of } from "rxjs";
import { catchError, map, shareReplay, switchMap, tap } from "rxjs/operators";
import { SchemaRegistry } from "../api/schema-registry";
import type { SchemaRegistryType } from "../api/types";
import { log } from "../util/logging";
import { schemaFactories } from "./factories/factory";
import { parentSchema, userSchema } from "./schemas";

/**
 * Local union schema for page or database results to avoid circular imports.
 */
const pageOrDatabaseSchema = type({
  object: '"page" | "database"',
  id: "string",
  created_time: "string",
  last_edited_time: "string",
  archived: "boolean",
  url: "string",
  "public_url?": "string | null",
  parent: parentSchema,
  properties: type("Record<string, unknown>"),
  created_by: userSchema,
  last_edited_by: userSchema
});

/**
 * Schema factory function type.
 */
type SchemaFactory<T = unknown> = () => Type<T> | Promise<Type<T>>;

/**
 * Lazy schema configuration.
 */
interface LazySchemaConfig {
  name: string;
  factory: SchemaFactory;
  preload?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Cached schema entry.
 */
interface CachedSchema<T> {
  name: string;
  schema: Type<T>;
  loadedAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

/**
 * Schema loading state.
 */
interface SchemaLoadingState {
  loading: Set<string>;
  errors: Map<string, Error>;
  stats: {
    totalLoaded: number;
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

/**
 * Lazy schema loader implementation for Notion API schemas.
 *
 * This class is responsible for loading schemas on demand and caching them.
 * Used for loading schemas that are not needed immediately and for loading
 * schemas that are large and complex.
 *
 * @example
 * ```typescript
 * const loader = new LazySchemaLoader();
 * loader.register({
 *   name: "notion.page",
 *   factory: notionSchemaFactories.pageObjectResponse,
 *   metadata: { api: "notion", type: "page" }
 * });
 * const pageSchema$ = loader.load("notion.page");
 * ```
 */
export class LazySchemaLoader {
  private readonly registry: SchemaRegistryType;
  private configs = new Map<string, LazySchemaConfig>();
  private cache = new Map<string, Observable<Type<unknown>>>();
  private loaded = new Map<string, CachedSchema<unknown>>();
  private state$ = new BehaviorSubject<SchemaLoadingState>({
    loading: new Set(),
    errors: new Map(),
    stats: {
      totalLoaded: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  });

  constructor(registry?: SchemaRegistryType) {
    this.registry = registry ?? new SchemaRegistry();
  }

  /**
   * Observable of loading state.
   *
   * @remarks
   * This observable will emit the current loading state of the schema loader.
   * It is useful for monitoring the loading state of the schema loader.
   */
  get state(): SchemaLoadingState {
    return this.state$.value;
  }

  /**
   * Register a lazy schema configuration.
   *
   * @param config - The schema configuration to register.
   *
   * @remarks
   * If the schema is configured to be preloaded, it will be loaded immediately.
   */
  register(config: LazySchemaConfig): void {
    this.configs.set(config.name, config);
    if (config.preload) {
      this.load(config.name).subscribe();
    }
  }

  /**
   * Load a schema by name.
   *
   * @param name - The name of the schema to load.
   *
   * @returns An observable of the schema.
   */
  load<T = unknown>(name: string): Observable<Type<T>> {
    this.updateStats({ totalRequests: this.state.stats.totalRequests + 1 });

    const cached = this.cache.get(name);
    if (cached) {
      this.updateStats({ cacheHits: this.state.stats.cacheHits + 1 });
      this.updateAccessInfo(name);
      return cached as Observable<Type<T>>;
    }

    const config = this.configs.get(name);
    if (!config) {
      return of(type("unknown") as unknown as Type<T>).pipe(
        tap(() => {
          const error = new Error(`Schema configuration for '${name}' not found`);
          this.update((state) => {
            state.errors.set(name, error);
          });
        })
      );
    }

    this.updateStats({ cacheMisses: this.state.stats.cacheMisses + 1 });

    const schema$ = this.create<T>(config);
    this.cache.set(name, schema$ as Observable<Type<unknown>>);

    return schema$;
  }

  /**
   * Create schema loading observable.
   */
  private create<T>(config: LazySchemaConfig): Observable<Type<T>> {
    return of(config).pipe(
      tap(() => {
        this.update((state) => {
          state.loading.add(config.name);
        });
      }),
      switchMap((cfg) => Promise.resolve(cfg.factory())),
      map((schema) => schema as Type<T>),
      tap((schema) => {
        // Cache the loaded schema
        this.loaded.set(config.name, {
          name: config.name,
          schema: schema as Type<unknown>,
          loadedAt: new Date(),
          accessCount: 1,
          lastAccessed: new Date()
        });

        // Register with the schema registry if provided
        if (this.registry) {
          this.registry.register(config.name, schema as Type<unknown>);
        }

        this.update((state) => {
          state.loading.delete(config.name);
          state.errors.delete(config.name);
        });
        this.updateStats({ totalLoaded: this.state.stats.totalLoaded + 1 });
      }),
      catchError((error) => {
        this.update((state) => {
          state.loading.delete(config.name);
          state.errors.set(config.name, error);
        });
        throw error;
      }),
      shareReplay(1)
    );
  }

  /**
   * Validate a response against a lazy-loaded schema.
   */
  async validateResponse<T>(schemaName: string, response: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.load<T>(schemaName).subscribe({
        next: (schema) => {
          const result = schema(response);
          if (result instanceof ArkErrors) {
            reject(new Error(`Validation failed for schema '${schemaName}': ${result.summary}`));
          } else {
            resolve(result as T);
          }
        },
        error: reject
      });
    });
  }

  /**
   * Preload multiple schemas.
   */
  preload(names: string[]): Observable<Type<unknown>[]> {
    const observables = names.map((name) => this.load(name));
    return new Observable((observer) => {
      const schemas: Type<unknown>[] = [];
      let completed = 0;

      observables.forEach((obs, index) => {
        obs.subscribe({
          next: (schema) => {
            schemas[index] = schema;
            completed++;
            if (completed === observables.length) {
              observer.next(schemas);
              observer.complete();
            }
          },
          error: (err) => observer.error(err)
        });
      });
    });
  }

  /**
   * Clear schema cache.
   */
  clear(name?: string): void {
    if (name) {
      this.cache.delete(name);
      this.loaded.delete(name);
    } else {
      this.cache.clear();
      this.loaded.clear();
    }
  }

  /**
   * Get cache statistics.
   */
  stats(): {
    totalCached: number;
    schemas: Array<{
      name: string;
      loadedAt: Date;
      accessCount: number;
      lastAccessed: Date;
    }>;
  } {
    return {
      totalCached: this.loaded.size,
      schemas: Array.from(this.loaded.values()).map((entry) => ({
        name: entry.name,
        loadedAt: entry.loadedAt,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed
      }))
    };
  }

  /**
   * Update loading state.
   */
  private update(updater: (state: SchemaLoadingState) => void): void {
    const newState = {
      loading: new Set(this.state.loading),
      errors: new Map(this.state.errors),
      stats: { ...this.state.stats }
    };
    updater(newState);
    this.state$.next(newState);
  }

  /**
   * Update statistics.
   */
  private updateStats(updates: Partial<SchemaLoadingState["stats"]>): void {
    this.update((state) => {
      Object.assign(state.stats, updates);
    });
    log.debug("Updated stats", this.state$.value.stats);
  }

  /**
   * Update access information.
   */
  private updateAccessInfo(name: string): void {
    const cached = this.loaded.get(name);
    if (cached) {
      cached.accessCount++;
      cached.lastAccessed = new Date();
    }
  }
}

export const createNotionSchemaLoader = (registry?: SchemaRegistryType): LazySchemaLoader => {
  const loader = new LazySchemaLoader(registry);

  loader.register({
    name: "notion.page",
    factory: schemaFactories.responses.page,
    metadata: { api: "notion", type: "page" }
  });

  loader.register({
    name: "notion.database",
    factory: schemaFactories.responses.database,
    metadata: { api: "notion", type: "database" }
  });

  loader.register({
    name: "notion.block",
    factory: schemaFactories.responses.block,
    metadata: { api: "notion", type: "block" }
  });

  loader.register({
    name: "notion.user",
    factory: schemaFactories.responses.user,
    metadata: { api: "notion", type: "user" }
  });

  loader.register({
    name: "notion.queryDatabase",
    factory: schemaFactories.queryDatabaseResponse,
    metadata: { api: "notion", type: "query", endpoint: "databases/{id}/query" }
  });

  loader.register({
    name: "notion.listDatabases",
    factory: schemaFactories.listDatabasesResponse,
    metadata: { api: "notion", type: "list", endpoint: "databases" }
  });

  loader.register({
    name: "notion.listBlockChildren",
    factory: schemaFactories.listBlockChildrenResponse,
    metadata: { api: "notion", type: "list", endpoint: "blocks/{id}/children" }
  });

  loader.register({
    name: "notion.search",
    factory: schemaFactories.searchResponse,
    metadata: { api: "notion", type: "search", endpoint: "search" }
  });

  loader.register({
    name: "notion.listUsers",
    factory: schemaFactories.listUsersResponse,
    metadata: { api: "notion", type: "list", endpoint: "users" }
  });

  return loader;
};

/**
 * Global lazy schema loader instance.
 */
export const notionSchemaLoader = createNotionSchemaLoader(new SchemaRegistry());

/**
 * Example usage:
 *
 * ```typescript
 * // Load schema on-demand
 * const pageSchema$ = notionSchemaLoader.loadSchema('notion.page');
 *
 * // Validate response
 * const validatedPage = await notionSchemaLoader.validateResponse(
 *   'notion.page',
 *   apiResponse
 * );
 *
 * // Preload multiple schemas
 * notionSchemaLoader.preloadSchemas([
 *   'notion.page',
 *   'notion.database',
 *   'notion.block'
 * ]).subscribe();
 *
 * // Monitor loading state
 * notionSchemaLoader.state$.subscribe(state => {
 *   console.log('Loading:', Array.from(state.loading));
 *   console.log('Stats:', state.stats);
 * });
 * ```
 */
