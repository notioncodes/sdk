/**
 * @module types
 *
 * Type utilities for the Notion SDK.
 * Provides helper types for working with ArkType schemas.
 */

import type { Type } from "arktype";

/**
 * Utility type to infer the TypeScript type from an ArkType schema.
 * This allows us to derive static types from runtime schemas.
 *
 * @template T - The ArkType schema to infer from
 *
 * @example
 * ```typescript
 * const userSchema = type({ name: "string", age: "number" });
 * type User = InferredType<typeof userSchema>;
 * // User is { name: string; age: number }
 * ```
 */
export type InferredType<T extends Type> = T extends Type<infer U> ? U : never;
