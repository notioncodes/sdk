import { cyan, greenBright } from "ansis";
import dotenv from "dotenv";
import fs from "fs";
import { Subscription } from "rxjs";
import { SearchOperator } from "../src/lib/operators/search-operators";
import { cons } from "../src/lib/util/console";

const timeoutMS = 5000;
const timeoutSignal = AbortSignal.timeout(timeoutMS);
const abortController = new AbortController();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    abortController.abort();
  });
}

dotenv.config();

const main = async () => {
  let operator: SearchOperator;
  const token = process.env.NOTION_TOKEN || process.env.token;
  operator = new SearchOperator();

  if (!token) {
    console.warn("⚠️  No NOTION_TOKEN found, skipping live API test");
    process.exit(1);
  }

  const monitor = cons();
  let startTime = Date.now();

  let progressSubscription: Subscription;
  let metricsSubscription: Subscription;
  let streamSubscription: Subscription;

  const { stream, progress, metrics } = operator.executeWithStreaming(
    {
      query: "",
      filter: {
        value: "page",
        property: "object"
      },
      page_size: 20
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

  const streamData: any[] = [];
  const progressData: any[] = [];
  const metricsData: any[] = [];

  let currentMetrics = { requestCount: 0, errorCount: 0, successCount: 0 };

  return new Promise<void>((resolve, reject) => {
    progressSubscription = progress.subscribe((progressInfo) => {
      progressData.push(progressInfo);
      monitor.next({
        duration: Date.now() - startTime,
        error: currentMetrics.errorCount,
        success: currentMetrics.successCount,
        throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
      });
    });

    metricsSubscription = metrics.subscribe((metricsInfo) => {
      metricsData.push(metricsInfo);
      currentMetrics = metricsInfo;
      monitor.next({
        duration: Date.now() - startTime,
        error: metricsInfo.errorCount,
        success: metricsInfo.successCount,
        throughput: Math.round((metricsInfo.requestCount / (Date.now() - startTime)) * 1000)
      });
    });

    streamSubscription = stream.subscribe({
      next: (result) => {
        streamData.push(result);
        monitor.next({
          messages: result.results.map((result) => result.url),
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
        monitor.next({
          message: "✅ search operation completed successfully",
          duration: Date.now() - startTime,
          error: currentMetrics.errorCount,
          success: currentMetrics.successCount,
          throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
        });
        monitor.stop("✅ search operation completed successfully");
        progressSubscription.unsubscribe();
        metricsSubscription.unsubscribe();
        streamSubscription.unsubscribe();
        resolve();
      },
      error: (error) => {
        monitor.fail(`❌ fatal error occurred: ${error.message}`);
        progressSubscription.unsubscribe();
        metricsSubscription.unsubscribe();
        streamSubscription.unsubscribe();
        process.exit(1);
      }
    });

    abortController.signal.addEventListener("abort", () => {
      console.log(cyan(`\n👋 final stats:`));
      console.log(`   + ${Math.round((Date.now() - startTime) / 1000)}s duration`);
      console.log(`   + ${currentMetrics.requestCount} requests`);
      console.log(`   + ${currentMetrics.errorCount} errors`);
      console.log(`  +  ${Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)}/s throughput`);
      console.log(greenBright(`   + ${currentMetrics.successCount} objects exported`));
      process.exit(0);
    });
  });
};

main().catch((error) => {
  // Gracefully handle known errors without a full stack trace
  if (error.message !== "Stream did not complete within timeout") {
    console.error("❌ CLI error:", error);
  }
  process.exit(1);
});
