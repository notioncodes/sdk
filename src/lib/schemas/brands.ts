/**
 * Creates a branded type to ensure type safety for different ID types.
 *
 * @template Brand - The brand identifier for the type.
 */
export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

/**
 * Page identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const pageId: PageId = 'page_abc123' as PageId;
 * ```
 */
export type PageId = Branded<string, "PageId">;

/**
 * Database identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const dbId: DatabaseId = 'db_xyz789' as DatabaseId;
 * ```
 */
export type DatabaseId = Branded<string, "DatabaseId">;

/**
 * Block identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const blockId: BlockId = 'block_def456' as BlockId;
 * ```
 */
export type BlockId = Branded<string, "BlockId">;

/**
 * User identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const userId: UserId = 'user_ghi789' as UserId;
 * ```
 */
export type UserId = Branded<string, "UserId">;

/**
 * Comment identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const commentId: CommentId = 'comment_jkl012' as CommentId;
 * ```
 */
export type CommentId = Branded<string, "CommentId">;

/**
 * Workspace identifier with compile-time type safety.
 *
 * @example
 * ```typescript
 * const workspaceId: WorkspaceId = 'workspace_mno345' as WorkspaceId;
 * ```
 */
export type WorkspaceId = Branded<string, "WorkspaceId">;

export const toPageId = (id: string): PageId => id as PageId;
export const toDatabaseId = (id: string): DatabaseId => id as DatabaseId;
export const toBlockId = (id: string): BlockId => id as BlockId;
