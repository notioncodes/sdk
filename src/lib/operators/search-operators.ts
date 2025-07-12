import { from, Observable, throwError } from "rxjs";
import { fromFetch } from "rxjs/fetch";
import { catchError, switchMap, tap } from "rxjs/operators";
import type { ListResponse, PageOrDatabase } from "../schemas/types/reponses";
import type { SearchBody } from "../schemas/types/search";
import { log } from "../util/logging";
import { Operator, type OperatorConfig } from "./operator";

/**
 * Response type for search results.
 */
export interface SearchResponse extends ListResponse {
  results: PageOrDatabase[];
}

/**
 * Operator for searching across Notion workspace.
 *
 * @example
 * ```typescript
 * const searchOp = new SearchOperator();
 * const results$ = searchOp.run(
 *   {
 *     query: 'meeting notes',
 *     filter: { property: 'object', value: 'page' }
 *   },
 *   context
 * );
 * ```
 */
export class SearchOperator extends Operator<SearchBody, SearchResponse> {
  protected schemaName = "notion.search";

  execute(request: SearchBody, context: OperatorConfig): Observable<SearchResponse> {
    const body: any = {
      query: request.query
    };

    if (request.filter) {
      body.filter = request.filter;
    }

    if (request.sort) {
      body.sort = request.sort;
    }

    if (request.start_cursor) {
      body.start_cursor = request.start_cursor;
    }

    if (request.page_size) {
      body.page_size = request.page_size;
    }

    log.debug("search-operator", body);

    try {
      return fromFetch(`${context.baseUrl}/search`, {
        method: "POST",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }).pipe(
        tap((response) => {
          log.debug("http response", {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
          });
        }),
        switchMap((response) => {
          if (!response.ok) {
            return from(response.text()).pipe(
              switchMap((errorText) => {
                log.error("http error", errorText);
                throw new Error(`Search failed: ${response.status} ${response.statusText} - ${errorText}`);
              })
            );
          }

          return from(response.json()).pipe(
            tap((json) => {
              log.debug("http response json", json);
            })
          );
        }),
        catchError((error) => {
          log.error("search operator error", error);
          if (error.name === "TypeError" && error.message.includes("fetch")) {
            log.error("network error", "check internet connection and API endpoint");
          }
          return throwError(() => error);
        })
      );
    } catch (error) {
      log.error("search operator setup error", error);
      return throwError(() => error);
    }
  }
}
