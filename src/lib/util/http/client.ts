import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import { Observable, from, race, throwError, timer } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { catchError, delayWhen, map, retryWhen, scan, shareReplay, switchMap, tap } from "rxjs/operators";

/**
 * The configuration for an HTTP request.
 */
export interface HTTPConfig {
  /**
   * The base URL of the request.
   */
  baseUrl: string;

  /**
   * The method of the request.
   */
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

  /**
   * The headers of the request.
   */
  headers?: Record<string, string>;

  /**
   * The timeout for the request in milliseconds.
   */
  timeout?: number;

  /**
   * The maximum number of retries for the request.
   */
  retries?: number;

  /**
   * The delay between retries in milliseconds.
   */
  backoff?: number;

  /**
   * The body of the request.
   */
  body?: any;
}

/**
 * The response returned by the HTTP client for a given request.
 */
export class HTTPResponse<TResponse> {
  /**
   * The observable of the parsed response data.
   */
  readonly data$: Observable<TResponse>;

  /**
   * The observable of the raw response.
   */
  readonly raw$: Observable<Response>;

  /**
   * The metrics reporter.
   */
  readonly reporter: Reporter;

  /**
   * The cancel function.
   */
  readonly cancel: () => void;

  /**
   * Creates a new HTTPResponse.
   *
   * @param data$ - The observable of the parsed response data.
   * @param raw$ - The observable of the raw response.
   * @param reporter - The metrics reporter for the request.
   */
  constructor(data$: Observable<TResponse>, raw$: Observable<Response>, reporter: Reporter, cancel: () => void) {
    this.data$ = data$;
    this.raw$ = raw$;
    this.reporter = reporter;
    this.cancel = () => {
      cancel();
    };
  }
}

/**
 * Execute HTTP requests with comprehensive error handling, retry logic, and observability.
 *
 * Key features:
 * - **Raw Response Access**: The raw$ observable provides access to the complete Response
 *   object including status codes, headers, and other metadata before JSON parsing
 * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
 *   propagates errors for failed requests
 * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
 *   once, even with multiple subscribers to both raw$ and data$ observables
 * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
 *   for transient failures
 * - **Real-time Metrics**: Provides live observability through MetricsReporter for
 *   monitoring request lifecycle, errors, and performance
 * - **Timeout Handling**: Supports request cancellation via AbortController
 */
export class HTTP {
  /**
   * Executes an HTTP POST request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  fetch<TResponse>(endpoint: string, config: HTTPConfig, reporter: Reporter = new Reporter()): HTTPResponse<TResponse> {
    const controller = new AbortController();
    const maxRetries = config.retries ?? 3;
    const baseDelay = config.backoff ?? 500;

    const raw$ = fromFetch(`${config.baseUrl}${endpoint}`, {
      method: config.method,
      headers: config.headers,
      signal: controller.signal,
      body: config.body ? JSON.stringify(config.body) : undefined
    }).pipe(
      /**
       * shareReplay(1) ensures that the fetch request is executed only once,
       * and the emitted Response is cached and shared with all subscribers.
       */
      shareReplay(1)
    );

    const request$ = raw$.pipe(
      tap((response) => {
        // reporter.set("stage", "requesting");
        // console.log("snapshot:", reporter.snapshot());
      }),
      switchMap((response) => {
        if (!response.ok) {
          return from(response.text()).pipe(
            switchMap((text) => {
              const errorMsg = `HTTP ${response.status}: ${text}`;
              reporter.apply(add("errors", 1), set("stage", "error"), set("message", errorMsg));
              return throwError(() => new Error(errorMsg));
            })
          );
        }
        return from(response.json()).pipe(
          map((json) => {
            reporter.apply(set("stage", "complete"));
            return json as TResponse;
          })
        );
      }),
      retryWhen((errors) =>
        errors.pipe(
          scan((retryCount, error) => {
            if (retryCount >= maxRetries) throw error;
            reporter.apply(
              add("errors", 1),
              set("stage", "retry"),
              set("message", `retrying after ${baseDelay * Math.pow(2, retryCount)}ms: ${error.message}`)
            );
            return retryCount + 1;
          }, 0),
          delayWhen((retryCount) => timer(baseDelay * Math.pow(2, retryCount)))
        )
      ),
      catchError((error) => {
        reporter.apply(add("errors", 1), set("stage", "error"), set("message", error.message));
        return throwError(() => error);
      })
    );

    const timeout$ = timer(config.timeout ?? 60000).pipe(
      switchMap(() => {
        controller.abort();
        reporter.apply(
          add("errors", 1),
          set("stage", "timeout"),
          set("message", `aborted request after ${config.timeout}ms due to timeout`)
        );
        return throwError(() => new Error(`aborted request after ${config.timeout}ms due to timeout`));
      })
    );

    const data$ = race(request$, timeout$);

    return new HTTPResponse<TResponse>(data$, raw$, reporter, () => controller.abort());
  }

  /**
   * Executes an HTTP GET request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  get<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return this.fetch<TResponse>(endpoint, { ...config, method: "GET" });
  }

  /**
   * Executes an HTTP POST request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  post<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return this.fetch<TResponse>(endpoint, { ...config, method: "POST" });
  }

  /**
   * Executes an HTTP PUT request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  put<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return this.fetch<TResponse>(endpoint, { ...config, method: "PUT" });
  }

  /**
   * Executes an HTTP PATCH request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  delete<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return this.fetch<TResponse>(endpoint, { ...config, method: "DELETE" });
  }

  /**
   * Executes an HTTP DELETE request with comprehensive error handling, retry logic, and observability.
   *
   * This method provides access to both the parsed response data and the raw Response object
   * through separate observables. The implementation uses RxJS to handle the asynchronous
   * nature of HTTP requests while providing real-time metrics and retry capabilities.
   *
   * Key features:
   * - **Raw Response Access**: The raw$ observable provides access to the complete Response
   *   object including status codes, headers, and other metadata before JSON parsing.
   * - **Parsed Data Stream**: The data$ observable delivers the parsed JSON response or
   *   propagates errors for failed requests.
   * - **Shared Execution**: Uses shareReplay(1) to ensure the fetch request executes only
   *   once, even with multiple subscribers to both raw$ and data$ observables.
   * - **Exponential Backoff**: Implements configurable retry logic with exponential backoff
   *   for transient failures.
   * - **Real-time Metrics**: Provides live observability through MetricsReporter for
   *   monitoring request lifecycle, errors, and performance.
   * - **Timeout Handling**: Supports request cancellation via AbortController.
   *
   * @template TResponse - The expected type of the parsed JSON response.
   *
   * @param endpoint - The API endpoint path to append to the base URL.
   * @param config - HTTP configuration including method, headers, timeout, and retry settings.
   *
   * @returns HTTPResponse object containing data$, raw$, and reporter observables.
   */
  patch<TResponse>(endpoint: string, config: HTTPConfig): HTTPResponse<TResponse> {
    return this.fetch<TResponse>(endpoint, { ...config, method: "PATCH" });
  }
}
