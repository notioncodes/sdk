import { firstValueFrom, of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SchemaLoader } from "../schemas/simple-loader";
import { Operator, OperatorContext, createOperator } from "./operator";

describe("Operator Architecture", () => {
  let mockContext: OperatorContext;
  let mockSchemaLoader: SchemaLoader;

  beforeEach(() => {
    mockSchemaLoader = {
      validateResponse: vi.fn().mockResolvedValue({})
    } as any;

    mockContext = {
      schemaLoader: mockSchemaLoader,
      baseUrl: "https://api.notion.com/v1",
      headers: { Authorization: "Bearer test" },
      requestId: "test-request-id"
    };
  });

  describe("Base Operator", () => {
    class TestOperator extends Operator<{ id: string }, { result: string }> {
      protected schemaName = "test.schema";

      execute(request: { id: string }, context: OperatorContext) {
        return of({ result: `Processed ${request.id}` });
      }
    }

    it("should execute operator and return result", async () => {
      const operator = new TestOperator();
      const result = await firstValueFrom(operator.run({ id: "123" }, mockContext));

      expect(result).toBeDefined();
      expect(result?.data.result).toBe("Processed 123");
      expect(result?.metadata?.requestId).toBe("test-request-id");
    });

    it("should validate response when enabled", async () => {
      const operator = new TestOperator();
      mockSchemaLoader.validateResponse = vi.fn().mockResolvedValue({ result: "validated" });

      const result = await firstValueFrom(operator.run({ id: "123" }, mockContext, { validateResponse: true }));

      expect(mockSchemaLoader.validateResponse).toHaveBeenCalledWith("test.schema", { result: "Processed 123" });
      expect(result?.data.result).toBe("validated");
    });

    it("should retry on failure", async () => {
      let attempts = 0;
      class RetryOperator extends Operator<any, any> {
        protected schemaName = "retry.test";

        execute() {
          attempts++;
          if (attempts < 3) {
            return throwError(() => new Error("Test error"));
          }
          return of({ success: true });
        }
      }

      const operator = new RetryOperator();
      const result = await firstValueFrom(operator.run({}, mockContext, { retries: 3, retryDelay: 10 }));

      expect(attempts).toBe(3);
      expect(result?.data.success).toBe(true);
    });

    it("should handle errors properly", async () => {
      class ErrorOperator extends Operator<any, any> {
        protected schemaName = "error.test";

        execute() {
          return throwError(() => new Error("Operation failed"));
        }
      }

      const operator = new ErrorOperator();

      await expect(firstValueFrom(operator.run({}, mockContext, { retries: 0 }))).rejects.toThrow("Operation failed");
    });
  });

  describe("Operator Composition", () => {
    class FirstOperator extends Operator<number, number> {
      protected schemaName = "first.operator";

      execute(request: number) {
        return of(request * 2);
      }
    }

    class SecondOperator extends Operator<number, string> {
      protected schemaName = "second.operator";

      execute(request: number) {
        return of(`Result: ${request}`);
      }
    }

    it("should compose operators", async () => {
      const first = new FirstOperator();
      const second = new SecondOperator();
      const composed = first.pipe(second);

      const result = await firstValueFrom(composed.run(5, mockContext));

      expect(result?.data).toBe("Result: 10");
    });

    it("should preserve schema name from second operator", () => {
      const first = new FirstOperator();
      const second = new SecondOperator();
      const composed = first.pipe(second);

      expect((composed as any).schemaName).toBe("second.operator");
    });
  });

  describe("createOperator factory", () => {
    it("should create operator from config", async () => {
      const operator = createOperator<string, string>({
        schemaName: "factory.test",
        execute: (request) => of(`Hello, ${request}!`),
        options: { retries: 5 }
      });

      const result = await firstValueFrom(operator.run("World", mockContext));

      expect(result?.data).toBe("Hello, World!");
    });

    it("should use provided options", () => {
      const operator = createOperator({
        schemaName: "options.test",
        execute: () => of("test"),
        options: { retries: 10, cache: true }
      });

      expect((operator as any).defaultOptions.retries).toBe(10);
      expect((operator as any).defaultOptions.cache).toBe(true);
    });
  });

  describe("Operator with streaming", () => {
    it("should handle streaming data", async () => {
      class StreamOperator extends Operator<void, number> {
        protected schemaName = "stream.test";

        execute() {
          return of(1, 2, 3, 4, 5);
        }
      }

      const operator = new StreamOperator();
      const results: number[] = [];

      await new Promise<void>((resolve) => {
        operator.run(undefined, mockContext).subscribe({
          next: (result) => results.push(result.data),
          complete: () => {
            expect(results).toEqual([1, 2, 3, 4, 5]);
            resolve();
          }
        });
      });
    });
  });
});
