/**
 * Streaming support for the three-tier API pattern using RxJS.
 *
 * This module provides reactive streaming capabilities for handling
 * large datasets, real-time updates, and efficient data processing.
 */

import { BehaviorSubject, EMPTY, from, interval, merge, Observable, of, Subject } from "rxjs";
import {
  buffer,
  bufferCount,
  catchError,
  concatMap,
  delay,
  distinctUntilChanged,
  expand,
  filter,
  map,
  mergeMap,
  retry,
  retryWhen,
  scan,
  share,
  startWith,
  switchMap,
  tap,
  withLatestFrom
} from "rxjs/operators";
import type { StreamOptions } from "stream";

/**
 * Stream processor for handling data transformations.
 */
export interface StreamProcessor<T, U = T> {
  process(source: Observable<T>): Observable<U>;
}

/**
 * Pagination stream options.
 */
export interface PaginationStreamOptions extends StreamOptions {
  pageSize?: number;
  maxPages?: number;
  delayBetweenPages?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * Create a paginated stream from an API endpoint.
 */
export function createPaginatedStream<T>(
  fetcher: (cursor?: string) => Observable<PaginatedResponse<T>>,
  options: PaginationStreamOptions
): Observable<T> {
  let pageCount = 0;

  return of(undefined).pipe(
    expand((cursor) => {
      if (!options.maxPages || pageCount >= options.maxPages) {
        return EMPTY;
      }

      return from(fetcher(cursor)).pipe(
        tap(() => pageCount++),
        map((response) => (response.hasMore ? response.nextCursor : undefined)),
        delay(options.delayBetweenPages ?? 0)
      );
    }),
    concatMap((cursor, index) => {
      if (index === 0) return EMPTY; // Skip the initial undefined

      return from(fetcher(cursor)).pipe(
        map((response) => response.data),
        concatMap((items) => from(items))
      );
    }),
    retry({ count: options.retryCount ?? 3, delay: options.retryDelay ?? 1000 })
  );
}

/**
 * Create a real-time stream with polling.
 */
export function createPollingStream<T>(
  fetcher: () => Promise<T[]>,
  intervalMs: number,
  options: StreamOptions = {}
): Observable<T> {
  const { retryCount = 3, retryDelay = 1000 } = options;

  return interval(intervalMs).pipe(
    startWith(0),
    switchMap(() => from(fetcher())),
    concatMap((items) => from(items)),
    retry({ count: retryCount, delay: retryDelay }),
    share()
  );
}

/**
 * Stream transformer for applying transformations.
 */
export class StreamTransformer<T, U> implements StreamProcessor<T, U> {
  constructor(
    private transform: (value: T) => U | Promise<U>,
    private options: { concurrency?: number } = {}
  ) {}

  process(source: Observable<T>): Observable<U> {
    const { concurrency = 1 } = this.options;

    return source.pipe(mergeMap((value) => from(Promise.resolve(this.transform(value))), concurrency));
  }
}

/**
 * Stream filter for conditional processing.
 */
export class StreamFilter<T> implements StreamProcessor<T> {
  constructor(private predicate: (value: T) => boolean | Promise<boolean>) {}

  process(source: Observable<T>): Observable<T> {
    return source.pipe(
      concatMap((value) =>
        from(Promise.resolve(this.predicate(value))).pipe(
          concatMap((shouldInclude) => (shouldInclude ? of(value) : EMPTY))
        )
      )
    );
  }
}

/**
 * Stream batcher for processing items in batches.
 */
export class StreamBatcher<T> implements StreamProcessor<T, T[]> {
  constructor(
    private batchSize: number,
    private timeWindowMs?: number
  ) {}

  process(source: Observable<T>): Observable<T[]> {
    if (this.timeWindowMs) {
      return source.pipe(
        buffer(merge(source.pipe(bufferCount(this.batchSize)), interval(this.timeWindowMs))),
        filter((batch) => batch.length > 0)
      );
    }

    return source.pipe(bufferCount(this.batchSize));
  }
}

/**
 * Stream deduplicator for removing duplicates.
 */
export class StreamDeduplicator<T> implements StreamProcessor<T> {
  constructor(
    private keySelector: (value: T) => any,
    private windowSize?: number
  ) {}

  process(source: Observable<T>): Observable<T> {
    if (this.windowSize) {
      const seen = new Map<any, number>();
      let index = 0;

      return source.pipe(
        filter((value) => {
          const key = this.keySelector(value);
          const lastSeen = seen.get(key);

          if (lastSeen === undefined || index - lastSeen >= this.windowSize!) {
            seen.set(key, index);
            index++;
            return true;
          }

          index++;
          return false;
        })
      );
    }

    return source.pipe(distinctUntilChanged((a, b) => this.keySelector(a) === this.keySelector(b)));
  }
}

/**
 * Stream rate limiter for controlling throughput.
 */
export class StreamRateLimiter<T> implements StreamProcessor<T> {
  constructor(
    private rateMs: number,
    private burst: number = 1
  ) {}

  process(source: Observable<T>): Observable<T> {
    if (this.burst === 1) {
      return source.pipe(concatMap((value) => of(value).pipe(delay(this.rateMs))));
    }

    return source.pipe(
      bufferCount(this.burst),
      concatMap((batch) =>
        from(batch).pipe(concatMap((value, index) => of(value).pipe(delay(index === 0 ? 0 : this.rateMs / this.burst))))
      )
    );
  }
}

/**
 * Stream error handler with recovery strategies.
 */
export class StreamErrorHandler<T> implements StreamProcessor<T> {
  constructor(
    private errorHandler: (error: any) => Observable<T> | T | void,
    private maxRetries: number = 3
  ) {}

  process(source: Observable<T>): Observable<T> {
    return source.pipe(
      retryWhen((errors) =>
        errors.pipe(
          scan((retryCount, error) => {
            if (retryCount >= this.maxRetries) {
              throw error;
            }
            return retryCount + 1;
          }, 0),
          delay(1000)
        )
      ),
      catchError((error) => {
        const result = this.errorHandler(error);

        if (result === undefined || result === null) {
          return EMPTY;
        }

        if (result instanceof Observable) {
          return result;
        }

        return of(result as T);
      })
    );
  }
}

/**
 * Stream pipeline builder for composing processors.
 */
export class StreamPipeline<T> {
  private processors: StreamProcessor<any, any>[] = [];

  /**
   * Add a processor to the pipeline.
   */
  pipe<U>(processor: StreamProcessor<T, U>): StreamPipeline<U> {
    this.processors.push(processor);
    return this as any;
  }

  /**
   * Transform values in the stream.
   */
  transform<U>(fn: (value: T) => U | Promise<U>, concurrency?: number): StreamPipeline<U> {
    return this.pipe(new StreamTransformer(fn, { concurrency }));
  }

  /**
   * Filter values in the stream.
   */
  filter(predicate: (value: T) => boolean | Promise<boolean>): StreamPipeline<T> {
    return this.pipe(new StreamFilter(predicate));
  }

  /**
   * Batch values in the stream.
   */
  batch(size: number, timeWindowMs?: number): StreamPipeline<T[]> {
    return this.pipe(new StreamBatcher(size, timeWindowMs));
  }

  /**
   * Remove duplicate values.
   */
  deduplicate(keySelector: (value: T) => any, windowSize?: number): StreamPipeline<T> {
    return this.pipe(new StreamDeduplicator(keySelector, windowSize));
  }

  /**
   * Rate limit the stream.
   */
  rateLimit(rateMs: number, burst?: number): StreamPipeline<T> {
    return this.pipe(new StreamRateLimiter(rateMs, burst));
  }

  /**
   * Handle errors in the stream.
   */
  handleErrors(handler: (error: any) => Observable<T> | T | void, maxRetries?: number): StreamPipeline<T> {
    return this.pipe(new StreamErrorHandler(handler, maxRetries));
  }

  /**
   * Build and execute the pipeline.
   */
  build(): (source: Observable<any>) => Observable<T> {
    return (source) =>
      this.processors.reduce((stream, processor) => processor.process(stream), source) as Observable<T>;
  }
}

/**
 * Create a stream pipeline.
 */
export function pipeline<T>(): StreamPipeline<T> {
  return new StreamPipeline<T>();
}

/**
 * Stream state manager for maintaining state across emissions.
 */
export class StreamStateManager<T, S> {
  private stateSubject: BehaviorSubject<S>;

  constructor(initialState: S) {
    this.stateSubject = new BehaviorSubject(initialState);
  }

  /**
   * Get current state.
   */
  get state(): S {
    return this.stateSubject.value;
  }

  /**
   * Get state as observable.
   */
  get state$(): Observable<S> {
    return this.stateSubject.asObservable();
  }

  /**
   * Update state.
   */
  setState(state: S): void {
    this.stateSubject.next(state);
  }

  /**
   * Process stream with state.
   */
  processWithState(source: Observable<T>, reducer: (state: S, value: T) => S): Observable<{ value: T; state: S }> {
    return source.pipe(
      withLatestFrom(this.state$),
      map(([value, state]) => {
        const newState = reducer(state, value);
        this.setState(newState);
        return { value, state: newState };
      })
    );
  }
}

/**
 * Stream aggregator for computing aggregations.
 */
export class StreamAggregator<T> {
  /**
   * Count items in the stream.
   */
  static count<T>(): (source: Observable<T>) => Observable<number> {
    return (source) => source.pipe(scan((count) => count + 1, 0));
  }

  /**
   * Sum numeric values.
   */
  static sum<T>(selector: (value: T) => number): (source: Observable<T>) => Observable<number> {
    return (source) => source.pipe(scan((sum, value) => sum + selector(value), 0));
  }

  /**
   * Calculate average.
   */
  static average<T>(selector: (value: T) => number): (source: Observable<T>) => Observable<number> {
    return (source) =>
      source.pipe(
        scan(
          (acc, value) => ({
            sum: acc.sum + selector(value),
            count: acc.count + 1
          }),
          { sum: 0, count: 0 }
        ),
        map((acc) => (acc.count > 0 ? acc.sum / acc.count : 0))
      );
  }

  /**
   * Find minimum value.
   */
  static min<T>(selector: (value: T) => number): (source: Observable<T>) => Observable<number> {
    return (source) =>
      source.pipe(
        scan(
          (min, value) => {
            const num = selector(value);
            return min === null ? num : Math.min(min, num);
          },
          null as number | null
        ),
        filter((min): min is number => min !== null)
      );
  }

  /**
   * Find maximum value.
   */
  static max<T>(selector: (value: T) => number): (source: Observable<T>) => Observable<number> {
    return (source) =>
      source.pipe(
        scan(
          (max, value) => {
            const num = selector(value);
            return max === null ? num : Math.max(max, num);
          },
          null as number | null
        ),
        filter((max): max is number => max !== null)
      );
  }

  /**
   * Group by key.
   */
  static groupBy<T, K>(keySelector: (value: T) => K): (source: Observable<T>) => Observable<Map<K, T[]>> {
    return (source) =>
      source.pipe(
        scan((groups, value) => {
          const key = keySelector(value);
          const group = groups.get(key) || [];
          group.push(value);
          groups.set(key, group);
          return groups;
        }, new Map<K, T[]>())
      );
  }
}

/**
 * Create a buffered stream with backpressure handling.
 */
export function createBufferedStream<T>(
  source: Observable<T>,
  bufferSize: number,
  onBackpressure?: (buffer: T[]) => void
): Observable<T> {
  const buffer: T[] = [];
  const bufferSubject = new Subject<T>();
  let isPaused = false;

  source.subscribe({
    next: (value) => {
      if (buffer.length >= bufferSize) {
        isPaused = true;
        if (onBackpressure) {
          onBackpressure(buffer);
        }
      }

      if (!isPaused) {
        bufferSubject.next(value);
      } else {
        buffer.push(value);
      }
    },
    error: (err) => bufferSubject.error(err),
    complete: () => {
      // Flush remaining buffer
      buffer.forEach((value) => bufferSubject.next(value));
      bufferSubject.complete();
    }
  });

  return bufferSubject.pipe(
    tap(() => {
      if (isPaused && buffer.length > 0) {
        const value = buffer.shift();
        if (value !== undefined) {
          bufferSubject.next(value);
        }

        if (buffer.length < bufferSize / 2) {
          isPaused = false;
        }
      }
    })
  );
}
