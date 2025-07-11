/**
 * Database schema system for type-safe property mapping and validation.
 *
 * This module provides a comprehensive schema definition system for
 * Notion databases with full type inference and transformation support.
 */

import { Type } from "arktype";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { NamingConfig } from "../../util/naming";
import { transformFromNotion, transformToNotion } from "../../util/transformer";
import type { BidirectionalTransform, DatabaseSchema, PropertySchema, RelationSchema } from "./types";
import { PropertyDataType } from "./types";

/**
 * Property type mapping for Notion properties.
 */
export const propertyTypeMapping = {
  [PropertyDataType.String]: "string",
  [PropertyDataType.Number]: "number",
  [PropertyDataType.Boolean]: "boolean",
  [PropertyDataType.Date]: "Date",
  [PropertyDataType.Array]: "unknown[]",
  [PropertyDataType.Object]: "Record<string, unknown>",
  [PropertyDataType.RichText]: "string",
  [PropertyDataType.Select]: "{ name: string; color: string }",
  [PropertyDataType.MultiSelect]: "{ name: string; color: string }[]",
  [PropertyDataType.Relation]: "string[]",
  [PropertyDataType.Formula]: "unknown",
  [PropertyDataType.Rollup]: "unknown"
} as const;

/**
 * Create a property schema with validation.
 */
export function createPropertySchema<T>(
  propertyType: PropertyDataType,
  options: Partial<PropertySchema<T>> = {}
): PropertySchema<T> {
  const baseType = propertyTypeMapping[propertyType];

  return {
    type: propertyType,
    required: options.required ?? false,
    default: options.default,
    validate: options.validate,
    transform: options.transform,
    index: options.index ?? false
  };
}

/**
 * Create a bidirectional transform for date properties.
 */
export const dateTransform: BidirectionalTransform<string, Date> = {
  forward: (value: string) => new Date(value),
  reverse: (value: Date) => value.toJSON()
};

/**
 * Create a bidirectional transform for rich text properties.
 */
export const richTextTransform: BidirectionalTransform<any[], string> = {
  forward: (value: any[]) => value.map((item) => item.plain_text || "").join(""),
  reverse: (value: string) => [
    {
      type: "text",
      text: { content: value },
      plain_text: value
    }
  ]
};

/**
 * Database schema builder for fluent schema construction.
 */
export class DatabaseSchemaBuilder<T extends Record<string, any>> {
  private schema: Partial<DatabaseSchema<T>> = {
    properties: {} as any,
    computedProperties: {},
    relations: {}
  };

  constructor(name: string) {
    this.schema.name = name;
  }

  /**
   * Add a property to the schema.
   */
  property<K extends keyof T>(name: K, type: PropertyDataType, options: Partial<PropertySchema<T[K]>> = {}): this {
    (this.schema.properties as any)[name] = createPropertySchema(type, options);
    return this;
  }

  /**
   * Add a string property.
   */
  string<K extends keyof T>(name: K, options?: Partial<PropertySchema<string>>): this {
    return this.property(name, PropertyDataType.String, options as any);
  }

  /**
   * Add a number property.
   */
  number<K extends keyof T>(name: K, options?: Partial<PropertySchema<number>>): this {
    return this.property(name, PropertyDataType.Number, options as any);
  }

  /**
   * Add a boolean property.
   */
  boolean<K extends keyof T>(name: K, options?: Partial<PropertySchema<boolean>>): this {
    return this.property(name, PropertyDataType.Boolean, options as any);
  }

  /**
   * Add a date property.
   */
  date<K extends keyof T>(name: K, options?: Partial<PropertySchema<Date>>): this {
    return this.property(name, PropertyDataType.Date, {
      ...options,
      transform: dateTransform
    } as any);
  }

  /**
   * Add a rich text property.
   */
  richText<K extends keyof T>(name: K, options?: Partial<PropertySchema<string>>): this {
    return this.property(name, PropertyDataType.RichText, {
      ...options,
      transform: richTextTransform
    } as any);
  }

  /**
   * Add a select property.
   */
  select<K extends keyof T>(
    name: K,
    options: Partial<PropertySchema<{ name: string; color: string }>> & {
      options?: string[];
    } = {}
  ): this {
    return this.property(name, PropertyDataType.Select, options as any);
  }

  /**
   * Add a multi-select property.
   */
  multiSelect<K extends keyof T>(
    name: K,
    options: Partial<PropertySchema<{ name: string; color: string }[]>> & {
      options?: string[];
    } = {}
  ): this {
    return this.property(name, PropertyDataType.MultiSelect, options as any);
  }

  /**
   * Add a relation property.
   */
  relation<K extends keyof T>(name: K, target: string, options?: Partial<RelationSchema>): this {
    this.property(name, PropertyDataType.Relation);
    this.schema.relations![name as string] = {
      type: "one-to-many",
      target,
      ...options
    };
    return this;
  }

  /**
   * Add a computed property.
   */
  computed<K extends string>(name: K, compute: (obj: T) => any, cache = true): this {
    this.schema.computedProperties![name] = { compute, cache };
    return this;
  }

  /**
   * Mark properties as required.
   */
  required<K extends keyof T>(...properties: K[]): this {
    for (const prop of properties) {
      if (this.schema.properties![prop]) {
        this.schema.properties![prop].required = true;
      }
    }
    return this;
  }

  /**
   * Mark properties as indexed.
   */
  indexed<K extends keyof T>(...properties: K[]): this {
    for (const prop of properties) {
      if (this.schema.properties![prop]) {
        this.schema.properties![prop].index = true;
      }
    }
    return this;
  }

  /**
   * Build the final schema.
   */
  build(): DatabaseSchema<T> {
    return this.schema as DatabaseSchema<T>;
  }
}

/**
 * Create a database schema builder.
 */
export function defineDatabase<T extends Record<string, any>>(name: string): DatabaseSchemaBuilder<T> {
  return new DatabaseSchemaBuilder<T>(name);
}

/**
 * Schema validator for database records.
 */
export class DatabaseSchemaValidator<T extends Record<string, any>> {
  private propertyValidators: Map<keyof T, Type<any>> = new Map();
  private requiredProperties: Set<keyof T> = new Set();

  constructor(private schema: DatabaseSchema<T>) {
    this.initializeValidators();
  }

  private initializeValidators(): void {
    for (const [key, prop] of Object.entries(this.schema.properties) as [keyof T, PropertySchema<any>][]) {
      if (prop.validate) {
        this.propertyValidators.set(key, prop.validate);
      }
      if (prop.required) {
        this.requiredProperties.add(key);
      }
    }
  }

  /**
   * Validate a record against the schema.
   */
  validate(record: Partial<T>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required properties
    for (const prop of this.requiredProperties) {
      if (!(prop in record) || record[prop] === undefined || record[prop] === null) {
        errors.push(`Property '${String(prop)}' is required`);
      }
    }

    // Validate property values
    for (const [key, value] of Object.entries(record) as [keyof T, any][]) {
      const validator = this.propertyValidators.get(key);
      if (validator && value !== undefined && value !== null) {
        const result = validator(value);
        if (result instanceof Error) {
          errors.push(`Property '${String(key)}': ${result.message}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create a stream validator.
   */
  createStreamValidator(): (source: Observable<Partial<T>>) => Observable<T> {
    return (source) =>
      source.pipe(
        map((record) => {
          const { valid, errors } = this.validate(record);
          if (!valid) {
            throw new Error(`Validation failed: ${errors.join(", ")}`);
          }
          return record as T;
        })
      );
  }
}

/**
 * Schema transformer for property mapping.
 */
export class DatabaseSchemaTransformer<T extends Record<string, any>> {
  constructor(
    private schema: DatabaseSchema<T>,
    private namingConfig?: NamingConfig
  ) {}

  /**
   * Transform a record from Notion format.
   */
  fromNotion(record: any): T {
    let transformed = record;

    // Apply naming transformation
    if (this.namingConfig) {
      transformed = transformFromNotion(record, this.namingConfig);
    }

    // Apply property transformations
    for (const [key, prop] of Object.entries(this.schema.properties) as [keyof T, PropertySchema<any>][]) {
      if (prop.transform && key in transformed) {
        transformed[key] = prop.transform.forward(transformed[key]);
      }
    }

    // Apply computed properties
    if (this.schema.computedProperties) {
      for (const [key, computed] of Object.entries(this.schema.computedProperties)) {
        transformed[key] = computed.compute(transformed);
      }
    }

    return transformed;
  }

  /**
   * Transform a record to Notion format.
   */
  toNotion(record: T): any {
    let transformed: any = { ...record };

    // Remove computed properties
    if (this.schema.computedProperties) {
      for (const key of Object.keys(this.schema.computedProperties)) {
        delete transformed[key];
      }
    }

    // Apply property transformations
    for (const [key, prop] of Object.entries(this.schema.properties) as [keyof T, PropertySchema<any>][]) {
      if (prop.transform && key in transformed) {
        transformed[key] = prop.transform.reverse(transformed[key]);
      }
    }

    // Apply naming transformation
    if (this.namingConfig) {
      transformed = transformToNotion(transformed, this.namingConfig);
    }

    return transformed;
  }

  /**
   * Create a stream transformer.
   */
  createStreamTransformer(): {
    fromNotion: (source: Observable<any>) => Observable<T>;
    toNotion: (source: Observable<T>) => Observable<any>;
  } {
    return {
      fromNotion: (source) => source.pipe(map((record) => this.fromNotion(record))),
      toNotion: (source) => source.pipe(map((record) => this.toNotion(record)))
    };
  }
}

/**
 * Database schema registry for managing multiple schemas.
 */
export class DatabaseSchemaRegistry {
  private schemas = new Map<string, DatabaseSchema<any>>();
  private validators = new Map<string, DatabaseSchemaValidator<any>>();
  private transformers = new Map<string, DatabaseSchemaTransformer<any>>();

  /**
   * Register a database schema.
   */
  register<T extends Record<string, any>>(schema: DatabaseSchema<T>, namingConfig?: NamingConfig): void {
    this.schemas.set(schema.name, schema);
    this.validators.set(schema.name, new DatabaseSchemaValidator(schema));
    this.transformers.set(schema.name, new DatabaseSchemaTransformer(schema, namingConfig));
  }

  /**
   * Get a schema by name.
   */
  getSchema<T extends Record<string, any>>(name: string): DatabaseSchema<T> | undefined {
    return this.schemas.get(name);
  }

  /**
   * Get a validator by schema name.
   */
  getValidator<T extends Record<string, any>>(name: string): DatabaseSchemaValidator<T> | undefined {
    return this.validators.get(name);
  }

  /**
   * Get a transformer by schema name.
   */
  getTransformer<T extends Record<string, any>>(name: string): DatabaseSchemaTransformer<T> | undefined {
    return this.transformers.get(name);
  }

  /**
   * List all registered schemas.
   */
  list(): string[] {
    return Array.from(this.schemas.keys());
  }
}

/**
 * Global database schema registry.
 */
export const databaseSchemaRegistry = new DatabaseSchemaRegistry();

/**
 * Example usage:
 *
 * ```typescript
 * interface Task {
 *   id: string;
 *   title: string;
 *   description: string;
 *   completed: boolean;
 *   dueDate: Date;
 *   tags: string[];
 *   priority: { name: string; color: string };
 *   assignee?: string;
 *   completedAt?: Date;
 * }
 *
 * const taskSchema = defineDatabase<Task>("tasks")
 *   .string("id", { required: true, index: true })
 *   .richText("title", { required: true })
 *   .richText("description")
 *   .boolean("completed", { default: false })
 *   .date("dueDate")
 *   .multiSelect("tags")
 *   .select("priority", { options: ["Low", "Medium", "High"] })
 *   .relation("assignee", "users")
 *   .computed("completedAt", (task) => task.completed ? new Date() : undefined)
 *   .required("title", "dueDate")
 *   .indexed("id", "completed")
 *   .build();
 *
 * databaseSchemaRegistry.register(taskSchema, { strategy: "camelCase" });
 * ```
 */
