/**
 * @module schemas/blocks-minimal
 *
 * Minimal block schemas for Notion block types.
 * A simplified version to avoid ArkType complexity issues.
 */

import { type } from "arktype";
import { apiColorSchema, richTextSchema } from "./core";

// ============================================================================
// Simple Block Schemas for Testing
// ============================================================================

/**
 * Schema for paragraph blocks.
 */
export const paragraphBlockSchema = type({
  type: '"paragraph"',
  paragraph: {
    rich_text: richTextSchema,
    color: apiColorSchema
  }
});

/**
 * Type representing a paragraph block.
 */
export type ParagraphBlock = typeof paragraphBlockSchema.infer;

/**
 * Schema for heading_1 blocks.
 */
export const heading1BlockSchema = type({
  type: '"heading_1"',
  heading_1: {
    rich_text: richTextSchema,
    color: apiColorSchema,
    is_toggleable: "boolean"
  }
});

/**
 * Type representing a heading_1 block.
 */
export type Heading1Block = typeof heading1BlockSchema.infer;

/**
 * Schema for heading_2 blocks.
 */
export const heading2BlockSchema = type({
  type: '"heading_2"',
  heading_2: {
    rich_text: richTextSchema,
    color: apiColorSchema,
    is_toggleable: "boolean"
  }
});

/**
 * Type representing a heading_2 block.
 */
export type Heading2Block = typeof heading2BlockSchema.infer;

/**
 * Schema for heading_3 blocks.
 */
export const heading3BlockSchema = type({
  type: '"heading_3"',
  heading_3: {
    rich_text: richTextSchema,
    color: apiColorSchema,
    is_toggleable: "boolean"
  }
});

/**
 * Type representing a heading_3 block.
 */
export type Heading3Block = typeof heading3BlockSchema.infer;

// Create stubs for other schemas to satisfy imports
export const bulletedListItemBlockSchema = type({ type: '"bulleted_list_item"' });
export const numberedListItemBlockSchema = type({ type: '"numbered_list_item"' });
export const toDoBlockSchema = type({ type: '"to_do"' });
export const toggleBlockSchema = type({ type: '"toggle"' });
export const codeBlockSchema = type({ type: '"code"' });
export const childPageBlockSchema = type({ type: '"child_page"' });
export const childDatabaseBlockSchema = type({ type: '"child_database"' });
export const embedBlockSchema = type({ type: '"embed"' });
export const imageBlockSchema = type({ type: '"image"' });
export const videoBlockSchema = type({ type: '"video"' });
export const fileBlockSchema = type({ type: '"file"' });
export const pdfBlockSchema = type({ type: '"pdf"' });
export const bookmarkBlockSchema = type({ type: '"bookmark"' });
export const calloutBlockSchema = type({ type: '"callout"' });
export const quoteBlockSchema = type({ type: '"quote"' });
export const equationBlockSchema = type({ type: '"equation"' });
export const dividerBlockSchema = type({ type: '"divider"' });
export const tableOfContentsBlockSchema = type({ type: '"table_of_contents"' });
export const columnBlockSchema = type({ type: '"column"' });
export const columnListBlockSchema = type({ type: '"column_list"' });
export const linkPreviewBlockSchema = type({ type: '"link_preview"' });
export const syncedBlockSchema = type({ type: '"synced_block"' });
export const templateBlockSchema = type({ type: '"template"' });
export const linkToPageBlockSchema = type({ type: '"link_to_page"' });
export const tableBlockSchema = type({ type: '"table"' });
export const tableRowBlockSchema = type({ type: '"table_row"' });
export const breadcrumbBlockSchema = type({ type: '"breadcrumb"' });
export const audioBlockSchema = type({ type: '"audio"' });
export const unsupportedBlockSchema = type({ type: '"unsupported"' });

// Export types
export type TodoBlock = typeof toDoBlockSchema.infer;
export type CodeBlock = typeof codeBlockSchema.infer;

/**
 * Schema for any block type.
 */
export const blockSchema = type("unknown");

/**
 * Type representing any block.
 */
export type Block = typeof blockSchema.infer;

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Type guard to check if a value is a block.
 *
 * @param value - The value to check.
 * @returns True if the value is a block.
 */
export function isBlock(value: unknown): value is Block {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "object" in value &&
    (value as any).object === "block"
  );
}

/**
 * Gets the type of a block.
 *
 * @param block - The block to get the type from.
 * @returns The block type.
 */
export function getBlockType(block: { type: string }): string {
  return block.type;
}

/**
 * Checks if a block has children.
 *
 * @param block - The block to check.
 * @returns True if the block has children.
 */
export function hasChildren(block: { has_children?: boolean }): boolean {
  return block.has_children === true;
}
