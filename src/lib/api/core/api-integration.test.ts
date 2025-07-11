/**
 * Integration tests for the three-tier API pattern.
 *
 * This test suite demonstrates the complete integration of all
 * API components including proxy-based context switching, fluent
 * builders, streaming, and database schemas.
 */

import { type } from "arktype";
import { firstValueFrom, of, toArray } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import {
  ApiEvent,
  ApiTier,
  createContextAwareApi,
  createPaginatedStream,
  databaseSchemaRegistry,
  defineDatabase,
  pipeline,
  QueryBuilderFactory,
  QueryOperator,
  schemaRegistry
} from "./index";

describe("Three-Tier API Integration", () => {
  describe("Schema Registry", () => {
    it("should register and validate schemas", () => {
      const userSchema = type({
        id: "string",
        name: "string",
        email: "string",
        age: "number >= 0"
      });

      schemaRegistry.register("User", userSchema);

      const validUser = { id: "1", name: "John", email: "john@example.com", age: 30 };
      const result = schemaRegistry.validate("User", validUser);

      expect(result).toEqual(validUser);
    });

    it("should compose schemas", () => {
      const baseSchema = type({ id: "string", createdAt: "string" });
      const userSchema = type({ name: "string", email: "string" });

      schemaRegistry.register("Base", baseSchema);
      schemaRegistry.register("UserData", userSchema);
      schemaRegistry.compose("User", { type: "extend", base: "Base", extensions: ["UserData"] });

      const user = { id: "1", createdAt: "2023-01-01", name: "John", email: "john@example.com" };
      const result = schemaRegistry.tryValidate("User", user);

      expect(result.valid).toBe(true);
      expect(result.value).toEqual(user);
    });
  });

  describe("Context-Aware API", () => {
    it("should switch between API tiers", async () => {
      const baseApi = {
        async fetchData(id: string) {
          return { id, data: "test" };
        }
      };

      const api = createContextAwareApi(baseApi);

      // Tier 1: Raw access
      api.context.setContext({ tier: ApiTier.Tier1 });
      const tier1Result = await api.fetchData("1");
      expect(tier1Result).toEqual({ id: "1", data: "test" });

      // Switch to Tier 2
      api.context.setContext({ tier: ApiTier.Tier2, naming: { strategy: "camelCase" } });
      const tier2Result = await api.fetchData("2");
      expect(tier2Result).toEqual({ id: "2", data: "test" });
    });

    it("should emit lifecycle events", async () => {
      const baseApi = {
        async process(value: number) {
          return value * 2;
        }
      };

      const api = createContextAwareApi(baseApi);
      const events: any[] = [];

      api.context.on(ApiEvent.BeforeRequest, (data) => events.push({ type: "before", data }));
      api.context.on(ApiEvent.AfterRequest, (data) => events.push({ type: "after", data }));

      await api.process(5);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe("before");
      expect(events[1].type).toBe("after");
      expect(events[1].data.data).toBe(10);
    });
  });

  describe("Fluent Query Builder", () => {
    it("should build type-safe queries", async () => {
      interface User {
        id: string;
        name: string;
        age: number;
        active: boolean;
      }

      const mockExecutor = vi.fn().mockResolvedValue([
        { id: "1", name: "John", age: 30, active: true },
        { id: "2", name: "Jane", age: 25, active: true }
      ]);

      const factory = new QueryBuilderFactory(schemaRegistry, () => mockExecutor);

      const query = factory
        .for<User>("users")
        .where("active", QueryOperator.Equals, true)
        .where("age", QueryOperator.GreaterThan, 20)
        .orderBy("name", "asc")
        .limit(10);

      const results = await query.execute();

      expect(mockExecutor).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it("should support streaming results", async () => {
      interface Product {
        id: string;
        name: string;
        price: number;
      }

      const products = Array.from({ length: 250 }, (_, i) => ({
        id: `p${i}`,
        name: `Product ${i}`,
        price: i * 10
      }));

      const mockExecutor = vi.fn().mockImplementation(async (context) => {
        const start = context.offsetValue || 0;
        const limit = context.limitValue || 100;
        return products.slice(start, start + limit);
      });

      const factory = new QueryBuilderFactory(schemaRegistry, () => mockExecutor);

      const stream = factory
        .for<Product>("products")
        .where("price", QueryOperator.GreaterThan, 100)
        .stream({ bufferSize: 50 });

      const results = await firstValueFrom(stream.pipe(toArray()));

      expect(results).toHaveLength(250);
      expect(mockExecutor).toHaveBeenCalledTimes(5); // 250 / 50
    });
  });

  describe("Database Schema System", () => {
    it("should define and validate database schemas", () => {
      interface Task {
        id: string;
        title: string;
        description?: string;
        completed: boolean;
        dueDate: Date;
        priority: { name: string; color: string };
      }

      const taskSchema = defineDatabase<Task>("tasks")
        .string("id", { required: true })
        .string("title", { required: true })
        .string("description")
        .boolean("completed", { default: false })
        .date("dueDate")
        .select("priority", { options: ["Low", "Medium", "High"] })
        .required("title", "dueDate")
        .build();

      databaseSchemaRegistry.register(taskSchema);

      const validator = databaseSchemaRegistry.getValidator<Task>("tasks");
      expect(validator).toBeDefined();

      const validTask = {
        id: "1",
        title: "Test Task",
        completed: false,
        dueDate: new Date(),
        priority: { name: "High", color: "red" }
      };

      const result = validator!.validate(validTask);
      expect(result.valid).toBe(true);
    });

    it("should transform between naming conventions", () => {
      interface User {
        userId: string;
        firstName: string;
        lastName: string;
        emailAddress: string;
      }

      const userSchema = defineDatabase<User>("users")
        .string("userId")
        .string("firstName")
        .string("lastName")
        .string("emailAddress")
        .build();

      databaseSchemaRegistry.register(userSchema, { strategy: "camelCase" });

      const transformer = databaseSchemaRegistry.getTransformer<User>("users");
      expect(transformer).toBeDefined();

      const notionFormat = {
        user_id: "123",
        first_name: "John",
        last_name: "Doe",
        email_address: "john@example.com"
      };

      const transformed = transformer!.fromNotion(notionFormat);
      expect(transformed).toEqual({
        userId: "123",
        firstName: "John",
        lastName: "Doe",
        emailAddress: "john@example.com"
      });
    });
  });

  describe("Streaming Pipeline", () => {
    it("should process data through a streaming pipeline", async () => {
      const source = of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

      const result = await firstValueFrom(
        pipeline<number>()
          .filter((n) => n % 2 === 0)
          .transform((n) => n * 2)
          .batch(2)
          .build(source)
          .pipe(toArray())
      );

      expect(result).toEqual([[4, 8], [12, 16], [20]]);
    });

    it("should handle paginated streams", async () => {
      let page = 0;
      const fetcher = async (cursor?: string) => {
        const currentPage = cursor ? parseInt(cursor) : 0;
        page = currentPage;

        if (currentPage >= 3) {
          return { data: [], hasMore: false };
        }

        return {
          data: Array.from({ length: 3 }, (_, i) => ({
            id: `${currentPage}-${i}`,
            value: currentPage * 3 + i
          })),
          hasMore: true,
          nextCursor: String(currentPage + 1)
        };
      };

      const stream = createPaginatedStream(fetcher, { maxPages: 2 });
      const results = await firstValueFrom(stream.pipe(toArray()));

      expect(results).toHaveLength(6);
      expect(results[0]).toEqual({ id: "0-0", value: 0 });
      expect(results[5]).toEqual({ id: "1-2", value: 5 });
    });
  });

  describe("Complete Integration Example", () => {
    it("should demonstrate full three-tier API usage", async () => {
      // Define schemas
      interface Project {
        id: string;
        name: string;
        description: string;
        status: { name: string; color: string };
        createdAt: Date;
        tasks: string[];
      }

      const projectSchema = defineDatabase<Project>("projects")
        .string("id", { required: true })
        .richText("name", { required: true })
        .richText("description")
        .select("status", { options: ["Planning", "Active", "Completed"] })
        .date("createdAt")
        .relation("tasks", "tasks")
        .build();

      databaseSchemaRegistry.register(projectSchema, { strategy: "camelCase" });

      // Mock API
      const mockProjects = [
        {
          id: "p1",
          name: "Project Alpha",
          description: "First project",
          status: { name: "Active", color: "green" },
          created_at: "2023-01-01T00:00:00Z",
          tasks: ["t1", "t2"]
        },
        {
          id: "p2",
          name: "Project Beta",
          description: "Second project",
          status: { name: "Planning", color: "yellow" },
          created_at: "2023-02-01T00:00:00Z",
          tasks: ["t3"]
        }
      ];

      const baseApi = {
        async searchProjects(params: any) {
          return { results: mockProjects, hasMore: false };
        }
      };

      // Create context-aware API
      const api = createContextAwareApi(baseApi);

      // Use Tier 2 with transformation
      api.context.setContext({
        tier: ApiTier.Tier2,
        naming: { strategy: "camelCase" }
      });

      // Execute search
      const response = await api.searchProjects({});

      // Transform results
      const transformer = databaseSchemaRegistry.getTransformer<Project>("projects");
      const projects = response.results.map((p) => transformer!.fromNotion(p));

      expect(projects).toHaveLength(2);
      expect(projects[0].createdAt).toBeInstanceOf(Date);
      expect(projects[0].name).toBe("Project Alpha");
      expect(projects[1].status.name).toBe("Planning");
    });
  });
});
