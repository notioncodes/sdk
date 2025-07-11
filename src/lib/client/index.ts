import { NotionContext, NotionConfig, QueryConfig } from "./notion-context";
import { QueryBuilder } from "./query-builder";
import { createDatabaseSchema, DatabaseSchemaBuilder } from "../schemas/core/database-schema";
import { type } from "arktype";

// Re-export all types and utilities
export * from "../schemas/core/branded-types";
export * from "../schemas/core/property-schemas";
export * from "../schemas/core/database-schema";
export { NotionContext, NotionConfig, QueryConfig };
export { QueryBuilder };

// Main factory function
export function createNotionClient(config: NotionConfig): NotionContext {
  return new NotionContext(config);
}

// Convenience exports for schema building
export { createDatabaseSchema, DatabaseSchemaBuilder, type };

// Example usage demonstrating all three tiers:

/*
// Tier 1: Simple string-based commands
const notion = createNotionClient({ auth: process.env.NOTION_API_KEY! });

const pages = await notion.export('pages');
const users = await notion.query('users where type = "person"');

// Tier 2: Fluent builder pattern with type safety
const taskSchema = createDatabaseSchema({
  title: 'title',
  status: 'select',
  priority: 'number',
  dueDate: 'date',
  assignee: 'people'
});

const tasks = await notion
  .database(taskSchema)
  .where('status', 'todo')
  .where('priority', 5, 'greater_than')
  .orderBy('dueDate', 'ascending')
  .limit(50)
  .stream();

// Even more type-safe with property accessors
const urgentTasks = await notion
  .database(taskSchema)
  .prop('status').equals('in-progress')
  .prop('priority').greaterThan(3)
  .prop('dueDate').before(new Date().toISOString())
  .execute();

// Tier 3: Advanced configuration pattern
const config: QueryConfig = {
  type: 'database',
  id: 'db-uuid',
  filter: {
    and: [
      { property: 'status', equals: 'active' },
      { property: 'priority', greater_than: 5 }
    ]
  },
  sorts: [{ property: 'createdTime', direction: 'descending' }],
  pageSize: 100
};

const stream = notion.stream(config);

// Proxy-based dynamic access
const page = await notion.getPage('page-id');
const updatedPage = await notion.updatePage('page-id', { 
  properties: { 
    title: { title: [{ text: { content: 'New Title' } }] } 
  } 
});
*/