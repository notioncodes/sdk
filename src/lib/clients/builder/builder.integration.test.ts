import { of } from "rxjs";
import { describe, expect, it } from "vitest";
import { SchemaRegistryImpl } from "../../api/schema-registry";
import { QueryBuilder } from "./builder";

describe("QueryBuilder", () => {
  it("should return the first result as observable", async () => {
    const builder = new QueryBuilder("test", new SchemaRegistryImpl(), () => of([]));
    const result$ = builder.first();

    // Subscribe to the observable and test the emitted value
    const result = await new Promise((resolve) => {
      result$.subscribe(resolve);
    });

    expect(result).toBe(null);
  });
});
