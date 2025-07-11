import { type } from "arktype";
import { apiColorSchema, fileSchema, iconSchema, isoDateSchema, richTextSchema } from "./schemas";

const baseBlockProperties = {
  id: "string",
  object: '"block"' as const,
  created_time: isoDateSchema,
  created_by: {
    object: '"user"' as const,
    id: "string"
  },
  last_edited_time: isoDateSchema,
  last_edited_by: {
    object: '"user"' as const,
    id: "string"
  },
  has_children: "boolean",
  archived: "boolean",
  "parent?": {
    type: '"page_id" | "block_id" | "database_id" | "workspace"',
    "page_id?": "string",
    "block_id?": "string",
    "database_id?": "string",
    "workspace?": "boolean"
  }
} as const;

export const paragraphBlockSchema = type({
  ...baseBlockProperties,
  type: '"paragraph"',
  paragraph: {
    rich_text: richTextSchema,
    color: apiColorSchema
  }
});

export type ParagraphBlock = typeof paragraphBlockSchema.infer;

export const heading1BlockSchema = type({
  ...baseBlockProperties,
  type: '"heading_1"',
  heading_1: {
    rich_text: richTextSchema,
    color: apiColorSchema,
    is_toggleable: "boolean"
  }
});

export type Heading1Block = typeof heading1BlockSchema.infer;

export const heading2BlockSchema = type({
  ...baseBlockProperties,
  type: '"heading_2"',
  heading_2: {
    rich_text: richTextSchema,
    color: apiColorSchema,
    is_toggleable: "boolean"
  }
});

export type Heading2Block = typeof heading2BlockSchema.infer;

export const heading3BlockSchema = type({
  ...baseBlockProperties,
  type: '"heading_3"',
  heading_3: {
    rich_text: richTextSchema,
    color: apiColorSchema,
    is_toggleable: "boolean"
  }
});

export type Heading3Block = typeof heading3BlockSchema.infer;

export const bulletedListItemBlockSchema = type({
  ...baseBlockProperties,
  type: '"bulleted_list_item"',
  bulleted_list_item: {
    rich_text: richTextSchema,
    color: apiColorSchema
  }
});

export type BulletedListItemBlock = typeof bulletedListItemBlockSchema.infer;

export const numberedListItemBlockSchema = type({
  ...baseBlockProperties,
  type: '"numbered_list_item"',
  numbered_list_item: {
    rich_text: richTextSchema,
    color: apiColorSchema
  }
});

export type NumberedListItemBlock = typeof numberedListItemBlockSchema.infer;

export const toDoBlockSchema = type({
  ...baseBlockProperties,
  type: '"to_do"',
  to_do: {
    rich_text: richTextSchema,
    checked: "boolean",
    color: apiColorSchema
  }
});

export type TodoBlock = typeof toDoBlockSchema.infer;

export const toggleBlockSchema = type({
  ...baseBlockProperties,
  type: '"toggle"',
  toggle: {
    rich_text: richTextSchema,
    color: apiColorSchema
  }
});

export type ToggleBlock = typeof toggleBlockSchema.infer;

export const codeBlockSchema = type({
  ...baseBlockProperties,
  type: '"code"',
  code: {
    rich_text: richTextSchema,
    caption: richTextSchema,
    language: "string"
  }
});

export type CodeBlock = typeof codeBlockSchema.infer;

export const childPageBlockSchema = type({
  ...baseBlockProperties,
  type: '"child_page"',
  child_page: {
    title: "string"
  }
});

export type ChildPageBlock = typeof childPageBlockSchema.infer;

export const childDatabaseBlockSchema = type({
  ...baseBlockProperties,
  type: '"child_database"',
  child_database: {
    title: "string"
  }
});

export type ChildDatabaseBlock = typeof childDatabaseBlockSchema.infer;

export const embedBlockSchema = type({
  ...baseBlockProperties,
  type: '"embed"',
  embed: {
    "url?": "string",
    "caption?": richTextSchema
  }
});

export type EmbedBlock = typeof embedBlockSchema.infer;

export const imageBlockSchema = type({
  ...baseBlockProperties,
  type: '"image"',
  image: fileSchema
});

export type ImageBlock = typeof imageBlockSchema.infer;

export const videoBlockSchema = type({
  ...baseBlockProperties,
  type: '"video"',
  video: fileSchema
});

export type VideoBlock = typeof videoBlockSchema.infer;

export const fileBlockSchema = type({
  ...baseBlockProperties,
  type: '"file"',
  file: fileSchema
});

export type FileBlock = typeof fileBlockSchema.infer;

export const pdfBlockSchema = type({
  ...baseBlockProperties,
  type: '"pdf"',
  pdf: fileSchema
});

export type PdfBlock = typeof pdfBlockSchema.infer;

export const audioBlockSchema = type({
  ...baseBlockProperties,
  type: '"audio"',
  audio: fileSchema
});

export type AudioBlock = typeof audioBlockSchema.infer;

export const bookmarkBlockSchema = type({
  ...baseBlockProperties,
  type: '"bookmark"',
  bookmark: {
    url: "string",
    "caption?": richTextSchema
  }
});

export type BookmarkBlock = typeof bookmarkBlockSchema.infer;

export const calloutBlockSchema = type({
  ...baseBlockProperties,
  type: '"callout"',
  callout: {
    rich_text: richTextSchema,
    icon: iconSchema,
    color: apiColorSchema
  }
});

export type CalloutBlock = typeof calloutBlockSchema.infer;

export const quoteBlockSchema = type({
  ...baseBlockProperties,
  type: '"quote"',
  quote: {
    rich_text: richTextSchema,
    color: apiColorSchema
  }
});

export type QuoteBlock = typeof quoteBlockSchema.infer;

export const equationBlockSchema = type({
  ...baseBlockProperties,
  type: '"equation"',
  equation: {
    expression: "string"
  }
});

export type EquationBlock = typeof equationBlockSchema.infer;

export const dividerBlockSchema = type({
  ...baseBlockProperties,
  type: '"divider"',
  divider: type({})
});

export type DividerBlock = typeof dividerBlockSchema.infer;

export const tableOfContentsBlockSchema = type({
  ...baseBlockProperties,
  type: '"table_of_contents"',
  table_of_contents: {
    "color?": apiColorSchema
  }
});

export type TableOfContentsBlock = typeof tableOfContentsBlockSchema.infer;

export const columnBlockSchema = type({
  ...baseBlockProperties,
  type: '"column"',
  column: type({})
});

export type ColumnBlock = typeof columnBlockSchema.infer;

export const columnListBlockSchema = type({
  ...baseBlockProperties,
  type: '"column_list"',
  column_list: type({})
});

export type ColumnListBlock = typeof columnListBlockSchema.infer;

export const linkPreviewBlockSchema = type({
  ...baseBlockProperties,
  type: '"link_preview"',
  link_preview: {
    url: "string"
  }
});

export type LinkPreviewBlock = typeof linkPreviewBlockSchema.infer;

export const syncedBlockSchema = type({
  ...baseBlockProperties,
  /**
   * Schema for a synced block in Notion.
   *
   * The `synced_block` property may optionally include a `synced_from` object,
   * which itself may optionally include a `type` (must be "block_id") and a `block_id` string.
   * If not present, `synced_from` is null.
   */
  type: '"synced_block"',
  synced_block: type({
    "synced_from?": type({
      "type?": '"block_id"',
      "block_id?": "string"
    })
  })
});

export type SyncedBlock = typeof syncedBlockSchema.infer;

export const templateBlockSchema = type({
  ...baseBlockProperties,
  type: '"template"',
  template: {
    rich_text: richTextSchema
  }
});

export type TemplateBlock = typeof templateBlockSchema.infer;

export const linkToPageBlockSchema = type({
  ...baseBlockProperties,
  type: '"link_to_page"',
  link_to_page: {
    type: '"page_id" | "database_id"',
    "page_id?": "string",
    "database_id?": "string"
  }
});

export type LinkToPageBlock = typeof linkToPageBlockSchema.infer;

export const tableBlockSchema = type({
  ...baseBlockProperties,
  type: '"table"',
  table: {
    table_width: "number",
    has_column_header: "boolean",
    has_row_header: "boolean"
  }
});

export type TableBlock = typeof tableBlockSchema.infer;

export const tableRowBlockSchema = type({
  ...baseBlockProperties,
  type: '"table_row"',
  table_row: {
    cells: [richTextSchema, "[]"]
  }
});

export type TableRowBlock = typeof tableRowBlockSchema.infer;

export const breadcrumbBlockSchema = type({
  ...baseBlockProperties,
  type: '"breadcrumb"',
  breadcrumb: type({})
});

export type BreadcrumbBlock = typeof breadcrumbBlockSchema.infer;

export const unsupportedBlockSchema = type({
  ...baseBlockProperties,
  type: '"unsupported"',
  unsupported: type({})
});

export type UnsupportedBlock = typeof unsupportedBlockSchema.infer;

export const blockSchema = type({
  id: "string",
  object: '"block"',
  type: "string",
  created_time: isoDateSchema,
  created_by: {
    object: '"user"',
    id: "string"
  },
  last_edited_time: isoDateSchema,
  last_edited_by: {
    object: '"user"',
    id: "string"
  },
  has_children: "boolean",
  archived: "boolean"
});

export type Block =
  | ParagraphBlock
  | Heading1Block
  | Heading2Block
  | Heading3Block
  | BulletedListItemBlock
  | NumberedListItemBlock
  | TodoBlock
  | ToggleBlock
  | CodeBlock
  | ChildPageBlock
  | ChildDatabaseBlock
  | EmbedBlock
  | ImageBlock
  | VideoBlock
  | FileBlock
  | PdfBlock
  | BookmarkBlock
  | CalloutBlock
  | QuoteBlock
  | EquationBlock
  | DividerBlock
  | TableOfContentsBlock
  | ColumnBlock
  | ColumnListBlock
  | LinkPreviewBlock
  | SyncedBlock
  | TemplateBlock
  | LinkToPageBlock
  | TableBlock
  | TableRowBlock
  | BreadcrumbBlock
  | AudioBlock
  | UnsupportedBlock;

export function isBlock(value: unknown): value is Block {
  return (
    value !== null &&
    value !== undefined &&
    typeof value === "object" &&
    "object" in value &&
    value.object === "block" &&
    "id" in value &&
    typeof value.id === "string"
  );
}

export function getBlockType(block: { type: string }): string {
  return block.type;
}

export function hasChildren(block: { has_children?: boolean }): boolean {
  return block.has_children === true;
}
