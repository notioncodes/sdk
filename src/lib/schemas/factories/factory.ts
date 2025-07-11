import dotenv from "dotenv";
import { userSchema } from "../schemas";
import { blockSchema } from "../types/blocks";
import { databaseSchema } from "../types/databases";
import { pageSchema } from "../types/pages";
import { createPaginatedResponseSchema } from "./reponses";

dotenv.config();

export const schemaFactories = {
  responses: {
    page: {
      create: () => pageSchema,
      update: () => pageSchema,
      delete: () => pageSchema,
      get: () => pageSchema,
      list: () => createPaginatedResponseSchema(pageSchema, "page"),
      query: () => createPaginatedResponseSchema(pageSchema, "page"),
      search: () => createPaginatedResponseSchema(pageSchema, "page")
    },
    user: {
      create: () => userSchema,
      update: () => userSchema,
      delete: () => userSchema,
      get: () => userSchema,
      list: () => createPaginatedResponseSchema(userSchema, "user")
    }
  },
  database: {
    create: () => databaseSchema,
    update: () => databaseSchema,
    delete: () => databaseSchema,
    get: () => databaseSchema,
    list: () => createPaginatedResponseSchema(databaseSchema, "database"),
    query: () => createPaginatedResponseSchema(databaseSchema, "database"),
    search: () => createPaginatedResponseSchema(databaseSchema, "database")
  },
  block: {
    create: () => blockSchema,
    update: () => blockSchema,
    delete: () => blockSchema,
    get: () => blockSchema,
    list: () => createPaginatedResponseSchema(blockSchema, "block")
  }
};

import * as client from "@notionhq/client";

const notion = new client.Client({
  auth: process.env.token
});

const response = await notion.databases.query({
  database_id: "16ad7342e57180c4a065c7a1015871d3"
});
