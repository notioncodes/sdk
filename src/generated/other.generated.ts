import { type, scope, ArkErrors } from 'arktype';
import type { InferredType } from '../types.js';

/**
 * @module generated/other
 *
 * Auto-generated ArkType schemas for other-related types.
 * Generated from Notion API type definitions.
 * 
 * ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated
 * ⚠️  Changes will be overwritten on next generation
 */

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for BlockObjectResponse.
 * Complexity: complex
 */
export const BlockObjectResponseSchema = type(ParagraphBlockObjectResponseSchema | Heading1BlockObjectResponseSchema | Heading2BlockObjectResponseSchema | Heading3BlockObjectResponseSchema | BulletedListItemBlockObjectResponseSchema | NumberedListItemBlockObjectResponseSchema | QuoteBlockObjectResponseSchema | ToDoBlockObjectResponseSchema | ToggleBlockObjectResponseSchema | TemplateBlockObjectResponseSchema | SyncedBlockBlockObjectResponseSchema | ChildPageBlockObjectResponseSchema | ChildDatabaseBlockObjectResponseSchema | EquationBlockObjectResponseSchema | CodeBlockObjectResponseSchema | CalloutBlockObjectResponseSchema | DividerBlockObjectResponseSchema | BreadcrumbBlockObjectResponseSchema | TableOfContentsBlockObjectResponseSchema | ColumnListBlockObjectResponseSchema | ColumnBlockObjectResponseSchema | LinkToPageBlockObjectResponseSchema | TableBlockObjectResponseSchema | TableRowBlockObjectResponseSchema | EmbedBlockObjectResponseSchema | BookmarkBlockObjectResponseSchema | ImageBlockObjectResponseSchema | VideoBlockObjectResponseSchema | PdfBlockObjectResponseSchema | FileBlockObjectResponseSchema | AudioBlockObjectResponseSchema | LinkPreviewBlockObjectResponseSchema | UnsupportedBlockObjectResponseSchema);

/**
 * Schema for BlockObjectRequest.
 * Complexity: complex
 */
export const BlockObjectRequestSchema = type({} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {});

/**
 * Schema for BlockObjectRequestWithoutChildren.
 * Complexity: complex
 */
export const BlockObjectRequestWithoutChildrenSchema = type({} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {});

/**
 * Schema for BlockObjectWithSingleLevelOfChildrenRequest.
 * Complexity: complex
 */
export const BlockObjectWithSingleLevelOfChildrenRequestSchema = type({} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {});

/**
 * Schema for PropertyFilter.
 * Complexity: complex
 */
export const PropertyFilterSchema = type({} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {} | {});

/**
 * Schema for PropertyItemObjectResponse.
 * Complexity: complex
 */
export const PropertyItemObjectResponseSchema = type(NumberPropertyItemObjectResponseSchema | UrlPropertyItemObjectResponseSchema | SelectPropertyItemObjectResponseSchema | MultiSelectPropertyItemObjectResponseSchema | StatusPropertyItemObjectResponseSchema | DatePropertyItemObjectResponseSchema | EmailPropertyItemObjectResponseSchema | PhoneNumberPropertyItemObjectResponseSchema | CheckboxPropertyItemObjectResponseSchema | FilesPropertyItemObjectResponseSchema | CreatedByPropertyItemObjectResponseSchema | CreatedTimePropertyItemObjectResponseSchema | LastEditedByPropertyItemObjectResponseSchema | LastEditedTimePropertyItemObjectResponseSchema | FormulaPropertyItemObjectResponseSchema | ButtonPropertyItemObjectResponseSchema | uuidSchema | VerificationPropertyItemObjectResponseSchema | TitlePropertyItemObjectResponseSchema | RichTextPropertyItemObjectResponseSchema | PeoplePropertyItemObjectResponseSchema | RelationPropertyItemObjectResponseSchema | RollupPropertyItemObjectResponseSchema);

/**
 * Schema for DatabasePropertyConfigResponse.
 * Complexity: complex
 */
export const DatabasePropertyConfigResponseSchema = type(NumberDatabasePropertyConfigResponseSchema | FormulaDatabasePropertyConfigResponseSchema | SelectDatabasePropertyConfigResponseSchema | MultiSelectDatabasePropertyConfigResponseSchema | StatusDatabasePropertyConfigResponseSchema | RelationDatabasePropertyConfigResponseSchema | RollupDatabasePropertyConfigResponseSchema | databaseIdSchema | TitleDatabasePropertyConfigResponseSchema | RichTextDatabasePropertyConfigResponseSchema | UrlDatabasePropertyConfigResponseSchema | PeopleDatabasePropertyConfigResponseSchema | FilesDatabasePropertyConfigResponseSchema | EmailDatabasePropertyConfigResponseSchema | PhoneNumberDatabasePropertyConfigResponseSchema | DateDatabasePropertyConfigResponseSchema | CheckboxDatabasePropertyConfigResponseSchema | CreatedByDatabasePropertyConfigResponseSchema | CreatedTimeDatabasePropertyConfigResponseSchema | LastEditedByDatabasePropertyConfigResponseSchema | LastEditedTimeDatabasePropertyConfigResponseSchema);

// ============================================================================
// Type Exports
// ============================================================================

export type BlockObjectResponse = typeof BlockObjectResponseSchema.infer;
export type BlockObjectRequest = typeof BlockObjectRequestSchema.infer;
export type BlockObjectRequestWithoutChildren = typeof BlockObjectRequestWithoutChildrenSchema.infer;
export type BlockObjectWithSingleLevelOfChildrenRequest = typeof BlockObjectWithSingleLevelOfChildrenRequestSchema.infer;
export type PropertyFilter = typeof PropertyFilterSchema.infer;
export type PropertyItemObjectResponse = typeof PropertyItemObjectResponseSchema.infer;
export type DatabasePropertyConfigResponse = typeof DatabasePropertyConfigResponseSchema.infer;
