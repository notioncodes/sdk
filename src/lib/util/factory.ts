import { type, Type } from "arktype";
import type { NamingConfig, NamingStrategy } from "./naming";
import type { TransformKeys } from "./transformer";
import { transformFromNotion } from "./transformer";

/**
 * Schema factory that creates dynamic schemas based on naming strategies.
 */
export class SchemaFactory {
  private schemaCache = new Map<string, Type>();

  /**
   * Create a schema with property name transformation.
   */
  createSchema<T extends Record<string, any>>(
    baseSchema: Type<T>,
    config: NamingConfig
  ): TransformSchema<T, NamingConfig["strategy"]> {
    const cacheKey = this.getCacheKey(baseSchema, config);

    if (this.schemaCache.has(cacheKey)) {
      return this.schemaCache.get(cacheKey) as TransformSchema<T, NamingConfig["strategy"]>;
    }

    const transformedSchema = this.buildTransformedSchema(baseSchema, config);
    this.schemaCache.set(cacheKey, transformedSchema);

    return transformedSchema as TransformSchema<T, NamingConfig["strategy"]>;
  }

  /**
   * Create a page schema with naming transformation.
   */
  createPageSchema<S extends NamingStrategy>(config: NamingConfig & { strategy: S }): TransformSchema<any, S> {
    // This would use your existing pageSchema as the base
    const basePageSchema = type({
      id: "string",
      object: '"page"',
      created_time: "string",
      created_by: "unknown", // We'll use a simplified version for demo
      last_edited_time: "string",
      last_edited_by: "unknown",
      archived: "boolean",
      properties: "Record<string, unknown>",
      parent: "unknown",
      url: "string",
      "public_url?": "string"
    });

    return this.createSchema(basePageSchema, config) as TransformSchema<any, S>;
  }

  /**
   * Create a block schema with naming transformation.
   */
  createBlockSchema<S extends NamingStrategy>(config: NamingConfig & { strategy: S }): TransformSchema<any, S> {
    const baseBlockSchema = type({
      id: "string",
      object: '"block"',
      created_time: "string",
      created_by: "unknown",
      last_edited_time: "string",
      last_edited_by: "unknown",
      has_children: "boolean",
      archived: "boolean",
      type: "string"
    });

    return this.createSchema(baseBlockSchema, config) as TransformSchema<any, S>;
  }

  /**
   * Build a transformed schema that validates and transforms properties.
   */
  private buildTransformedSchema<T>(baseSchema: Type<T>, config: NamingConfig): Type {
    return type((input: unknown) => {
      // First, validate with the base schema (expects Notion API format)
      const validationResult = baseSchema(input);

      if (validationResult instanceof Error) {
        return validationResult;
      }

      // Then transform to target naming convention
      return transformFromNotion(validationResult as Record<string, any>, config);
    });
  }

  /**
   * Generate cache key for schema caching.
   */
  private getCacheKey<T>(schema: Type<T>, config: NamingConfig): string {
    return `${schema.toString()}-${config.strategy}-${JSON.stringify(config.customMappings || {})}-${config.preserveUnknown || false}`;
  }
}

/**
 * Type representing a schema with transformed property names.
 */
export type TransformSchema<T, S extends NamingStrategy> = Type<TransformKeys<T, S>>;

/**
 * Global schema factory instance.
 */
export const schemaFactory = new SchemaFactory();
