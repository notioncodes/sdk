/**
 * @module
 * This module defines branded types for Notion's various IDs to ensure type-safe
 * operations throughout the SDK. Using branded types prevents accidental misuse of
 * one type of ID where another is expected, such as passing a `PageId` to a function
 * that requires a `DatabaseId`.
 *
 * Each ID type is a string augmented with a unique symbol, making it incompatible
 * with a plain string or other ID types at compile time without explicit casting.
 * Helper functions are provided for safely casting strings to these branded types.
 */

declare const PageIdBrand: unique symbol;
declare const DatabaseIdBrand: unique symbol;
declare const BlockIdBrand: unique symbol;

/**
 * Represents a type-safe Notion Page ID.
 * @example
 * const pageId = toPageId('a-real-page-id');
 */
export type PageId = string & { [PageIdBrand]: true };

/**
 * Represents a type-safe Notion Database ID.
 * @example
 * const dbId = toDatabaseId('a-real-database-id');
 */
export type DatabaseId = string & { [DatabaseIdBrand]: true };

/**
 * Represents a type-safe Notion Block ID.
 * @example
 * const blockId = toBlockId('a-real-block-id');
 */
export type BlockId = string & { [BlockIdBrand]: true };

/**
 * Safely casts a string to a `PageId`.
 *
 * @param id The string representation of the page ID.
 * @returns The string cast to a `PageId`.
 */
export const toPageId = (id: string): PageId => id as PageId;

/**
 * Safely casts a string to a `DatabaseId`.
 *
 * @param id The string representation of the database ID.
 * @returns The string cast to a `DatabaseId`.
 */
export const toDatabaseId = (id: string): DatabaseId => id as DatabaseId;

/**
 * Safely casts a string to a `BlockId`.
 *
 * @param id The string representation of the block ID.
 * @returns The string cast to a `BlockId`.
 */
export const toBlockId = (id: string): BlockId => id as BlockId;
