import { type, scope, ArkErrors } from 'arktype';
import type { InferredType } from '../types.js';

/**
 * @module generated/content
 *
 * Auto-generated ArkType schemas for content-related types.
 * Generated from Notion API type definitions.
 * 
 * ⚠️  DO NOT EDIT MANUALLY - This file is auto-generated
 * ⚠️  Changes will be overwritten on next generation
 */

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Schema for RichTextItemResponse.
 * Complexity: simple
 */
export const RichTextItemResponseSchema = type(RichTextItemResponseCommonSchema | TextRichTextItemResponseSchema | MentionRichTextItemResponseSchema | EquationRichTextItemResponseSchema);

/**
 * Schema for RichTextItemRequest.
 * Complexity: simple
 */
export const RichTextItemRequestSchema = type(RichTextItemRequestCommonSchema | TextRichTextItemRequestSchema | MentionRichTextItemRequestSchema | EquationRichTextItemRequestSchema);

// ============================================================================
// Type Exports
// ============================================================================

export type RichTextItemResponse = typeof RichTextItemResponseSchema.infer;
export type RichTextItemRequest = typeof RichTextItemRequestSchema.infer;
