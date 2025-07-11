import { describe, expect, it } from "vitest";
import {
  createPropertyMapping,
  namingRegistry,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  toScreamingSnakeCase,
  toSnakeCase
} from "./naming";

describe("Naming Strategy Utilities", () => {
  describe("String Transformations", () => {
    it("should convert to camelCase", () => {
      expect(toCamelCase("created_time")).toBe("createdTime");
      expect(toCamelCase("last_edited_by")).toBe("lastEditedBy");
      expect(toCamelCase("has_children")).toBe("hasChildren");
    });

    it("should convert to snake_case", () => {
      expect(toSnakeCase("createdTime")).toBe("created_time");
      expect(toSnakeCase("lastEditedBy")).toBe("last_edited_by");
      expect(toSnakeCase("hasChildren")).toBe("has_children");
    });

    it("should convert to kebab-case", () => {
      expect(toKebabCase("createdTime")).toBe("created-time");
      expect(toKebabCase("lastEditedBy")).toBe("last-edited-by");
      expect(toKebabCase("hasChildren")).toBe("has-children");
    });

    it("should convert to PascalCase", () => {
      expect(toPascalCase("created_time")).toBe("CreatedTime");
      expect(toPascalCase("last_edited_by")).toBe("LastEditedBy");
      expect(toPascalCase("has_children")).toBe("HasChildren");
    });

    it("should convert to SCREAMING_SNAKE_CASE", () => {
      expect(toScreamingSnakeCase("createdTime")).toBe("CREATED_TIME");
      expect(toScreamingSnakeCase("lastEditedBy")).toBe("LAST_EDITED_BY");
      expect(toScreamingSnakeCase("hasChildren")).toBe("HAS_CHILDREN");
    });
  });

  describe("Property Mapping", () => {
    it("should create bidirectional camelCase mapping", () => {
      const mapping = createPropertyMapping("camelCase");

      expect(mapping.toTarget("created_time")).toBe("createdTime");
      expect(mapping.toNotion("createdTime")).toBe("created_time");

      const mappings = mapping.getMappings();
      expect(mappings.created_time).toBe("createdTime");
      expect(mappings.last_edited_by).toBe("lastEditedBy");
    });

    it("should create bidirectional kebab-case mapping", () => {
      const mapping = createPropertyMapping("kebab-case");

      expect(mapping.toTarget("created_time")).toBe("created-time");
      expect(mapping.toNotion("created-time")).toBe("created_time");
    });
  });

  describe("Naming Registry", () => {
    it("should register and retrieve naming strategies", () => {
      const mapping = createPropertyMapping("camelCase");
      namingRegistry.register("camelCase", mapping);

      const retrieved = namingRegistry.getMapping("camelCase");
      expect(retrieved).toBe(mapping);
    });

    it("should handle custom mappings", () => {
      namingRegistry.registerCustomMappings("test", {
        special_field: "customField"
      });

      const customMappings = namingRegistry.getCustomMappings("test");
      expect(customMappings?.special_field).toBe("customField");
    });
  });
});
