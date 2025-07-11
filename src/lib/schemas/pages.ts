import { ArkErrors, type } from "arktype";
import { arkToNever, type InferredType } from "../util/types";
import { BlockId, DatabaseId, PageId } from "./brands";
import { coverSchema, iconSchema, pageIdSchema, parentSchema, userSchema } from "./schemas";

/**
 * Page property schemas for various property types.
 * This is a flexible schema that accepts any object with property definitions.
 */
export const pagePropertiesSchema = type("Record<string, unknown>");

export type PageProperties = InferredType<typeof pagePropertiesSchema>;

/**
 * Base page schema without content.
 * Represents a page object returned by the Notion API.
 */
export const pageSchema = type({
  id: pageIdSchema,
  object: '"page"',
  created_time: "string",
  created_by: userSchema,
  last_edited_time: "string",
  last_edited_by: userSchema,
  archived: "boolean",
  "icon?": iconSchema,
  "cover?": coverSchema,
  properties: pagePropertiesSchema,
  parent: parentSchema,
  url: "string",
  "public_url?": "string"
});

export type Page = InferredType<typeof pageSchema>;

/**
 * Full page schema including content blocks.
 * Used when retrieving a page with its content.
 */
export const fullPageSchema = type({
  id: pageIdSchema,
  object: '"page"',
  created_time: "string",
  created_by: userSchema,
  last_edited_time: "string",
  last_edited_by: userSchema,
  archived: "boolean",
  "icon?": iconSchema,
  "cover?": coverSchema,
  properties: pagePropertiesSchema,
  parent: parentSchema,
  url: "string",
  "public_url?": "string",
  content: "unknown[]" // Array of blocks - we'll use block schemas when implemented
});

export type FullPage = InferredType<typeof fullPageSchema>;

/**
 * Type guard to check if an object is a page.
 *
 * @param obj - The object to check
 * @returns True if the object is a page
 *
 * @example
 * ```typescript
 * const result = await notion.pages.retrieve({ page_id: "..." });
 * if (isPage(result)) {
 *   // TypeScript knows result is a Page
 *   console.log(result.properties);
 * }
 * ```
 */
export function isPage(obj: unknown): obj is Page {
  return (
    obj !== null && obj !== undefined && typeof obj === "object" && "object" in obj && (obj as any).object === "page"
  );
}

/**
 * Type guard to check if an object is a full page with content.
 *
 * @param obj - The object to check
 * @returns True if the object is a full page with content
 *
 * @example
 * ```typescript
 * const result = await notion.pages.retrieve({ page_id: "...", filter_properties: [] });
 * if (isFullPage(result)) {
 *   // TypeScript knows result has content
 *   console.log(result.content);
 * }
 * ```
 */
export function isFullPage(obj: unknown): obj is FullPage {
  return isPage(obj) && "content" in obj;
}

/**
 * Extract the title from a page's properties.
 * Searches for a property of type "title" and returns its plain text content.
 *
 * @param page - The page to extract the title from
 * @returns The page title as a string, or empty string if not found
 *
 * @example
 * ```typescript
 * const page = await notion.pages.retrieve({ page_id: "..." });
 * const title = getPageTitle(page);
 * console.log(`Page title: ${title}`);
 * ```
 */
export function getPageTitle(page: Page | FullPage): string {
  // Look for a property with type "title"
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop && typeof prop === "object" && "title" in prop && Array.isArray(prop.title) && prop.title.length > 0) {
      // Get the plain text from the first title item
      const firstItem = prop.title[0];
      if (firstItem && typeof firstItem === "object" && "plain_text" in firstItem) {
        return firstItem.plain_text as string;
      }
    }
  }
  return "";
}

/**
 * Create a page ID from a string.
 * This is a convenience function that performs validation.
 *
 * @param id - The ID string to convert
 * @returns A validated PageId
 * @throws {ArkErrors} If the ID is invalid
 *
 * @example
 * ```typescript
 * const pageId = createPageId("12345678-1234-1234-1234-123456789012");
 * ```
 */
export function createPageId(id: string): PageId {
  const result = pageIdSchema(id);
  if (result instanceof ArkErrors) {
    throw result;
  }
  return result as PageId;
}

/**
 * Get the parent type of a page.
 *
 * @param page - The page to check
 * @returns The parent type: "workspace", "page_id", "database_id", or "block_id"
 *
 * @example
 * ```typescript
 * const page = await notion.pages.retrieve({ page_id: "..." });
 * const parentType = getPageParentType(page);
 * if (parentType === "database_id") {
 *   console.log("This page is in a database");
 * }
 * ```
 */
export function getPageParentType(page: Page | FullPage): "workspace" | "page_id" | "database_id" | "block_id" {
  return page.parent.type;
}

/**
 * Get the parent ID of a page (if it has one).
 *
 * @param page - The page to check
 * @returns The parent ID or null if parent is workspace
 *
 * @example
 * ```typescript
 * const page = await notion.pages.retrieve({ page_id: "..." });
 * const parentId = getPageParentId(page);
 * if (parentId) {
 *   console.log(`Parent ID: ${parentId}`);
 * }
 * ```
 */
export function getPageParentId(page: Page | FullPage): PageId | DatabaseId | BlockId | null {
  const parent = page.parent;
  switch (parent.type) {
    case "page_id":
      return parent.page_id as PageId;
    case "database_id":
      return parent.database_id as DatabaseId;
    case "block_id":
      return parent.block_id as BlockId;
    case "workspace":
      return null;
    default:
      return arkToNever(parent);
  }
}
