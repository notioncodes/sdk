import { type, scope } from "arktype";
import { DatabaseId } from "./branded-types";

// Re-export from property-schemas
export { PropertyType, PropertyValue, PropertyConfig } from "./property-schemas";
import { PropertyType, PropertyValue, PropertyConfig, propertyValueSchemas, propertyConfigSchemas } from "./property-schemas";

// Type-safe database schema builder
export class DatabaseSchemaBuilder<TProperties extends Record<string, PropertyType> = {}> {
  private properties: TProperties;

  constructor(properties: TProperties = {} as TProperties) {
    this.properties = properties;
  }

  addProperty<K extends string, T extends PropertyType>(
    key: K,
    type: T,
    config?: Partial<PropertyConfig<T>>
  ): DatabaseSchemaBuilder<TProperties & Record<K, T>> {
    return new DatabaseSchemaBuilder({
      ...this.properties,
      [key]: type
    } as TProperties & Record<K, T>);
  }

  build() {
    const schemaProperties: Record<string, any> = {};
    
    for (const [key, propType] of Object.entries(this.properties)) {
      const valueSchema = propertyValueSchemas[propType as keyof typeof propertyValueSchemas];
      if (valueSchema) {
        schemaProperties[key] = valueSchema;
      }
    }

    const schema = type(schemaProperties);
    
    return {
      properties: this.properties,
      schema,
      validate: (data: unknown) => schema(data),
      infer: {} as { [K in keyof TProperties]: PropertyValue<TProperties[K]> }
    };
  }
}

// Database schema type
export type DatabaseSchema<T extends Record<string, PropertyType>> = {
  properties: T;
  schema: ReturnType<typeof type>;
  validate: (data: unknown) => any;
  infer: { [K in keyof T]: PropertyValue<T[K]> };
};

// Helper to create database schema
export const createDatabaseSchema = <T extends Record<string, PropertyType>>(
  properties: T
): DatabaseSchema<T> => {
  return new DatabaseSchemaBuilder(properties).build();
};

// Example usage type
export type InferDatabaseSchema<T extends DatabaseSchema<any>> = T["infer"];

// Property filter types
export type PropertyFilter<T extends PropertyType> = 
  T extends "title" | "rich_text" ? TextFilter :
  T extends "number" ? NumberFilter :
  T extends "checkbox" ? CheckboxFilter :
  T extends "select" | "status" ? SelectFilter :
  T extends "multi_select" ? MultiSelectFilter :
  T extends "date" | "created_time" | "last_edited_time" ? DateFilter :
  T extends "people" | "created_by" | "last_edited_by" ? PeopleFilter :
  T extends "files" ? FilesFilter :
  T extends "url" | "email" | "phone_number" ? TextFilter :
  T extends "relation" ? RelationFilter :
  T extends "formula" ? FormulaFilter :
  T extends "rollup" ? RollupFilter :
  never;

// Filter types
export type TextFilter = 
  | { equals: string }
  | { does_not_equal: string }
  | { contains: string }
  | { does_not_contain: string }
  | { starts_with: string }
  | { ends_with: string }
  | { is_empty: true }
  | { is_not_empty: true };

export type NumberFilter =
  | { equals: number }
  | { does_not_equal: number }
  | { greater_than: number }
  | { less_than: number }
  | { greater_than_or_equal_to: number }
  | { less_than_or_equal_to: number }
  | { is_empty: true }
  | { is_not_empty: true };

export type CheckboxFilter =
  | { equals: boolean }
  | { does_not_equal: boolean };

export type SelectFilter =
  | { equals: string }
  | { does_not_equal: string }
  | { is_empty: true }
  | { is_not_empty: true };

export type MultiSelectFilter =
  | { contains: string }
  | { does_not_contain: string }
  | { is_empty: true }
  | { is_not_empty: true };

export type DateFilter =
  | { equals: string }
  | { before: string }
  | { after: string }
  | { on_or_before: string }
  | { on_or_after: string }
  | { past_week: {} }
  | { past_month: {} }
  | { past_year: {} }
  | { next_week: {} }
  | { next_month: {} }
  | { next_year: {} }
  | { is_empty: true }
  | { is_not_empty: true };

export type PeopleFilter =
  | { contains: string }
  | { does_not_contain: string }
  | { is_empty: true }
  | { is_not_empty: true };

export type FilesFilter =
  | { is_empty: true }
  | { is_not_empty: true };

export type RelationFilter =
  | { contains: string }
  | { does_not_contain: string }
  | { is_empty: true }
  | { is_not_empty: true };

export type FormulaFilter = TextFilter | NumberFilter | CheckboxFilter | DateFilter;
export type RollupFilter = NumberFilter | DateFilter;

// Compound filter types
export type CompoundFilter<T extends Record<string, PropertyType>> = 
  | { and: Array<PropertyFilterMap<T> | CompoundFilter<T>> }
  | { or: Array<PropertyFilterMap<T> | CompoundFilter<T>> };

export type PropertyFilterMap<T extends Record<string, PropertyType>> = {
  [K in keyof T]?: {
    property: K;
  } & PropertyFilter<T[K]>;
}[keyof T];

// Sort direction
export type SortDirection = "ascending" | "descending";

// Sort configuration
export type Sort<T extends Record<string, PropertyType>> = {
  [K in keyof T]?: {
    property: K;
    direction: SortDirection;
  };
}[keyof T];

// Query builder type
export type DatabaseQuery<T extends Record<string, PropertyType>> = {
  filter?: PropertyFilterMap<T> | CompoundFilter<T>;
  sorts?: Array<Sort<T>>;
  start_cursor?: string;
  page_size?: number;
};