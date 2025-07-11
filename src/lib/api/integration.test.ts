/**
 * Integration test for lazy schema loader with other core components.
 */

import { firstValueFrom } from "rxjs";
import { describe, expect, it } from "vitest";
import { schemaFactories } from "../schemas/factories/factory";
import { LazySchemaLoader, createNotionSchemaLoader, notionSchemaLoader } from "../schemas/lazy-schema-loader";
import { SchemaRegistry } from "./schema-registry";

describe("Lazy Schema Loader Integration", () => {
  it("should integrate with schema registry", async () => {
    const registry = new SchemaRegistry();
    const loader = createNotionSchemaLoader(registry);

    // Load a schema
    await firstValueFrom(loader.load("notion.page"));

    // Verify it was registered
    expect(registry.has("notion.page")).toBe(true);

    // Get the schema from registry
    const schema = registry.get("notion.page");
    expect(schema).toBeDefined();
  });

  it("should work with streaming config validation", async () => {
    // Example of how lazy schemas could work with streaming
    const streamingConfig = {
      pageSize: 100,
      maxConcurrent: 5,
      bufferSize: 1000,
      backpressureThreshold: 0.8
    };

    // In a real scenario, you might validate streaming response data
    const mockListResponse = {
      object: "list",
      type: "page_or_database",
      results: [],
      next_cursor: null,
      has_more: false
    };

    const validated = await notionSchemaLoader.validateResponse("notion.queryDatabase", mockListResponse);

    expect(validated).toEqual(mockListResponse);
  });

  it("should handle concurrent schema loading efficiently", async () => {
    const loader = new LazySchemaLoader();

    // Register test schemas
    let factoryCallCount = 0;
    loader.register({
      name: "test.concurrent",
      factory: () => {
        factoryCallCount++;
        return schemaFactories.responses.page.create();
      }
    });

    // Load the same schema multiple times concurrently
    const promises = Array(5)
      .fill(null)
      .map(() => firstValueFrom(loader.load("test.concurrent")));

    await Promise.all(promises);

    // Factory should only be called once due to caching
    expect(factoryCallCount).toBe(1);
    expect(loader.state.stats.totalRequests).toBe(5);
    expect(loader.state.stats.cacheHits).toBe(4);
  });

  it("should provide useful error messages for validation failures", async () => {
    const invalidPageData = {
      object: "page",
      id: 123, // Should be string
      created_time: "not-a-date"
      // Missing required fields
    };

    try {
      await notionSchemaLoader.validateResponse("notion.page", invalidPageData);
      expect.fail("Should have thrown validation error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain("Validation failed");
      expect(error.message).toContain("notion.page");
    }
  });
});
