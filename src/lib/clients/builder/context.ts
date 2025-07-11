import type { Type } from "arktype";
import type { QueryCondition, SortSpec } from "./builder";

/**
 * Query execution context.
 */
export interface ReadContext<T> {
  conditions: QueryCondition<T>[];
  sorts: SortSpec<T>[];
  limitValue?: number;
  offsetValue?: number;
  includes: string[];
  selectedFields?: (keyof T)[];
}

export interface WriteContext<T> {
  schema: Type<T>;
}

export type Context<T> = ReadContext<T> | WriteContext<T>;
