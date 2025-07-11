import { describe, it } from "vitest";
import { createNotionSchemaLoader } from "../../schemas/lazy-schema-loader";
import { log } from "../../util/logging";

describe("e2e-clients", () => {
  it("e2e-clients", async () => {
    const loader = createNotionSchemaLoader();

    log.debugging.inspect("loader", loader);
  });
});
