import { from, interval, merge, Observable, Subject, throwError } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import {
  catchError,
  expand,
  filter,
  map,
  scan,
  share,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom
} from "rxjs/operators";
import type { ListResponse, PageOrDatabase } from "../schemas/types/reponses";
import type { SearchBody } from "../schemas/types/search";
import { log } from "../util/logging";
import { Operator, type MetricsInfo, type OperatorConfig, type ProgressInfo } from "./operator";

/**
 * Response type for search results.
 */
export interface SearchResponse extends ListResponse {
  results: PageOrDatabase[];
}

/**
 * Enhanced execute result with streaming capabilities.
 */
export interface SearchStreamResult {
  stream: Observable<SearchResponse>;
  progress: Observable<ProgressInfo>;
  metrics: Observable<MetricsInfo>;
  cancel: () => void;
}

/**
 * Progress tracking configuration.
 */
export interface ProgressConfig {
  enabled: boolean;
  interval: number;
  estimateTotal?: boolean;
}

/**
 * Metrics tracking configuration.
 */
export interface MetricsConfig {
  enabled: boolean;
  interval: number;
  includeLatency?: boolean;
  includeErrorRates?: boolean;
}

/**
 * Composable operator function type.
 */
export type ComposableOperator<T, R> = (source: Observable<T>) => Observable<R>;

/**
 * Enhanced configuration for search operations.
 */
export interface SearchConfig {
  baseUrl: string;
  headers: Record<string, string>;
  requestId?: string;
  progress?: ProgressConfig;
  metrics?: MetricsConfig;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Operator for searching across Notion workspace with streaming pagination support.
 *
 * @example
 * ```typescript
 * const searchOp = new SearchOperator();
 * const { stream, progress, metrics } = searchOp.executeWithStreaming(
 *   {
 *     query: 'meeting notes',
 *     filter: { property: 'object', value: 'page' },
 *     page_size: 10
 *   },
 *   {
 *     baseUrl: 'https://api.notion.com/v1',
 *     headers: { Authorization: 'Bearer ...' }
 *   }
 * );
 *
 * // Subscribe to paginated results
 * stream.subscribe(page => console.log('Page:', page.results.length));
 *
 * // Track progress
 * progress.subscribe(p => console.log(`Progress: ${p.current}/${p.total}`));
 *
 * // Monitor metrics
 * metrics.subscribe(m => console.log(`Throughput: ${m.throughput} req/s`));
 * ```
 */
export class SearchOperator extends Operator<SearchBody, SearchResponse> {
  protected schemaName = "notion.search";

  /**
   * Execute the operator with the given request and configuration.
   * This method satisfies the base class contract.
   *
   * @param request - The search request payload
   * @param config - The operator configuration
   * @returns Observable of search responses
   */
  execute(request: SearchBody, config: OperatorConfig): Observable<SearchResponse> {
    const searchConfig = config as SearchConfig;
    const result = this.executeWithStreaming(request, searchConfig);
    return result.stream;
  }

  /**
   * Enhanced execute method with streaming pagination support.
   *
   * @param request - The search request payload
   * @param config - The operator configuration with optional progress/metrics settings
   * @returns Object containing stream, progress, and metrics observables
   */
  executeWithStreaming(request: SearchBody, config: SearchConfig): SearchStreamResult {
    const cancelSubject = new Subject<void>();
    const progressSubject = new Subject<ProgressInfo>();
    const metricsSubject = new Subject<MetricsInfo>();

    const metricsState = {
      requestCount: 0,
      totalDuration: 0,
      errorCount: 0,
      successCount: 0,
      startTime: Date.now()
    };

    const stream = this.createPaginatedStream(
      request,
      config,
      cancelSubject,
      progressSubject,
      metricsSubject,
      metricsState
    );

    const progress = this.createProgressStream(progressSubject, config); // setup progress tracking
    const metrics = this.createMetricsStream(metricsSubject, metricsState, config); // setup metrics tracking

    return {
      stream: stream.pipe(takeUntil(cancelSubject)),
      progress,
      metrics,
      cancel: () => {
        cancelSubject.next();
        cancelSubject.complete();
      }
    };
  }

  /**
   * Create a paginated stream that handles cursor-based pagination automatically.
   */
  private createPaginatedStream(
    initialRequest: SearchBody,
    config: SearchConfig,
    cancelSubject: Subject<void>,
    progressSubject: Subject<ProgressInfo>,
    metricsSubject: Subject<MetricsInfo>,
    metricsState: any
  ): Observable<SearchResponse> {
    return new Observable<SearchResponse>((subscriber) => {
      let currentCursor: string | undefined;
      let page = 0;
      let totalResults = 0;

      const fetchPage = (cursor?: string): Observable<SearchResponse> => {
        const startTime = Date.now();
        const requestWithCursor = cursor ? { ...initialRequest, start_cursor: cursor } : initialRequest;

        log.debug("search-operator: fetching page", { cursor, page });

        metricsState.requestCount++;

        return fromFetch(`${config.baseUrl}/search`, {
          method: "POST",
          headers: {
            ...config.headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestWithCursor)
        }).pipe(
          tap((response) => {
            log.debug("http response", {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok,
              page,
              headers: Object.fromEntries(response.headers.entries())
            });
          }),
          switchMap((response) => {
            if (!response.ok) {
              return from(response.text()).pipe(
                switchMap((errorText) => {
                  const errorMsg = `search failed: ${response.status} ${response.statusText} - ${errorText}`;
                  metricsState.errorCount++;
                  metricsSubject.next(this.calculateMetrics(metricsState));

                  log.error("http error", errorMsg);

                  throw new Error(errorMsg);
                })
              );
            }

            return from(response.json()).pipe(
              tap((json) => {
                log.debug("http response json", {
                  resultsCount: json.results?.length || 0,
                  hasMore: json.has_more,
                  nextCursor: json.next_cursor,
                  page
                });
              }),
              map((json) => {
                const duration = Date.now() - startTime;
                metricsState.totalDuration += duration;
                metricsState.successCount += json.results?.length || 0;

                totalResults += json.results?.length || 0;

                if (config.progress?.enabled) {
                  const progressInfo: ProgressInfo = {
                    current: page,
                    total: json.has_more ? undefined : page,
                    percentage: json.has_more ? undefined : 100,
                    message: `fetched ${totalResults} results across ${page} pages`,
                    stage: json.has_more ? "fetching" : "complete"
                  };
                  progressSubject.next(progressInfo);
                }

                if (config.metrics?.enabled) {
                  metricsSubject.next(this.calculateMetrics(metricsState));
                }

                return json as SearchResponse;
              })
            );
          }),
          catchError((error) => {
            metricsState.errorCount++;
            metricsSubject.next(this.calculateMetrics(metricsState));

            log.error("search operator error", error);

            return throwError(() => error);
          })
        );
      };

      /**
       * Start the pagination chain.
       */
      const subscription = fetchPage()
        .pipe(
          expand((response) => {
            if (!response.has_more || !response.next_cursor) {
              return new Observable<SearchResponse>((subscriber) => subscriber.complete());
            }
            return fetchPage(response.next_cursor);
          }),
          takeUntil(cancelSubject)
        )
        .subscribe({
          next: (response) => {
            subscriber.next(response);
          },
          error: (error) => {
            subscriber.error(error);
          },
          complete: () => {
            if (config.progress?.enabled) {
              progressSubject.next({
                current: page,
                total: page,
                percentage: 100,
                message: `completed ${totalResults} results across ${page} pages`,
                stage: "complete"
              });
            }

            if (config.metrics?.enabled) {
              metricsSubject.next(this.calculateMetrics(metricsState));
            }

            subscriber.complete();
          }
        });

      return () => {
        subscription.unsubscribe();
      };
    });
  }

  /**
   * Create progress tracking stream with configurable intervals.
   */
  private createProgressStream(progressSubject: Subject<ProgressInfo>, config: SearchConfig): Observable<ProgressInfo> {
    if (!config.progress?.enabled) {
      return progressSubject.asObservable();
    }

    const intervalStream = interval(config.progress.interval || 1000).pipe(
      withLatestFrom(progressSubject),
      map(([, progress]) => progress),
      filter((progress) => progress.stage !== "complete")
    );

    return merge(progressSubject.asObservable(), intervalStream).pipe(share());
  }

  /**
   * Create metrics tracking stream with configurable intervals.
   */
  private createMetricsStream(
    metricsSubject: Subject<MetricsInfo>,
    metricsState: any,
    config: SearchConfig
  ): Observable<MetricsInfo> {
    if (!config.metrics?.enabled) {
      return metricsSubject.asObservable();
    }

    const intervalStream = interval(config.metrics.interval || 5000).pipe(
      map(() => this.calculateMetrics(metricsState))
    );

    return merge(metricsSubject.asObservable(), intervalStream).pipe(share());
  }

  /**
   * Calculate current metrics based on the metrics state.
   */
  private calculateMetrics(metricsState: any): MetricsInfo {
    const elapsedTime = Date.now() - metricsState.startTime;
    const throughput = metricsState.requestCount / (elapsedTime / 1000);
    const averageDuration = metricsState.totalDuration / Math.max(metricsState.requestCount, 1);
    return {
      requestCount: metricsState.requestCount,
      totalDuration: metricsState.totalDuration,
      averageDuration,
      errorCount: metricsState.errorCount,
      successCount: metricsState.successCount,
      throughput,
      timestamp: new Date()
    };
  }

  /**
   * Apply composable operators to the stream.
   *
   * @param operators - Array of composable operators to apply
   * @returns A function that can be used to compose the operators
   */
  compose<T>(...operators: ComposableOperator<T, T>[]): ComposableOperator<T, T> {
    return (source: Observable<T>) => {
      return operators.reduce((acc, op) => op(acc), source);
    };
  }
}

/**
 * Composable operators for common search transformations.
 */
export const searchComposables = {
  /**
   * Filter results by object type.
   */
  filterByType: (type: "page" | "database"): ComposableOperator<SearchResponse, SearchResponse> => {
    return (source) =>
      source.pipe(
        map((response) => ({
          ...response,
          results: response.results.filter((item) => item.object === type)
        }))
      );
  },

  /**
   * Filter out archived items.
   */
  excludeArchived: (): ComposableOperator<SearchResponse, SearchResponse> => {
    return (source) =>
      source.pipe(
        map((response) => ({
          ...response,
          results: response.results.filter((item) => !item.archived)
        }))
      );
  },

  /**
   * Transform results to a simpler format.
   */
  simplify: (): ComposableOperator<SearchResponse, Array<{ id: string; object: string; title?: string }>> => {
    return (source) =>
      source.pipe(
        map((response) =>
          response.results.map((item) => ({
            id: item.id,
            object: item.object,
            title: item.object === "page" ? (item as any).properties?.Name?.title?.[0]?.text?.content : undefined
          }))
        )
      );
  },

  /**
   * Flatten all results into a single stream.
   */
  flatten: (): ComposableOperator<SearchResponse, PageOrDatabase> => {
    return (source) => source.pipe(switchMap((response) => from(response.results)));
  },

  /**
   * Batch results into groups.
   */
  batch: (size: number): ComposableOperator<PageOrDatabase, PageOrDatabase[]> => {
    return (source) =>
      source.pipe(
        scan((acc: PageOrDatabase[], item: PageOrDatabase) => {
          acc.push(item);
          return acc;
        }, []),
        filter((batch) => batch.length >= size),
        map((batch) => batch.splice(0, size))
      );
  }
};

/**
 * Factory function for creating search operators with default progress/metrics configuration.
 */
export function createSearchOperator(config?: {
  enableProgress?: boolean;
  enableMetrics?: boolean;
  progressInterval?: number;
  metricsInterval?: number;
}): SearchOperator {
  const operator = new SearchOperator();

  // Set default configuration on the instance
  (operator as any).defaultConfig = {
    progress: {
      enabled: config?.enableProgress ?? true,
      interval: config?.progressInterval ?? 1000
    },
    metrics: {
      enabled: config?.enableMetrics ?? true,
      interval: config?.metricsInterval ?? 5000
    }
  };

  return operator;
}

/**
 * Higher-order function for adding progress tracking to any operator.
 */
export function withProgress<T extends SearchOperator>(operator: T, config?: ProgressConfig): T {
  const originalExecute = operator.execute.bind(operator);

  operator.execute = (request: SearchBody, operatorConfig: SearchConfig) => {
    const enhancedConfig = {
      ...operatorConfig,
      progress: {
        enabled: true,
        interval: 1000,
        ...config
      }
    };
    return originalExecute(request, enhancedConfig);
  };

  return operator;
}

/**
 * Higher-order function for adding metrics tracking to any operator.
 */
export function withMetrics<T extends SearchOperator>(operator: T, config?: MetricsConfig): T {
  const originalExecute = operator.execute.bind(operator);

  operator.execute = (request: SearchBody, operatorConfig: SearchConfig) => {
    const enhancedConfig = {
      ...operatorConfig,
      metrics: {
        enabled: true,
        interval: 5000,
        ...config
      }
    };
    return originalExecute(request, enhancedConfig);
  };

  return operator;
}
