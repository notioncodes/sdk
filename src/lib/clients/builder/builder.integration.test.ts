import { of } from "rxjs";
import { describe, expect, it } from "vitest";
import { SchemaRegistryImpl } from "../../api/core/schema-registry";
import { QueryBuilder } from "./builder";

describe("QueryBuilder", () => {
  it("should return the first result", () => {
    const builder = new QueryBuilder("test", new SchemaRegistryImpl(), () => of([]));
    const result = builder.first();
    expect(result).toBe(null);
  });
});
