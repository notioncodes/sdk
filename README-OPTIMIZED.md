# Optimized Notion SDK with ArkType

This optimized implementation provides a type-safe, developer-friendly Notion client with three levels of API access, powered by ArkType for robust schema validation and type inference.

## Key Features

- **Type-Safe IDs**: Branded types for PageId, DatabaseId, BlockId, etc.
- **Schema-Driven Development**: Define database schemas with full type inference
- **Three-Tier API**: Progressive disclosure from simple to advanced usage
- **Streaming Support**: RxJS-based streaming for large datasets
- **Dynamic Proxy Methods**: Intuitive method generation based on context
- **Advanced Validation**: ArkType-powered schema validation and transformation

## Installation

```bash
npm install @notionkit/sdk
```

## Three-Tier API Pattern

### Tier 1: Simple String-Based Commands

Perfect for quick scripts and simple queries:

```typescript
import { createNotionClient } from '@notionkit/sdk';

const notion = createNotionClient({ auth: process.env.NOTION_API_KEY! });

// Export all pages
const pages = await notion.export('pages');

// Query with SQL-like syntax
const users = await notion.query('users where type = "person"');
const activeTasks = await notion.query('pages where status = "active" and priority > 3');
```

### Tier 2: Fluent Builder Pattern

Type-safe queries with IntelliSense support:

```typescript
import { createDatabaseSchema } from '@notionkit/sdk';

// Define your database schema
const taskSchema = createDatabaseSchema({
  title: 'title',
  status: 'select',
  priority: 'number',
  dueDate: 'date',
  assignee: 'people',
  completed: 'checkbox'
});

// Query with full type safety
const urgentTasks = await notion
  .database(taskSchema)
  .where('status', 'in-progress')
  .where('priority', 3, 'greater_than')
  .orderBy('dueDate', 'ascending')
  .limit(50)
  .execute();

// Use property accessors for even better type safety
const overdueTasks = await notion
  .database(taskSchema)
  .prop('status').notEquals('completed')
  .prop('dueDate').before(new Date().toISOString())
  .prop('completed').equals(false)
  .stream(); // Returns Observable<Task>
```

### Tier 3: Advanced Configuration Pattern

Maximum control for complex scenarios:

```typescript
const config: QueryConfig = {
  type: 'database',
  id: 'db-uuid',
  filter: {
    and: [
      { property: 'status', equals: 'active' },
      { property: 'priority', greater_than: 5 },
      {
        or: [
          { property: 'assignee', contains: 'user-123' },
          { property: 'tags', contains: 'urgent' }
        ]
      }
    ]
  },
  sorts: [
    { property: 'priority', direction: 'descending' },
    { property: 'dueDate', direction: 'ascending' }
  ],
  pageSize: 100
};

const results = await notion.execute(config);
const stream = notion.stream(config);
```

## Schema Definition

### Using the Schema Builder

```typescript
import { DatabaseSchemaBuilder } from '@notionkit/sdk';

const projectSchema = new DatabaseSchemaBuilder()
  .addProperty('name', 'title')
  .addProperty('status', 'status')
  .addProperty('startDate', 'date')
  .addProperty('endDate', 'date')
  .addProperty('budget', 'number')
  .addProperty('team', 'people')
  .addProperty('files', 'files')
  .build();

// Register schema for reuse
const projectDbId = notion.registerSchema('projects', projectSchema);
```

### Custom Validation with ArkType

```typescript
import { type } from '@notionkit/sdk';

const customTaskSchema = type({
  title: type('string').pipe(s => 
    s.length > 0 ? s : type.errors('Title cannot be empty')
  ),
  priority: type('1 | 2 | 3 | 4 | 5'),
  status: type("'todo' | 'in-progress' | 'done' | 'archived'"),
  dueDate: type('string').narrow((s): s is string => {
    const date = new Date(s);
    return !isNaN(date.getTime()) && date > new Date();
  }),
  tags: type('string[]').pipe(tags => 
    tags.length <= 5 ? tags : type.errors('Maximum 5 tags allowed')
  )
});
```

## Dynamic Proxy Methods

The client uses a Proxy to enable intuitive method calls:

```typescript
// CRUD operations with dynamic methods
const page = await notion.getPage('page-id');
const database = await notion.getDatabase('db-id');
const user = await notion.getUser('user-id');

// Create resources
const newPage = await notion.createPage({
  parent: { database_id: 'db-id' },
  properties: { /* ... */ }
});

// Update resources
const updated = await notion.updatePage('page-id', {
  properties: { /* ... */ }
});

// Delete resources
await notion.deleteBlock('block-id');
```

## Streaming and Pagination

### Streaming Results

```typescript
const taskStream = notion
  .database(taskSchema)
  .where('status', 'active')
  .stream();

taskStream.subscribe({
  next: (task) => console.log('Task:', task),
  error: (err) => console.error('Error:', err),
  complete: () => console.log('Stream completed')
});
```

### Manual Pagination

```typescript
let cursor: string | undefined;
let allTasks: Task[] = [];

do {
  const batch = await notion
    .database(taskSchema)
    .cursor(cursor!)
    .limit(100)
    .execute();
  
  allTasks = allTasks.concat(batch);
  cursor = batch[batch.length - 1]?.id;
} while (cursor);
```

## Advanced Features

### Count and Existence Checks

```typescript
// Count total items
const total = await notion
  .database(taskSchema)
  .where('status', 'active')
  .count();

// Check if any items exist
const hasUrgent = await notion
  .database(taskSchema)
  .where('priority', 5)
  .exists();

// Get first matching item
const mostUrgent = await notion
  .database(taskSchema)
  .orderBy('priority', 'descending')
  .first();
```

### Type-Safe Property Selection

```typescript
// Select specific properties with type inference
const summaries = await notion
  .database(taskSchema)
  .select('title', 'status', 'priority')
  .where('completed', false)
  .execute();
// Type: Array<{ title: string, status: SelectOption, priority: number }>
```

## Type Safety Benefits

1. **Compile-Time Validation**: Catch errors before runtime
2. **IntelliSense Support**: Full autocompletion for properties and methods
3. **Type Inference**: Automatic type inference from schemas
4. **Branded Types**: Prevent mixing up different ID types
5. **Schema Validation**: Runtime validation with helpful error messages

## Migration from Original Client

The optimized client is designed to work alongside the original Notion client:

```typescript
// Original client still available
import { NotionClient } from '@notionkit/sdk';

// New optimized client
import { createNotionClient } from '@notionkit/sdk';

// Both can coexist in the same project
const oldClient = new NotionClient({ apiKey: 'key' });
const newClient = createNotionClient({ auth: 'key' });
```

## Best Practices

1. **Define Schemas Early**: Create schemas at the start of your project
2. **Use Branded Types**: Always use toPageId(), toDatabaseId() for type safety
3. **Leverage Type Inference**: Let TypeScript infer types from schemas
4. **Stream Large Datasets**: Use streaming for better memory efficiency
5. **Validate User Input**: Use ArkType schemas to validate external data

## Performance Considerations

- **Streaming**: Use `.stream()` for large datasets to avoid memory issues
- **Pagination**: Set appropriate page sizes based on your use case
- **Caching**: The schema registry caches schemas for better performance
- **Validation**: Schema validation is optimized and only runs when needed

## Error Handling

```typescript
try {
  const result = await notion
    .database(taskSchema)
    .where('invalidProperty', 'value') // TypeScript error!
    .execute();
} catch (error) {
  if (error instanceof NotionAPIError) {
    console.error('API Error:', error.code, error.message);
  } else if (error instanceof ValidationError) {
    console.error('Validation Error:', error.details);
  }
}
```

## Contributing

This optimized implementation demonstrates how ArkType can enhance the developer experience when working with the Notion API. Feel free to extend and customize it for your specific needs!