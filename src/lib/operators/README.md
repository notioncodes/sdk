# Notion Operator Architecture

This architecture provides a powerful, type-safe, and composable way to interact with the Notion API using operators, RxJS streams, and arktype validation.

## Overview

The operator architecture consists of several key components:

1. **Base Operator Class**: Abstract class providing core functionality for all API operations
2. **Specific Operators**: Concrete implementations for different Notion API endpoints
3. **Operator Pipeline**: Composition and streaming utilities
4. **Schema Integration**: Type validation using arktype schemas
5. **RxJS Streaming**: Reactive programming for handling async operations and data streams

## Core Concepts

### Operators

Operators are the fundamental building blocks for API interactions. Each operator:

- Encapsulates a specific API operation
- Provides type safety for requests and responses
- Handles validation, retries, and error handling
- Supports streaming and composition

```typescript
class GetPageOperator extends Operator<GetPageRequest, Page> {
  protected schemaName = "notion.page";
  
  execute(request: GetPageRequest, context: OperatorContext): Observable<Page> {
    // Implementation
  }
}
```

### Operator Context

The `OperatorContext` provides shared resources:

- Schema loader for validation
- Base URL and headers
- Request ID for tracking
- Metadata for debugging

### Operator Pipeline

The pipeline manages operator execution and provides:

- Configuration management
- Streaming with pagination
- Batch operations
- Caching support
- Progress tracking

## Usage Examples

### Basic Page Retrieval

```typescript
import { createPipeline, pageOperators } from '@notionkit/sdk/operators';
import { createNotionSchemaLoader } from '@notionkit/sdk/schemas';
import { toPageId } from '@notionkit/sdk/types';

// Initialize
const pipeline = createPipeline({
  schemaLoader: createNotionSchemaLoader(),
  headers: {
    'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28'
  }
});

// Get a page
const getPage = pageOperators.get();
const page$ = pipeline.execute(getPage, {
  pageId: toPageId('your-page-id')
});

page$.subscribe({
  next: result => console.log('Page:', result.data),
  error: err => console.error('Error:', err)
});
```

### Database Query with Streaming

```typescript
// Query database with pagination
const queryOp = databaseOperators.query();
const results$ = pipeline.stream(
  queryOp,
  {
    databaseId: toDatabaseId('your-database-id'),
    filter: {
      property: 'Status',
      select: { equals: 'In Progress' }
    }
  },
  response => response.next_cursor,
  response => response.results
);

// Process streamed results
results$.pipe(
  filter(item => item.object === 'page'),
  map(page => ({
    id: page.id,
    title: getPageTitle(page)
  })),
  take(100)
).subscribe({
  next: page => console.log('Found:', page)
});
```

### Operator Composition

```typescript
// Chain operations: create page then add content
const createPageOp = pageOperators.create();
const addBlocksOp = blockOperators.append();

const createWithContent$ = pipeline.execute(createPageOp, {
  parent: { database_id: toDatabaseId('db-id') },
  properties: {
    Name: {
      title: [{ text: { content: 'New Page' } }]
    }
  }
}).pipe(
  mergeMap(pageResult => 
    pipeline.execute(addBlocksOp, {
      blockId: pageResult.data.id,
      children: [
        {
          type: 'heading_1',
          heading_1: {
            rich_text: [{ text: { content: 'Welcome' } }]
          }
        }
      ]
    })
  )
);
```

### Batch Operations

```typescript
// Execute multiple operations in parallel
const batch$ = pipeline.batch([
  {
    operator: pageOperators.get(),
    request: { pageId: toPageId('page-1') }
  },
  {
    operator: databaseOperators.get(),
    request: { databaseId: toDatabaseId('db-1') }
  }
]);

batch$.subscribe({
  next: ([pageResult, dbResult]) => {
    console.log('Page:', pageResult.data);
    console.log('Database:', dbResult.data);
  }
});
```

### Custom Operators

```typescript
// Create a custom operator
const customOp = createOperator<string, CustomResponse>({
  schemaName: 'custom.response',
  execute: (request, context) => {
    return from(fetch(`${context.baseUrl}/custom/${request}`))
      .pipe(
        mergeMap(res => res.json()),
        map(data => data as CustomResponse)
      );
  },
  options: {
    retries: 5,
    validateResponse: true
  }
});

// Or extend the base class
class CustomOperator extends Operator<CustomRequest, CustomResponse> {
  protected schemaName = 'custom.schema';
  
  execute(request: CustomRequest, context: OperatorContext) {
    // Custom implementation
  }
}
```

### Higher-Order Operators

```typescript
// Add logging to any operator
const loggedOp = withLogging(searchOperators.all());

// Add metrics collection
const metricOp = withMetrics(
  pageOperators.get(),
  metrics => console.log('Metrics:', metrics)
);

// Use in pipeline
pipeline.execute(metricOp, { pageId: toPageId('...') });
```

### Stream Processing

```typescript
// Create a custom stream pipeline
const streamPipeline = pipeline.createStreamPipeline<PageOrDatabase>()
  .filter(item => item.object === 'page')
  .transform(page => ({
    id: page.id,
    title: getPageTitle(page),
    lastEdited: new Date(page.last_edited_time)
  }))
  .deduplicate(item => item.id)
  .batch(10, 5000) // Batch every 10 items or 5 seconds
  .rateLimit(100) // Max 100ms between items
  .handleErrors(error => {
    console.error('Stream error:', error);
    return []; // Continue processing
  });

// Apply to a stream
const processed$ = databaseResults$.pipe(streamPipeline.build());
```

## Available Operators

### Page Operators

- `GetPageOperator`: Retrieve a single page
- `CreatePageOperator`: Create a new page
- `UpdatePageOperator`: Update page properties
- `ArchivePageOperator`: Archive (soft delete) a page

### Database Operators

- `GetDatabaseOperator`: Retrieve database metadata
- `CreateDatabaseOperator`: Create a new database
- `UpdateDatabaseOperator`: Update database properties
- `QueryDatabaseOperator`: Query database contents

### Block Operators

- `GetBlockOperator`: Retrieve a single block
- `GetBlockChildrenOperator`: Get child blocks
- `AppendBlockChildrenOperator`: Add blocks to a page/block
- `UpdateBlockOperator`: Update block content
- `DeleteBlockOperator`: Delete a block

### Search Operators

- `SearchOperator`: Search all content
- `SearchPagesOperator`: Search only pages
- `SearchDatabasesOperator`: Search only databases

## Architecture Benefits

1. **Type Safety**: Full TypeScript support with arktype validation
2. **Composability**: Operators can be chained and composed
3. **Streaming**: Built-in support for handling large datasets
4. **Error Handling**: Automatic retries and error recovery
5. **Validation**: Schema validation for all API responses
6. **Testability**: Easy to mock and test individual operators
7. **Extensibility**: Simple to add new operators or customize existing ones
8. **Performance**: Efficient batching and caching support

## Best Practices

1. **Use Type Guards**: Always validate IDs with branded types

   ```typescript
   const pageId = toPageId('your-id-string');
   ```

2. **Handle Errors**: Subscribe to error callbacks

   ```typescript
   operator$.subscribe({
     next: result => { /* handle success */ },
     error: err => { /* handle error */ }
   });
   ```

3. **Clean Up Subscriptions**: Unsubscribe when done

   ```typescript
   const subscription = operator$.subscribe(/* ... */);
   // Later...
   subscription.unsubscribe();
   ```

4. **Use Streaming for Large Datasets**: Don't load everything at once

   ```typescript
   const stream$ = pipeline.stream(queryOp, request, getCursor, getItems);
   ```

5. **Compose for Complex Operations**: Chain operators for workflows

   ```typescript
   const workflow$ = createOp.pipe(updateOp).pipe(notifyOp);
   ```

## Testing

Operators are designed to be easily testable:

```typescript
describe('MyOperator', () => {
  it('should process request', async () => {
    const operator = new MyOperator();
    const mockContext: OperatorContext = {
      schemaLoader: mockSchemaLoader,
      baseUrl: 'https://api.test.com',
      headers: { Authorization: 'Bearer test' }
    };
    
    const result = await operator
      .run({ id: '123' }, mockContext)
      .toPromise();
    
    expect(result.data).toEqual(expectedData);
  });
});
```

## Integration with Schema Loader

The architecture integrates seamlessly with the lazy schema loader:

```typescript
// Schema validation happens automatically
const operator = new GetPageOperator(); // schemaName = 'notion.page'

// The schema loader validates responses
const result = await operator.run(request, context);
// result.data is guaranteed to match the Page schema
```

## Performance Considerations

1. **Lazy Loading**: Schemas are loaded on-demand
2. **Caching**: Responses can be cached to reduce API calls
3. **Batching**: Multiple operations can be batched
4. **Streaming**: Large datasets are processed incrementally
5. **Connection Pooling**: Reuse HTTP connections

## Future Enhancements

- WebSocket support for real-time updates
- GraphQL operator support
- Advanced caching strategies
- Offline support with sync
- Request/response interceptors
- Middleware system for cross-cutting concerns
