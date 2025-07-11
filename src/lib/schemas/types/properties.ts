import { type } from "arktype";
import { color, numberFormat } from "./base";

/**
 * Base property schema that all property types extend.
 * Contains common fields shared by all property types.
 */
export const basePropertySchema = type({
  id: "string",
  type: "string",
  "name?": "string"
});

// Individual property schemas (simplified)
export const titlePropertySchema = type({
  type: '"title"',
  title: "Record<string, unknown>"
});

export const numberPropertySchema = type({
  type: '"number"',
  number: {
    "format?": numberFormat
  }
});

export const selectPropertySchema = type({
  type: '"select"',
  select: {
    "options?": {
      name: "string",
      "id?": "string",
      "color?": color
    }
  }
});

// Simple union without scope
export const databasePropertySchema = type("unknown");

// Simple value schemas
export const titleValueSchema = type({
  type: '"title"',
  id: "string",
  title: "unknown[]"
});

export const numberValueSchema = type({
  type: '"number"',
  id: "string",
  number: "number | null"
});

export const pagePropertyValueSchema = type("unknown");

// Types
export type DatabaseProperty = typeof databasePropertySchema.infer;
export type PagePropertyValue = typeof pagePropertyValueSchema.infer;

// Utility functions
export function validateDatabaseProperty(property: unknown): property is DatabaseProperty {
  return databasePropertySchema.allows(property);
}

export function validatePagePropertyValue(value: unknown): value is PagePropertyValue {
  return pagePropertyValueSchema.allows(value);
}

export function getDatabasePropertyType(property: DatabaseProperty): string {
  return (property as any).type;
}

export function getPagePropertyValueType(value: PagePropertyValue): string {
  return (value as any).type;
}

export function isDatabasePropertyOfType(property: DatabaseProperty, type: string): boolean {
  return getDatabasePropertyType(property) === type;
}

export function isPagePropertyValueOfType(value: PagePropertyValue, type: string): boolean {
  return getPagePropertyValueType(value) === type;
}
