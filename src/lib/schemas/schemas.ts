import { scope, type } from "arktype";
import { BlockId, CommentId, DatabaseId, PageId, UserId, WorkspaceId } from "./brands";

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
