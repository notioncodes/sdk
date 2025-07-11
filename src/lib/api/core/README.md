# Three-Tier API Pattern Implementation

This directory contains a comprehensive implementation of a three-tier API pattern using ArkType, RxJS, and TypeScript 5.8+. The implementation provides a type-safe, reactive, and flexible API infrastructure for the Notion SDK.

## Key Features

### 1. **Proxy-Based Context Switching** (`proxy-context.ts`)

- Dynamic method generation using ES6 Proxies
- Seamless switching between API tiers
- Event-driven lifecycle management
- Context stacking for nested operations

```typescript
const api = createContextAwareApi(baseApi);
api.context.setContext({ tier: ApiTier.Tier2, naming: { strategy: "camelCase" } });
```

### 2. **Fluent Builder Pattern** (`fluent-builder.ts`)

- Type-safe query construction
- Chainable API with full IntelliSense
- Streaming support with RxJS
- Advanced features: aggregation, joins, subqueries

```typescript
const results = await queryBuilder
  .for<User>("users")
  .where("active", QueryOperator.Equals, true)
  .orderBy("createdAt", "desc")
  .limit(10)
  .stream({ bufferSize: 100 });
```

### 3. **Advanced Type Transformations** (`database-schema.ts`)

- Comprehensive property mapping system
- Bidirectional transformations
- Support for all Notion property types
- Automatic naming convention conversion

```typescript
const schema = defineDatabase<Task>("tasks")
  .string("id", { required: true })
  .richText("title")
  .date("dueDate")
  .select("priority", { options: ["Low", "Medium", "High"] })
  .build();
```

### 4. **Schema Registry** (`schema-registry.ts`)

- Centralized schema management
- Runtime validation with ArkType
- Schema composition and derivation
- Observable schema changes

```typescript
schemaRegistry.register("User", userSchema);
schemaRegistry.compose("ExtendedUser", {
  type: "extend",
  base: "User",
  extensions: ["Profile", "Settings"]
});
```

### 5. **Streaming Support** (`streaming.ts`)

- Reactive data processing with RxJS
- Pagination with backpressure handling
- Stream transformations and aggregations
- Error recovery and retry strategies

```typescript
const stream = createPaginatedStream(fetcher)
  .pipe(
    pipeline<T>()
      .filter(item => item.active)
      .transform(item => enrichItem(item))
      .batch(100)
      .rateLimit(1000)
      .build()
  );
```

## Architecture

### Three API Tiers

1. **Tier 1 - Low Level**
   - Direct API access
   - No transformations
   - Raw request/response handling

2. **Tier 2 - Enhanced**
   - Type safety and validation
   - Property name transformations
   - Error handling and retries

3. **Tier 3 - Fluent Builder**
   - High-level abstractions
   - Query builder pattern
   - Streaming and reactive operations

### Core Components

- **Types** (`types.ts`): Core type definitions and interfaces
- **Schema Registry**: Dynamic type validation and management
- **Proxy Context**: Runtime API behavior modification
- **Fluent Builder**: Chainable query construction
- **Streaming**: Reactive data processing
- **Database Schema**: Property mapping and validation

## Usage Examples

### Basic API Usage

```typescript
// Create a context-aware API client
const api = createContextAwareApi(notionClient);

// Use Tier 1 for raw access
api.context.setContext({ tier: ApiTier.Tier1 });
const rawData = await api.search({ query: "test" });

// Switch to Tier 2 for enhanced features
api.context.setContext({ 
  tier: ApiTier.Tier2, 
  naming: { strategy: "camelCase" } 
});
const transformedData = await api.search({ query: "test" });

// Use Tier 3 for fluent queries
api.context.setContext({ tier: ApiTier.Tier3 });
const results = await api.pages
  .where("status", "published")
  .orderBy("createdAt", "desc")
  .limit(10)
  .execute();
```

### Database Schema Definition

```typescript
interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  dueDate: Date;
  assignee?: string;
  tags: string[];
}

const taskSchema = defineDatabase<Task>("tasks")
  .string("id", { required: true, index: true })
  .richText("title", { required: true })
  .richText("description")
  .boolean("completed", { default: false })
  .date("dueDate")
  .relation("assignee", "users")
  .multiSelect("tags")
  .computed("isOverdue", task => 
    !task.completed && task.dueDate < new Date()
  )
  .build();

databaseSchemaRegistry.register(taskSchema, { 
  strategy: "camelCase" 
});
```

### Streaming Large Datasets

```typescript
const projectStream = createPaginatedStream(
  async (cursor) => {
    const response = await api.databases.query({
      database_id: "projects_db",
      start_cursor: cursor,
      page_size: 100
    });
    return {
      data: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor
    };
  },
  { maxPages: 10, delayBetweenPages: 100 }
);

// Process stream with transformations
projectStream.pipe(
  pipeline<Project>()
    .filter(p => p.status === "active")
    .transform(async p => ({
      ...p,
      tasks: await fetchProjectTasks(p.id)
    }))
    .batch(10)
    .handleErrors(error => {
      console.error("Stream error:", error);
      return EMPTY; // Skip failed items
    })
    .build()
).subscribe({
  next: batch => console.log("Processing batch:", batch),
  complete: () => console.log("Stream complete")
});
```

## Testing

The implementation includes comprehensive integration tests in `api-integration.test.ts` that demonstrate:

- Schema registration and validation
- Context switching between tiers
- Query builder functionality
- Database schema transformations
- Streaming operations
- Complete end-to-end scenarios

## Future Enhancements

1. **GraphQL Integration**: Add GraphQL schema generation from database schemas
2. **Caching Layer**: Implement intelligent caching with invalidation strategies
3. **Optimistic Updates**: Support for optimistic UI updates with rollback
4. **Real-time Subscriptions**: WebSocket support for real-time data
5. **Schema Migrations**: Automated schema migration system
6. **Performance Monitoring**: Built-in performance metrics and tracing

## Known Limitations

1. Schema composition in the registry is simplified and needs full implementation
2. Some advanced query builder features (joins, subqueries) are not fully implemented
3. The proxy-based tier switching doesn't yet handle all edge cases
4. Stream error recovery could be more sophisticated

## Contributing

When adding new features:

1. Ensure 100% test coverage
2. Update type definitions
3. Add integration tests
4. Document new APIs
5. Consider backward compatibility
