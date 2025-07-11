import * as client from "@notionhq/client";
import dotenv from "dotenv";
import { describe, it } from "vitest";

dotenv.config();

const notion = new client.Client({
  auth: process.env.token
});

describe("e2e", async () => {
  it("should work", async () => {
    const response = await notion.databases.query({
      database_id: "16ad7342e57180c4a065c7a1015871d3"
    });

    console.log(response);
  });
});
