import { type } from "arktype";

// Unique symbols for branding
declare const PageIdBrand: unique symbol;
declare const DatabaseIdBrand: unique symbol;
declare const BlockIdBrand: unique symbol;
declare const UserIdBrand: unique symbol;
declare const CommentIdBrand: unique symbol;
declare const WorkspaceIdBrand: unique symbol;

// Branded type definitions
export type PageId = string & { [PageIdBrand]: true };
export type DatabaseId = string & { [DatabaseIdBrand]: true };
export type BlockId = string & { [BlockIdBrand]: true };
export type UserId = string & { [UserIdBrand]: true };
export type CommentId = string & { [CommentIdBrand]: true };
export type WorkspaceId = string & { [WorkspaceIdBrand]: true };

// ArkType schemas with validation
export const pageIdSchema = type("string").narrow((s): s is PageId => 
  /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/.test(s.replace(/-/g, ''))
);

export const databaseIdSchema = type("string").narrow((s): s is DatabaseId => 
  /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/.test(s.replace(/-/g, ''))
);

export const blockIdSchema = type("string").narrow((s): s is BlockId => 
  /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/.test(s.replace(/-/g, ''))
);

export const userIdSchema = type("string").narrow((s): s is UserId => 
  /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/.test(s.replace(/-/g, ''))
);

export const commentIdSchema = type("string").narrow((s): s is CommentId => 
  /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/.test(s.replace(/-/g, ''))
);

export const workspaceIdSchema = type("string").narrow((s): s is WorkspaceId => 
  /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/.test(s.replace(/-/g, ''))
);

// Safe casting functions with validation
export const toPageId = (id: string): PageId => {
  const result = pageIdSchema(id);
  if (result instanceof type.errors) {
    throw new Error(`Invalid PageId: ${id}`);
  }
  return result;
};

export const toDatabaseId = (id: string): DatabaseId => {
  const result = databaseIdSchema(id);
  if (result instanceof type.errors) {
    throw new Error(`Invalid DatabaseId: ${id}`);
  }
  return result;
};

export const toBlockId = (id: string): BlockId => {
  const result = blockIdSchema(id);
  if (result instanceof type.errors) {
    throw new Error(`Invalid BlockId: ${id}`);
  }
  return result;
};

export const toUserId = (id: string): UserId => {
  const result = userIdSchema(id);
  if (result instanceof type.errors) {
    throw new Error(`Invalid UserId: ${id}`);
  }
  return result;
};

export const toCommentId = (id: string): CommentId => {
  const result = commentIdSchema(id);
  if (result instanceof type.errors) {
    throw new Error(`Invalid CommentId: ${id}`);
  }
  return result;
};

export const toWorkspaceId = (id: string): WorkspaceId => {
  const result = workspaceIdSchema(id);
  if (result instanceof type.errors) {
    throw new Error(`Invalid WorkspaceId: ${id}`);
  }
  return result;
};

// Type guards
export const isPageId = (value: unknown): value is PageId => {
  return typeof value === 'string' && pageIdSchema.allows(value);
};

export const isDatabaseId = (value: unknown): value is DatabaseId => {
  return typeof value === 'string' && databaseIdSchema.allows(value);
};

export const isBlockId = (value: unknown): value is BlockId => {
  return typeof value === 'string' && blockIdSchema.allows(value);
};

export const isUserId = (value: unknown): value is UserId => {
  return typeof value === 'string' && userIdSchema.allows(value);
};

export const isCommentId = (value: unknown): value is CommentId => {
  return typeof value === 'string' && commentIdSchema.allows(value);
};

export const isWorkspaceId = (value: unknown): value is WorkspaceId => {
  return typeof value === 'string' && workspaceIdSchema.allows(value);
};