import { Client } from "@notionhq/client";
import { Observable, from, map, expand, EMPTY, concatMap, toArray } from "rxjs";
import { 
  PageId, DatabaseId, BlockId, UserId,
  isPageId, isDatabaseId, isBlockId
} from "../schemas/core/branded-types";
import { 
  PropertyType, PropertyFilter, PropertyFilterMap,
  CompoundFilter, DatabaseSchema, InferDatabaseSchema
} from "../schemas/core/database-schema";
import { SchemaRegistry } from "./schema-registry";

type ResourceType = 'page' | 'database' | 'block' | 'user';

type FilterOperator = 'equals' | 'does_not_equal' | 'contains' | 'does_not_contain' | 
  'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty' |
  'greater_than' | 'less_than' | 'greater_than_or_equal_to' | 'less_than_or_equal_to' |
  'before' | 'after' | 'on_or_before' | 'on_or_after';

export class QueryBuilder<
  TResource extends ResourceType,
  TSchema extends Record<string, PropertyType> = any
> {
  private filters: Array<PropertyFilterMap<TSchema> | CompoundFilter<TSchema>> = [];
  private sorts: Array<{ property: keyof TSchema; direction: 'ascending' | 'descending' }> = [];
  private pageSize?: number;
  private startCursor?: string;
  private includeArchivedFlag = false;
  private includes: Set<string> = new Set();

  constructor(
    private client: Client,
    private resourceType: TResource,
    private schemaRegistry: SchemaRegistry,
    private resourceId?: PageId | DatabaseId | BlockId | string
  ) {}

  // Fluent filter methods
  where<K extends keyof TSchema>(
    property: K,
    value: any,
    operator: FilterOperator = 'equals'
  ): QueryBuilder<TResource, TSchema> {
    const filter: any = {
      property,
      [operator]: value
    };
    this.filters.push(filter);
    return this;
  }

  and(filters: Array<PropertyFilterMap<TSchema> | CompoundFilter<TSchema>>): QueryBuilder<TResource, TSchema> {
    this.filters.push({ and: filters });
    return this;
  }

  or(filters: Array<PropertyFilterMap<TSchema> | CompoundFilter<TSchema>>): QueryBuilder<TResource, TSchema> {
    this.filters.push({ or: filters });
    return this;
  }

  // Sort methods
  orderBy(
    property: keyof TSchema,
    direction: 'ascending' | 'descending' = 'ascending'
  ): QueryBuilder<TResource, TSchema> {
    this.sorts.push({ property, direction });
    return this;
  }

  // Pagination methods
  limit(size: number): QueryBuilder<TResource, TSchema> {
    this.pageSize = size;
    return this;
  }

  cursor(cursor: string): QueryBuilder<TResource, TSchema> {
    this.startCursor = cursor;
    return this;
  }

  // Include methods
  include(...resources: string[]): QueryBuilder<TResource, TSchema> {
    resources.forEach(r => this.includes.add(r));
    return this;
  }

  includeArchived(include = true): QueryBuilder<TResource, TSchema> {
    this.includeArchivedFlag = include;
    return this;
  }

  // Execution methods
  async execute(): Promise<any[]> {
    const results: any[] = [];
    let hasMore = true;
    let cursor = this.startCursor;

    while (hasMore) {
      const response = await this.executeQuery(cursor);
      results.push(...response.results);
      
      hasMore = response.has_more && (!this.pageSize || results.length < this.pageSize);
      cursor = response.next_cursor;
      
      if (this.pageSize && results.length >= this.pageSize) {
        return results.slice(0, this.pageSize);
      }
    }

    return results;
  }

  async first(): Promise<any | null> {
    const response = await this.executeQuery(undefined, 1);
    return response.results[0] || null;
  }

  stream(): Observable<any> {
    return from(this.executeQuery()).pipe(
      expand(response => 
        response.has_more 
          ? from(this.executeQuery(response.next_cursor))
          : EMPTY
      ),
      concatMap(response => from(response.results))
    );
  }

  // Advanced query methods
  async count(): Promise<number> {
    let count = 0;
    let hasMore = true;
    let cursor = this.startCursor;

    while (hasMore) {
      const response = await this.executeQuery(cursor);
      count += response.results.length;
      hasMore = response.has_more;
      cursor = response.next_cursor;
    }

    return count;
  }

  async exists(): Promise<boolean> {
    const response = await this.executeQuery(undefined, 1);
    return response.results.length > 0;
  }

  // Schema-aware methods
  select<K extends keyof TSchema>(...properties: K[]): QueryBuilder<TResource, Pick<TSchema, K>> {
    // This would require modifying the response to only include selected properties
    // For now, it returns the same builder but with updated type
    return this as any;
  }

  // Private execution method
  private async executeQuery(cursor?: string, limit?: number): Promise<any> {
    const filter = this.buildFilter();
    const sorts = this.buildSorts();
    const pageSize = limit || this.pageSize || 100;

    switch (this.resourceType) {
      case 'page':
        return this.queryPages(filter, sorts, pageSize, cursor);
      case 'database':
        return this.queryDatabase(filter, sorts, pageSize, cursor);
      case 'block':
        return this.queryBlocks(pageSize, cursor);
      case 'user':
        return this.queryUsers(pageSize, cursor);
      default:
        throw new Error(`Unsupported resource type: ${this.resourceType}`);
    }
  }

  private buildFilter(): any {
    if (this.filters.length === 0) return undefined;
    if (this.filters.length === 1) return this.filters[0];
    return { and: this.filters };
  }

  private buildSorts(): any[] {
    return this.sorts.map(sort => ({
      property: sort.property as string,
      direction: sort.direction
    }));
  }

  private async queryPages(filter: any, sorts: any[], pageSize: number, cursor?: string): Promise<any> {
    const searchFilter: any = {
      property: 'object',
      value: 'page'
    };

    if (filter) {
      searchFilter.and = [filter];
    }

    return this.client.search({
      filter: searchFilter,
      sort: sorts[0], // Notion API only supports one sort
      page_size: pageSize,
      start_cursor: cursor
    });
  }

  private async queryDatabase(filter: any, sorts: any[], pageSize: number, cursor?: string): Promise<any> {
    if (!this.resourceId || !isDatabaseId(this.resourceId)) {
      // Search for databases
      const searchFilter: any = {
        property: 'object',
        value: 'database'
      };

      if (filter) {
        searchFilter.and = [filter];
      }

      return this.client.search({
        filter: searchFilter,
        sort: sorts[0], // Notion API only supports one sort
        page_size: pageSize,
        start_cursor: cursor
      });
    }

    // Query specific database
    return this.client.databases.query({
      database_id: this.resourceId,
      filter,
      sorts,
      page_size: pageSize,
      start_cursor: cursor
    });
  }

  private async queryBlocks(pageSize: number, cursor?: string): Promise<any> {
    if (!this.resourceId) {
      throw new Error('Parent ID required for block queries');
    }

    return this.client.blocks.children.list({
      block_id: this.resourceId,
      page_size: pageSize,
      start_cursor: cursor
    });
  }

  private async queryUsers(pageSize: number, cursor?: string): Promise<any> {
    return this.client.users.list({
      page_size: pageSize,
      start_cursor: cursor
    });
  }

  // Type-safe property access for database queries
  prop<K extends keyof TSchema>(property: K): PropertyAccessor<TSchema[K], TResource, TSchema> {
    return new PropertyAccessor(this, property);
  }
}

// Property accessor for type-safe filtering
export class PropertyAccessor<
  TProp extends PropertyType,
  TResource extends ResourceType,
  TSchema extends Record<string, PropertyType>
> {
  constructor(
    private builder: QueryBuilder<TResource, TSchema>,
    private property: keyof TSchema
  ) {}

  equals(value: PropertyFilter<TProp> extends { equals: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'equals');
  }

  notEquals(value: PropertyFilter<TProp> extends { does_not_equal: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'does_not_equal');
  }

  contains(value: PropertyFilter<TProp> extends { contains: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'contains');
  }

  notContains(value: PropertyFilter<TProp> extends { does_not_contain: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'does_not_contain');
  }

  startsWith(value: PropertyFilter<TProp> extends { starts_with: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'starts_with');
  }

  endsWith(value: PropertyFilter<TProp> extends { ends_with: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'ends_with');
  }

  isEmpty(): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, true, 'is_empty');
  }

  isNotEmpty(): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, true, 'is_not_empty');
  }

  // Number-specific methods
  greaterThan(value: PropertyFilter<TProp> extends { greater_than: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'greater_than');
  }

  lessThan(value: PropertyFilter<TProp> extends { less_than: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'less_than');
  }

  greaterThanOrEqual(value: PropertyFilter<TProp> extends { greater_than_or_equal_to: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'greater_than_or_equal_to');
  }

  lessThanOrEqual(value: PropertyFilter<TProp> extends { less_than_or_equal_to: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'less_than_or_equal_to');
  }

  // Date-specific methods
  before(value: PropertyFilter<TProp> extends { before: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'before');
  }

  after(value: PropertyFilter<TProp> extends { after: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'after');
  }

  onOrBefore(value: PropertyFilter<TProp> extends { on_or_before: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'on_or_before');
  }

  onOrAfter(value: PropertyFilter<TProp> extends { on_or_after: infer V } ? V : never): QueryBuilder<TResource, TSchema> {
    return this.builder.where(this.property, value, 'on_or_after');
  }
}