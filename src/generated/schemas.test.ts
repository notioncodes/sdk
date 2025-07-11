import { describe, expect, it } from "vitest";
import {
  BasicPageResponseSchema,
  BasicUserResponseSchema,
  BooleanRequestSchema,
  EmptyObjectSchema,
  IdRequestSchema,
  NumberRequestSchema,
  SelectColorSchema,
  StringRequestSchema,
  TextRequestSchema,
  type BasicPageResponse,
  type BasicUserResponse,
  type BooleanRequest,
  type EmptyObject,
  type IdRequest,
  type NumberRequest,
  type SelectColor,
  type StringRequest
} from "./schemas.js";

describe("Generated ArkType Schemas", () => {
  describe("Basic Type Schemas", () => {
    it("should validate string types", () => {
      expect(IdRequestSchema("test-id")).toBe("test-id");
      expect(StringRequestSchema("hello")).toBe("hello");
      expect(TextRequestSchema("some text")).toBe("some text");
    });

    it("should validate number types", () => {
      expect(NumberRequestSchema(42)).toBe(42);
      expect(NumberRequestSchema(3.14)).toBe(3.14);
    });

    it("should validate boolean types", () => {
      expect(BooleanRequestSchema(true)).toBe(true);
      expect(BooleanRequestSchema(false)).toBe(false);
    });

    it("should validate empty object", () => {
      const result = EmptyObjectSchema({});
      expect(result).toEqual({});
    });
  });

  describe("SelectColor Schema", () => {
    it("should validate all color options", () => {
      const colors: SelectColor[] = [
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

      colors.forEach((color) => {
        expect(SelectColorSchema(color)).toBe(color);
      });
    });
  });

  describe("Object Schemas", () => {
    it("should validate BasicUserResponse", () => {
      const validUser: BasicUserResponse = {
        id: "user_123",
        name: "John Doe"
      };

      const result = BasicUserResponseSchema(validUser);
      expect(result).toEqual(validUser);
    });

    it("should validate BasicPageResponse", () => {
      const validPage: BasicPageResponse = {
        id: "page_456",
        title: "My Page"
      };

      const result = BasicPageResponseSchema(validPage);
      expect(result).toEqual(validPage);
    });
  });

  describe("Type Inference", () => {
    it("should infer correct types", () => {
      // These are compile-time checks that the types are correctly inferred
      const id: IdRequest = "test-id";
      const str: StringRequest = "hello";
      const num: NumberRequest = 42;
      const bool: BooleanRequest = true;
      const empty: EmptyObject = {};
      const color: SelectColor = "blue";
      const user: BasicUserResponse = { id: "user_123", name: "John" };
      const page: BasicPageResponse = { id: "page_456", title: "My Page" };

      // Runtime validation
      expect(IdRequestSchema(id)).toBe(id);
      expect(StringRequestSchema(str)).toBe(str);
      expect(NumberRequestSchema(num)).toBe(num);
      expect(BooleanRequestSchema(bool)).toBe(bool);
      expect(EmptyObjectSchema(empty)).toEqual(empty);
      expect(SelectColorSchema(color)).toBe(color);
      expect(BasicUserResponseSchema(user)).toEqual(user);
      expect(BasicPageResponseSchema(page)).toEqual(page);
    });
  });

  describe("Schema Properties", () => {
    it("should have correct schema types", () => {
      // Test that schemas are functions (ArkType instances)
      expect(typeof IdRequestSchema).toBe("function");
      expect(typeof StringRequestSchema).toBe("function");
      expect(typeof NumberRequestSchema).toBe("function");
      expect(typeof BooleanRequestSchema).toBe("function");
      expect(typeof EmptyObjectSchema).toBe("function");
      expect(typeof SelectColorSchema).toBe("function");
      expect(typeof BasicUserResponseSchema).toBe("function");
      expect(typeof BasicPageResponseSchema).toBe("function");
    });
  });
});
