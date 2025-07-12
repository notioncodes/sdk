import { scope, type } from "arktype";
import { isoDateSchema } from "../schemas";

/**
 * Schema for basic query parameters with validation constraints.
 * Ensures page_size is limited to prevent API overload.
 */
export const QuerySchema = type({
  query: "string",
  sort: "object",
  filter: "object",
  start_cursor: "string",
  page_size: "number < 25"
});

// databaseSort will be defined in the scope below

/**
 * Base property filter conditions for checkbox fields.
 * Supports equality and inequality operations.
 */
export const checkboxFilter = type({
  equals: "boolean",
  "does_not_equal?": "boolean"
});

/**
 * Comprehensive number filter with range and existence checks.
 * Supports all common numerical comparison operations.
 */
export const numberFilter = type({
  "equals?": "number",
  "does_not_equal?": "number",
  "greater_than?": "number",
  "less_than?": "number",
  "greater_than_or_equal_to?": "number",
  "less_than_or_equal_to?": "number",
  "is_empty?": "boolean",
  "is_not_empty?": "boolean"
});

/**
 * Text filter supporting various string operations.
 * Includes pattern matching and existence checks.
 */
export const textFilter = type({
  "equals?": "string",
  "does_not_equal?": "string",
  "contains?": "string",
  "does_not_contain?": "string",
  "starts_with?": "string",
  "ends_with?": "string",
  "is_empty?": "boolean",
  "is_not_empty?": "boolean"
});

/**
 * Select filter for single-select properties.
 * Supports value matching and existence checks.
 */
export const selectFilter = type({
  "equals?": "string",
  "does_not_equal?": "string",
  "is_empty?": "boolean",
  "is_not_empty?": "boolean"
});

/**
 * Multi-select filter for multi-select properties.
 * Supports containment checks and existence validation.
 */
export const multiSelectFilter = type({
  "contains?": "string",
  "does_not_contain?": "string",
  "is_empty?": "boolean",
  "is_not_empty?": "boolean"
});

/**
 * Comprehensive date filter with relative and absolute date operations.
 * Supports ISO date strings and relative date ranges.
 */
export const dateFilter = type({
  "equals?": isoDateSchema,
  "before?": isoDateSchema,
  "after?": isoDateSchema,
  "on_or_before?": isoDateSchema,
  "on_or_after?": isoDateSchema,
  "past_week?": "Record<string, never>",
  "past_month?": "Record<string, never>",
  "past_year?": "Record<string, never>",
  "next_week?": "Record<string, never>",
  "next_month?": "Record<string, never>",
  "next_year?": "Record<string, never>",
  "is_empty?": "boolean",
  "is_not_empty?": "boolean"
});

/**
 * People filter for user-related properties.
 * Supports user containment and existence checks.
 */
export const peopleFilter = type({
  "contains?": "string",
  "does_not_contain?": "string",
  "is_empty?": "boolean",
  "is_not_empty?": "boolean"
});

/**
 * Relation filter for database relations.
 * Supports relation containment and existence validation.
 */
export const relationFilter = type({
  "contains?": "string",
  "does_not_contain?": "string",
  "is_empty?": "boolean",
  "is_not_empty?": "boolean"
});

/**
 * Formula filter that can contain different result types.
 * Supports filtering based on formula evaluation results.
 */
export const formulaFilter = type({
  "string?": textFilter,
  "checkbox?": checkboxFilter,
  "number?": numberFilter,
  "date?": dateFilter
});

/**
 * Rollup filter for rollup properties.
 * Supports aggregation-based filtering with logical operations.
 */
export const rollupFilter = type({
  "any?": "Record<string, unknown>",
  "every?": "Record<string, unknown>",
  "none?": "Record<string, unknown>",
  "date?": dateFilter,
  "number?": numberFilter
});

/**
 * Comprehensive property filter supporting all Notion property types.
 * Handles different property types with appropriate filter operations.
 */
export const propertyFilter = type({
  property: "string",
  "checkbox?": checkboxFilter,
  "number?": numberFilter,
  "rich_text?": textFilter,
  "title?": textFilter,
  "select?": selectFilter,
  "multi_select?": multiSelectFilter,
  "date?": dateFilter,
  "created_time?": dateFilter,
  "last_edited_time?": dateFilter,
  "people?": peopleFilter,
  "created_by?": peopleFilter,
  "last_edited_by?": peopleFilter,
  "relation?": relationFilter,
  "formula?": formulaFilter,
  "rollup?": rollupFilter,
  "url?": textFilter,
  "email?": textFilter,
  "phone_number?": textFilter
});

/**
 * Creates a comprehensive scope for all query-related types.
 * This enables proper handling of recursive and interdependent types.
 */
export const queryScope = scope({
  /**
   * Sort object for database queries.
   */
  databaseSort: {
    property: "string",
    direction: "'ascending' | 'descending'"
  },

  /**
   * User object schema for API responses.
   */
  userObject: {
    object: "'user'",
    id: "string",
    "name?": "string",
    "avatar_url?": "string",
    "type?": "'person' | 'bot'",
    "person?": {
      email: "string"
    },
    "bot?": "Record<string, unknown>"
  },

  /**
   * Relation item type for database relations.
   */
  relationItem: {
    id: "string"
  },

  /**
   * Page property value types for different property kinds.
   */
  pageProperty: {
    id: "string",
    type: "string",
    "title?": "Record<string, unknown>[]",
    "rich_text?": "Record<string, unknown>[]",
    "number?": "number",
    "select?": {
      id: "string",
      name: "string",
      color: "string"
    },
    "multi_select?": "Record<string, unknown>[]",
    "date?": {
      start: "string",
      "end?": "string | null",
      "time_zone?": "string | null"
    },
    "checkbox?": "boolean",
    "url?": "string",
    "email?": "string",
    "phone_number?": "string",
    "people?": "userObject[]",
    "relation?": "relationItem[]",
    "formula?": "Record<string, unknown>",
    "rollup?": "Record<string, unknown>"
  },

  /**
   * Complete page object schema for API responses.
   */
  pageObject: {
    object: "'page'",
    id: "string",
    created_time: isoDateSchema,
    last_edited_time: isoDateSchema,
    created_by: "userObject",
    last_edited_by: "userObject",
    "cover?": "Record<string, unknown>",
    "icon?": "Record<string, unknown>",
    parent: "Record<string, unknown>",
    archived: "boolean",
    properties: "Record<string, pageProperty>",
    url: "string"
  },

  /**
   * Recursive database filter schema supporting nested compound filters.
   * Allows for complex filtering with AND/OR operations at any level.
   */
  databaseFilter: {
    "and?": "databaseFilter[]",
    "or?": "databaseFilter[]"
  }
});

// Export the individual types from the scope
export const databaseSort = queryScope.type("databaseSort");
export const userObject = queryScope.type("userObject");
export const pageProperty = queryScope.type("pageProperty");
export const pageObject = queryScope.type("pageObject");
export const databaseFilter = queryScope.type("databaseFilter");

/**
 * Union type that represents either a property filter or a compound filter.
 * This provides flexibility for both simple and complex filter operations.
 */
export const filterUnion = propertyFilter.or(databaseFilter);

/**
 * Type representing a complete database filter structure.
 * Can be either a property filter or a compound filter with nested operations.
 */
export type DatabaseFilter =
  | typeof propertyFilter.infer
  | {
      and?: DatabaseFilter[];
    }
  | {
      or?: DatabaseFilter[];
    };

// Create properly scoped query types
export const queryTypes = queryScope.export();

/**
 * Database query parameters with proper typing and validation.
 * Supports filtering, sorting, and pagination with type safety.
 */
export const databaseQueryParameters = type({
  filter: filterUnion,
  sorts: queryTypes.databaseSort.array(),
  start_cursor: "string",
  page_size: "number"
});

export type DatabaseQueryParameters = typeof databaseQueryParameters.infer;

/**
 * Optional version for the actual request schema.
 * Makes all query parameters optional for flexible API usage.
 */
export const databaseQuerySchema = type({
  "filter?": filterUnion,
  "sorts?": queryTypes.databaseSort.array(),
  "start_cursor?": "string",
  "page_size?": "number"
});

export type DatabaseQuery = typeof databaseQuerySchema.infer;

/**
 * Database query response schema.
 * Represents the complete response structure from Notion's database query API.
 */
export const databaseQueryResponse = type({
  object: "'list'",
  results: queryTypes.pageObject.array(),
  next_cursor: "string | null",
  has_more: "boolean",
  type: "'page_or_database'",
  page_or_database: "Record<string, unknown>"
});

export type DatabaseQueryResponse = typeof databaseQueryResponse.infer;

// Export types for convenience
export type DatabaseSort = typeof databaseSort.infer;
export type PropertyFilter = typeof propertyFilter.infer;
export type PageObject = typeof pageObject.infer;
export type UserObject = typeof userObject.infer;
export type CheckboxFilter = typeof checkboxFilter.infer;
export type NumberFilter = typeof numberFilter.infer;
export type TextFilter = typeof textFilter.infer;
export type SelectFilter = typeof selectFilter.infer;
export type MultiSelectFilter = typeof multiSelectFilter.infer;
export type DateFilter = typeof dateFilter.infer;
export type PeopleFilter = typeof peopleFilter.infer;
export type RelationFilter = typeof relationFilter.infer;
export type FormulaFilter = typeof formulaFilter.infer;
export type RollupFilter = typeof rollupFilter.infer;
export type PageProperty = typeof pageProperty.infer;
