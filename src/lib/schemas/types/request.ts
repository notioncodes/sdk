import { type } from "arktype";
import { isoDateSchema } from "../schemas";

export const searchSortSchema = type({
  timestamp: isoDateSchema,
  direction: '"ascending" | "descending"'
});

export const searchFilterSchema = type({
  property: "string",
  value: '"page" | "database"'
});

export const searchParametersSchema = type({
  sort: searchSortSchema,
  query: "string",
  start_cursor: "string",
  page_size: "number",
  filter: searchFilterSchema
});

export type SearchParameters = typeof searchParametersSchema.infer;
