/**
 * Core types for the three-tier API pattern.
 *
 * This module defines the foundational types for building a type-safe,
 * proxy-based API with fluent builder patterns and streaming support.
 */

import { Type } from "arktype";
import { Observable } from "rxjs";
import type { NamingConfig } from "../../util/naming";

/**
 * API access tiers for different levels of abstraction.
 */
export enum ApiTier {
  /** Low-level, direct API access */
  Tier1 = "tier1",
  /** Mid-level, enhanced with type safety and transformations */
  Tier2 = "tier2",
  /** High-level, fluent builder pattern with advanced features */
  Tier3 = "tier3"
}

/**
 * Context for API operations, including tier and configuration.
 */
export interface ApiContext {
  tier: ApiTier;
  naming?: NamingConfig;
  streaming?: boolean;
  debug?: boolean;
  cache?: boolean;
}

/**
 * Base interface for all API responses.
 */
export interface ApiResponse<T> {
  data: T;
  metadata?: ResponseMetadata;
  errors?: ApiError[];
}

/**
 * Metadata for API responses.
 */
export interface ResponseMetadata {
  requestId?: string;
  timestamp?: Date;
  rateLimit?: RateLimitInfo;
  cached?: boolean;
}

/**
 * Rate limit information.
 */
export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

/**
 * API error structure.
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Pagination parameters.
 */
export interface PaginationParams {
  startCursor?: string;
  pageSize?: number;
}

/**
 * Paginated response structure.
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Builder pattern interface for fluent API construction.
 */
export interface FluentBuilder<T> {
  build(): T;
  validate(): Type<T>;
}

/**
 * Stream options for RxJS integration.
 */
export interface StreamOptions {
  bufferSize?: number;
  throttleMs?: number;
  retryCount?: number;
  retryDelay?: number;
}

/**
 * Type-safe property path for deep object access.
 */
export type PropertyPath<T, P extends string = ""> = P extends ""
  ? keyof T extends string
    ? keyof T
    : never
  : P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? T[K] extends Record<string, any>
        ? `${K}.${PropertyPath<T[K], Rest>}`
        : never
      : never
    : P extends keyof T
      ? P
      : never;

/**
 * Extract type at a property path.
 */
export type PropertyValueType<T, P extends PropertyPath<T>> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? Rest extends PropertyPath<T[K]>
      ? PropertyValueType<T[K], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never;

/**
 * Conditional type for method chaining.
 */
export type ChainableMethod<T, R> =
  R extends Promise<infer U>
    ? Promise<T & { result: U }>
    : R extends Observable<infer U>
      ? Observable<T & { result: U }>
      : T & { result: R };

/**
 * Type for dynamic proxy handlers.
 */
export type ProxyHandler<T> = {
  get(target: T, prop: string | symbol, receiver: any): any;
  set?(target: T, prop: string | symbol, value: any, receiver: any): boolean;
  has?(target: T, prop: string | symbol): boolean;
};

/**
 * Schema registry for dynamic type validation.
 */
export interface SchemaRegistry {
  register<T>(name: string, schema: Type<T>): void;
  get<T>(name: string): Type<T> | undefined;
  validate<T>(name: string, value: unknown): T;
  list(): string[];
}

/**
 * Transform function type for property mapping.
 */
export type TransformFunction<T, U> = (value: T) => U;

/**
 * Bidirectional transform for property conversion.
 */
export interface BidirectionalTransform<T, U> {
  forward: TransformFunction<T, U>;
  reverse: TransformFunction<U, T>;
}

/**
 * Database schema definition with strong typing.
 */
export interface DatabaseSchema<T extends Record<string, any>> {
  name: string;
  properties: {
    [K in keyof T]: PropertySchema<T[K]>;
  };
  computedProperties?: {
    [key: string]: ComputedProperty<T>;
  };
  relations?: {
    [key: string]: RelationSchema;
  };
}

/**
 * Property schema definition.
 */
export interface PropertySchema<T> {
  type: PropertyDataType;
  required?: boolean;
  default?: T | (() => T);
  validate?: Type<T>;
  transform?: BidirectionalTransform<any, T>;
  index?: boolean;
}

/**
 * Computed property definition.
 */
export interface ComputedProperty<T> {
  compute: (obj: T) => any;
  cache?: boolean;
}

/**
 * Relation schema for database relationships.
 */
export interface RelationSchema {
  type: "one-to-one" | "one-to-many" | "many-to-many";
  target: string;
  foreign?: string;
  through?: string;
}

/**
 * Property types supported by the schema system.
 */
export enum PropertyDataType {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Date = "date",
  Array = "array",
  Object = "object",
  RichText = "rich_text",
  Select = "select",
  MultiSelect = "multi_select",
  Relation = "relation",
  Formula = "formula",
  Rollup = "rollup"
}

/**
 * Query builder interface for type-safe queries.
 */
export interface QueryBuilder<T> {
  where<K extends keyof T>(field: K, operator: QueryOperator, value: T[K]): this;
  orderBy<K extends keyof T>(field: K, direction?: "asc" | "desc"): this;
  limit(count: number): this;
  offset(count: number): this;
  include(...relations: string[]): this;
  select<K extends keyof T>(...fields: K[]): QueryBuilder<Pick<T, K>>;
  stream(options?: StreamOptions): Observable<T>;
  execute(): Promise<T[]>;
  first(): Promise<T | null>;
  count(): Promise<number>;
}

/**
 * Query operators for filtering.
 */
export enum QueryOperator {
  Equals = "=",
  NotEquals = "!=",
  GreaterThan = ">",
  GreaterThanOrEqual = ">=",
  LessThan = "<",
  LessThanOrEqual = "<=",
  Contains = "contains",
  StartsWith = "starts_with",
  EndsWith = "ends_with",
  In = "in",
  NotIn = "not_in",
  IsNull = "is_null",
  IsNotNull = "is_not_null"
}

/**
 * Cache strategy for API responses.
 */
export interface CacheStrategy {
  key: (params: any) => string;
  ttl?: number;
  invalidate?: (params: any) => string[];
}

/**
 * Event emitter for API lifecycle events.
 */
export interface ApiEventEmitter {
  on(event: ApiEvent, handler: (data: any) => void): void;
  off(event: ApiEvent, handler: (data: any) => void): void;
  emit(event: ApiEvent, data: any): void;
}

/**
 * API lifecycle events.
 */
export enum ApiEvent {
  BeforeRequest = "before_request",
  AfterRequest = "after_request",
  Error = "error",
  RateLimit = "rate_limit",
  CacheHit = "cache_hit",
  CacheMiss = "cache_miss",
  Transform = "transform"
}
