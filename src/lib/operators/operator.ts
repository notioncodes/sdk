import { randomUUID } from "node:crypto";
import { Observable } from "rxjs";

export class HTTPConfig {
  token?: string;
  baseUrl: string;
  headers: Record<string, string>;
  constructor(config: Partial<HTTPConfig> = {}) {
    this.baseUrl = config?.baseUrl ?? "https://api.notion.com/v1";
    this.headers = {
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
      Authorization: `Bearer ${config?.token}`,
      ...config?.headers
    };
    delete config?.token;
  }
}

/**
 * Progress tracking configuration.
 */
export class ProgressConfig {
  enabled: boolean;
  interval: number;
  estimateTotal?: boolean;
  constructor(config: Partial<ProgressConfig> = {}) {
    this.enabled = config.enabled ?? true;
    this.interval = config.interval ?? 1000;
    this.estimateTotal = config.estimateTotal;
  }
}

export class MetricsConfig {
  enabled: boolean;
  interval: number;
  includeLatency?: boolean;
  includeErrorRates?: boolean;
  constructor(config: Partial<MetricsConfig> = {}) {
    this.enabled = config.enabled ?? true;
    this.interval = config.interval ?? 1000;
    this.includeLatency = config.includeLatency;
    this.includeErrorRates = config.includeErrorRates;
  }
}

/**
 * Configuration for operator execution.
 */
export class OperatorConfig {
  progress?: ProgressConfig;
  metrics?: MetricsConfig;
  retry?: RetryConfig;
  cache?: boolean;
  timeout?: number;
  constructor(config: Partial<OperatorConfig> = {}) {
    this.progress = new ProgressConfig(config.progress);
    this.metrics = new MetricsConfig(config.metrics);
    this.retry = new RetryConfig(config.retry);
    this.cache = config.cache ?? false;
    this.timeout = config.timeout ?? 10000;
  }
}

/**
 * Metadata for operator execution results.
 */
export class OperatorMetadata {
  requestId: string;
  timestamp: Date;
  duration?: number;
  cached?: boolean;
  retryCount?: number;
  constructor(config: Partial<OperatorMetadata> = {}) {
    this.requestId = config.requestId ?? randomUUID();
    this.timestamp = config.timestamp ?? new Date();
    this.duration = config.duration;
    this.cached = config.cached;
    this.retryCount = config.retryCount;
  }
}

/**
 * Result wrapper for operator execution.
 */
export class OperatorResult<TData> {
  data: TData;
  metadata: OperatorMetadata;
  constructor(config: Partial<OperatorResult<TData>> = {}) {
    this.data = config.data as TData;
    this.metadata = new OperatorMetadata(config.metadata);
  }
}

/**
 * Progress tracking information.
 */
export class ProgressInfo {
  current: number;
  total?: number;
  percentage?: number;
  message?: string;
  stage?: string;
  constructor(config: Partial<ProgressInfo> = {}) {
    this.current = config.current ?? 0;
    this.total = config.total;
    this.percentage = config.percentage;
    this.message = config.message;
    this.stage = config.stage;
  }
}

/**
 * Metrics information for operator execution.
 */
export class MetricsInfo {
  requestCount: number;
  totalDuration: number;
  averageDuration: number;
  errorCount: number;
  successCount: number;
  throughput: number;
  timestamp: Date;
  constructor(config: Partial<MetricsInfo> = {}) {
    this.requestCount = config.requestCount ?? 0;
    this.totalDuration = config.totalDuration ?? 0;
    this.averageDuration = config.averageDuration ?? 0;
    this.errorCount = config.errorCount ?? 0;
    this.successCount = config.successCount ?? 0;
    this.throughput = config.throughput ?? 0;
    this.timestamp = config.timestamp ?? new Date();
  }
}

export class RetryConfig {
  retries?: number;
  delay?: number;
  constructor(config: Partial<RetryConfig> = {}) {
    this.retries = config.retries ?? 3;
    this.delay = config.delay ?? 1000;
  }
}

/**
 * Abstract base class for all operators that implement this contract.
 */
export abstract class Operator<TPayload, TResponse> {
  /**
   * Schema name for tracking and validation set by the subclass.
   */
  protected abstract schemaName: string;

  /**
   * Execute the operator with the given request and configuration to be
   * implemented by subclasses.
   *
   * @template {TPayload} TPayload - The payload type.
   * @template {TResponse} TResponse - The response type.
   *
   * @param {TPayload} payload - The payload to be processed.
   * @param {HTTPConfig} searchConfig - The search configuration.
   * @param {OperatorConfig} operatorConfig - The operator configuration.
   *
   * @returns Observable of the response.
   */
  abstract execute(payload: TPayload, httpConfig: HTTPConfig, operatorConfig: OperatorConfig): Observable<TResponse>;
}
