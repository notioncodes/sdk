import { describe, expect, it } from "vitest";
import { NotionClient } from "./client";

describe("NotionClient", () => {
  it("should be instantiable with an auth token", () => {
    const client = new NotionClient({
      auth: "test-token"
    });
    expect(client).toBeInstanceOf(NotionClient);
  });

  it("should throw an error if auth is not provided", () => {
    // The underlying @notionhq/client handles the error, but we can
    // check that our wrapper doesn't crash and correctly passes options.
    // @ts-expect-error - We are intentionally passing an invalid config.
    expect(() => new NotionClient({})).toThrow();
  });
});
