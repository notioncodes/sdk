import { type } from "arktype";
import { searchFilterSchema, searchSortSchema } from "./request";

export const searchBodySchema = type({
  "query?": "string",
  "filter?": searchFilterSchema,
  "sort?": searchSortSchema,
  "start_cursor?": "string",
  "page_size?": "number"
});

export type SearchBody = typeof searchBodySchema.infer;
