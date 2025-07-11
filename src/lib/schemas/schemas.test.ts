import { describe, expect, it } from "vitest";
import * as schemas from "./schemas";

describe("schemas-exported", () => {
  it("should export core schemas", () => {
    expect(schemas.uuidSchema).toBeDefined();
    expect(schemas.isoDateSchema).toBeDefined();
    expect(schemas.colorSchema).toBeDefined();
    expect(schemas.fileSchema).toBeDefined();
    expect(schemas.iconSchema).toBeDefined();
    expect(schemas.coverSchema).toBeDefined();
    expect(schemas.parentSchema).toBeDefined();
    expect(schemas.richTextSchema).toBeDefined();
    expect(schemas.mentionItemSchema).toBeDefined();
  });

  it("should validate UUID format", () => {
    const validUuid = "123e4567-e89b-12d3-a456-426614174000";
    const invalidUuid = "not-a-uuid";

    const result1 = schemas.uuidSchema(validUuid);
    const result2 = schemas.uuidSchema(invalidUuid);

    expect(result1).toBe(validUuid);
    expect(result2).toHaveProperty(" arkKind", "errors");
  });

  it("should validate ISO date format", () => {
    const validDate = "2024-01-01T12:00:00.000Z";
    const invalidDate = "not-a-date";

    const result1 = schemas.isoDateSchema(validDate);
    const result2 = schemas.isoDateSchema(invalidDate);

    expect(result1).toBe(validDate);
    expect(result2).toHaveProperty(" arkKind", "errors");
  });

  it("should validate color values", () => {
    const validColor = "blue";
    const invalidColor = "not-a-color";

    const result1 = schemas.colorSchema(validColor);
    const result2 = schemas.colorSchema(invalidColor);

    expect(result1).toBe(validColor);
    expect(result2).toHaveProperty(" arkKind", "errors");
  });
});
