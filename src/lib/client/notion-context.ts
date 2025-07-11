import { Client } from "@notionhq/client";
import { Observable, from, map, mergeMap, toArray, catchError, of } from "rxjs";
import { 
  PageId, DatabaseId, BlockId, UserId,
  toPageId, toDatabaseId, toBlockId, toUserId
} from "../schemas/core/branded-types";
import { DatabaseSchema, PropertyType } from "../schemas/core/database-schema";
import { QueryBuilder } from "./query-builder";
import { CommandParser } from "./command-parser";
import { SchemaRegistry } from "./schema-registry";

export interface NotionConfig {
  auth: string;
  baseUrl?: string;
  timeoutMs?: number;
  notionVersion?: string;
}

// Context-aware proxy for dynamic method generation
export class NotionContext {
  private client: Client;
  private schemaRegistry: SchemaRegistry;
  private commandParser: CommandParser;

  constructor(config: NotionConfig) {
    this.client = new Client(config);
    this.schemaRegistry = new SchemaRegistry();
    this.commandParser = new CommandParser(this.schemaRegistry);

    // Return a proxy to enable dynamic method generation
    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && !Reflect.has(target, prop)) {
          // Dynamic method generation based on context
          return (...args: unknown[]) => target.dynamicQuery(prop, ...args);
        }
        return Reflect.get(target, prop);
      }
    }) as NotionContext & Record<string, any>;
  }

  // Tier 1: Simple string-based commands
  async export(command: string): Promise<any> {
    const parsed = this.commandParser.parse(command);
    
    switch (parsed.type) {
      case 'pages':
        return this.exportPages(parsed.options);
      case 'databases':
        return this.exportDatabases(parsed.options);
      case 'users':
        return this.exportUsers(parsed.options);
      default:
        throw new Error(`Unknown export type: ${parsed.type}`);
    }
  }

  async query(command: string): Promise<any> {
    const parsed = this.commandParser.parseQuery(command);
    
    switch (parsed.resource) {
      case 'pages':
        return this.queryPages(parsed);
      case 'databases':
        return this.queryDatabases(parsed);
      case 'blocks':
        return this.queryBlocks(parsed);
      case 'users':
        return this.queryUsers(parsed);
      default:
        throw new Error(`Unknown resource: ${parsed.resource}`);
    }
  }

  // Tier 2: Fluent builder pattern
  pages(): QueryBuilder<'page'> {
    return new QueryBuilder<'page'>(this.client, 'page', this.schemaRegistry);
  }

  database<T extends Record<string, PropertyType>>(
    idOrSchema: DatabaseId | string | DatabaseSchema<T>
  ): QueryBuilder<'database', T> {
    if (typeof idOrSchema === 'string') {
      const id = idOrSchema.includes('-') ? idOrSchema : toDatabaseId(idOrSchema);
      return new QueryBuilder<'database', T>(this.client, 'database', this.schemaRegistry, id);
    } else if ('properties' in idOrSchema && 'schema' in idOrSchema) {
      // Register schema
      const id = this.schemaRegistry.registerSchema(idOrSchema);
      return new QueryBuilder<'database', T>(this.client, 'database', this.schemaRegistry, id);
    }
    throw new Error('Invalid database identifier or schema');
  }

  blocks(parentId?: PageId | DatabaseId | BlockId): QueryBuilder<'block'> {
    return new QueryBuilder<'block'>(this.client, 'block', this.schemaRegistry, parentId);
  }

  users(): QueryBuilder<'user'> {
    return new QueryBuilder<'user'>(this.client, 'user', this.schemaRegistry);
  }

  // Tier 3: Advanced configuration pattern
  async execute<T>(config: QueryConfig): Promise<T[]> {
    const builder = this.createBuilderFromConfig(config);
    return builder.execute();
  }

  stream<T>(config: QueryConfig): Observable<T> {
    const builder = this.createBuilderFromConfig(config);
    return builder.stream();
  }

  // Schema registration
  registerSchema<T extends Record<string, PropertyType>>(
    name: string,
    schema: DatabaseSchema<T>
  ): DatabaseId {
    return this.schemaRegistry.register(name, schema);
  }

  getSchema<T extends Record<string, PropertyType>>(
    nameOrId: string | DatabaseId
  ): DatabaseSchema<T> | undefined {
    return this.schemaRegistry.get(nameOrId);
  }

  // Private helper methods
  private async exportPages(options?: any): Promise<any[]> {
    const response = await this.client.search({
      filter: { property: 'object', value: 'page' },
      ...options
    });
    return response.results;
  }

  private async exportDatabases(options?: any): Promise<any[]> {
    const response = await this.client.search({
      filter: { property: 'object', value: 'database' },
      ...options
    });
    return response.results;
  }

  private async exportUsers(options?: any): Promise<any[]> {
    const response = await this.client.users.list(options);
    return response.results;
  }

  private async queryPages(parsed: any): Promise<any[]> {
    const response = await this.client.search({
      filter: {
        property: 'object',
        value: 'page',
        ...parsed.filter
      },
      ...parsed.options
    });
    return response.results;
  }

  private async queryDatabases(parsed: any): Promise<any[]> {
    const response = await this.client.search({
      filter: {
        property: 'object', 
        value: 'database',
        ...parsed.filter
      },
      ...parsed.options
    });
    return response.results;
  }

  private async queryBlocks(parsed: any): Promise<any[]> {
    if (!parsed.parentId) {
      throw new Error('Parent ID required for block queries');
    }
    const response = await this.client.blocks.children.list({
      block_id: parsed.parentId,
      ...parsed.options
    });
    return response.results;
  }

  private async queryUsers(parsed: any): Promise<any[]> {
    const response = await this.client.users.list(parsed.options);
    return response.results.filter((user: any) => {
      if (parsed.filter?.type) {
        return user.type === parsed.filter.type;
      }
      return true;
    });
  }

  private dynamicQuery(method: string, ...args: unknown[]): any {
    // Parse method name to determine action
    const parts = method.split(/(?=[A-Z])/);
    const action = parts[0].toLowerCase();
    const resource = parts.slice(1).join('').toLowerCase();

    switch (action) {
      case 'get':
        return this.dynamicGet(resource, args[0]);
      case 'create':
        return this.dynamicCreate(resource, args[0]);
      case 'update':
        return this.dynamicUpdate(resource, args[0], args[1]);
      case 'delete':
        return this.dynamicDelete(resource, args[0]);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private async dynamicGet(resource: string, id: any): Promise<any> {
    switch (resource) {
      case 'page':
        return this.client.pages.retrieve({ page_id: toPageId(id) });
      case 'database':
        return this.client.databases.retrieve({ database_id: toDatabaseId(id) });
      case 'block':
        return this.client.blocks.retrieve({ block_id: toBlockId(id) });
      case 'user':
        return this.client.users.retrieve({ user_id: toUserId(id) });
      default:
        throw new Error(`Unknown resource: ${resource}`);
    }
  }

  private async dynamicCreate(resource: string, data: any): Promise<any> {
    switch (resource) {
      case 'page':
        return this.client.pages.create(data);
      case 'database':
        return this.client.databases.create(data);
      case 'block':
        return this.client.blocks.children.append(data);
      default:
        throw new Error(`Cannot create resource: ${resource}`);
    }
  }

  private async dynamicUpdate(resource: string, id: any, data: any): Promise<any> {
    switch (resource) {
      case 'page':
        return this.client.pages.update({ page_id: toPageId(id), ...data });
      case 'database':
        return this.client.databases.update({ database_id: toDatabaseId(id), ...data });
      case 'block':
        return this.client.blocks.update({ block_id: toBlockId(id), ...data });
      default:
        throw new Error(`Cannot update resource: ${resource}`);
    }
  }

  private async dynamicDelete(resource: string, id: any): Promise<any> {
    switch (resource) {
      case 'block':
        return this.client.blocks.delete({ block_id: toBlockId(id) });
      default:
        throw new Error(`Cannot delete resource: ${resource}`);
    }
  }

  private createBuilderFromConfig(config: QueryConfig): QueryBuilder<any, any> {
    let builder: QueryBuilder<any, any>;

    switch (config.type) {
      case 'page':
        builder = this.pages();
        break;
      case 'database':
        builder = this.database(config.id as DatabaseId);
        break;
      case 'block':
        builder = this.blocks(config.id as PageId | DatabaseId | BlockId);
        break;
      case 'user':
        builder = this.users();
        break;
      default:
        throw new Error(`Unknown query type: ${config.type}`);
    }

    // Apply filters
    if (config.filter) {
      builder = this.applyFilters(builder, config.filter);
    }

    // Apply sorts
    if (config.sorts) {
      for (const sort of config.sorts) {
        builder = builder.orderBy(sort.property as any, sort.direction);
      }
    }

    // Apply pagination
    if (config.pageSize) {
      builder = builder.limit(config.pageSize);
    }

    return builder;
  }

  private applyFilters(builder: QueryBuilder<any, any>, filter: any): QueryBuilder<any, any> {
    if ('and' in filter) {
      for (const subFilter of filter.and) {
        builder = this.applyFilters(builder, subFilter);
      }
    } else if ('or' in filter) {
      // Handle OR filters (would need QueryBuilder enhancement)
      console.warn('OR filters not yet implemented in QueryBuilder');
    } else if ('property' in filter) {
      const { property, ...condition } = filter;
      const [operator, value] = Object.entries(condition)[0];
      builder = builder.where(property, value as any, operator as any);
    }

    return builder;
  }
}

// Query configuration interface
export interface QueryConfig {
  type: 'page' | 'database' | 'block' | 'user';
  id?: string;
  filter?: any;
  sorts?: Array<{
    property: string;
    direction: 'ascending' | 'descending';
  }>;
  pageSize?: number;
  startCursor?: string;
}