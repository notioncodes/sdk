/**
 * @module schemas/index.test
 *
 * Tests for the central export point of all schemas.
 */

import { describe, expect, it } from "vitest";
import * as schemas from "./schemas";

describe("Schema Exports", () => {
  it("should export core schemas", () => {
    // Check that some key exports from core are available
    expect(schemas.uuidSchema).toBeDefined();
    expect(schemas.isoDateSchema).toBeDefined();
    expect(schemas.apiColorSchema).toBeDefined();
    expect(schemas.fileSchema).toBeDefined();
    expect(schemas.iconSchema).toBeDefined();
    expect(schemas.coverSchema).toBeDefined();
    expect(schemas.parentSchema).toBeDefined();
    expect(schemas.richTextSchema).toBeDefined();
    expect(schemas.mentionItemSchema).toBeDefined();

    // Check type guards
    expect(schemas.isPageId).toBeDefined();
    expect(schemas.isDatabaseId).toBeDefined();
    expect(schemas.isBlockId).toBeDefined();
    expect(schemas.isUserId).toBeDefined();
    expect(schemas.isCommentId).toBeDefined();
    expect(schemas.isWorkspaceId).toBeDefined();
  });

  it("should export working type guards", () => {
    // Test the type guards are callable and work correctly
    expect(schemas.isPageId("page_123")).toBe(true);
    expect(schemas.isPageId("not_a_page")).toBe(false);

    expect(schemas.isDatabaseId("db_123")).toBe(true);
    expect(schemas.isDatabaseId("not_a_db")).toBe(false);

    expect(schemas.isBlockId("block_123")).toBe(true);
    expect(schemas.isBlockId("not_a_block")).toBe(false);

    expect(schemas.isUserId("user_123")).toBe(true);
    expect(schemas.isUserId("not_a_user")).toBe(false);

    expect(schemas.isCommentId("comment_123")).toBe(true);
    expect(schemas.isCommentId("not_a_comment")).toBe(false);

    expect(schemas.isWorkspaceId("workspace_123")).toBe(true);
    expect(schemas.isWorkspaceId("not_a_workspace")).toBe(false);
  });
});
