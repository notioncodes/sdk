import { 
  createNotionClient, 
  createDatabaseSchema,
  DatabaseSchemaBuilder,
  type,
  toPageId,
  toDatabaseId
} from '../src/lib/client';

// Initialize the client
const notion = createNotionClient({
  auth: process.env.NOTION_API_KEY!
});

// Define a strongly-typed database schema
const taskDatabaseSchema = createDatabaseSchema({
  title: 'title',
  status: 'select',
  priority: 'number',
  dueDate: 'date',
  assignee: 'people',
  tags: 'multi_select',
  completed: 'checkbox',
  description: 'rich_text',
  attachments: 'files',
  project: 'relation',
  totalHours: 'rollup',
  createdAt: 'created_time',
  lastEditedBy: 'last_edited_by'
});

// Or use the builder pattern for more control
const projectSchema = new DatabaseSchemaBuilder()
  .addProperty('name', 'title')
  .addProperty('status', 'status')
  .addProperty('startDate', 'date')
  .addProperty('endDate', 'date')
  .addProperty('budget', 'number')
  .addProperty('team', 'people')
  .addProperty('client', 'select')
  .addProperty('deliverables', 'rich_text')
  .build();

async function demonstrateAllTiers() {
  console.log('=== Tier 1: Simple String Commands ===');
  
  // Export all pages
  const allPages = await notion.export('pages');
  console.log(`Found ${allPages.length} pages`);

  // Query with simple syntax
  const activeUsers = await notion.query('users where type = "person"');
  console.log(`Found ${activeUsers.length} active users`);

  // More complex string queries
  const importantPages = await notion.query(
    'pages where status = "published" and priority > 5'
  );

  console.log('\n=== Tier 2: Fluent Builder Pattern ===');

  // Register schemas for type safety
  const taskDbId = notion.registerSchema('tasks', taskDatabaseSchema);
  const projectDbId = notion.registerSchema('projects', projectSchema);

  // Query with full type safety
  const urgentTasks = await notion
    .database(taskDatabaseSchema)
    .where('status', 'in-progress')
    .where('priority', 3, 'greater_than')
    .where('completed', false)
    .orderBy('dueDate', 'ascending')
    .orderBy('priority', 'descending')
    .limit(10)
    .execute();

  // Use property accessors for even better type safety
  const overdueTasks = await notion
    .database(taskDatabaseSchema)
    .prop('status').notEquals('completed')
    .prop('dueDate').before(new Date().toISOString())
    .prop('completed').equals(false)
    .include('properties', 'children')
    .execute();

  // Stream results for large datasets
  const taskStream = notion
    .database(taskDatabaseSchema)
    .prop('status').equals('todo')
    .orderBy('createdAt', 'descending')
    .stream();

  // Process streamed results
  taskStream.subscribe({
    next: (task) => console.log(`Processing task: ${task.properties.title}`),
    error: (err) => console.error('Stream error:', err),
    complete: () => console.log('Stream completed')
  });

  // Complex compound filters
  const complexQuery = await notion
    .database(taskDatabaseSchema)
    .or([
      { property: 'priority', greater_than: 4 },
      { property: 'assignee', contains: 'user-id' }
    ])
    .and([
      { property: 'status', does_not_equal: 'archived' },
      { property: 'completed', equals: false }
    ])
    .execute();

  console.log('\n=== Tier 3: Advanced Configuration ===');

  // Advanced query configuration
  const advancedConfig = {
    type: 'database' as const,
    id: taskDbId,
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
      { property: 'priority', direction: 'descending' as const },
      { property: 'dueDate', direction: 'ascending' as const }
    ],
    pageSize: 50
  };

  const advancedResults = await notion.execute(advancedConfig);
  const advancedStream = notion.stream(advancedConfig);

  console.log('\n=== Dynamic Proxy Methods ===');

  // The proxy enables dynamic method calls
  const page = await notion.getPage('some-page-id');
  const database = await notion.getDatabase('some-db-id');
  const user = await notion.getUser('some-user-id');

  // Create resources dynamically
  const newPage = await notion.createPage({
    parent: { database_id: taskDbId },
    properties: {
      title: { title: [{ text: { content: 'New Task' } }] },
      status: { select: { name: 'todo' } },
      priority: { number: 3 }
    }
  });

  // Update resources
  const updatedPage = await notion.updatePage(newPage.id, {
    properties: {
      status: { select: { name: 'in-progress' } }
    }
  });

  // Delete resources
  await notion.deleteBlock('some-block-id');

  console.log('\n=== Schema Validation ===');

  // Validate data against schema
  const isValid = notion.getSchema('tasks')?.validate({
    title: [{ text: { content: 'Test Task' } }],
    status: { name: 'todo' },
    priority: 5,
    completed: false
  });

  console.log('\n=== Advanced Patterns ===');

  // Pagination with cursors
  let cursor: string | undefined;
  let allTasks: any[] = [];
  
  do {
    const batch = await notion
      .database(taskDatabaseSchema)
      .cursor(cursor!)
      .limit(100)
      .execute();
    
    allTasks = allTasks.concat(batch);
    cursor = batch[batch.length - 1]?.id;
  } while (cursor);

  // Count total items
  const totalTasks = await notion
    .database(taskDatabaseSchema)
    .where('status', 'active')
    .count();

  // Check existence
  const hasUrgentTasks = await notion
    .database(taskDatabaseSchema)
    .where('priority', 5)
    .where('status', 'todo')
    .exists();

  // Get first matching item
  const mostUrgentTask = await notion
    .database(taskDatabaseSchema)
    .where('status', 'todo')
    .orderBy('priority', 'descending')
    .orderBy('dueDate', 'ascending')
    .first();

  // Select specific properties (type-safe)
  const taskSummaries = await notion
    .database(taskDatabaseSchema)
    .select('title', 'status', 'priority')
    .where('completed', false)
    .execute();
}

// Custom schema with validation
async function demonstrateCustomSchemas() {
  // Define custom validation rules with ArkType
  const customTaskSchema = type({
    title: type('string').pipe(s => s.length > 0 ? s : type.errors('Title cannot be empty')),
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

  // Use the custom schema
  const validationResult = customTaskSchema({
    title: 'Important Task',
    priority: 3,
    status: 'todo',
    dueDate: '2024-12-31',
    tags: ['urgent', 'client']
  });

  if (validationResult instanceof type.errors) {
    console.error('Validation failed:', validationResult.summary);
  } else {
    console.log('Validation passed:', validationResult);
  }
}

// Run the demonstrations
demonstrateAllTiers().catch(console.error);
demonstrateCustomSchemas().catch(console.error);