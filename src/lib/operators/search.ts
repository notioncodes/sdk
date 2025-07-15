import { HTTP, HTTPResponse, type HTTPConfig } from "$lib/util/http/client";
import { add, set } from "@mateothegreat/ts-kit/observability/metrics/operations";
import { Reporter } from "@mateothegreat/ts-kit/observability/metrics/reporter";
import type { Search, SearchResponse } from "@notion.codes/types";
import { EMPTY, Subject } from "rxjs";
import { expand, takeUntil } from "rxjs/operators";
import { Operator } from "./operator";

/**
 * Operator for searching across Notion with streaming pagination support.
 */
export class SearchOperator extends Operator<Search, SearchResponse> {
  /**
   * Execute the operator with the given request and configuration with streaming
   * pagination support.
   *
   * @param payload - The search request payload.
   * @param httpConfig - The HTTP configuration.
   *
   * @returns Observables of response stream.
   */
  execute(request: Search, httpConfig: HTTPConfig): HTTPResponse<SearchResponse> {
    const reporter = new Reporter({
      stage: "requesting",
      requests: 0,
      total: 0,
      cursor: null,
      errors: 0,
      successful: 0,
      throughput: 0,
      latency: 0
    });
    const cancelSubject = new Subject<void>();
    return this.createPaginatedStream(request, httpConfig, cancelSubject, reporter);
  }

  /**
   * Create a paginated stream that handles cursor-based pagination automatically.
   */
  private createPaginatedStream(
    request: Search,
    httpConfig: HTTPConfig,
    cancelSubject: Subject<void>,
    reporter: Reporter
  ): HTTPResponse<SearchResponse> {
    const http = new HTTP();
    const fetchPage = (request: Search): HTTPResponse<SearchResponse> => {
      const httpResponse = http.post<SearchResponse>(`/search`, {
        baseUrl: httpConfig.baseUrl,
        timeout: httpConfig.timeout,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
          ...httpConfig.headers
        },
        body: request
      });
      return httpResponse;
    };

    const initial = fetchPage(request);
    const data$ = initial.data$.pipe(
      expand((response) => {
        if (response.has_more && response.next_cursor) {
          reporter.apply(
            set("stage", "requesting"),
            add("requests", 1),
            add("total", response.results.length),
            set("cursor", response.next_cursor)
          );
          return fetchPage({
            ...request,
            start_cursor: response.next_cursor
          }).data$;
        }
        reporter.apply(
          set("stage", "complete"),
          set("cursor", null),
          add("requests", 1),
          add("total", response.results.length)
        );
        return EMPTY;
      }),
      takeUntil(cancelSubject)
    );

    return new HTTPResponse(data$, initial.raw$, reporter, () => cancelSubject.next());
  }
}
