import { type } from "arktype";
import { color, numberFormat } from "./primitives";

/**
 * Rich text object schema for text content with annotations.
 */
export const richTextObjectSchema = type({
  type: '"text"',
  text: {
    content: "string",
    "link?": {
      "url?": "string"
    }
  },
  annotations: {
    bold: "boolean",
    italic: "boolean",
    strikethrough: "boolean",
    underline: "boolean",
    code: "boolean",
    color: color
  },
  plain_text: "string",
  "href?": "string | null"
});

/**
 * Option schema for select and multi-select properties.
 */
export const optionSchema = type({
  "id?": "string",
  name: "string",
  "color?": color,
  "description?": "string | null"
});

/**
 * Status group schema for status properties.
 */
export const statusGroupSchema = type({
  name: "string",
  color: color,
  option_ids: "string[]"
});

// Database Property Schemas

/**
 * Database property schema for title type.
 */
export const titleDatabasePropertySchema = type({
  type: '"title"',
  title: "Record<string, unknown>"
});

/**
 * Database property schema for rich text type.
 */
export const richTextDatabasePropertySchema = type({
  type: '"rich_text"',
  rich_text: "Record<string, unknown>"
});

/**
 * Database property schema for number type.
 */
export const numberDatabasePropertySchema = type({
  type: '"number"',
  number: {
    "format?": numberFormat
  }
});

/**
 * Database property schema for select type.
 */
export const selectDatabasePropertySchema = type({
  type: '"select"',
  select: {
    "options?": optionSchema.array()
  }
});

/**
 * Database property schema for multi-select type.
 */
export const multiSelectDatabasePropertySchema = type({
  type: '"multi_select"',
  multi_select: {
    "options?": optionSchema.array()
  }
});

/**
 * Database property schema for status type.
 */
export const statusDatabasePropertySchema = type({
  type: '"status"',
  status: {
    "options?": optionSchema.array(),
    "groups?": statusGroupSchema.array()
  }
});

/**
 * Database property schema for date type.
 */
export const dateDatabasePropertySchema = type({
  type: '"date"',
  date: "Record<string, unknown>"
});

/**
 * Database property schema for people type.
 */
export const peopleDatabasePropertySchema = type({
  type: '"people"',
  people: "Record<string, unknown>"
});

/**
 * Database property schema for files type.
 */
export const filesDatabasePropertySchema = type({
  type: '"files"',
  files: "Record<string, unknown>"
});

/**
 * Database property schema for checkbox type.
 */
export const checkboxDatabasePropertySchema = type({
  type: '"checkbox"',
  checkbox: "Record<string, unknown>"
});

/**
 * Database property schema for URL type.
 */
export const urlDatabasePropertySchema = type({
  type: '"url"',
  url: "Record<string, unknown>"
});

/**
 * Database property schema for email type.
 */
export const emailDatabasePropertySchema = type({
  type: '"email"',
  email: "Record<string, unknown>"
});

/**
 * Database property schema for phone number type.
 */
export const phoneNumberDatabasePropertySchema = type({
  type: '"phone_number"',
  phone_number: "Record<string, unknown>"
});

/**
 * Database property schema for formula type.
 */
export const formulaDatabasePropertySchema = type({
  type: '"formula"',
  formula: {
    expression: "string"
  }
});

/**
 * Database property schema for relation type.
 */
export const relationDatabasePropertySchema = type({
  type: '"relation"',
  relation: {
    database_id: "string",
    type: "string",
    "dual_property?": {
      synced_property_name: "string",
      synced_property_id: "string"
    }
  }
});

/**
 * Database property schema for rollup type.
 */
export const rollupDatabasePropertySchema = type({
  type: '"rollup"',
  rollup: {
    relation_property_name: "string",
    relation_property_id: "string",
    rollup_property_name: "string",
    rollup_property_id: "string",
    function: "string"
  }
});

/**
 * Database property schema for created time type.
 */
export const createdTimeDatabasePropertySchema = type({
  type: '"created_time"',
  created_time: "Record<string, unknown>"
});

/**
 * Database property schema for created by type.
 */
export const createdByDatabasePropertySchema = type({
  type: '"created_by"',
  created_by: "Record<string, unknown>"
});

/**
 * Database property schema for last edited time type.
 */
export const lastEditedTimeDatabasePropertySchema = type({
  type: '"last_edited_time"',
  last_edited_time: "Record<string, unknown>"
});

/**
 * Database property schema for last edited by type.
 */
export const lastEditedByDatabasePropertySchema = type({
  type: '"last_edited_by"',
  last_edited_by: "Record<string, unknown>"
});

/**
 * Database property schema for unique ID type.
 */
export const uniqueIdDatabasePropertySchema = type({
  type: '"unique_id"',
  unique_id: {
    "prefix?": "string"
  }
});

/**
 * Database property schema for button type.
 */
export const buttonDatabasePropertySchema = type({
  type: '"button"',
  button: "Record<string, unknown>"
});

/**
 * Discriminated union schema for all database property types.
 */
export const databasePropertySchema = type([
  titleDatabasePropertySchema,
  richTextDatabasePropertySchema,
  numberDatabasePropertySchema,
  selectDatabasePropertySchema,
  multiSelectDatabasePropertySchema,
  statusDatabasePropertySchema,
  dateDatabasePropertySchema,
  peopleDatabasePropertySchema,
  filesDatabasePropertySchema,
  checkboxDatabasePropertySchema,
  urlDatabasePropertySchema,
  emailDatabasePropertySchema,
  phoneNumberDatabasePropertySchema,
  formulaDatabasePropertySchema,
  relationDatabasePropertySchema,
  rollupDatabasePropertySchema,
  createdTimeDatabasePropertySchema,
  createdByDatabasePropertySchema,
  lastEditedTimeDatabasePropertySchema,
  lastEditedByDatabasePropertySchema,
  uniqueIdDatabasePropertySchema,
  buttonDatabasePropertySchema
]);

// Page Property Value Schemas

/**
 * Page property value schema for title type.
 */
export const titlePagePropertyValueSchema = type({
  type: '"title"',
  id: "string",
  title: richTextObjectSchema.array()
});

/**
 * Page property value schema for rich text type.
 */
export const richTextPagePropertyValueSchema = type({
  type: '"rich_text"',
  id: "string",
  rich_text: richTextObjectSchema.array()
});

/**
 * Page property value schema for number type.
 */
export const numberPagePropertyValueSchema = type({
  type: '"number"',
  id: "string",
  number: "number | null"
});

/**
 * Page property schema for select type.
 *
 * @see {@link https://developers.notion.com/reference/page-property-values#select}
 */
export const selectPagePropertySchema = type({
  type: '"select"',
  select: {
    "options?": optionSchema.array()
  }
});

/**
 * Page property value schema for checkbox type.
 */
export const checkboxPagePropertySchema = type({
  type: '"checkbox"',
  id: "string",
  checkbox: "boolean"
});

/**
 * Page property value schema for URL type.
 */
export const urlPagePropertyValueSchema = type({
  type: '"url"',
  id: "string",
  url: "string | null"
});

/**
 * Page property value schema for email type.
 */
export const emailPagePropertyValueSchema = type({
  type: '"email"',
  id: "string",
  email: "string | null"
});

/**
 * Page property value schema for phone number type.
 */
export const phoneNumberPagePropertyValueSchema = type({
  type: '"phone_number"',
  id: "string",
  phone_number: "string | null"
});

/**
 * Formula result schema for different value types.
 */
export const formulaResultSchema = type([
  { type: '"string"', string: "string | null" },
  { type: '"number"', number: "number | null" },
  { type: '"boolean"', boolean: "boolean | null" },
  { type: '"date"', date: "string | null" }
]);

/**
 * Page property value schema for formula type.
 */
export const formulaPagePropertyValueSchema = type({
  type: '"formula"',
  id: "string",
  formula: formulaResultSchema
});

/**
 * Page property value schema for created time type.
 */
export const createdTimePagePropertyValueSchema = type({
  type: '"created_time"',
  id: "string",
  created_time: "string"
});

/**
 * Page property value schema for unique ID type.
 */
export const uniqueIdPagePropertyValueSchema = type({
  type: '"unique_id"',
  id: "string",
  unique_id: {
    number: "number",
    "prefix?": "string"
  }
});

/**
 * Page property value schema for button type.
 */
export const buttonPagePropertyValueSchema = type({
  type: '"button"',
  id: "string",
  button: "Record<string, unknown>"
});

/**
 * Discriminated union schema for all page property value types.
 */
export const pagePropertyValueSchema = type([
  titlePagePropertyValueSchema,
  richTextPagePropertyValueSchema,
  numberPagePropertyValueSchema,
  selectPagePropertySchema,
  checkboxPagePropertySchema,
  urlPagePropertyValueSchema,
  emailPagePropertyValueSchema,
  phoneNumberPagePropertyValueSchema,
  formulaPagePropertyValueSchema,
  createdTimePagePropertyValueSchema,
  uniqueIdPagePropertyValueSchema,
  buttonPagePropertyValueSchema
]);

// Types
export type DatabaseProperty = typeof databasePropertySchema.infer;
export type PagePropertyValue = typeof pagePropertyValueSchema.infer;

/**
 * Validates whether an unknown value is a valid database property.
 *
 * @param property - The value to validate
 * @returns True if the value is a valid database property, false otherwise
 */
export function validateDatabaseProperty(property: unknown): property is DatabaseProperty {
  return databasePropertySchema.allows(property);
}

/**
 * Validates whether an unknown value is a valid page property value.
 *
 * @param value - The value to validate
 * @returns True if the value is a valid page property value, false otherwise
 */
export function validatePagePropertyValue(value: unknown): value is PagePropertyValue {
  return pagePropertyValueSchema.allows(value);
}
