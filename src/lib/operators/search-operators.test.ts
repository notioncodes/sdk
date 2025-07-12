import dotenv from "dotenv";
import fs from "fs";
import { beforeEach, describe, expect, it } from "vitest";
import { DatabaseRecordBuilder } from "../schemas/builder";
import { display } from "../util/display";
import { log } from "../util/logging";
import { SearchOperator } from "./search-operators";

dotenv.config();

describe("Search Operators", () => {
  let operator: SearchOperator;
  const token = process.env.NOTION_TOKEN || process.env.token;

  // Remove TestScheduler setup since we're testing real async streams
  beforeEach(() => {
    operator = new SearchOperator();
  });

  describe("enhanced search-operator with streaming pagination", () => {
    it("should perform search with streaming pagination, progress, and metrics", async () => {
      if (!token) {
        console.warn("⚠️  No NOTION_TOKEN found, skipping live API test");
        return;
      }

      const monitor = display();
      let startTime = Date.now();

      const builder = new DatabaseRecordBuilder();
      builder.properties.relation("Content Links", "1234567890").relation("Categories", "1234567890");
      const schema = builder.build();

      log.debug("schema", schema);

      const { stream, progress, metrics } = operator.executeWithStreaming(
        {
          query: "",
          filter: {
            value: "page",
            property: "object"
          },
          page_size: 2
        },
        {
          baseUrl: "https://api.notion.com/v1",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28"
          },
          progress: {
            enabled: true,
            interval: 500
          },
          metrics: {
            enabled: true,
            interval: 500
          }
        }
      );

      const progressData: any[] = [];
      const metricsData: any[] = [];
      let currentMetrics = { requestCount: 0, errorCount: 0, successCount: 0 };

      // Wait for stream completion using Promise approach
      const streamData: any[] = [];
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          monitor.fail("❌ Stream did not complete within timeout");
          reject(new Error("Stream did not complete within timeout"));
        }, 10000);

        // Subscribe to progress updates
        const progressSubscription = progress.subscribe((progressInfo) => {
          progressData.push(progressInfo);
          monitor.next({
            messages: [`Progress: ${progressInfo.current}/${progressInfo.total} pages`],
            duration: Date.now() - startTime,
            error: currentMetrics.errorCount,
            success: currentMetrics.successCount,
            throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
          });
        });

        // Subscribe to metrics updates
        const metricsSubscription = metrics.subscribe((metricsInfo) => {
          metricsData.push(metricsInfo);
          currentMetrics = metricsInfo;

          monitor.next({
            messages: [
              `Requests: ${metricsInfo.requestCount} | Errors: ${metricsInfo.errorCount} | Success: ${metricsInfo.successCount}`
            ],
            duration: Date.now() - startTime,
            error: metricsInfo.errorCount,
            success: metricsInfo.successCount,
            throughput: Math.round((metricsInfo.requestCount / (Date.now() - startTime)) * 1000)
          });
        });

        // Subscribe to stream data
        const streamSubscription = stream.subscribe({
          next: (result) => {
            streamData.push(result);
            monitor.next({
              messages: [`Found ${result.results.length} results in this batch`],
              duration: Date.now() - startTime,
              error: currentMetrics.errorCount,
              success: currentMetrics.successCount,
              throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
            });

            if (result.results.length > 0) {
              fs.writeFileSync("search-result.json", JSON.stringify(result.results, null, 2));
            }
          },
          complete: () => {
            clearTimeout(timeout);

            monitor.next({
              messages: ["✅ Search operation completed successfully"],
              duration: Date.now() - startTime,
              error: currentMetrics.errorCount,
              success: currentMetrics.successCount,
              throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
            });
            monitor.stop("✅ Search operation completed successfully");

            // Clean up subscriptions
            progressSubscription.unsubscribe();
            metricsSubscription.unsubscribe();
            streamSubscription.unsubscribe();

            resolve();
          },
          error: (error) => {
            clearTimeout(timeout);

            monitor.fail("❌ Stream error occurred");
            console.error("❌ Stream error:", error);

            // Clean up subscriptions
            progressSubscription.unsubscribe();
            metricsSubscription.unsubscribe();
            streamSubscription.unsubscribe();

            reject(error);
          }
        });
      });

      // Write results to file if any
      if (streamData.length > 0 && streamData[0].results.length > 0) {
        fs.writeFileSync("search-result.json", JSON.stringify(streamData[0].results, null, 2));
      }

      // Assertions
      expect(streamData.length).toBeGreaterThan(0);
      expect(progressData.length).toBeGreaterThan(0);
      expect(metricsData.length).toBeGreaterThan(0);

      // Verify response structure
      if (streamData.length > 0) {
        const firstResult = streamData[0];
        expect(firstResult).toHaveProperty("results");
        expect(firstResult).toHaveProperty("has_more");
        expect(firstResult).toHaveProperty("next_cursor");
        expect(Array.isArray(firstResult.results)).toBe(true);
      }
    }, 20000); // timeout in milliseconds

    // Alternative approach using Promise-based stream completion
    it("should wait for stream completion using Promise approach", async () => {
      if (!token) {
        console.warn("⚠️  No NOTION_TOKEN found, skipping live API test");
        return;
      }

      const monitor = display();
      let startTime = Date.now();

      const { stream, progress, metrics } = operator.executeWithStreaming(
        {
          query: "minecraft",
          filter: {
            value: "page",
            property: "object"
          },
          page_size: 2
        },
        {
          baseUrl: "https://api.notion.com/v1",
          headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": "2022-06-28"
          },
          progress: {
            enabled: true,
            interval: 1000
          },
          metrics: {
            enabled: true,
            interval: 1000
          }
        }
      );

      const progressData: any[] = [];
      const metricsData: any[] = [];
      const streamData: any[] = [];
      let currentMetrics = { requestCount: 0, errorCount: 0, successCount: 0 };

      // Wait for stream completion using Promise
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          monitor.fail("❌ Stream did not complete within timeout");
          reject(new Error("Stream did not complete within timeout"));
        }, 25000);

        // Subscribe to progress updates
        const progressSubscription = progress.subscribe((progressInfo) => {
          progressData.push(progressInfo);
          monitor.next({
            messages: [`Progress: ${progressInfo.current}/${progressInfo.total} pages`],
            duration: Date.now() - startTime,
            error: currentMetrics.errorCount,
            success: currentMetrics.successCount,
            throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
          });
        });

        // Subscribe to metrics updates
        const metricsSubscription = metrics.subscribe((metricsInfo) => {
          metricsData.push(metricsInfo);
          currentMetrics = metricsInfo;

          monitor.next({
            messages: [
              `Requests: ${metricsInfo.requestCount} | Errors: ${metricsInfo.errorCount} | Success: ${metricsInfo.successCount}`
            ],
            duration: Date.now() - startTime,
            error: metricsInfo.errorCount,
            success: metricsInfo.successCount,
            throughput: Math.round((metricsInfo.requestCount / (Date.now() - startTime)) * 1000)
          });
        });

        // Subscribe to stream data
        const streamSubscription = stream.subscribe({
          next: (result) => {
            streamData.push(result);
            monitor.next({
              messages: [`Found ${result.results.length} results in this batch`],
              duration: Date.now() - startTime,
              error: currentMetrics.errorCount,
              success: currentMetrics.successCount,
              throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
            });

            if (result.results.length > 0) {
              fs.writeFileSync("search-result.json", JSON.stringify(result.results, null, 2));
            }
          },
          complete: () => {
            clearTimeout(timeout);

            monitor.next({
              messages: ["✅ Stream completed successfully"],
              duration: Date.now() - startTime,
              error: currentMetrics.errorCount,
              success: currentMetrics.successCount,
              throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
            });
            monitor.stop("✅ Stream completed successfully");

            // Clean up subscriptions
            progressSubscription.unsubscribe();
            metricsSubscription.unsubscribe();
            streamSubscription.unsubscribe();

            resolve();
          },
          error: (error) => {
            clearTimeout(timeout);

            monitor.fail("❌ Stream error occurred");
            console.error("❌ Stream error:", error);

            // Clean up subscriptions
            progressSubscription.unsubscribe();
            metricsSubscription.unsubscribe();
            streamSubscription.unsubscribe();

            reject(error);
          }
        });
      });

      // Assertions
      expect(streamData.length).toBeGreaterThan(0);
      expect(progressData.length).toBeGreaterThan(0);
      expect(metricsData.length).toBeGreaterThan(0);

      // Verify response structure
      if (streamData.length > 0) {
        const firstResult = streamData[0];
        expect(firstResult).toHaveProperty("results");
        expect(firstResult).toHaveProperty("has_more");
        expect(firstResult).toHaveProperty("next_cursor");
        expect(Array.isArray(firstResult.results)).toBe(true);
      }
    }, 30000); // timeout in milliseconds
  });
});
