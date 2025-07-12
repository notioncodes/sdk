import { isoDateSchema } from "$schemas/schemas";
import { type } from "arktype";

export const searchSort = type({
  timestamp: isoDateSchema,
  direction: '"ascending" | "descending"'
});

export const searchFilter = type({
  property: "'object'",
  value: '"page" | "database"'
});

export const searchParameters = type({
  query: "string",
  filter: searchFilter,
  sort: searchSort,
  start_cursor: "string",
  page_size: "number"
});

export type SearchParameters = typeof searchParameters.infer;

export const searchSchema = type({
  "query?": "string",
  "filter?": searchFilter,
  "sort?": searchSort,
  "start_cursor?": "string",
  "page_size?": "number"
});

export type Search = typeof searchSchema.infer;
