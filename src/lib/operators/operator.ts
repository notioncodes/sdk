import type { HTTPConfig, HTTPResponse } from "$lib/util/http/client";
import { randomUUID } from "node:crypto";
import { Observable } from "rxjs";

/**
 * Configuration for operator execution.
 */
export class OperatorConfig {
  cache?: boolean;
  timeout?: number;
  constructor(config: Partial<OperatorConfig> = {}) {
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

export interface ExecuteResult<TResponse> {
  stream: Observable<TResponse>;
  // progress: Observable<ProgressReport>;
  cancel: () => void;
}

/**
 * Abstract base class for all operators that implement this contract.
 */
export abstract class Operator<TPayload, TResponse> {
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
  abstract execute(payload: TPayload, httpConfig: HTTPConfig, operatorConfig: OperatorConfig): HTTPResponse<TResponse>;

  // /**
  //  * Create progress tracking stream with configurable intervals.
  //  */
  // createProgressStream(progressSubject: Subject<ProgressReport>, config: OperatorConfig): Observable<ProgressReport> {
  //   if (!config.progress?.enabled) {
  //     return progressSubject.asObservable();
  //   }

  //   const intervalStream = interval(config.progress.interval || 1000).pipe(
  //     withLatestFrom(progressSubject),
  //     map(([, progress]) => progress),
  //     filter((progress) => progress.stage !== "complete")
  //   );

  //   return merge(progressSubject.asObservable(), intervalStream).pipe(share());
  // }

  /**
   * Create metrics tracking stream with configurable intervals.
   */
  // createMetricsStream(
  //   metricsSubject: Subject<MetricsReport>,
  //   metricsState: any,
  //   config: OperatorConfig
  // ): Observable<MetricsReport> {
  //   if (!config.metrics?.enabled) {
  //     return metricsSubject.asObservable();
  //   }

  //   const intervalStream = interval(config.metrics.interval || 5000).pipe(
  //     map(() => this.calculateMetrics(metricsState))
  //   );

  //   return merge(metricsSubject.asObservable(), intervalStream).pipe(share());
  // }
}
