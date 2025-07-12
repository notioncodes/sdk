import { cyan, greenBright } from "ansis";
import dotenv from "dotenv";
import fs from "fs";
import { Subscription } from "rxjs";
import { SearchOperator } from "../src/lib/operators/search-operators";
import { display } from "../src/lib/util/display";

dotenv.config();
if (!process.env.NOTION_TOKEN && !process.env.token) {
  console.warn("⚠️  No NOTION_TOKEN found, skipping live API test");
  process.exit(1);
}

const abortController = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    abortController.abort();
  });
}

const main = async () => {
  const operator = new SearchOperator();

  const { stream, progress, metrics } = operator.executeWithStreaming(
    {
      filter: {
        value: "page",
        property: "object"
      },
      page_size: 10
    },
    {
      baseUrl: "https://api.notion.com/v1",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN || process.env.token}`,
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

  return new Promise<void>((resolve, reject) => {
    const monitor = display();

    let startTime = Date.now();
    let progressSubscription: Subscription;
    let metricsSubscription: Subscription;
    let streamSubscription: Subscription;
    let currentMetrics = { requestCount: 0, errorCount: 0, successCount: 0 };

    progressSubscription = progress.subscribe((progressInfo) => {
      monitor.next({
        duration: Date.now() - startTime,
        error: currentMetrics.errorCount,
        success: currentMetrics.successCount,
        throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
      });
    });

    metricsSubscription = metrics.subscribe((metricsInfo) => {
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
          duration: Date.now() - startTime,
          error: currentMetrics.errorCount,
          success: currentMetrics.successCount,
          throughput: Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)
        });
        progressSubscription.unsubscribe();
        metricsSubscription.unsubscribe();
        streamSubscription.unsubscribe();
        resolve();
        monitor.stop("\n✅ export finished");
        stats();
      },
      error: (error) => {
        progressSubscription.unsubscribe();
        metricsSubscription.unsubscribe();
        streamSubscription.unsubscribe();
        monitor.fail(`error: ${error.message}`);
        process.exit(1);
      }
    });

    abortController.signal.addEventListener("abort", () => {
      stats();
      process.exit(0);
    });

    const stats = () => {
      console.log(cyan(`👋 final stats:`));
      console.log(`   + ${Math.round((Date.now() - startTime) / 1000)}s duration`);
      console.log(`   + ${currentMetrics.requestCount} requests`);
      console.log(`   + ${currentMetrics.errorCount} errors`);
      console.log(`   + ${Math.round((currentMetrics.requestCount / (Date.now() - startTime)) * 1000)}/s throughput`);
      console.log(greenBright(`   + ${currentMetrics.successCount} objects exported`));
    };
  });
};

main().catch((error) => {
  console.error("error:", error);
  process.exit(1);
});
