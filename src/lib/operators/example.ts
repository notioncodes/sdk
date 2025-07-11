/**
 * Example usage of the Notion operator architecture.
 *
 * This demonstrates:
 * - Type-safe operators with arktype validation
 * - RxJS streaming and composition
 * - Integration with the SchemaLoader
 * - Pipeline operations
 */

import { filter, map, mergeMap, take } from "rxjs/operators";
import { createNotionSchemaLoader } from "../schemas/loader";
import { toDatabaseId, toPageId } from "../schemas/types/brands";
import { getPageTitle } from "../schemas/types/pages";
import { blockOperators, databaseOperators, pageOperators, searchOperators } from "./index";
import { createPipeline, withLogging, withMetrics } from "./operator-pipeline";

async function exampleUsage() {
  // Initialize schema loader
  const schemaLoader = createNotionSchemaLoader();

  // Create pipeline with configuration
  const pipeline = createPipeline({
    schemaLoader,
    baseUrl: "https://api.notion.com/v1",
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28"
    },
    retries: 3
  });

  // Example 1: Simple page retrieval with type validation
  const getPage = pageOperators.get();
  const pageResult$ = pipeline.execute(getPage, {
    pageId: toPageId("16ad7342e57180c4a065c7a1015871d3")
  });

  pageResult$.subscribe({
    next: (result) => {
      console.log("Page title:", getPageTitle(result.data));
      console.log("Request took:", result.metadata?.duration, "ms");
    },
    error: (err) => console.error("Failed to get page:", err)
  });

  // Example 2: Search with streaming results
  const searchOp = searchOperators.pages();
  const searchResults$ = pipeline.stream(
    searchOp,
    { query: "meeting notes" },
    (response) => response.next_cursor,
    (response) => response.results
  );

  searchResults$
    .pipe(
      filter((page) => !page.archived),
      map((page) => ({
        id: page.id,
        title: getPageTitle(page as any),
        lastEdited: page.last_edited_time
      })),
      take(10) // Limit to first 10 results
    )
    .subscribe({
      next: (page) => console.log("Found page:", page),
      complete: () => console.log("Search complete")
    });

  // Example 3: Database query with pagination
  const queryDb = databaseOperators.query();
  const dbResults$ = pipeline.stream(
    queryDb,
    {
      databaseId: toDatabaseId("16ad7342e57180e7a564d866c8627845"),
      filter: {
        property: "Status",
        select: { equals: "In Progress" }
      },
      sorts: [
        {
          property: "Created",
          direction: "descending"
        }
      ]
    },
    (response) => response.next_cursor,
    (response) => response.results
  );

  // Process database results with transformation
  const processedResults$ = dbResults$.pipe(
    map((item) => {
      if (item.object === "page") {
        return {
          type: "page" as const,
          id: item.id,
          title: getPageTitle(item as any),
          status: (item.properties as any).Status?.select?.name
        };
      }
      return null;
    }),
    filter((item) => item !== null)
  );

  // Example 4: Operator composition
  const createPageOp = pageOperators.create();
  const addBlocksOp = blockOperators.append();

  // Chain operations: create page then add content
  const createPageWithContent$ = pipeline
    .execute(createPageOp, {
      parent: { database_id: toDatabaseId("16ad7342e57180e7a564d866c8627845") },
      properties: {
        Name: {
          title: [
            {
              text: { content: "New Page from Operator" }
            }
          ]
        },
        Status: {
          select: { name: "Not Started" }
        }
      }
    })
    .pipe(
      mergeMap((pageResult) =>
        pipeline.execute(addBlocksOp, {
          blockId: pageResult.data.id as any,
          children: [
            {
              type: "heading_1",
              heading_1: {
                rich_text: [{ text: { content: "Introduction" } }]
              }
            },
            {
              type: "paragraph",
              paragraph: {
                rich_text: [{ text: { content: "This page was created using the operator architecture." } }]
              }
            }
          ]
        })
      )
    );

  // Example 5: Batch operations
  const batchResults$ = pipeline.batch([
    {
      operator: pageOperators.get(),
      request: { pageId: toPageId("16ad7342e57180c4a065c7a1015871d3") }
    },
    {
      operator: databaseOperators.get(),
      request: { databaseId: toDatabaseId("16ad7342e57180e7a564d866c8627845") }
    }
  ]);

  batchResults$.subscribe({
    next: (results) => {
      console.log("Page:", results[0].data);
      console.log("Database:", results[1].data);
    }
  });

  // Example 6: Using higher-order operators
  const loggedSearchOp = withLogging(searchOperators.all());
  const metricSearchOp = withMetrics(loggedSearchOp, (metrics) => console.log("Search metrics:", metrics));

  pipeline.execute(metricSearchOp, { query: "important" }).subscribe();

  // Example 7: Stream with progress tracking
  const progressStream$ = pipeline.streamWithProgress(
    databaseOperators.query(),
    {
      databaseId: toDatabaseId("16ad7342e57180e7a564d866c8627845")
    },
    {
      getCursor: (response) => response.next_cursor,
      getItems: (response) => response.results,
      onProgress: (progress) => {
        console.log(`Processed ${progress.current} items`);
      }
    }
  );

  // Example 8: Custom stream pipeline
  const customPipeline = pipeline
    .createStreamPipeline<any>()
    .filter((item) => item.object === "page")
    .transform((page) => ({
      id: page.id,
      title: getPageTitle(page),
      created: new Date(page.created_time)
    }))
    .deduplicate((item) => item.id)
    .batch(5, 1000) // Batch every 5 items or 1 second
    .handleErrors((error) => {
      console.error("Stream error:", error);
      return []; // Continue with empty array
    });

  const processedStream$ = dbResults$.pipe(customPipeline.build());
}

// Type-safe request builders
export const requestBuilders = {
  page: {
    get: (pageId: string) => ({
      pageId: toPageId(pageId)
    }),
    create: (databaseId: string, title: string) => ({
      parent: { database_id: toDatabaseId(databaseId) },
      properties: {
        Name: {
          title: [
            {
              text: { content: title }
            }
          ]
        }
      }
    })
  },
  database: {
    query: (databaseId: string, filter?: any) => ({
      databaseId: toDatabaseId(databaseId),
      filter
    })
  }
};

// Usage with request builders
async function typeafeExample() {
  const pipeline = createPipeline({
    schemaLoader: createNotionSchemaLoader(),
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28"
    }
  });

  const page$ = pipeline.execute(pageOperators.get(), requestBuilders.page.get("16ad7342e57180c4a065c7a1015871d3"));

  const newPage$ = pipeline.execute(
    pageOperators.create(),
    requestBuilders.page.create("16ad7342e57180e7a564d866c8627845", "My New Page")
  );
}

export { exampleUsage, typeafeExample };
