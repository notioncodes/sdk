/**
 * @module schemas/core
 *
 * Core schemas and branded types that form the foundation of the SDK's type system.
 * These types ensure compile-time safety and prevent common mistakes like passing
 * the wrong ID type to an API method.
 */

import { scope, type } from "arktype";

// ============================================================================
// Branded Types
// ============================================================================

/**
 * Creates a branded type to ensure type safety for different ID types.
 *
 * @template Brand - The brand identifier for the type.
 */
export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/**
 * Page identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const pageId: PageId = 'page_abc123' as PageId;
 * ```
 */
export type PageId = Branded<string, "PageId">;

/**
 * Database identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const dbId: DatabaseId = 'db_xyz789' as DatabaseId;
 * ```
 */
export type DatabaseId = Branded<string, "DatabaseId">;

/**
 * Block identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const blockId: BlockId = 'block_def456' as BlockId;
 * ```
 */
export type BlockId = Branded<string, "BlockId">;

/**
 * User identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const userId: UserId = 'user_ghi789' as UserId;
 * ```
 */
export type UserId = Branded<string, "UserId">;

/**
 * Comment identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const commentId: CommentId = 'comment_jkl012' as CommentId;
 * ```
 */
export type CommentId = Branded<string, "CommentId">;

/**
 * Workspace identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const workspaceId: WorkspaceId = 'workspace_mno345' as WorkspaceId;
 * ```
 */
export type WorkspaceId = Branded<string, "WorkspaceId">;

// ============================================================================
// ID Schemas
// ============================================================================

/**
 * Schema for PageId validation.
 */
export const pageIdSchema = type("string");

/**
 * Schema for DatabaseId validation.
 */
export const databaseIdSchema = type("string");

/**
 * Schema for BlockId validation.
 */
export const blockIdSchema = type("string");

/**
 * Schema for UserId validation.
 */
export const userIdSchema = type("string");

/**
 * Schema for CommentId validation.
 */
export const commentIdSchema = type("string");

/**
 * Schema for WorkspaceId validation.
 */
export const workspaceIdSchema = type("string");

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * Schema for UUID validation.
 */
export const uuidSchema = type("/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/");

/**
 * Schema for ISO 8601 date strings.
 */
export const isoDateSchema = type("/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?$/");

/**
 * Schema for API colors.
 */
export const apiColorSchema = type(
  '"default" | "gray" | "brown" | "orange" | "yellow" | "green" | "blue" | "purple" | "pink" | "red" | "gray_background" | "brown_background" | "orange_background" | "yellow_background" | "green_background" | "blue_background" | "purple_background" | "pink_background" | "red_background"'
);

/**
 * Type representing API colors.
 */
export type ApiColor = typeof apiColorSchema.infer;

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * Schema for emoji strings.
 */
export const emojiSchema = type("string");

/**
 * Schema for external file references.
 */
export const externalFileSchema = type({
  url: "string"
});

/**
 * Schema for internal file references.
 */
export const internalFileSchema = type({
  url: "string",
  expiry_time: isoDateSchema
});

/**
 * Create a scope for file-related schemas.
 */
const fileScope = scope({
  externalFile: {
    type: '"external"',
    external: externalFileSchema
  },
  internalFile: {
    type: '"file"',
    file: internalFileSchema
  },
  file: "externalFile | internalFile"
}).export();

/**
 * Schema for file references (internal or external).
 */
export const fileSchema = fileScope.file;

/**
 * Type representing a file reference.
 */
export type File = typeof fileSchema.infer;

/**
 * Create a scope for icon-related schemas.
 */
const iconScope = scope({
  emojiIcon: {
    type: '"emoji"',
    emoji: emojiSchema
  },
  externalIcon: {
    type: '"external"',
    external: externalFileSchema
  },
  fileIcon: {
    type: '"file"',
    file: internalFileSchema
  },
  icon: "emojiIcon | externalIcon | fileIcon"
}).export();

/**
 * Schema for icon references.
 */
export const iconSchema = iconScope.icon;

/**
 * Type representing an icon.
 */
export type Icon = typeof iconSchema.infer;

/**
 * Create a scope for cover-related schemas.
 */
const coverScope = scope({
  externalCover: {
    type: '"external"',
    external: externalFileSchema
  },
  fileCover: {
    type: '"file"',
    file: internalFileSchema
  },
  cover: "externalCover | fileCover"
}).export();

/**
 * Schema for cover images.
 */
export const coverSchema = coverScope.cover;

/**
 * Type representing a cover image.
 */
export type Cover = typeof coverSchema.infer;

/**
 * Create a scope for parent-related schemas.
 */
const parentScope = scope({
  databaseParent: {
    type: '"database_id"',
    database_id: "string"
  },
  pageParent: {
    type: '"page_id"',
    page_id: "string"
  },
  workspaceParent: {
    type: '"workspace"',
    workspace: "true"
  },
  blockParent: {
    type: '"block_id"',
    block_id: "string"
  },
  parent: "databaseParent | pageParent | workspaceParent | blockParent"
}).export();
/**
 * Schema for parent references.
 */
export const parentSchema = parentScope.parent;

/**
 * Type representing a parent reference.
 */
export type Parent = typeof parentSchema.infer;

// ============================================================================
// Rich Text Schemas
// ============================================================================

/**
 * Schema for text annotations.
 */
export const annotationsSchema = type({
  bold: "boolean",
  italic: "boolean",
  strikethrough: "boolean",
  underline: "boolean",
  code: "boolean",
  color: apiColorSchema
});

/**
 * Type representing text annotations.
 */
export type Annotations = typeof annotationsSchema.infer;

/**
 * Create a scope for text content schemas.
 */
const textScope = scope({
  linkObject: { url: "string" },
  textContent: {
    content: "string",
    "link?": "linkObject | null"
  }
}).export();

/**
 * Schema for plain text content.
 */
export const textContentSchema = textScope.textContent;

/**
 * Schema for rich text items.
 */
export const richTextItemSchema = type({
  type: '"text"',
  text: textContentSchema,
  annotations: annotationsSchema,
  plain_text: "string",
  "href?": "string | null"
});

/**
 * Type representing a rich text item.
 */
export type RichTextItem = typeof richTextItemSchema.infer;

/**
 * Schema for arrays of rich text items.
 */
export const richTextSchema = type([richTextItemSchema, "[]"]);

/**
 * Type representing rich text content.
 */
export type RichText = typeof richTextSchema.infer;

// ============================================================================
// User Schema
// ============================================================================

/**
 * Schema for user objects.
 */
export const userSchema = type({
  object: '"user"',
  id: userIdSchema
});

/**
 * Type representing a user.
 */
export type User = typeof userSchema.infer;

// ============================================================================
// Mention Schemas
// ============================================================================

/**
 * Schema for user mentions.
 */
export const userMentionSchema = type({
  type: '"user"',
  user: {
    object: '"user"',
    id: "string"
  }
});

/**
 * Schema for page mentions.
 */
export const pageMentionSchema = type({
  type: '"page"',
  page: { id: "string" }
});

/**
 * Schema for database mentions.
 */
export const databaseMentionSchema = type({
  type: '"database"',
  database: { id: "string" }
});

/**
 * Schema for date mentions.
 */
export const dateMentionSchema = type({
  type: '"date"',
  date: {
    start: isoDateSchema,
    "end?": "string | null",
    "time_zone?": "string | null"
  }
});

/**
 * Create a scope for mention-related schemas.
 */
const mentionScope = scope({
  userMention: userMentionSchema,
  pageMention: pageMentionSchema,
  databaseMention: databaseMentionSchema,
  dateMention: dateMentionSchema,
  mentionItem: "userMention | pageMention | databaseMention | dateMention"
}).export();

/**
 * Schema for mention items.
 */
export const mentionItemSchema = mentionScope.mentionItem;

/**
 * Type representing a mention.
 */
export type MentionItem = typeof mentionItemSchema.infer;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if a value is a PageId.
 *
 * @param value - The value to check.
 * @returns True if the value is a PageId.
 */
export function isPageId(value: unknown): value is PageId {
  return typeof value === "string" && value.startsWith("page_");
}

/**
 * Type guard to check if a value is a DatabaseId.
 *
 * @param value - The value to check.
 * @returns True if the value is a DatabaseId.
 */
export function isDatabaseId(value: unknown): value is DatabaseId {
  return typeof value === "string" && value.startsWith("db_");
}

/**
 * Type guard to check if a value is a BlockId.
 *
 * @param value - The value to check.
 * @returns True if the value is a BlockId.
 */
export function isBlockId(value: unknown): value is BlockId {
  return typeof value === "string" && value.startsWith("block_");
}

/**
 * Type guard to check if a value is a UserId.
 *
 * @param value - The value to check.
 * @returns True if the value is a UserId.
 */
export function isUserId(value: unknown): value is UserId {
  return typeof value === "string" && value.startsWith("user_");
}

/**
 * Type guard to check if a value is a CommentId.
 *
 * @param value - The value to check.
 * @returns True if the value is a CommentId.
 */
export function isCommentId(value: unknown): value is CommentId {
  return typeof value === "string" && value.startsWith("comment_");
}

/**
 * Type guard to check if a value is a WorkspaceId.
 *
 * @param value - The value to check.
 * @returns True if the value is a WorkspaceId.
 */
export function isWorkspaceId(value: unknown): value is WorkspaceId {
  return typeof value === "string" && value.startsWith("workspace_");
}
