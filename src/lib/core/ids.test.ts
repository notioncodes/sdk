import { describe, expect, it } from "vitest";
import { BlockId, DatabaseId, PageId, toBlockId, toDatabaseId, toPageId } from "./ids";

describe("ID Branded Types", () => {
  const testId = "12345678-1234-5678-1234-567812345678";

  it("should correctly cast a string to a PageId", () => {
    const pageId = toPageId(testId);
    expect(typeof pageId).toBe("string");
    expect(pageId).toBe(testId);
    // This test primarily serves to ensure the function executes and returns the expected value.
    // The type-checking is a compile-time feature.
    const id: PageId = pageId;
    expect(id).toBeTruthy();
  });

  it("should correctly cast a string to a DatabaseId", () => {
    const dbId = toDatabaseId(testId);
    expect(typeof dbId).toBe("string");
    expect(dbId).toBe(testId);
    const id: DatabaseId = dbId;
    expect(id).toBeTruthy();
  });

  it("should correctly cast a string to a BlockId", () => {
    const blockId = toBlockId(testId);
    expect(typeof blockId).toBe("string");
    expect(blockId).toBe(testId);
    const id: BlockId = blockId;
    expect(id).toBeTruthy();
  });
});
