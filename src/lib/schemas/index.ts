import dotenv from "dotenv";

dotenv.config();

import * as client from "@notionhq/client";

const notion = new client.Client({
  auth: process.env.token
});

const response = await notion.databases.query({
  database_id: "16ad7342e57180c4a065c7a1015871d3"
});
