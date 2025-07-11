simplify drastically and not have unneeded clients that can be consolidated. the goal is to prvide superior developer experience and an escape hatch worst case scenario

I'll analyze the current builder implementation and simplify it drastically while maintaining a superior developer experience with an escape hatch for complex scenarios.
Now let me check the core types to understand the interface requirements:
Now let me check the existing tests to understand how the builder is actually used:
Based on my analysis of the codebase, I can see that there are currently 4 different builder classes (FluentQueryBuilder, AdvancedQueryBuilder, TypeSafeQueryBuilder, and RawQueryBuilder) with significant overlap and complexity. The goal is to simplify this into a single, superior developer experience with an escape hatch.
Here's my simplified approach:
Apply
;
  return new QueryBuilder<T>(schemaName, schemaRegistry, executor, rawExecutor, schema);
Key improvements in this simplified version:
Single Builder Class: Consolidated all functionality into one QueryBuilder class
Superior DX: Clean, intuitive API with full TypeScript inference
Raw Query Escape Hatch: raw() method for complex scenarios the fluent API can't handle
Type Safety: Full type inference with optional schema validation
Streaming Built-in: RxJS streaming with automatic batching and retry logic
Cloning Support: clone() method for reusable query patterns
Minimal Dependencies: Only depends on essential types and interfaces
The API is now much simpler while maintaining all the power:
Basic queries: builder.where().orderBy().execute()
Streaming: builder.stream()
Field selection: builder.select("id", "name") with type inference
Raw queries: builder.raw("SELECT * FROM users WHERE complex = ?", [value])
Schema validation: Automatic when schema is provided
This provides the best developer experience with a clear escape hatch for edge cases, eliminating the need for multiple builder classes.
