import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNotionClient, createDatabaseSchema } from './index';
import { toPageId, toDatabaseId } from '../schemas/core/branded-types';

// Mock the Notion client
vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      results: [],
      has_more: false,
      next_cursor: null
    }),
    pages: {
      retrieve: vi.fn().mockResolvedValue({ id: 'page-123' }),
      create: vi.fn().mockResolvedValue({ id: 'new-page-123' }),
      update: vi.fn().mockResolvedValue({ id: 'page-123' })
    },
    databases: {
      retrieve: vi.fn().mockResolvedValue({ id: 'db-123' }),
      create: vi.fn().mockResolvedValue({ id: 'new-db-123' }),
      update: vi.fn().mockResolvedValue({ id: 'db-123' }),
      query: vi.fn().mockResolvedValue({
        results: [],
        has_more: false,
        next_cursor: null
      })
    },
    blocks: {
      retrieve: vi.fn().mockResolvedValue({ id: 'block-123' }),
      update: vi.fn().mockResolvedValue({ id: 'block-123' }),
      delete: vi.fn().mockResolvedValue({}),
      children: {
        list: vi.fn().mockResolvedValue({
          results: [],
          has_more: false,
          next_cursor: null
        }),
        append: vi.fn().mockResolvedValue({ results: [] })
      }
    },
    users: {
      retrieve: vi.fn().mockResolvedValue({ id: 'user-123' }),
      list: vi.fn().mockResolvedValue({
        results: [],
        has_more: false,
        next_cursor: null
      })
    }
  }))
}));

describe('NotionContext', () => {
  let notion: ReturnType<typeof createNotionClient>;

  beforeEach(() => {
    notion = createNotionClient({ auth: 'test-key' });
  });

  describe('Tier 1: String-based commands', () => {
    it('should export pages', async () => {
      const pages = await notion.export('pages');
      expect(Array.isArray(pages)).toBe(true);
    });

    it('should query users with filters', async () => {
      const users = await notion.query('users where type = "person"');
      expect(Array.isArray(users)).toBe(true);
    });

    it('should parse complex queries', async () => {
      const pages = await notion.query('pages where status = "published" and priority > 5');
      expect(Array.isArray(pages)).toBe(true);
    });
  });

  describe('Tier 2: Fluent builder pattern', () => {
    const taskSchema = createDatabaseSchema({
      title: 'title',
      status: 'select',
      priority: 'number',
      completed: 'checkbox'
    });

    it('should create query builder for pages', () => {
      const builder = notion.pages();
      expect(builder).toBeDefined();
      expect(builder.where).toBeDefined();
      expect(builder.orderBy).toBeDefined();
      expect(builder.limit).toBeDefined();
    });

    it('should create query builder for database with schema', () => {
      const builder = notion.database(taskSchema);
      expect(builder).toBeDefined();
    });

    it('should support chained filters', async () => {
      const builder = notion
        .database(taskSchema)
        .where('status', 'active')
        .where('priority', 3, 'greater_than')
        .orderBy('priority', 'descending')
        .limit(10);

      const results = await builder.execute();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should support property accessors', () => {
      const builder = notion
        .database(taskSchema)
        .prop('status').equals('active')
        .prop('priority').greaterThan(3)
        .prop('completed').equals(false);

      expect(builder).toBeDefined();
    });
  });

  describe('Tier 3: Advanced configuration', () => {
    it('should execute advanced query config', async () => {
      const config = {
        type: 'database' as const,
        id: 'db-123',
        filter: {
          and: [
            { property: 'status', equals: 'active' },
            { property: 'priority', greater_than: 5 }
          ]
        },
        sorts: [
          { property: 'priority', direction: 'descending' as const }
        ],
        pageSize: 50
      };

      const results = await notion.execute(config);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should create stream from config', () => {
      const config = {
        type: 'page' as const,
        filter: { property: 'status', equals: 'published' }
      };

      const stream = notion.stream(config);
      expect(stream.subscribe).toBeDefined();
    });
  });

  describe('Dynamic proxy methods', () => {
    it('should support dynamic get methods', async () => {
      const page = await notion.getPage('page-123');
      expect(page.id).toBe('page-123');

      const database = await notion.getDatabase('db-123');
      expect(database.id).toBe('db-123');

      const user = await notion.getUser('user-123');
      expect(user.id).toBe('user-123');
    });

    it('should support dynamic create methods', async () => {
      const page = await notion.createPage({
        parent: { database_id: 'db-123' },
        properties: {}
      });
      expect(page.id).toBe('new-page-123');
    });

    it('should support dynamic update methods', async () => {
      const page = await notion.updatePage('page-123', {
        properties: {}
      });
      expect(page.id).toBe('page-123');
    });

    it('should support dynamic delete methods', async () => {
      await expect(notion.deleteBlock('block-123')).resolves.not.toThrow();
    });
  });

  describe('Schema management', () => {
    const testSchema = createDatabaseSchema({
      name: 'title',
      active: 'checkbox'
    });

    it('should register and retrieve schemas', () => {
      const id = notion.registerSchema('test', testSchema);
      expect(id).toBeDefined();

      const retrieved = notion.getSchema('test');
      expect(retrieved).toBeDefined();
      expect(retrieved?.properties).toEqual(testSchema.properties);
    });

    it('should validate data against schema', () => {
      notion.registerSchema('test', testSchema);
      const schema = notion.getSchema('test');
      
      const validData = {
        name: [{ text: { content: 'Test' } }],
        active: true
      };

      const result = schema?.validate(validData);
      expect(result).toBeDefined();
    });
  });
});

describe('Branded Types', () => {
  it('should validate page IDs', () => {
    const validId = '12345678-1234-1234-1234-123456789012';
    const pageId = toPageId(validId);
    expect(pageId).toBe(validId);
  });

  it('should validate database IDs', () => {
    const validId = '12345678-1234-1234-1234-123456789012';
    const dbId = toDatabaseId(validId);
    expect(dbId).toBe(validId);
  });

  it('should throw on invalid IDs', () => {
    expect(() => toPageId('invalid')).toThrow();
    expect(() => toDatabaseId('invalid')).toThrow();
  });
});