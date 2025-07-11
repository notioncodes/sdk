/**
 * @module schemas/pages.test
 *
 * Comprehensive test suite for page schemas.
 * Tests page properties and variations.
 */

import { describe, expect, it } from "vitest";
import type { DatabaseId, PageId } from "./core";
import {
  fullPageSchema,
  getPageTitle,
  isFullPage,
  // Type utilities
  isPage,
  // Page property schemas
  pagePropertiesSchema,
  // Page schemas
  pageSchema
} from "./pages";

describe("Page Schemas", () => {
  const basePageProperties = {
    id: "page_123" as PageId,
    object: "page" as const,
    created_time: "2023-01-01T00:00:00.000Z",
    created_by: { object: "user" as const, id: "user_123" },
    last_edited_time: "2023-01-01T00:00:00.000Z",
    last_edited_by: { object: "user" as const, id: "user_123" },
    archived: false,
    url: "https://notion.so/page_123"
  };

  describe("Page Properties Schema", () => {
    it("should validate page properties with title", () => {
      const properties = {
        title: {
          id: "title",
          type: "title",
          title: [
            {
              type: "text",
              text: { content: "My Page Title" },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "My Page Title",
              href: null
            }
          ]
        }
      };

      const result = pagePropertiesSchema(properties);
      expect(result).toEqual(properties);
    });

    it("should validate empty page properties", () => {
      const properties = {};
      const result = pagePropertiesSchema(properties);
      expect(result).toEqual(properties);
    });

    it("should validate page properties with multiple property types", () => {
      const properties = {
        Name: {
          id: "title",
          type: "title",
          title: []
        },
        Tags: {
          id: "tags",
          type: "multi_select",
          multi_select: []
        },
        Status: {
          id: "status",
          type: "select",
          select: null
        }
      };

      const result = pagePropertiesSchema(properties);
      expect(result).toEqual(properties);
    });
  });

  describe("Page Schema", () => {
    it("should validate a minimal page", () => {
      const page = {
        ...basePageProperties,
        parent: {
          type: "workspace",
          workspace: true
        },
        properties: {}
      };

      const result = pageSchema(page);
      expect(result).toEqual(page);
    });

    it("should validate a page with database parent", () => {
      const page = {
        ...basePageProperties,
        parent: {
          type: "database_id",
          database_id: "db_456" as DatabaseId
        },
        properties: {
          Name: {
            id: "title",
            type: "title",
            title: [
              {
                type: "text",
                text: { content: "Database Item" },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default"
                },
                plain_text: "Database Item",
                href: null
              }
            ]
          }
        }
      };

      const result = pageSchema(page);
      expect(result).toEqual(page);
    });

    it("should validate a page with icon and cover", () => {
      const page = {
        ...basePageProperties,
        parent: {
          type: "page_id",
          page_id: "page_parent_123" as PageId
        },
        properties: {},
        icon: {
          type: "emoji",
          emoji: "📄"
        },
        cover: {
          type: "external",
          external: { url: "https://example.com/cover.jpg" }
        }
      };

      const result = pageSchema(page);
      expect(result).toEqual(page);
    });
  });

  describe("Full Page Schema", () => {
    it("should validate a full page with content", () => {
      const fullPage = {
        ...basePageProperties,
        parent: {
          type: "workspace",
          workspace: true
        },
        properties: {
          title: {
            id: "title",
            type: "title",
            title: [
              {
                type: "text",
                text: { content: "Full Page" },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default"
                },
                plain_text: "Full Page",
                href: null
              }
            ]
          }
        },
        content: [
          {
            object: "block",
            id: "block_123",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: { content: "Page content" },
                  annotations: {
                    bold: false,
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    code: false,
                    color: "default"
                  },
                  plain_text: "Page content",
                  href: null
                }
              ],
              color: "default"
            }
          }
        ]
      };

      const result = fullPageSchema(fullPage);
      expect(result).toEqual(fullPage);
    });

    it("should validate a full page with empty content", () => {
      const fullPage = {
        ...basePageProperties,
        parent: {
          type: "workspace",
          workspace: true
        },
        properties: {},
        content: []
      };

      const result = fullPageSchema(fullPage);
      expect(result).toEqual(fullPage);
    });
  });

  describe("Type Utilities", () => {
    it("should correctly identify pages", () => {
      expect(isPage({ object: "page", id: "page_123" })).toBe(true);
      expect(isPage({ object: "database", id: "db_123" })).toBe(false);
      expect(isPage(null)).toBe(false);
      expect(isPage(undefined)).toBe(false);
    });

    it("should correctly identify full pages", () => {
      expect(isFullPage({ object: "page", content: [] })).toBe(true);
      expect(isFullPage({ object: "page" })).toBe(false);
      expect(isFullPage({ object: "database", content: [] })).toBe(false);
    });

    it("should extract page title", () => {
      const pageWithTitle = {
        properties: {
          title: {
            title: [
              {
                plain_text: "My Page Title"
              }
            ]
          }
        }
      };

      expect(getPageTitle(pageWithTitle as any)).toBe("My Page Title");
    });

    it("should return empty string for page without title", () => {
      const pageWithoutTitle = {
        properties: {}
      };

      expect(getPageTitle(pageWithoutTitle as any)).toBe("");
    });

    it("should handle page with empty title array", () => {
      const pageWithEmptyTitle = {
        properties: {
          title: {
            title: []
          }
        }
      };

      expect(getPageTitle(pageWithEmptyTitle as any)).toBe("");
    });
  });
});
