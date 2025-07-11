import { from, Observable, of, throwError } from "rxjs";
import { catchError, map, mergeMap, retry, tap } from "rxjs/operators";
import type { SchemaLoader } from "../schemas/loader";
import { log } from "../util/logging";

/**
 * Operator execution context containing shared resources.
 */
export interface NotionConfig {
  schemaLoader?: SchemaLoader;
  baseUrl?: string;
  headers?: Record<string, string>;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of an operator execution.
 */
export interface OperatorResult<T> {
  data: T;
  metadata?: {
    requestId?: string;
    timestamp: Date;
    cached?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Options for operator execution.
 */
export interface OperatorOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  cache?: boolean;
  validateResponse?: boolean;
}

/**
 * Base operator class for Notion API operations.
 *
 * This abstract class provides the foundation for all API operations,
 * including type validation, error handling, and streaming support.
 *
 * @example
 * ```typescript
 * class GetPageOperator extends Operator<PageRequest, Page> {
 *   protected schemaName = 'notion.page';
 *
 *   protected execute(request: PageRequest, context: OperatorContext): Observable<Page> {
 *     return from(fetch(`${context.baseUrl}/pages/${request.pageId}`)).pipe(
 *       map(response => response.json())
 *     );
 *   }
 * }
 * ```
 */
export abstract class Operator<TRequest = unknown, TResponse = unknown> {
  /**
   * Name of the schema to use for response validation.
   */
  protected abstract schemaName: string;

  /**
   * Default options for this operator.
   */
  protected defaultOptions: OperatorOptions = {
    retries: 3,
    retryDelay: 1000,
    validateResponse: true,
    cache: false
  };

  /**
   * Execute the operator with the given request.
   *
   * @param request - The request payload
   * @param context - The execution context
   * @returns Observable stream of the response
   */
  abstract execute(request: TRequest, context: NotionConfig): Observable<TResponse>;

  /**
   * Run the operator with full error handling and validation.
   *
   * @param request - The request payload
   * @param config - The execution context
   * @param options - Execution options
   * @returns Observable stream of the operator result
   */
  run(request: TRequest, config: NotionConfig, options?: OperatorOptions): Observable<OperatorResult<TResponse>> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    return this.execute(request, config).pipe(
      // Retry logic
      retry({
        count: mergedOptions.retries || 0,
        delay: mergedOptions.retryDelay || 1000
      }),

      // Validate response if enabled
      mergeMap((response) => {
        if (mergedOptions.validateResponse && this.schemaName) {
          return this.validateResponse(response, config.schemaLoader);
        }
        return of(response);
      }),

      // Wrap in result
      map((data) => ({
        data,
        metadata: {
          requestId: config.requestId,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          cached: false
        }
      })),

      // Error handling
      catchError((error) => {
        log.error(`Operator ${this.constructor.name} failed`, { error, request });
        return throwError(() => this.wrapError(error));
      }),

      // Logging
      tap((result) => {
        log.debug(`Operator ${this.constructor.name} completed`, {
          duration: result.metadata?.duration,
          requestId: result.metadata?.requestId
        });
      })
    );
  }

  /**
   * Validate the response against the schema.
   *
   * @param response - The response to validate
   * @param schemaLoader - The schema loader instance
   * @returns Observable of the validated response
   */
  protected validateResponse(response: TResponse, schemaLoader: SchemaLoader): Observable<TResponse> {
    return from(schemaLoader.validateResponse<TResponse>(this.schemaName, response));
  }

  /**
   * Wrap an error with additional context.
   *
   * @param error - The original error
   * @returns Enhanced error object
   */
  protected wrapError(error: unknown): Error {
    if (error instanceof Error) {
      return new OperatorError(`${this.constructor.name}: ${error.message}`, this.constructor.name, error);
    }
    return new OperatorError(`${this.constructor.name}: Unknown error`, this.constructor.name, error);
  }

  /**
   * Compose this operator with another operator.
   *
   * @param nextOperator - The operator to chain
   * @returns A composed operator
   */
  pipe<TNext>(nextOperator: Operator<TResponse, TNext>): ComposedOperator<TRequest, TResponse, TNext> {
    return new ComposedOperator(this, nextOperator);
  }
}

/**
 * Error class for operator failures.
 */
export class OperatorError extends Error {
  constructor(
    message: string,
    public operatorName: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = "OperatorError";
  }
}

/**
 * Composed operator that chains two operators together.
 */
export class ComposedOperator<TRequest, TMiddle, TResponse> extends Operator<TRequest, TResponse> {
  protected schemaName: string;

  constructor(
    private first: Operator<TRequest, TMiddle>,
    private second: Operator<TMiddle, TResponse>
  ) {
    super();
    this.schemaName = (second as any).schemaName;
  }

  execute(request: TRequest, context: NotionConfig): Observable<TResponse> {
    return this.first.run(request, context).pipe(mergeMap((result) => this.second.execute(result.data, context)));
  }
}

/**
 * Factory function for creating operators.
 *
 * @param config - Operator configuration
 * @returns A new operator instance
 */
export function createOperator<TRequest, TResponse>(config: {
  schemaName: string;
  execute: (request: TRequest, context: NotionConfig) => Observable<TResponse>;
  options?: OperatorOptions;
}): Operator<TRequest, TResponse> {
  class ConfiguredOperator extends Operator<TRequest, TResponse> {
    protected schemaName = config.schemaName;
    protected defaultOptions = {
      retries: 3,
      retryDelay: 1000,
      validateResponse: true,
      cache: false,
      ...config.options
    };

    execute(request: TRequest, context: NotionConfig): Observable<TResponse> {
      return config.execute(request, context);
    }
  }

  return new ConfiguredOperator();
}
