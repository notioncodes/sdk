import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseRecordBuilder, builder } from "./builder";

/**
 * Let's test the DatabaseRecordBuilder!
 *
 * This suite ensures that our builder for database records works exactly as we
 * expect. We'll check its constructor, how it handles relation properties,
 * and the behavior of its exported instance.
 */
describe("DatabaseRecordBuilder", () => {
  let recordBuilder: DatabaseRecordBuilder;

  beforeEach(() => {
    recordBuilder = new DatabaseRecordBuilder();
  });

  /**
   * Checking the constructor.
   * A good builder starts with a clean slate!
   */
  describe("constructor", () => {
    it("should initialize with empty properties map", () => {
      expect(recordBuilder.properties).toBeInstanceOf(Map);
      expect(recordBuilder.properties.size).toBe(0);
    });
  });

  /**
   * Testing the star of the show: the relation method.
   * This is where we ensure relations are built correctly.
   */
  describe("relation", () => {
    it("should create a relation property with correct structure", () => {
      const propertyName = "Content Links";
      const databaseId = "1234567890";

      recordBuilder.relation(propertyName, databaseId);

      const property = recordBuilder.properties.get(propertyName);

      expect(property).toBeDefined();
      expect(property).toEqual({
        type: "relation",
        has_more: false,
        relation: [
          {
            id: databaseId
          }
        ]
      });
    });

    it("should return builder instance for method chaining", () => {
      const result = recordBuilder.relation("Test", "test-id");

      expect(result).toBe(recordBuilder);
    });

    it("should allow multiple relations to be added", () => {
      recordBuilder.relation("Content Links", "db-1").relation("Categories", "db-2");

      expect(recordBuilder.properties.size).toBe(2);
      expect(recordBuilder.properties.get("Content Links")).toEqual({
        type: "relation",
        has_more: false,
        relation: [
          {
            id: "db-1"
          }
        ]
      });
      expect(recordBuilder.properties.get("Categories")).toEqual({
        type: "relation",
        has_more: false,
        relation: [
          {
            id: "db-2"
          }
        ]
      });
    });

    it("should overwrite existing property with same name", () => {
      recordBuilder.relation("Test", "db-1");
      recordBuilder.relation("Test", "db-2");

      expect(recordBuilder.properties.size).toBe(1);
      expect(recordBuilder.properties.get("Test")).toEqual({
        type: "relation",
        has_more: false,
        relation: [
          {
            id: "db-2"
          }
        ]
      });
    });

    it("should handle empty string parameters", () => {
      recordBuilder.relation("", "");

      const property = recordBuilder.properties.get("");

      expect(property).toEqual({
        type: "relation",
        has_more: false,
        relation: [
          {
            id: ""
          }
        ]
      });
    });
  });

  describe("build", () => {
    it("should return the properties map", () => {
      recordBuilder.relation("Test", "test-id");
      const properties = recordBuilder.build();
      expect(properties).toBe(recordBuilder.properties);
      expect(properties.size).toBe(1);
    });
  });

  describe("exported builder instance", () => {
    it("should export a default builder instance", () => {
      expect(builder).toBeInstanceOf(DatabaseRecordBuilder);
    });

    it("should be separate from new instances", () => {
      const newBuilder = new DatabaseRecordBuilder();

      builder.relation("Test", "test-id");

      expect(builder.properties.size).toBe(1);
      expect(newBuilder.properties.size).toBe(0);
    });
  });
});
