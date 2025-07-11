// Main exports for the optimized Notion SDK
export * from './lib/client';

// Also export the original client wrapper for backward compatibility
export { NotionClient } from './lib/client';

// Export branded types
export {
  PageId, DatabaseId, BlockId, UserId, CommentId, WorkspaceId,
  toPageId, toDatabaseId, toBlockId, toUserId, toCommentId, toWorkspaceId
} from './lib/schemas/core/branded-types';

// Export property schemas
export {
  PropertyType, PropertyValue, PropertyConfig,
  propertyTypes, colorSchema, Color
} from './lib/schemas/core/property-schemas';

// Export database schemas
export {
  createDatabaseSchema, DatabaseSchemaBuilder,
  DatabaseSchema, InferDatabaseSchema,
  PropertyFilter, CompoundFilter, PropertyFilterMap,
  DatabaseQuery, SortDirection
} from './lib/schemas/core/database-schema';

// Export existing schemas for compatibility (selective to avoid conflicts)
export {
  apiColorSchema, ApiColor,
  emojiSchema, fileSchema, File,
  iconSchema, Icon, coverSchema, Cover,
  parentSchema, Parent,
  annotationsSchema, Annotations,
  textContentSchema, richTextItemSchema, RichTextItem,
  userSchema, User,
  mentionItemSchema, MentionItem
} from './lib/schemas/schemas';

export * from './lib/schemas/pages';
export * from './lib/schemas/blocks';

// Export utilities
export * from './lib/util/types';
export * from './lib/util/logging';