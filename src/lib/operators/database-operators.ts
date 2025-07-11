import { from, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import type { DatabaseId } from "../schemas/types/brands";
import type { Database, DatabaseProperties } from "../schemas/types/databases";
import type { ListResponse, PageOrDatabase } from "../schemas/types/reponses";
import { Operator, type NotionConfig } from "./operator";

/**
 * Request type for getting a database.
 */
export interface GetDatabaseRequest {
  databaseId: DatabaseId;
}

/**
 * Request type for creating a database.
 */
export interface CreateDatabaseRequest {
  parent: {
    page_id: string;
  };
  title: any[];
  properties: DatabaseProperties;
  icon?: any;
  cover?: any;
}

/**
 * Request type for updating a database.
 */
export interface UpdateDatabaseRequest {
  databaseId: DatabaseId;
  title?: any[];
  description?: any[];
  properties?: DatabaseProperties;
  icon?: any;
  cover?: any;
  archived?: boolean;
}

/**
 * Request type for querying a database.
 */
export interface QueryDatabaseRequest {
  databaseId: DatabaseId;
  filter?: any;
  sorts?: any[];
  startCursor?: string;
  pageSize?: number;
}

/**
 * Response type for database queries.
 */
export interface QueryDatabaseResponse extends ListResponse {
  results: PageOrDatabase[];
}

/**
 * Operator for retrieving a single database.
 */
export class GetDatabaseOperator extends Operator<GetDatabaseRequest, Database> {
  protected schemaName = "notion.database";

  execute(request: GetDatabaseRequest, context: NotionConfig): Observable<Database> {
    const url = `${context.baseUrl}/databases/${request.databaseId}`;

    return from(
      fetch(url, {
        method: "GET",
        headers: context.headers
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to get database: ${response.statusText}`);
        }
        return response.json() as Promise<Database>;
      })
    );
  }
}

/**
 * Operator for creating a new database.
 */
export class CreateDatabaseOperator extends Operator<CreateDatabaseRequest, Database> {
  protected schemaName = "notion.database";

  execute(request: CreateDatabaseRequest, context: NotionConfig): Observable<Database> {
    return from(
      fetch(`${context.baseUrl}/databases`, {
        method: "POST",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to create database: ${response.statusText}`);
        }
        return response.json() as Promise<Database>;
      })
    );
  }
}

/**
 * Operator for updating an existing database.
 */
export class UpdateDatabaseOperator extends Operator<UpdateDatabaseRequest, Database> {
  protected schemaName = "notion.database";

  execute(request: UpdateDatabaseRequest, context: NotionConfig): Observable<Database> {
    const { databaseId, ...updateData } = request;

    return from(
      fetch(`${context.baseUrl}/databases/${databaseId}`, {
        method: "PATCH",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to update database: ${response.statusText}`);
        }
        return response.json() as Promise<Database>;
      })
    );
  }
}

/**
 * Operator for querying a database.
 *
 * @example
 * ```typescript
 * const queryOp = new QueryDatabaseOperator();
 * const results$ = queryOp.run(
 *   {
 *     databaseId: toDatabaseId('...'),
 *     filter: {
 *       property: 'Status',
 *       select: { equals: 'Done' }
 *     }
 *   },
 *   context
 * );
 * ```
 */
export class QueryDatabaseOperator extends Operator<QueryDatabaseRequest, QueryDatabaseResponse> {
  protected schemaName = "notion.queryDatabase";

  execute(request: QueryDatabaseRequest, context: NotionConfig): Observable<QueryDatabaseResponse> {
    const { databaseId, ...queryParams } = request;

    return from(
      fetch(`${context.baseUrl}/databases/${databaseId}/query`, {
        method: "POST",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(queryParams)
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to query database: ${response.statusText}`);
        }
        return response.json() as Promise<QueryDatabaseResponse>;
      })
    );
  }
}

/**
 * Factory functions for creating database operators.
 */
export const databaseOperators = {
  get: () => new GetDatabaseOperator(),
  create: () => new CreateDatabaseOperator(),
  update: () => new UpdateDatabaseOperator(),
  query: () => new QueryDatabaseOperator()
};
