import { from, lastValueFrom } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import {
  ApiTier,
  QueryOperator,
  createContextAwareApi,
  databaseSchemaRegistry,
  defineDatabase,
  pipeline
} from "../api/core";
import * as schemas from "./schemas";

interface Task {
  id: string;
  title?: string;
  dueDate?: Date;
  completed?: boolean;
  priority?: number;
  userId?: string;
}

const notionClient = {
  tasks: {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    stream: vi.fn().mockImplementation(() =>
      from([
        {
          id: "1",
          title: "Test Task",
          dueDate: new Date(Date.now() - 86400000),
          completed: false,
          priority: 2,
          userId: "user_1"
        }
      ])
    )
  }
};

const enrichTaskWithUser = (task: Task): Task & { userName: string } => {
  return { ...task, userName: "Test User" };
};

describe("schemas-exported", () => {
  it("should export core schemas", () => {
    expect(schemas.uuidSchema).toBeDefined();
    expect(schemas.isoDateSchema).toBeDefined();
    expect(schemas.apiColorSchema).toBeDefined();
    expect(schemas.fileSchema).toBeDefined();
    expect(schemas.iconSchema).toBeDefined();
    expect(schemas.coverSchema).toBeDefined();
    expect(schemas.parentSchema).toBeDefined();
    expect(schemas.richTextSchema).toBeDefined();
    expect(schemas.mentionItemSchema).toBeDefined();
  });

  it("type-guard-checkers-work", () => {
    expect(schemas.isPageId("page_123")).toBe(true);
    expect(schemas.isPageId("not_a_page")).toBe(false);

    expect(schemas.isDatabaseId("db_123")).toBe(true);
    expect(schemas.isDatabaseId("not_a_db")).toBe(false);

    expect(schemas.isBlockId("block_123")).toBe(true);
    expect(schemas.isBlockId("not_a_block")).toBe(false);

    expect(schemas.isUserId("user_123")).toBe(true);
    expect(schemas.isUserId("not_a_user")).toBe(false);

    expect(schemas.isCommentId("comment_123")).toBe(true);
    expect(schemas.isCommentId("not_a_comment")).toBe(false);

    expect(schemas.isWorkspaceId("workspace_123")).toBe(true);
    expect(schemas.isWorkspaceId("not_a_workspace")).toBe(false);
  });
});

describe("context-aware-api-integration", () => {
  it("create-register-and-query-database-schema-with-fluent-api-and-pipeline", async () => {
    const api = createContextAwareApi(notionClient);
    const taskSchema = defineDatabase<Task>("tasks")
      .string("id", { required: true })
      .richText("title")
      .date("dueDate")
      .boolean("completed")
      .number("priority")
      .string("userId")
      .build();

    databaseSchemaRegistry.register(taskSchema, { strategy: "camelCase" });

    api.context.setContext({ tier: ApiTier.Tier3 });

    const tasks$ = api.tasks
      .where("completed", QueryOperator.Equals, false)
      .where("dueDate", QueryOperator.LessThan, new Date())
      .orderBy("priority", "desc")
      .stream({ bufferSize: 100 })
      .pipe(pipeline<Task>().transform(enrichTaskWithUser).batch(10).build());

    const result = await lastValueFrom(tasks$);

    console.log(result);

    expect(Array.isArray(result)).toBe(true);
    // @ts-expect-error - crappy mocking
    expect(result.length).toBeGreaterThan(0);
    // @ts-expect-error - crappy mocking
    const taskResult = result[0];
    expect(taskResult).toHaveProperty("id", "1");
    expect(taskResult).toHaveProperty("userName", "Test User");
    expect(taskResult.completed).toBe(false);
    expect(taskResult.priority).toBe(2);
    expect(taskResult.dueDate).toBeInstanceOf(Date);
  });

  it("handle-empty-results-and-edge-cases", async () => {
    const emptyClient = {
      tasks: {
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        stream: vi.fn().mockImplementation(() => from([]))
      }
    };
    const api = createContextAwareApi(emptyClient);

    api.context.setContext({ tier: ApiTier.Tier3 });

    const tasks$ = api.tasks
      .where("completed", QueryOperator.Equals, false)
      .stream({ bufferSize: 100 })
      .pipe(pipeline<Task>().transform(enrichTaskWithUser).batch(10).build());

    const result = await lastValueFrom(tasks$, { defaultValue: [] });
    expect(Array.isArray(result)).toBe(true);
    // @ts-expect-error - crappy mocking
    expect(result.length).toBe(0);
  });

  it("return-undefined-for-unregistered-schema-validator", () => {
    const validator = databaseSchemaRegistry.getValidator("unregistered-schema");
    expect(validator).toBeUndefined();
  });
});
