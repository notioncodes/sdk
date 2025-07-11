import { scope, type } from "arktype";
import { pageIdSchema, databaseIdSchema, userIdSchema } from "./branded-types";

// Base property types
export const propertyTypes = [
  "title",
  "rich_text", 
  "number",
  "select",
  "multi_select",
  "date",
  "people",
  "files",
  "checkbox",
  "url",
  "email",
  "phone_number",
  "formula",
  "relation",
  "rollup",
  "created_time",
  "created_by",
  "last_edited_time",
  "last_edited_by",
  "status",
  "unique_id",
  "verification",
  "button"
] as const;

export type PropertyType = typeof propertyTypes[number];

// Color schema
export const colorSchema = type(
  '"default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red"'
);

export type Color = typeof colorSchema.infer;

// Select option schema
export const selectOptionSchema = type({
  id: "string",
  name: "string",
  color: colorSchema,
  "description?": "string | null"
});

export type SelectOption = typeof selectOptionSchema.infer;

// Status option schema
export const statusOptionSchema = type({
  id: "string",
  name: "string",
  color: colorSchema
});

export type StatusOption = typeof statusOptionSchema.infer;

// Status group schema
export const statusGroupSchema = type({
  id: "string",
  name: "string",
  color: colorSchema,
  option_ids: type("string[]")
});

export type StatusGroup = typeof statusGroupSchema.infer;

// Date schema
export const dateValueSchema = type({
  start: "string",
  "end?": "string | null",
  "time_zone?": "string | null"
});

export type DateValue = typeof dateValueSchema.infer;

// Rich text schema
export const richTextSchema = type({
  type: '"text"',
  text: {
    content: "string",
    "link?": type({ url: "string" }).or("null")
  },
  annotations: {
    bold: "boolean",
    italic: "boolean",
    strikethrough: "boolean",
    underline: "boolean",
    code: "boolean",
    color: colorSchema
  },
  plain_text: "string",
  "href?": "string | null"
});

export type RichText = typeof richTextSchema.infer;

// File schema
const fileScope = scope({
  external: {
    type: '"external"',
    external: { url: "string" }
  },
  file: {
    type: '"file"',
    file: {
      url: "string",
      expiry_time: "string"
    }
  },
  fileValue: "external | file"
}).export();

export const fileValueSchema = fileScope.fileValue;
export type FileValue = typeof fileValueSchema.infer;

// Formula value schemas
const formulaScope = scope({
  stringFormula: {
    type: '"string"',
    string: "string | null"
  },
  numberFormula: {
    type: '"number"',
    number: "number | null"
  },
  booleanFormula: {
    type: '"boolean"',
    boolean: "boolean | null"
  },
  dateFormula: {
    type: '"date"',
    date: dateValueSchema.or("null")
  },
  formulaValue: "stringFormula | numberFormula | booleanFormula | dateFormula"
}).export();

export const formulaValueSchema = formulaScope.formulaValue;
export type FormulaValue = typeof formulaValueSchema.infer;

// Rollup value schemas
const rollupScope = scope({
  numberRollup: {
    type: '"number"',
    number: "number | null",
    function: '"count" | "count_values" | "empty" | "not_empty" | "unique" | "show_unique" | "percent_empty" | "percent_not_empty" | "sum" | "average" | "median" | "min" | "max" | "range"'
  },
  dateRollup: {
    type: '"date"',
    date: dateValueSchema.or("null"),
    function: '"earliest_date" | "latest_date" | "date_range"'
  },
  arrayRollup: {
    type: '"array"',
    array: type("unknown[]"),
    function: '"show_original"'
  },
  rollupValue: "numberRollup | dateRollup | arrayRollup"
}).export();

export const rollupValueSchema = rollupScope.rollupValue;
export type RollupValue = typeof rollupValueSchema.infer;

// Property value schemas
export const propertyValueSchemas = scope({
  title: type([richTextSchema, "[]"]),
  rich_text: type([richTextSchema, "[]"]),
  number: "number | null",
  select: selectOptionSchema.or("null"),
  multi_select: type([selectOptionSchema, "[]"]),
  date: dateValueSchema.or("null"),
  people: type([{ object: '"user"', id: userIdSchema }, "[]"]),
  files: type([fileValueSchema, "[]"]),
  checkbox: "boolean",
  url: "string | null",
  email: "string | null",
  phone_number: "string | null",
  formula: formulaValueSchema,
  relation: type([{ id: pageIdSchema }, "[]"]),
  rollup: rollupValueSchema,
  created_time: "string",
  created_by: { object: '"user"', id: userIdSchema },
  last_edited_time: "string",
  last_edited_by: { object: '"user"', id: userIdSchema },
  status: statusOptionSchema.or("null"),
  unique_id: {
    number: "number",
    prefix: "string | null"
  },
  verification: {
    state: '"verified" | "unverified"',
    "verified_by?": type({ object: '"user"', id: userIdSchema }).or("null"),
    "date?": dateValueSchema.or("null")
  },
  button: type("Record<string, never>")
}).export();

// Property configuration schemas
export const propertyConfigSchemas = scope({
  title: { type: '"title"' },
  rich_text: { type: '"rich_text"' },
  number: {
    type: '"number"',
    format: type('"number" | "number_with_commas" | "percent" | "dollar" | "canadian_dollar" | "singapore_dollar" | "euro" | "pound" | "yen" | "ruble" | "rupee" | "won" | "yuan" | "real" | "lira" | "rupiah" | "franc" | "hong_kong_dollar" | "new_zealand_dollar" | "krona" | "norwegian_krone" | "mexican_peso" | "rand" | "new_taiwan_dollar" | "danish_krone" | "zloty" | "baht" | "forint" | "koruna" | "shekel" | "chilean_peso" | "philippine_peso" | "dirham" | "colombian_peso" | "riyal" | "ringgit" | "leu" | "argentine_peso" | "uruguayan_peso"')
  },
  select: {
    type: '"select"',
    options: type([selectOptionSchema, "[]"])
  },
  multi_select: {
    type: '"multi_select"',
    options: type([selectOptionSchema, "[]"])
  },
  date: { type: '"date"' },
  people: { type: '"people"' },
  files: { type: '"files"' },
  checkbox: { type: '"checkbox"' },
  url: { type: '"url"' },
  email: { type: '"email"' },
  phone_number: { type: '"phone_number"' },
  formula: {
    type: '"formula"',
    expression: "string"
  },
  relation: {
    type: '"relation"',
    database_id: databaseIdSchema,
    "synced_property_id?": "string",
    "synced_property_name?": "string"
  },
  rollup: {
    type: '"rollup"',
    relation_property_id: "string",
    relation_property_name: "string",
    rollup_property_id: "string",
    rollup_property_name: "string",
    function: '"count" | "count_values" | "empty" | "not_empty" | "unique" | "show_unique" | "percent_empty" | "percent_not_empty" | "sum" | "average" | "median" | "min" | "max" | "range" | "earliest_date" | "latest_date" | "date_range" | "show_original"'
  },
  created_time: { type: '"created_time"' },
  created_by: { type: '"created_by"' },
  last_edited_time: { type: '"last_edited_time"' },
  last_edited_by: { type: '"last_edited_by"' },
  status: {
    type: '"status"',
    options: type([statusOptionSchema, "[]"]),
    groups: type([statusGroupSchema, "[]"])
  },
  unique_id: { type: '"unique_id"' },
  verification: { type: '"verification"' },
  button: { type: '"button"' }
}).export();

// Union types for property values and configs
export type PropertyValue<T extends PropertyType> = T extends keyof typeof propertyValueSchemas 
  ? typeof propertyValueSchemas[T]["infer"]
  : never;

export type PropertyConfig<T extends PropertyType> = T extends keyof typeof propertyConfigSchemas
  ? typeof propertyConfigSchemas[T]["infer"] 
  : never;

// Database property schema
export const databasePropertySchema = <T extends PropertyType>(propType: T) => {
  const configSchema = propertyConfigSchemas[propType as keyof typeof propertyConfigSchemas];
  if (!configSchema) {
    throw new Error(`Unknown property type: ${propType}`);
  }
  
  return type({
    id: "string",
    name: "string",
    type: `"${propType}"`
  });
};

// Helper to create typed property value
export const createPropertyValue = <T extends PropertyType>(
  propType: T,
  value: PropertyValue<T>
): Record<string, any> => {
  return {
    type: propType,
    [propType]: value
  };
};