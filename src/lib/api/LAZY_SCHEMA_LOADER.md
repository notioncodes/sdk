# Lazy Schema Loader for Notion API

The lazy schema loader provides efficient on-demand generation and caching of Notion API schemas, significantly improving performance and memory usage for read-heavy operations.

## Features

- **On-demand Schema Generation**: Schemas are generated only when needed
- **Intelligent Caching**: Generated schemas are cached using RxJS observables with `shareReplay`
- **Type-safe Validation**: Validates API responses against ArkType schemas
- **Performance Tracking**: Built-in statistics for monitoring cache performance
- **Preloading Support**: Option to preload critical schemas at startup
- **Observable State**: Reactive state management for loading progress and errors

## Architecture

The lazy schema loader consists of three main components:

1. **LazySchemaLoader Class**: Core implementation providing schema registration, loading, and caching
2. **Schema Factories**: Factory functions that generate ArkType schemas for Notion API types
3. **Global Instance**: Pre-configured loader instance with all Notion API schemas registered

## Usage

### Basic Usage

```typescript
import { notionSchemaLoader } from "@notionkit/sdk";

// Load a schema on-demand
const pageSchema$ = notionSchemaLoader.loadSchema('notion.page');

// Validate an API response
const validatedPage = await notionSchemaLoader.validateResponse(
  'notion.page',
  apiResponse
);
```

### Preloading Schemas

```typescript
// Preload multiple schemas at startup
notionSchemaLoader.preloadSchemas([
  'notion.page',
  'notion.database',
  'notion.block'
]).subscribe({
  next: (schemas) => console.log('Schemas loaded:', schemas.length),
  error: (err) => console.error('Failed to load schemas:', err)
});
```

### Monitoring Loading State

```typescript
// Subscribe to loading state changes
notionSchemaLoader.state$.subscribe(state => {
  console.log('Currently loading:', Array.from(state.loading));
  console.log('Errors:', Array.from(state.errors.entries()));
  console.log('Stats:', state.stats);
});

// Get current state synchronously
const currentState = notionSchemaLoader.state;
console.log('Cache hit rate:', 
  (currentState.stats.cacheHits / currentState.stats.totalRequests) * 100
);
```

### Cache Management

```typescript
// Get cache statistics
const stats = notionSchemaLoader.getCacheStats();
console.log('Total cached schemas:', stats.totalCached);
stats.schemas.forEach(schema => {
  console.log(`${schema.name}: accessed ${schema.accessCount} times`);
});

// Clear specific schema from cache
notionSchemaLoader.clearCache('notion.page');

// Clear all cached schemas
notionSchemaLoader.clearCache();
```

## Supported Schemas

The following Notion API response schemas are available:

### Object Schemas

- `notion.page` - Page object responses
- `notion.database` - Database object responses  
- `notion.block` - Block object responses
- `notion.user` - User object responses

### List Response Schemas

- `notion.queryDatabase` - Query database responses
- `notion.listDatabases` - List databases responses
- `notion.listBlockChildren` - List block children responses
- `notion.search` - Search responses
- `notion.listUsers` - List users responses

## Schema Factories

Each schema factory generates a detailed ArkType schema matching the Notion API specification:

### Page Schema

- Supports all page properties including icon, cover, parent relationships
- Validates emoji, external, file, and custom emoji icon types
- Handles workspace, page, database, and block parent types

### Database Schema

- Validates database-specific properties like title, description, and inline status
- Supports same icon and parent types as pages
- Includes property schema validation

### Block Schema  

- Validates common block properties
- Supports all Notion block types (paragraph, heading, list items, etc.)
- Note: Block-specific content properties are dynamically present based on type

### User Schema

- Validates both person and bot user types
- Handles person-specific email property
- Supports bot ownership and workspace information

## Performance Benefits

The lazy schema loader provides significant performance improvements:

1. **Reduced Startup Time**: No need to generate all schemas upfront
2. **Lower Memory Usage**: Only loaded schemas are kept in memory
3. **Efficient Caching**: Schemas are shared across all consumers using RxJS
4. **Smart Loading**: Automatic deduplication of concurrent schema requests

## Advanced Usage

### Custom Schema Registration

```typescript
import { LazySchemaLoader } from "@notionkit/sdk";
import { type } from "arktype";

const customLoader = new LazySchemaLoader();

// Register a custom schema
customLoader.registerLazySchema({
  name: 'custom.response',
  factory: () => type({
    id: 'string',
    data: 'unknown'
  }),
  preload: true, // Load immediately
  metadata: { version: '1.0' }
});
```

### Integration with Schema Registry

```typescript
import { SchemaRegistryImpl } from "@notionkit/sdk";

// Create loader with schema registry integration
const registry = new SchemaRegistryImpl();
const loader = createNotionSchemaLoader(registry);

// Schemas are automatically registered when loaded
await loader.validateResponse('notion.page', pageData);
console.log(registry.has('notion.page')); // true
```

## Error Handling

The lazy schema loader provides comprehensive error handling:

```typescript
// Check for loading errors
notionSchemaLoader.state$.subscribe(state => {
  if (state.errors.size > 0) {
    state.errors.forEach((error, schemaName) => {
      console.error(`Failed to load ${schemaName}:`, error);
    });
  }
});

// Handle validation errors
try {
  const validated = await notionSchemaLoader.validateResponse(
    'notion.page',
    invalidData
  );
} catch (error) {
  console.error('Validation failed:', error.message);
  // Contains detailed ArkType validation errors
}
```

## Best Practices

1. **Preload Critical Schemas**: Use preloading for schemas needed at startup
2. **Monitor Cache Performance**: Track cache hit rates to optimize preloading
3. **Clear Unused Schemas**: Periodically clear schemas that are no longer needed
4. **Handle Loading Errors**: Always handle potential schema loading failures
5. **Use Type Guards**: Combine with TypeScript type guards for compile-time safety

## Implementation Details

The lazy schema loader uses several advanced techniques:

- **RxJS Observables**: For reactive state management and caching
- **ArkType Scopes**: For complex union type definitions
- **ShareReplay Operator**: To ensure schemas are loaded only once
- **BehaviorSubject**: For synchronous state access
- **Factory Pattern**: For deferred schema generation

This implementation provides a robust, performant solution for handling Notion API schema validation in production applications.
