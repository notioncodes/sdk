import { Observable } from "rxjs";
import type { SchemaLoader } from "../schemas/loader";

/**
 * Configuration for operator execution.
 */
export interface OperatorConfig {
  baseUrl: string;
  headers: Record<string, string>;
  requestId?: string;
}

/**
 * Extended configuration for Notion API operations.
 */
export interface NotionConfig extends OperatorConfig {
  schemaLoader?: SchemaLoader;
}

/**
 * Metadata for operator execution results.
 */
export interface OperatorMetadata {
  requestId: string;
  timestamp: Date;
  duration?: number;
  cached?: boolean;
  retryCount?: number;
}

/**
 * Result wrapper for operator execution.
 */
export interface OperatorResult<TData> {
  data: TData;
  metadata: OperatorMetadata;
}

/**
 * Progress tracking information.
 */
export interface ProgressInfo {
  current: number;
  total?: number;
  percentage?: number;
  message?: string;
  stage?: string;
}

/**
 * Metrics information for operator execution.
 */
export interface MetricsInfo {
  requestCount: number;
  totalDuration: number;
  averageDuration: number;
  errorCount: number;
  successCount: number;
  throughput: number;
  timestamp: Date;
}

/**
 * Options for operator execution.
 */
export interface OperatorOptions {
  retries?: number;
  timeout?: number;
  cache?: boolean;
  enableProgress?: boolean;
  enableMetrics?: boolean;
  progressInterval?: number;
}

/**
 * Abstract base class for all operators.
 * Provides common functionality for API operations with schema validation.
 */
export abstract class Operator<TRequest, TResponse> {
  /**
   * Schema name for validation.
   */
  protected abstract schemaName: string;

  /**
   * Execute the operator with the given request and configuration.
   * This method should be implemented by subclasses to perform the actual operation.
   *
   * @param request - The request payload
   * @param config - The operator configuration
   * @returns Observable of the response
   */
  abstract execute(request: TRequest, config: OperatorConfig): Observable<TResponse>;

  /**
   * Run the operator with full result metadata.
   *
   * @param request - The request payload
   * @param config - The operator configuration
   * @param options - Additional execution options
   * @returns Observable of the operator result
   */
  run(request: TRequest, config: NotionConfig, options?: OperatorOptions): Observable<OperatorResult<TResponse>> {
    const startTime = Date.now();
    const requestId = config.requestId || this.generateRequestId();

    return new Observable((subscriber) => {
      const subscription = this.execute(request, config).subscribe({
        next: (data) => {
          const metadata: OperatorMetadata = {
            requestId,
            timestamp: new Date(),
            duration: Date.now() - startTime,
            cached: false,
            retryCount: 0
          };

          subscriber.next({
            data,
            metadata
          });
        },
        error: (error) => {
          subscriber.error(error);
        },
        complete: () => {
          subscriber.complete();
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Generate a unique request ID.
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
