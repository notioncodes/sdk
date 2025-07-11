import { from, Observable } from "rxjs";
import { mergeMap } from "rxjs/operators";
import type { Block } from "../schemas/types/blocks";
import type { BlockId, PageId } from "../schemas/types/brands";
import type { ListResponse } from "../schemas/types/reponses";
import { Operator, type NotionConfig } from "./operator";

/**
 * Request type for getting a block.
 */
export interface GetBlockRequest {
  blockId: BlockId;
}

/**
 * Request type for getting block children.
 */
export interface GetBlockChildrenRequest {
  blockId: BlockId;
  startCursor?: string;
  pageSize?: number;
}

/**
 * Request type for appending blocks.
 */
export interface AppendBlockChildrenRequest {
  blockId: BlockId | PageId;
  children: any[];
}

/**
 * Request type for updating a block.
 */
export interface UpdateBlockRequest {
  blockId: BlockId;
  type?: string;
  archived?: boolean;
  [key: string]: any;
}

/**
 * Request type for deleting a block.
 */
export interface DeleteBlockRequest {
  blockId: BlockId;
}

/**
 * Response type for block children.
 */
export interface BlockChildrenResponse extends ListResponse {
  results: Block[];
}

/**
 * Operator for retrieving a single block.
 */
export class GetBlockOperator extends Operator<GetBlockRequest, Block> {
  protected schemaName = "notion.block";

  execute(request: GetBlockRequest, context: NotionConfig): Observable<Block> {
    const url = `${context.baseUrl}/blocks/${request.blockId}`;

    return from(
      fetch(url, {
        method: "GET",
        headers: context.headers
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to get block: ${response.statusText}`);
        }
        return response.json() as Promise<Block>;
      })
    );
  }
}

/**
 * Operator for retrieving block children.
 *
 * @example
 * ```typescript
 * const getChildrenOp = new GetBlockChildrenOperator();
 * const children$ = getChildrenOp.run(
 *   { blockId: toBlockId('...') },
 *   context
 * );
 * ```
 */
export class GetBlockChildrenOperator extends Operator<GetBlockChildrenRequest, BlockChildrenResponse> {
  protected schemaName = "notion.listBlockChildren";

  execute(request: GetBlockChildrenRequest, context: NotionConfig): Observable<BlockChildrenResponse> {
    const { blockId, startCursor, pageSize } = request;
    const url = `${context.baseUrl}/blocks/${blockId}/children`;
    const params = new URLSearchParams();

    if (startCursor) params.append("start_cursor", startCursor);
    if (pageSize) params.append("page_size", pageSize.toString());

    const queryString = params.toString();
    const finalUrl = queryString ? `${url}?${queryString}` : url;

    return from(
      fetch(finalUrl, {
        method: "GET",
        headers: context.headers
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to get block children: ${response.statusText}`);
        }
        return response.json() as Promise<BlockChildrenResponse>;
      })
    );
  }
}

/**
 * Operator for appending block children.
 *
 * @example
 * ```typescript
 * const appendOp = new AppendBlockChildrenOperator();
 * const result$ = appendOp.run(
 *   {
 *     blockId: toPageId('...'),
 *     children: [
 *       {
 *         type: 'paragraph',
 *         paragraph: {
 *           rich_text: [{ text: { content: 'Hello' } }]
 *         }
 *       }
 *     ]
 *   },
 *   context
 * );
 * ```
 */
export class AppendBlockChildrenOperator extends Operator<AppendBlockChildrenRequest, Block> {
  protected schemaName = "notion.block";

  execute(request: AppendBlockChildrenRequest, context: NotionConfig): Observable<Block> {
    const { blockId, children } = request;

    return from(
      fetch(`${context.baseUrl}/blocks/${blockId}/children`, {
        method: "PATCH",
        headers: {
          ...context.headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ children })
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to append block children: ${response.statusText}`);
        }
        return response.json() as Promise<Block>;
      })
    );
  }
}

/**
 * Operator for updating a block.
 */
export class UpdateBlockOperator extends Operator<UpdateBlockRequest, Block> {
  protected schemaName = "notion.block";

  execute(request: UpdateBlockRequest, context: NotionConfig): Observable<Block> {
    const { blockId, ...updateData } = request;

    return from(
      fetch(`${context.baseUrl}/blocks/${blockId}`, {
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
          throw new Error(`Failed to update block: ${response.statusText}`);
        }
        return response.json() as Promise<Block>;
      })
    );
  }
}

/**
 * Operator for deleting (archiving) a block.
 */
export class DeleteBlockOperator extends Operator<DeleteBlockRequest, Block> {
  protected schemaName = "notion.block";

  execute(request: DeleteBlockRequest, context: NotionConfig): Observable<Block> {
    return from(
      fetch(`${context.baseUrl}/blocks/${request.blockId}`, {
        method: "DELETE",
        headers: context.headers
      })
    ).pipe(
      mergeMap(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to delete block: ${response.statusText}`);
        }
        return response.json() as Promise<Block>;
      })
    );
  }
}

/**
 * Factory functions for creating block operators.
 */
export const blockOperators = {
  get: () => new GetBlockOperator(),
  getChildren: () => new GetBlockChildrenOperator(),
  append: () => new AppendBlockChildrenOperator(),
  update: () => new UpdateBlockOperator(),
  delete: () => new DeleteBlockOperator()
};
