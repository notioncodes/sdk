import { ArkErrors, Type, type } from "arktype";
import { BehaviorSubject, Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import type { SchemaRegistryType } from "../clients/builder/builder";
import type { Context } from "../clients/builder/context";
import { log } from "../util/logging";
import { parentSchema, userSchema } from "./schemas";
import { blockSchema, createPaginatedResponseSchema, databaseSchema, pageSchema } from "./types";

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

type SchemaResolver<T = unknown> = (ctx: Context<T>) => Observable<Type<T>>;

interface LazySchemaConfig {
  name: string;
  resolver: SchemaResolver;
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
 * Schema loader implementation for Notion API schemas.
 *
 * This class is responsible for loading schemas on demand and caching them.
 * Used for loading schemas that are not needed immediately and for loading
 * schemas that are large and complex.
 *
 * @example
 * ```typescript
 * const loader = new SchemaLoader();
 * loader.register({
 *   name: "notion.page",
 *   factory: notionSchemaFactories.pageObjectResponse,
 *   metadata: { api: "notion", type: "page" }
 * });
 * const pageSchema$ = loader.load("notion.page");
 * ```
 */
export class SchemaLoader {
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

  constructor(registry: SchemaRegistryType) {
    this.registry = registry;
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

    this.cache.set(name, config.resolver(this.context));

    return config.resolver();
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
            log.error(`validation failed for schema '${schemaName}': ${result.summary}`, {
              schemaName,
              response
            });
            reject(new Error(`validation failed for schema '${schemaName}': ${result.summary}`));
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

export const createNotionSchemaLoader = (registry?: SchemaRegistryType): SchemaLoader => {
  const loader = new SchemaLoader(registry);

  loader.register({
    name: "notion.page",
    resolver: (ctx: Context<unknown>) => {
      console.log("asdf", ctx);
      return of(pageSchema);
    },
    metadata: { api: "notion", type: "page" }
  });

  // loader.register({
  //   name: "notion.database",
  //   factory: () => schemaFactories.database.create(),
  //   metadata: { api: "notion", type: "database" }
  // });

  // loader.register({
  //   name: "notion.block",
  //   factory: schemaFactories.block.create,
  //   metadata: { api: "notion", type: "block" }
  // });

  // loader.register({
  //   name: "notion.user",
  //   factory: schemaFactories.user.create,
  //   metadata: { api: "notion", type: "user" }
  // });

  // loader.register({
  //   name: "notion.queryDatabase",
  //   factory: schemaFactories.database.query,
  //   metadata: { api: "notion", type: "query" }
  // });

  // loader.register({
  //   name: "notion.listDatabases",
  //   factory: schemaFactories.database.list,
  //   metadata: { api: "notion", type: "list" }
  // });

  // loader.register({
  //   name: "notion.listBlockChildren",
  //   factory: schemaFactories.block.list,
  //   metadata: { api: "notion", type: "list" }
  // });

  // loader.register({
  //   name: "notion.search",
  //   factory: schemaFactories.page.search,
  //   metadata: { api: "notion", type: "search" }
  // });

  // loader.register({
  //   name: "notion.listUsers",
  //   factory: schemaFactories.user.list,
  //   metadata: { api: "notion", type: "list" }
  // });

  return loader;
};

export const schemaFactories = {
  page: {
    create: () => pageSchema,
    update: () => pageSchema,
    delete: () => pageSchema,
    get: () => pageSchema,
    list: () => createPaginatedResponseSchema(pageSchema),
    query: () => createPaginatedResponseSchema(pageSchema),
    search: () => createPaginatedResponseSchema(pageSchema)
  },
  user: {
    create: () => userSchema,
    update: () => userSchema,
    delete: () => userSchema,
    get: () => userSchema,
    list: () => createPaginatedResponseSchema(userSchema)
  },
  database: {
    create: () => databaseSchema,
    update: () => databaseSchema,
    delete: () => databaseSchema,
    get: () => databaseSchema,
    list: () => createPaginatedResponseSchema(databaseSchema),
    query: () => createPaginatedResponseSchema(databaseSchema),
    search: () => createPaginatedResponseSchema(databaseSchema)
  },
  block: {
    create: () => blockSchema,
    update: () => blockSchema,
    delete: () => blockSchema,
    get: () => blockSchema,
    list: () => createPaginatedResponseSchema(blockSchema)
  }
};
