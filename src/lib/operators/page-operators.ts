import { from, Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { DatabaseId, PageId } from "../schemas/types/brands";
import type { Page, PageProperties } from "../schemas/types/pages";
import { Operator, type NotionConfig } from "./operator";

/**
 * Request type for getting a page.
 */
export interface GetPageRequest {
  pageId: PageId;
  filterProperties?: string[];
}

/**
 * Request type for creating a page.
 */
export interface CreatePageRequest {
  parent: {
    database_id?: DatabaseId;
    page_id?: PageId;
    workspace?: boolean;
  };
  properties: PageProperties;
  children?: any[];
  icon?: any;
  cover?: any;
}

/**
 * Request type for updating a page.
 */
export interface UpdatePageRequest {
  pageId: PageId;
  properties?: PageProperties;
  icon?: any;
  cover?: any;
  archived?: boolean;
}

/**
 * Request type for listing pages.
 */
export interface ListPagesRequest {
  startCursor?: string;
  pageSize?: number;
  filter?: {
    property?: string;
    value?: any;
  };
}

/**
 * Operator for retrieving a single page.
 *
 * @example
 * ```typescript
 * const getPageOp = new GetPageOperator();
 * const result$ = getPageOp.run(
 *   { pageId: toPageId('...') },
 *   context
 * );
 * ```
 */
export class GetPageOperator extends Operator<GetPageRequest, Page> {
  protected schemaName = "notion.page";

  execute(request: GetPageRequest, context: NotionConfig): Observable<Page> {
    const url = `${context.baseUrl}/pages/${request.pageId}`;
    const queryParams = request.filterProperties ? `?filter_properties=${request.filterProperties.join(",")}` : "";

    return from(
      fetch(url + queryParams, {
        method: "GET",
        headers: context.headers
      })
    ).pipe(
      map(response => {
        if (!response.ok) {
          throw new Error(`Failed to get page: ${response.statusText}`);
        }
        return response.json();
      }),
      map(data => data as Page)
      mergeMap(async response => {
        if (!response.ok) {
          throw new Error(`Failed to get page: ${response.statusText}`);
        }
        return response.json() as Promise<Page>;
      })
    );
  }
}

/**
 * Operator for creating a new page.
 *
 * @example
 * ```typescript
 * const createPageOp = new CreatePageOperator();
 * const result$ = createPageOp.run(
 *   {
 *     parent: { database_id: toDatabaseId('...') },
 *     properties: { title: { ... } }
 *   },
 *   context
 * );
 * ```
 */
export class CreatePageOperator extends Operator<CreatePageRequest, Page> {
  protected schemaName = "notion.page";

  execute(request: CreatePageRequest, context: NotionConfig): Observable<Page> {
    return from(
      fetch(`${context.baseUrl}/pages`, {
        method: "POST",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      })
    ).pipe(
      map((response) => {
        if (!response.ok) {
          throw new Error(`Failed to create page: ${response.statusText}`);
        }
        return response.json();
      }),
      map((data) => data as Page)
    );
  }
}

/**
 * Operator for updating an existing page.
 *
 * @example
 * ```typescript
 * const updatePageOp = new UpdatePageOperator();
 * const result$ = updatePageOp.run(
 *   {
 *     pageId: toPageId('...'),
 *     properties: { title: { ... } }
 *   },
 *   context
 * );
 * ```
 */
export class UpdatePageOperator extends Operator<UpdatePageRequest, Page> {
  protected schemaName = "notion.page";

  execute(request: UpdatePageRequest, context: NotionConfig): Observable<Page> {
    const { pageId, ...updateData } = request;

    return from(
      fetch(`${context.baseUrl}/pages/${pageId}`, {
        method: "PATCH",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      })
    ).pipe(
      map((response) => {
        if (!response.ok) {
          throw new Error(`Failed to update page: ${response.statusText}`);
        }
        return response.json();
      }),
      map((data) => data as Page)
    );
  }
}

/**
 * Operator for archiving/deleting a page.
 *
 * @example
 * ```typescript
 * const archivePageOp = new ArchivePageOperator();
 * const result$ = archivePageOp.run(
 *   { pageId: toPageId('...') },
 *   context
 * );
 * ```
 */
export class ArchivePageOperator extends Operator<{ pageId: PageId }, Page> {
  protected schemaName = "notion.page";

  execute(request: { pageId: PageId }, context: NotionConfig): Observable<Page> {
    return from(
      fetch(`${context.baseUrl}/pages/${request.pageId}`, {
        method: "PATCH",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ archived: true })
      })
    ).pipe(
      map((response) => {
        if (!response.ok) {
          throw new Error(`Failed to archive page: ${response.statusText}`);
        }
        return response.json();
      }),
      map((data) => data as Page)
    );
  }
}

/**
 * Factory functions for creating page operators.
 */
export const pageOperators = {
  get: () => new GetPageOperator(),
  create: () => new CreatePageOperator(),
  update: () => new UpdatePageOperator(),
  archive: () => new ArchivePageOperator()
};
