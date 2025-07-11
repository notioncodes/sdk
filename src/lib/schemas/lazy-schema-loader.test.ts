/**
 * Tests for lazy schema loader implementation.
 */

import { ArkErrors } from "arktype";
import { firstValueFrom } from "rxjs";
import { beforeEach, describe, expect, it } from "vitest";
import { schemaFactories } from "./factories/factory";
import { createNotionSchemaLoader, LazySchemaLoader } from "./lazy-schema-loader";

describe("LazySchemaLoader", () => {
  let loader: LazySchemaLoader;

  beforeEach(() => {
    loader = new LazySchemaLoader();
  });

  describe("registerLazySchema", () => {
    it("should register a schema configuration", () => {
      const config = {
        name: "test.schema",
        factory: () => schemaFactories.reponses.page()
      };

      loader.register(config);
      expect(loader.state.loading.size).toBe(0);
    });

    it("should preload schema when preload is true", async () => {
      const config = {
        name: "test.preload",
        factory: () => schemaFactories.reponses.page(),
        preload: true
      };

      loader.register(config);

      // Wait for preload to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(loader.state.stats.totalLoaded).toBe(1);
    });
  });

  describe("loadSchema", () => {
    it("should lazily load a registered schema", async () => {
      const config = {
        name: "test.lazy",
        factory: () => schemaFactories.reponses.page()
      };

      loader.register(config);

      const schema = await firstValueFrom(loader.load("test.lazy"));

      expect(schema).toBeDefined();
      expect(loader.state.stats.totalLoaded).toBe(1);
      expect(loader.state.stats.totalRequests).toBe(1);
      expect(loader.state.stats.cacheMisses).toBe(1);
    });

    it("should return cached schema on subsequent loads", async () => {
      const config = {
        name: "test.cache",
        factory: () => schemaFactories.reponses.page()
      };

      loader.register(config);

      // First load
      await firstValueFrom(loader.load("test.cache"));

      // Second load (should hit cache)
      await firstValueFrom(loader.load("test.cache"));

      expect(loader.state.stats.totalLoaded).toBe(1);
      expect(loader.state.stats.totalRequests).toBe(2);
      expect(loader.state.stats.cacheHits).toBe(1);
      expect(loader.state.stats.cacheMisses).toBe(1);
    });

    it("should handle unregistered schema gracefully", async () => {
      const schema = await firstValueFrom(loader.load("unregistered"));
      expect(schema).toBeDefined();
      expect(loader.state.errors.has("unregistered")).toBe(true);
    });
  });

  describe("validateResponse", () => {
    it("should validate a valid page response", async () => {
      const config = {
        name: "notion.page",
        factory: () => schemaFactories.reponses.page()
      };

      loader.register(config);

      const validPage = {
        object: "page",
        id: "page_123",
        created_time: "2024-01-01T00:00:00.000Z",
        last_edited_time: "2024-01-01T00:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://notion.so/page_123",
        parent: {
          type: "database_id",
          database_id: "db_123"
        },
        properties: {},
        created_by: {
          id: "user_123",
          object: "user"
        },
        last_edited_by: {
          id: "user_123",
          object: "user"
        }
      };

      const result = await loader.validateResponse("notion.page", validPage);
      expect(result).toEqual(validPage);
    });

    it("should reject invalid page response", async () => {
      const config = {
        name: "notion.page",
        factory: () => schemaFactories.reponses.page()
      };

      loader.register(config);

      const invalidPage = {
        object: "invalid",
        id: 123 // Should be string
      };

      await expect(loader.validateResponse("notion.page", invalidPage)).rejects.toThrow();
    });
  });

  describe("clearCache", () => {
    it("should clear specific schema from cache", async () => {
      const config = {
        name: "test.clear",
        factory: () => schemaFactories.reponses.page()
      };

      loader.register(config);
      await firstValueFrom(loader.load("test.clear"));

      const statsBefore = loader.stats();
      expect(statsBefore.totalCached).toBe(1);

      loader.clear("test.clear");

      const statsAfter = loader.stats();
      expect(statsAfter.totalCached).toBe(0);
    });

    it("should clear all schemas from cache", async () => {
      loader.register({
        name: "test.clear1",
        factory: () => schemaFactories.reponses.page()
      });
      loader.register({
        name: "test.clear2",
        factory: () => schemaFactories.reponses.database()
      });

      await firstValueFrom(loader.load("test.clear1"));
      await firstValueFrom(loader.load("test.clear2"));

      const statsBefore = loader.stats();
      expect(statsBefore.totalCached).toBe(2);

      loader.clear();

      const statsAfter = loader.stats();
      expect(statsAfter.totalCached).toBe(0);
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      const config = {
        name: "test.stats",
        factory: () => schemaFactories.reponses.page()
      };

      loader.register(config);
      await firstValueFrom(loader.load("test.stats"));

      const stats = loader.stats();

      expect(stats.totalCached).toBe(1);
      expect(stats.schemas).toHaveLength(1);
      expect(stats.schemas[0].name).toBe("test.stats");
      expect(stats.schemas[0].accessCount).toBe(1);
      expect(stats.schemas[0].loadedAt).toBeInstanceOf(Date);
      expect(stats.schemas[0].lastAccessed).toBeInstanceOf(Date);
    });
  });
});

describe("schemaFactories", () => {
  describe("page", () => {
    it("should create a valid page schema", () => {
      const schema = schemaFactories.reponses.page();
      expect(schema).toBeDefined();

      const validPage = {
        object: "page",
        id: "page_123",
        created_time: "2024-01-01T00:00:00.000Z",
        last_edited_time: "2024-01-01T00:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://notion.so/page_123",
        parent: {
          type: "workspace",
          workspace: true
        },
        properties: {},
        created_by: {
          id: "user_123",
          object: "user"
        },
        last_edited_by: {
          id: "user_123",
          object: "user"
        }
      };

      const result = schema(validPage);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });

    it("should validate page with optional icon", () => {
      const schema = schemaFactories.reponses.page();

      const pageWithIcon = {
        object: "page",
        id: "page_123",
        created_time: "2024-01-01T00:00:00.000Z",
        last_edited_time: "2024-01-01T00:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://notion.so/page_123",
        icon: {
          type: "emoji",
          emoji: "📄"
        },
        parent: {
          type: "page_id",
          page_id: "parent_123"
        },
        properties: {},
        created_by: {
          id: "user_123",
          object: "user"
        },
        last_edited_by: {
          id: "user_123",
          object: "user"
        }
      };

      const result = schema(pageWithIcon);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });
  });

  describe("databaseObjectResponse", () => {
    it("should create a valid database schema", () => {
      const schema = schemaFactories.reponses.database();

      const validDatabase = {
        object: "database",
        id: "db_123",
        created_time: "2024-01-01T00:00:00.000Z",
        last_edited_time: "2024-01-01T00:00:00.000Z",
        archived: false,
        in_trash: false,
        url: "https://notion.so/db_123",
        title: [],
        description: [],
        properties: {},
        parent: {
          type: "page_id",
          page_id: "page_123"
        },
        created_by: {
          id: "user_123",
          object: "user"
        },
        last_edited_by: {
          id: "user_123",
          object: "user"
        },
        is_inline: false
      };

      const result = schema(validDatabase);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });
  });

  describe("blockObjectResponse", () => {
    it("should create a valid block schema", () => {
      const schema = schemaFactories.reponses.block();

      const validBlock = {
        object: "block",
        id: "block_123",
        created_time: "2024-01-01T00:00:00.000Z",
        last_edited_time: "2024-01-01T00:00:00.000Z",
        created_by: {
          id: "user_123",
          object: "user"
        },
        last_edited_by: {
          id: "user_123",
          object: "user"
        },
        has_children: false,
        archived: false,
        in_trash: false,
        type: "paragraph",
        parent: {
          type: "page_id",
          page_id: "page_123"
        }
      };

      const result = schema(validBlock);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });
  });

  describe("userObjectResponse", () => {
    it("should validate person user", () => {
      const schema = schemaFactories.reponses.user();

      const personUser = {
        object: "user",
        id: "user_123",
        type: "person",
        name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
        person: {
          email: "john@example.com"
        }
      };

      const result = schema(personUser);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });

    it("should validate bot user", () => {
      const schema = schemaFactories.reponses.user();

      const botUser = {
        object: "user",
        id: "bot_123",
        type: "bot",
        name: "Test Bot",
        bot: {
          owner: {
            type: "workspace",
            workspace: true
          }
        }
      };

      const result = schema(botUser);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });
  });

  describe("list response schemas", () => {
    it("should validate query database response", () => {
      const schema = schemaFactories.queryDatabaseResponse();

      const response = {
        object: "list",
        type: "page_or_database",
        results: [],
        next_cursor: null,
        has_more: false
      };

      const result = schema(response);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });

    it("should validate list databases response", () => {
      const schema = schemaFactories.listDatabasesResponse();

      const response = {
        object: "list",
        type: "database",
        results: [],
        next_cursor: null,
        has_more: false
      };

      const result = schema(response);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });

    it("should validate list users response", () => {
      const schema = schemaFactories.listUsersResponse();

      const response = {
        object: "list",
        type: "user",
        results: [],
        next_cursor: null,
        has_more: false
      };

      const result = schema(response);
      expect(result).not.toBeInstanceOf(ArkErrors);
    });
  });
});

describe("createNotionSchemaLoader", () => {
  it("should create a loader with all Notion schemas registered", async () => {
    const loader = createNotionSchemaLoader();

    // Test loading all registered schemas
    const schemas = await Promise.all([
      firstValueFrom(loader.load("notion.page")),
      firstValueFrom(loader.load("notion.database")),
      firstValueFrom(loader.load("notion.block")),
      firstValueFrom(loader.load("notion.user")),
      firstValueFrom(loader.load("notion.queryDatabase")),
      firstValueFrom(loader.load("notion.listDatabases")),
      firstValueFrom(loader.load("notion.listBlockChildren")),
      firstValueFrom(loader.load("notion.search")),
      firstValueFrom(loader.load("notion.listUsers"))
    ]);

    schemas.forEach((schema) => {
      expect(schema).toBeDefined();
    });

    expect(loader.state.stats.totalLoaded).toBe(9);
  });

  it("should reuse base schemas correctly", async () => {
    const loader = createNotionSchemaLoader();

    // Load page schema
    const pageSchema = await firstValueFrom(loader.load("notion.page"));

    // Load list databases response schema
    const listDbSchema = await firstValueFrom(loader.load("notion.listDatabases"));

    // Both should be valid ArkType schemas
    expect(pageSchema).toBeDefined();
    expect(listDbSchema).toBeDefined();

    // Test that they can validate appropriate data
    const validPage = {
      object: "page",
      id: "page_123",
      created_time: "2024-01-01T00:00:00.000Z",
      created_by: { object: "user", id: "user_123" },
      last_edited_time: "2024-01-01T00:00:00.000Z",
      last_edited_by: { object: "user", id: "user_123" },
      archived: false,
      url: "https://notion.so/page_123",
      parent: { type: "workspace", workspace: true },
      properties: {}
    };

    const validListResponse = {
      object: "list",
      type: "database",
      results: [],
      next_cursor: null,
      has_more: false
    };

    const pageResult = pageSchema(validPage);
    const listResult = listDbSchema(validListResponse);

    expect(pageResult).not.toBeInstanceOf(ArkErrors);
    expect(listResult).not.toBeInstanceOf(ArkErrors);
  });
});
