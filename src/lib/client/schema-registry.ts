import { DatabaseId, toDatabaseId } from "../schemas/core/branded-types";
import { DatabaseSchema, PropertyType } from "../schemas/core/database-schema";

export class SchemaRegistry {
  private schemas = new Map<string, DatabaseSchema<any>>();
  private schemasByName = new Map<string, DatabaseId>();

  register<T extends Record<string, PropertyType>>(
    name: string,
    schema: DatabaseSchema<T>
  ): DatabaseId {
    // Generate a deterministic ID based on the schema name
    const id = toDatabaseId(this.generateIdFromName(name));
    
    this.schemas.set(id, schema);
    this.schemasByName.set(name, id);
    
    return id;
  }

  registerSchema<T extends Record<string, PropertyType>>(
    schema: DatabaseSchema<T>
  ): DatabaseId {
    // Generate ID from schema properties
    const schemaKey = this.generateSchemaKey(schema);
    const id = toDatabaseId(this.generateIdFromName(schemaKey));
    
    this.schemas.set(id, schema);
    
    return id;
  }

  get<T extends Record<string, PropertyType>>(
    nameOrId: string | DatabaseId
  ): DatabaseSchema<T> | undefined {
    // Try direct ID lookup first
    const directSchema = this.schemas.get(nameOrId);
    if (directSchema) return directSchema;

    // Try name lookup
    const id = this.schemasByName.get(nameOrId);
    if (id) {
      return this.schemas.get(id);
    }

    return undefined;
  }

  has(nameOrId: string | DatabaseId): boolean {
    return this.schemas.has(nameOrId) || this.schemasByName.has(nameOrId);
  }

  getByName(name: string): DatabaseSchema<any> | undefined {
    const id = this.schemasByName.get(name);
    return id ? this.schemas.get(id) : undefined;
  }

  getAllSchemas(): Map<string, DatabaseSchema<any>> {
    return new Map(this.schemas);
  }

  getAllNames(): string[] {
    return Array.from(this.schemasByName.keys());
  }

  clear(): void {
    this.schemas.clear();
    this.schemasByName.clear();
  }

  // Helper methods
  private generateIdFromName(name: string): string {
    // Generate a UUID-like string from the name
    // This is a simplified version - in production, use a proper UUID library
    const hash = this.simpleHash(name);
    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      hash.substring(12, 16),
      hash.substring(16, 20),
      hash.substring(20, 32)
    ].join('-');
  }

  private generateSchemaKey(schema: DatabaseSchema<any>): string {
    // Generate a unique key based on schema properties
    const propKeys = Object.keys(schema.properties).sort().join(',');
    return `schema_${propKeys}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to hex and pad to 32 characters
    const hex = Math.abs(hash).toString(16);
    return hex.padStart(32, '0');
  }

  // Schema validation helpers
  validateData<T extends Record<string, PropertyType>>(
    schemaNameOrId: string | DatabaseId,
    data: unknown
  ): data is T {
    const schema = this.get<T>(schemaNameOrId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaNameOrId}`);
    }

    const result = schema.validate(data);
    return !(result instanceof Error);
  }

  transformData<T extends Record<string, PropertyType>>(
    schemaNameOrId: string | DatabaseId,
    data: unknown
  ): T {
    const schema = this.get<T>(schemaNameOrId);
    if (!schema) {
      throw new Error(`Schema not found: ${schemaNameOrId}`);
    }

    const result = schema.validate(data);
    if (result instanceof Error) {
      throw result;
    }

    return result as T;
  }
}