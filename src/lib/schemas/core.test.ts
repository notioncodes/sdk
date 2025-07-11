/**
 * @module schemas/core.test
 *
 * Comprehensive test suite for core schemas and branded types.
 * Ensures runtime validation and type safety work as expected.
 */

import { inspect } from "util";
import { describe, expect, it } from "vitest";
import {
  annotationsSchema,
  apiColorSchema,
  coverSchema,
  databaseMentionSchema,
  dateMentionSchema,
  externalFileSchema,
  fileSchema,
  iconSchema,
  internalFileSchema,
  isBlockId,
  isCommentId,
  isDatabaseId,
  isoDateSchema,
  // Type guards
  isPageId,
  isUserId,
  isWorkspaceId,
  mentionItemSchema,
  pageMentionSchema,
  parentSchema,
  richTextItemSchema,
  richTextSchema,
  textContentSchema,
  userMentionSchema,
  // Schemas
  uuidSchema,
  type Annotations,
  // Types
  type ApiColor,
  type BlockId,
  type CommentId,
  type Cover,
  type DatabaseId,
  type File,
  type Icon,
  type MentionItem,
  // Branded types
  type PageId,
  type Parent,
  type RichText,
  type RichTextItem,
  type UserId,
  type WorkspaceId
} from "./core";

describe("Core Schemas", () => {
  describe("UUID Schema", () => {
    it("should validate correct UUID format", () => {
      const validUuid = "550e8400-e29b-41d4-a716-446655440000";
      const result = uuidSchema(validUuid);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toBe(validUuid);
    });

    it("should reject invalid UUID format", () => {
      const invalidUuid = "not-a-uuid";
      const result = uuidSchema(invalidUuid);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toHaveProperty(" arkKind", "errors");
    });

    it("should reject UUID with wrong segment lengths", () => {
      const invalidUuid = "550e8400-e29b-41d4-a716-44665544000"; // Missing digit
      const result = uuidSchema(invalidUuid);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toHaveProperty(" arkKind", "errors");
    });
  });

  describe("ISO Date Schema", () => {
    it("should validate correct ISO date format", () => {
      const validDate = "2024-01-15T10:30:00Z";
      const result = isoDateSchema(validDate);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toBe(validDate);
    });

    it("should validate ISO date with milliseconds", () => {
      const validDate = "2024-01-15T10:30:00.123Z";
      const result = isoDateSchema(validDate);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toBe(validDate);
    });

    it("should validate ISO date without Z suffix", () => {
      const validDate = "2024-01-15T10:30:00";
      const result = isoDateSchema(validDate);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toBe(validDate);
    });

    it("should reject invalid date format", () => {
      const invalidDate = "2024/01/15";
      const result = isoDateSchema(invalidDate);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toHaveProperty(" arkKind", "errors");
    });
  });

  describe("API Color Schema", () => {
    it("should validate all standard colors", () => {
      const standardColors: ApiColor[] = [
        "default",
        "gray",
        "brown",
        "orange",
        "yellow",
        "green",
        "blue",
        "purple",
        "pink",
        "red"
      ];

      standardColors.forEach((color) => {
        const result = apiColorSchema(color);
        console.log(inspect({ color, result }, { colors: true, compact: false }));
        expect(result).toBe(color);
      });
    });

    it("should validate all background colors", () => {
      const backgroundColors: ApiColor[] = [
        "gray_background",
        "brown_background",
        "orange_background",
        "yellow_background",
        "green_background",
        "blue_background",
        "purple_background",
        "pink_background",
        "red_background"
      ];

      backgroundColors.forEach((color) => {
        const result = apiColorSchema(color);
        console.log(inspect({ color, result }, { colors: true, compact: false }));
        expect(result).toBe(color);
      });
    });

    it("should reject invalid colors", () => {
      const invalidColor = "invalid_color";
      const result = apiColorSchema(invalidColor);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toHaveProperty(" arkKind", "errors");
    });
  });

  describe("File Schemas", () => {
    it("should validate external file", () => {
      const externalFile = { url: "https://example.com/file.pdf" };
      const result = externalFileSchema(externalFile);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(externalFile);
    });

    it("should validate internal file", () => {
      const internalFile = {
        url: "https://s3.amazonaws.com/secure/file.pdf",
        expiry_time: "2024-01-15T10:30:00Z"
      };
      const result = internalFileSchema(internalFile);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(internalFile);
    });

    it("should validate file with external type", () => {
      const file: File = {
        type: "external",
        external: { url: "https://example.com/file.pdf" }
      };
      const result = fileSchema(file);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(file);
    });

    it("should validate file with internal type", () => {
      const file: File = {
        type: "file",
        file: {
          url: "https://s3.amazonaws.com/secure/file.pdf",
          expiry_time: "2024-01-15T10:30:00Z"
        }
      };
      const result = fileSchema(file);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(file);
    });
  });

  describe("Icon Schema", () => {
    it("should validate emoji icon", () => {
      const icon: Icon = {
        type: "emoji",
        emoji: "📚"
      };
      const result = iconSchema(icon);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(icon);
    });

    it("should validate external icon", () => {
      const icon: Icon = {
        type: "external",
        external: { url: "https://example.com/icon.png" }
      };
      const result = iconSchema(icon);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(icon);
    });

    it("should validate file icon", () => {
      const icon: Icon = {
        type: "file",
        file: {
          url: "https://s3.amazonaws.com/secure/icon.png",
          expiry_time: "2024-01-15T10:30:00Z"
        }
      };
      const result = iconSchema(icon);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(icon);
    });
  });

  describe("Cover Schema", () => {
    it("should validate external cover", () => {
      const cover: Cover = {
        type: "external",
        external: { url: "https://example.com/cover.jpg" }
      };
      const result = coverSchema(cover);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(cover);
    });

    it("should validate file cover", () => {
      const cover: Cover = {
        type: "file",
        file: {
          url: "https://s3.amazonaws.com/secure/cover.jpg",
          expiry_time: "2024-01-15T10:30:00Z"
        }
      };
      const result = coverSchema(cover);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(cover);
    });
  });

  describe("Parent Schema", () => {
    it("should validate database parent", () => {
      const parent: Parent = {
        type: "database_id",
        database_id: "db_123456"
      };
      const result = parentSchema(parent);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(parent);
    });

    it("should validate page parent", () => {
      const parent: Parent = {
        type: "page_id",
        page_id: "page_123456"
      };
      const result = parentSchema(parent);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(parent);
    });

    it("should validate workspace parent", () => {
      const parent: Parent = {
        type: "workspace",
        workspace: true
      };
      const result = parentSchema(parent);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(parent);
    });

    it("should validate block parent", () => {
      const parent: Parent = {
        type: "block_id",
        block_id: "block_123456"
      };
      const result = parentSchema(parent);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(parent);
    });
  });

  describe("Rich Text Schemas", () => {
    it("should validate annotations", () => {
      const annotations: Annotations = {
        bold: true,
        italic: false,
        strikethrough: false,
        underline: true,
        code: false,
        color: "blue"
      };
      const result = annotationsSchema(annotations);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(annotations);
    });

    it("should validate text content with link", () => {
      const textContent = {
        content: "Click here",
        link: { url: "https://example.com" }
      };
      const result = textContentSchema(textContent);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(textContent);
    });

    it("should validate text content without link", () => {
      const textContent = {
        content: "Plain text"
      };
      const result = textContentSchema(textContent);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(textContent);
    });

    it("should validate rich text item", () => {
      const richTextItem: RichTextItem = {
        type: "text",
        text: {
          content: "Hello world",
          link: { url: "https://example.com" }
        },
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default"
        },
        plain_text: "Hello world",
        href: "https://example.com"
      };
      const result = richTextItemSchema(richTextItem);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(richTextItem);
    });

    it("should validate rich text array", () => {
      const richText: RichText = [
        {
          type: "text",
          text: { content: "First item" },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default"
          },
          plain_text: "First item"
        },
        {
          type: "text",
          text: { content: "Second item" },
          annotations: {
            bold: true,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: "red"
          },
          plain_text: "Second item"
        }
      ];
      const result = richTextSchema(richText);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(richText);
    });

    it("should validate empty rich text array", () => {
      const richText: RichText = [];
      const result = richTextSchema(richText);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(richText);
    });
  });

  describe("Mention Schemas", () => {
    it("should validate user mention", () => {
      const mention: MentionItem = {
        type: "user",
        user: {
          object: "user",
          id: "user_123456"
        }
      };
      const result = userMentionSchema(mention);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(mention);
    });

    it("should validate page mention", () => {
      const mention: MentionItem = {
        type: "page",
        page: { id: "page_123456" }
      };
      const result = pageMentionSchema(mention);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(mention);
    });

    it("should validate database mention", () => {
      const mention: MentionItem = {
        type: "database",
        database: { id: "db_123456" }
      };
      const result = databaseMentionSchema(mention);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(mention);
    });

    it("should validate date mention with end date", () => {
      const mention: MentionItem = {
        type: "date",
        date: {
          start: "2024-01-15T10:00:00Z",
          end: "2024-01-16T10:00:00Z",
          time_zone: "America/New_York"
        }
      };
      const result = dateMentionSchema(mention);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(mention);
    });

    it("should validate date mention without end date", () => {
      const mention: MentionItem = {
        type: "date",
        date: {
          start: "2024-01-15T10:00:00Z"
        }
      };
      const result = dateMentionSchema(mention);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(mention);
    });

    it("should validate mention item union", () => {
      const userMention: MentionItem = {
        type: "user",
        user: {
          object: "user",
          id: "user_123456"
        }
      };
      const result = mentionItemSchema(userMention);
      console.log(inspect(result, { colors: true, compact: false }));
      expect(result).toEqual(userMention);
    });
  });

  describe("Type Guards", () => {
    describe("isPageId", () => {
      it("should return true for valid page ID", () => {
        const pageId = "page_abc123" as PageId;
        expect(isPageId(pageId)).toBe(true);
      });

      it("should return false for non-page ID", () => {
        expect(isPageId("db_abc123")).toBe(false);
        expect(isPageId("abc123")).toBe(false);
        expect(isPageId(123)).toBe(false);
        expect(isPageId(null)).toBe(false);
        expect(isPageId(undefined)).toBe(false);
      });
    });

    describe("isDatabaseId", () => {
      it("should return true for valid database ID", () => {
        const dbId = "db_abc123" as DatabaseId;
        expect(isDatabaseId(dbId)).toBe(true);
      });

      it("should return false for non-database ID", () => {
        expect(isDatabaseId("page_abc123")).toBe(false);
        expect(isDatabaseId("abc123")).toBe(false);
        expect(isDatabaseId(123)).toBe(false);
        expect(isDatabaseId(null)).toBe(false);
      });
    });

    describe("isBlockId", () => {
      it("should return true for valid block ID", () => {
        const blockId = "block_abc123" as BlockId;
        expect(isBlockId(blockId)).toBe(true);
      });

      it("should return false for non-block ID", () => {
        expect(isBlockId("page_abc123")).toBe(false);
        expect(isBlockId("abc123")).toBe(false);
        expect(isBlockId(123)).toBe(false);
        expect(isBlockId(null)).toBe(false);
      });
    });

    describe("isUserId", () => {
      it("should return true for valid user ID", () => {
        const userId = "user_abc123" as UserId;
        expect(isUserId(userId)).toBe(true);
      });

      it("should return false for non-user ID", () => {
        expect(isUserId("page_abc123")).toBe(false);
        expect(isUserId("abc123")).toBe(false);
        expect(isUserId(123)).toBe(false);
        expect(isUserId(null)).toBe(false);
      });
    });

    describe("isCommentId", () => {
      it("should return true for valid comment ID", () => {
        const commentId = "comment_abc123" as CommentId;
        expect(isCommentId(commentId)).toBe(true);
      });

      it("should return false for non-comment ID", () => {
        expect(isCommentId("page_abc123")).toBe(false);
        expect(isCommentId("abc123")).toBe(false);
        expect(isCommentId(123)).toBe(false);
        expect(isCommentId(null)).toBe(false);
      });
    });

    describe("isWorkspaceId", () => {
      it("should return true for valid workspace ID", () => {
        const workspaceId = "workspace_abc123" as WorkspaceId;
        expect(isWorkspaceId(workspaceId)).toBe(true);
      });

      it("should return false for non-workspace ID", () => {
        expect(isWorkspaceId("page_abc123")).toBe(false);
        expect(isWorkspaceId("abc123")).toBe(false);
        expect(isWorkspaceId(123)).toBe(false);
        expect(isWorkspaceId(null)).toBe(false);
      });
    });
  });
});
