import { type, Type } from "arktype";
import { parentSchema, userSchema } from "../schemas";
import { databasePropertySchema, pagePropertyValueSchema } from "./properties";

/**
 * API error schema for structured error handling.
 */
export const apiErrorSchema = type({
  code: "string",
  message: "string",
  "details?": "unknown"
});

export type APIError = typeof apiErrorSchema.infer;

/**
 * Base API response schema with generic data payload.
 */
export const createApiResponseSchema = <T>(dataSchema: Type<T>) =>
  type({
    data: dataSchema,
    "metadata?": apiResponseMetadataSchema,
    "errors?": apiErrorSchema.array()
  });

/**
 * Base response metadata schema for all Notion API responses.
 */
export const apiResponseMetadataSchema = type({
  "request_id?": "string",
  "timestamp?": "Date",
  "rate_limit?": type({
    remaining: "number",
    reset_time: "Date",
    "retry_after?": "number"
  }),
  "cached?": "boolean"
});

export type ResponseMetadata = typeof apiResponseMetadataSchema.infer;

/**
 * Pagination parameters schema for cursor-based pagination.
 */
export const paginationParametersSchema = type({
  "start_cursor?": "string",
  "page_size?": "number"
});

export type PaginationParameters = typeof paginationParametersSchema.infer;

/**
 * Base list response schema from Notion API.
 */
export const listResponseSchema = type({
  object: '"list"',
  next_cursor: "string | null",
  has_more: "boolean"
});

export type ListResponse = typeof listResponseSchema.infer;

/**
 * Enhanced paginated response schema that extends base API response.
 */
export const createPaginatedResponseSchema = <T>(resultSchema: Type<T>) =>
  type({
    request_id: "string",
    next_cursor: "string | null",
    has_more: "boolean",
    metadata: apiResponseMetadataSchema,
    errors: apiErrorSchema.array().optional(),
    results: resultSchema.array()
  });

/**
 * Valid list response types based on Notion API specification.
 */
export type ListType = "page_or_database" | "database" | "page" | "block" | "user" | "comment" | "search_result";

/**
 * Command layer factory for creating search response schemas.
 *
 * @param resultType - The arktype schema for search result items
 * @returns A composed arktype schema for search responses
 */
export function createSearchResponseSchema<T>(resultType: Type<T>) {
  return type({
    object: '"list"',
    type: '"search_result"',
    results: resultType.array(),
    next_cursor: "string | null",
    has_more: "boolean",
    "request_id?": "string"
  });
}

/**
 * Command layer factory for creating query response schemas.
 *
 * @param resultType - The arktype schema for query result items
 * @returns A composed arktype schema for database query responses
 */
export function createQueryResponseSchema<T>(resultType: Type<T>) {
  return type({
    object: '"list"',
    type: '"page" | "database"',
    results: resultType.array(),
    next_cursor: "string | null",
    has_more: "boolean",
    "request_id?": "string"
  });
}

/**
 * Unified page or database schema for mixed result sets.
 */
export const pageOrDatabaseSchema = type({
  object: '"page" | "database"',
  id: "string",
  created_time: "string",
  last_edited_time: "string",
  archived: "boolean",
  url: "string",
  "public_url?": "string | null",
  parent: parentSchema,
  properties: type([pagePropertyValueSchema, databasePropertySchema]),
  created_by: userSchema,
  last_edited_by: userSchema
});

export type PageOrDatabase = typeof pageOrDatabaseSchema.infer;

/**
 * Command layer response wrapper that provides consistent structure.
 */
export class NotionResponseCommand<T> {
  constructor(
    private schema: Type<T>,
    private transformer?: (data: any) => any
  ) {}

  /**
   * Create a validated response schema with error handling.
   */
  createResponseSchema() {
    return type({
      success: "boolean",
      data: this.schema,
      "error?": apiErrorSchema,
      "metadata?": apiResponseMetadataSchema
    });
  }

  /**
   * Transform raw API response to command layer format.
   */
  transform(rawResponse: unknown) {
    const responseSchema = this.createResponseSchema();

    try {
      const transformed = this.transformer ? this.transformer(rawResponse) : rawResponse;
      return responseSchema.assert({
        success: true,
        data: transformed
      });
    } catch (error) {
      return responseSchema.assert({
        success: false,
        error: {
          code: "TRANSFORMATION_ERROR",
          message: error instanceof Error ? error.message : "Unknown transformation error",
          details: error
        }
      });
    }
  }
}

/**
 * Factory function for creating command layer response handlers.
 *
 * @param schema - The arktype schema for the expected data structure
 * @param transformer - Optional transformation function for raw data
 * @returns A new NotionResponseCommand instance
 */
export function createResponseCommand<T>(schema: Type<T>, transformer?: (data: any) => any): NotionResponseCommand<T> {
  return new NotionResponseCommand(schema, transformer);
}
