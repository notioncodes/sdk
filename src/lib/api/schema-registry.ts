/**
 * Schema registry implementation for dynamic type validation.
 *
 * This module provides a centralized registry for ArkType schemas,
 * enabling runtime validation and type inference across the API.
 */

import { ArkErrors, type, Type } from "arktype";
import { BehaviorSubject, Observable } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";
import type { SchemaRegistryType } from "./types";

/**
 * Schema entry with metadata.
 */
interface SchemaEntry<T = unknown> {
  name: string;
  schema: Type<T>;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Schema validation result.
 */
export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  errors?: ArkErrors;
}

/**
 * Implementation of the schema registry with reactive capabilities.
 */
export class SchemaRegistry implements SchemaRegistryType {
  private schemas = new Map<string, SchemaEntry>();
  private schemaSubject = new BehaviorSubject<Map<string, SchemaEntry>>(new Map());

  /**
   * Observable of schema changes.
   */
  public readonly schemas$: Observable<Map<string, SchemaEntry>> = this.schemaSubject.asObservable();

  /**
   * Register a new schema or update an existing one.
   *
   * @param name - Unique name for the schema
   * @param schema - ArkType schema definition
   * @param metadata - Optional metadata for the schema
   */
  register<T>(name: string, schema: Type<T>, metadata?: Record<string, unknown>): void {
    const existing = this.schemas.get(name);
    const entry: SchemaEntry<T> = {
      name,
      schema,
      version: existing ? existing.version + 1 : 1,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
      metadata
    };

    this.schemas.set(name, entry);
    this.schemaSubject.next(new Map(this.schemas));
  }

  /**
   * Get a schema by name.
   *
   * @param name - Schema name
   * @returns The schema if found, undefined otherwise
   */
  get<T>(name: string): Type<T> | undefined {
    return this.schemas.get(name)?.schema as Type<T> | undefined;
  }

  /**
   * Validate a value against a schema.
   *
   * @param name - Schema name
   * @param value - Value to validate
   * @returns The validated value
   * @throws {Error} If schema not found or validation fails
   */
  validate<T>(name: string, value: unknown): T {
    const schema = this.get<T>(name);
    if (!schema) {
      throw new Error(`Schema '${name}' not found`);
    }

    const result = schema(value);
    if (result instanceof ArkErrors) {
      throw new Error(`Validation failed for schema '${name}': ${result.summary}`);
    }

    return result as T;
  }

  /**
   * Try to validate a value, returning a result object.
   *
   * @param name - Schema name
   * @param value - Value to validate
   * @returns Validation result
   */
  tryValidate<T>(name: string, value: unknown): ValidationResult<T> {
    const schema = this.get<T>(name);
    if (!schema) {
      return {
        valid: false,
        errors: new ArkErrors([{ path: [], message: `Schema '${name}' not found` }] as any)
      };
    }

    const result = schema(value);
    if (result instanceof ArkErrors) {
      return { valid: false, errors: result };
    }

    return { valid: true, value: result as T };
  }

  /**
   * List all registered schema names.
   *
   * @returns Array of schema names
   */
  list(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get detailed information about all schemas.
   *
   * @returns Array of schema entries
   */
  listDetailed(): SchemaEntry[] {
    return Array.from(this.schemas.values());
  }

  /**
   * Check if a schema exists.
   *
   * @param name - Schema name
   * @returns True if schema exists
   */
  has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Remove a schema from the registry.
   *
   * @param name - Schema name
   * @returns True if schema was removed
   */
  remove(name: string): boolean {
    const result = this.schemas.delete(name);
    if (result) {
      this.schemaSubject.next(new Map(this.schemas));
    }
    return result;
  }

  /**
   * Clear all schemas from the registry.
   */
  clear(): void {
    this.schemas.clear();
    this.schemaSubject.next(new Map());
  }

  /**
   * Create a derived schema by composing existing schemas.
   *
   * @param name - Name for the new schema
   * @param composition - Schema composition definition
   */
  compose<T>(name: string, composition: SchemaComposition): void {
    const composedSchema = this.buildComposedSchema<T>(composition);
    this.register(name, composedSchema, { composition });
  }

  /**
   * Build a composed schema from a composition definition.
   */
  private buildComposedSchema<T>(composition: SchemaComposition): Type<T> {
    // For now, return a basic validator that accepts any value
    // In a real implementation, this would handle complex schema composition
    return type((value: unknown) => {
      // Placeholder validation logic
      if (composition.type === "union") {
        // Try each schema until one passes
        for (const schemaName of composition.schemas) {
          const schema = this.get(schemaName);
          if (schema) {
            const result = schema(value);
            if (!(result instanceof ArkErrors)) {
              return result;
            }
          }
        }
        throw new Error("Value doesn't match any schema in union");
      }

      // For other types, just return the value for now
      return value as T;
    }) as unknown as Type<T>;
  }

  /**
   * Watch for changes to a specific schema.
   *
   * @param name - Schema name
   * @returns Observable of schema changes
   */
  watch<T>(name: string): Observable<Type<T> | undefined> {
    return this.schemas$.pipe(
      map((schemas) => schemas.get(name)?.schema as Type<T> | undefined),
      distinctUntilChanged()
    );
  }

  /**
   * Create a schema from a TypeScript interface using template literal types.
   *
   * @param name - Schema name
   * @param definition - Schema definition as a template literal
   */
  fromTemplate<T>(name: string, definition: string): void {
    // Create a simple validator for now
    const schema = type((value: unknown) => value as T) as unknown as Type<T>;
    this.register(name, schema, { source: "template", definition });
  }

  /**
   * Export schemas to a portable format.
   *
   * @returns Serialized schema definitions
   */
  export(): SerializedSchemaRegistry {
    const entries: SerializedSchemaEntry[] = [];

    for (const [name, entry] of this.schemas) {
      entries.push({
        name,
        version: entry.version,
        createdAt: entry.createdAt.toJSON(),
        updatedAt: entry.updatedAt.toJSON(),
        metadata: entry.metadata,
        // Note: Schema serialization would need custom implementation
        definition: entry.schema.toString()
      });
    }

    return { version: "1.0", entries };
  }

  /**
   * Import schemas from a portable format.
   *
   * @param data - Serialized schema registry
   */
  import(data: SerializedSchemaRegistry): void {
    this.clear();

    for (const entry of data.entries) {
      // Note: Schema deserialization would need custom implementation
      // This is a placeholder that would need proper parsing
      const schema = type((value: unknown) => value) as Type;

      const schemaEntry: SchemaEntry = {
        name: entry.name,
        schema,
        version: entry.version,
        createdAt: new Date(entry.createdAt),
        updatedAt: new Date(entry.updatedAt),
        metadata: entry.metadata
      };

      this.schemas.set(entry.name, schemaEntry);
    }

    this.schemaSubject.next(new Map(this.schemas));
  }
}

/**
 * Schema composition types.
 */
export type SchemaComposition =
  | { type: "union"; schemas: string[] }
  | { type: "intersection"; schemas: string[] }
  | { type: "extend"; base: string; extensions: string[] }
  | { type: "pick"; source: string; fields: string[] }
  | { type: "omit"; source: string; fields: string[] };

/**
 * Serialized schema registry format.
 */
export interface SerializedSchemaRegistry {
  version: string;
  entries: SerializedSchemaEntry[];
}

/**
 * Serialized schema entry.
 */
export interface SerializedSchemaEntry {
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
  definition: string;
}

/**
 * Alias for SchemaRegistry for backward compatibility.
 */
export class SchemaRegistryImpl extends SchemaRegistry {}

/**
 * Global schema registry instance.
 */
export const schemaRegistry = new SchemaRegistry();
