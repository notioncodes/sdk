import { cyan, yellow } from "ansis";
import { firstValueFrom, reduce } from "rxjs";
import { beforeEach, describe, expect, it as test } from "vitest";
import { SearchOperator } from "./search";

describe("Search Operators", () => {
  let operator: SearchOperator;
  const token = process.env.NOTION_TOKEN || process.env.token;

  // Remove TestScheduler setup since we're testing real async streams
  beforeEach(() => {
    operator = new SearchOperator();
  });

  // describe("enhanced search-operator with streaming pagination", () => {
  //   it("should perform search with streaming pagination, progress, and metrics", async () => {
  //     const res = operator.execute(
  //       {
  //         query: "",
  //         filter: {
  //           value: "page",
  //           property: "object"
  //         },
  //         page_size: 2
  //       },
  //       {
  //         baseUrl: "https://api.notion.com/v1",
  //         timeout: 10000,
  //         method: "POST",
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //           "Notion-Version": "2022-06-28"
  //         }
  //       }
  //     );

  //     res.reporter.metrics$.subscribe((metrics) => {
  //       console.log("res.reporter.metrics$.subscribe((metrics)):", metrics);
  //     });

  //     const allResults$ = res.data$.pipe(
  //       tap((results) => {
  //         console.log("results.length:", results.results.length);
  //       }),
  //       reduce((acc, page) => acc.concat(page.results), [] as any[])
  //     );
  //     const allResults = await firstValueFrom(allResults$);
  //     console.log("allResults.length:", allResults.length);
  //   }, 5000);
  // });

  describe("search operator", () => {
    test("should stream", async () => {
      let emitted = 0;

      const res = operator.execute(
        {
          query: "test",
          filter: {
            value: "page",
            property: "object"
          },
          page_size: 6
        },
        {
          baseUrl: "https://api.notion.com/v1",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      res.reporter.metrics$.subscribe((metrics) => {
        emitted++;
        console.log(`seq: ${cyan(emitted)}`, yellow(`res.reporter.metrics$.subscribe():`), metrics);
      });

      res.raw$.subscribe({
        next: (response) => {
          // console.log("Test: Raw response received:", response.status);
        },
        error: (error) => {
          console.error("Test: Raw response error:", error);
        }
      });

      const allResults$ = res.data$.pipe(reduce((acc, page) => acc.concat(page.results), [] as any[]));

      const allResults = await firstValueFrom(allResults$);
      expect(allResults.length).toBe(16);
    }, 10000);
  });
});
