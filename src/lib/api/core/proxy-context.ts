/**
 * Proxy-based context switching for the three-tier API pattern.
 *
 * This module implements dynamic method generation and context switching
 * using ES6 Proxies for seamless API tier transitions.
 */

import { Observable, Subject } from "rxjs";
import { filter, map, share } from "rxjs/operators";
import type { ApiContext, ApiEventEmitter, ProxyHandler } from "./types";
import { ApiEvent, ApiTier } from "./types";

/**
 * Context manager for API operations.
 */
export class ContextManager implements ApiEventEmitter {
  private currentContext: ApiContext;
  private contextStack: ApiContext[] = [];
  private eventSubject = new Subject<{ event: ApiEvent; data: any }>();

  /**
   * Observable stream of all API events.
   */
  public readonly events$ = this.eventSubject.asObservable().pipe(share());

  constructor(defaultContext: ApiContext) {
    this.currentContext = { ...defaultContext };
  }

  /**
   * Get the current API context.
   */
  getContext(): ApiContext {
    return { ...this.currentContext };
  }

  /**
   * Set the current API context.
   */
  setContext(context: Partial<ApiContext>): void {
    this.currentContext = { ...this.currentContext, ...context };
    this.emit(ApiEvent.Transform, { context: this.currentContext });
  }

  /**
   * Push a new context onto the stack.
   */
  pushContext(context: Partial<ApiContext>): void {
    this.contextStack.push({ ...this.currentContext });
    this.setContext(context);
  }

  /**
   * Pop the previous context from the stack.
   */
  popContext(): ApiContext | undefined {
    const previous = this.contextStack.pop();
    if (previous) {
      this.currentContext = previous;
      this.emit(ApiEvent.Transform, { context: this.currentContext });
    }
    return previous;
  }

  /**
   * Execute a function with a temporary context.
   */
  withContext<T>(context: Partial<ApiContext>, fn: () => T): T {
    this.pushContext(context);
    try {
      return fn();
    } finally {
      this.popContext();
    }
  }

  /**
   * Execute an async function with a temporary context.
   */
  async withContextAsync<T>(context: Partial<ApiContext>, fn: () => Promise<T>): Promise<T> {
    this.pushContext(context);
    try {
      return await fn();
    } finally {
      this.popContext();
    }
  }

  /**
   * Subscribe to API events.
   */
  on(event: ApiEvent, handler: (data: any) => void): void {
    const subscription = this.events$
      .pipe(
        filter((e) => e.event === event),
        map((e) => e.data)
      )
      .subscribe(handler);

    // TODO:Store subscription for cleanup (in a real implementation)
    // this.subscriptions.set(event, subscription);
  }

  /**
   * Unsubscribe from API events.
   */
  off(event: ApiEvent, handler: (data: any) => void): void {
    // Implementation would manage subscriptions
  }

  /**
   * Emit an API event.
   */
  emit(event: ApiEvent, data: any): void {
    this.eventSubject.next({ event, data });
  }
}

/**
 * Create a proxy handler for dynamic API method generation.
 */
export function createApiProxy<T extends object>(
  target: T,
  contextManager: ContextManager,
  tierHandlers: Map<ApiTier, ProxyHandler<T>>
): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const context = contextManager.getContext();
      const handler = tierHandlers.get(context.tier);

      if (handler && handler.get) {
        return handler.get(obj, prop, receiver);
      }

      return Reflect.get(obj, prop, receiver);
    },

    set(obj, prop, value, receiver) {
      const context = contextManager.getContext();
      const handler = tierHandlers.get(context.tier);

      if (handler && handler.set) {
        return handler.set(obj, prop, value, receiver);
      }

      return Reflect.set(obj, prop, value, receiver);
    },

    has(obj, prop) {
      const context = contextManager.getContext();
      const handler = tierHandlers.get(context.tier);

      if (handler && handler.has) {
        return handler.has(obj, prop);
      }

      return Reflect.has(obj, prop);
    }
  });
}

/**
 * Tier-specific proxy handler for Tier 1 (low-level) API access.
 */
export class Tier1ProxyHandler<T extends object> implements ProxyHandler<T> {
  constructor(private contextManager: ContextManager) {}

  get(target: T, prop: string | symbol, receiver: any): any {
    // For Tier 1, return raw methods without transformation
    const value = Reflect.get(target, prop, receiver);

    if (typeof value === "function") {
      return (...args: any[]) => {
        this.contextManager.emit(ApiEvent.BeforeRequest, { tier: ApiTier.Tier1, method: prop, args });

        try {
          const result = value.apply(target, args);

          // Handle promises
          if (result && typeof result.then === "function") {
            return result
              .then((data: any) => {
                this.contextManager.emit(ApiEvent.AfterRequest, { tier: ApiTier.Tier1, method: prop, data });
                return data;
              })
              .catch((error: any) => {
                this.contextManager.emit(ApiEvent.Error, { tier: ApiTier.Tier1, method: prop, error });
                throw error;
              });
          }

          this.contextManager.emit(ApiEvent.AfterRequest, { tier: ApiTier.Tier1, method: prop, data: result });
          return result;
        } catch (error) {
          this.contextManager.emit(ApiEvent.Error, { tier: ApiTier.Tier1, method: prop, error });
          throw error;
        }
      };
    }

    return value;
  }
}

/**
 * Tier-specific proxy handler for Tier 2 (enhanced) API access.
 */
export class Tier2ProxyHandler<T extends object> implements ProxyHandler<T> {
  constructor(
    private contextManager: ContextManager,
    private transformers: Map<string | symbol, (result: any) => any>
  ) {}

  get(target: T, prop: string | symbol, receiver: any): any {
    const value = Reflect.get(target, prop, receiver);

    if (typeof value === "function") {
      return (...args: any[]) => {
        this.contextManager.emit(ApiEvent.BeforeRequest, { tier: ApiTier.Tier2, method: prop, args });

        // Apply input transformation if needed
        const transformedArgs = this.transformInput(prop, args);

        try {
          const result = value.apply(target, transformedArgs);

          // Handle promises
          if (result && typeof result.then === "function") {
            return result
              .then((data: any) => {
                const transformed = this.transformOutput(prop, data);
                this.contextManager.emit(ApiEvent.AfterRequest, {
                  tier: ApiTier.Tier2,
                  method: prop,
                  data: transformed
                });
                return transformed;
              })
              .catch((error: any) => {
                this.contextManager.emit(ApiEvent.Error, { tier: ApiTier.Tier2, method: prop, error });
                throw error;
              });
          }

          const transformed = this.transformOutput(prop, result);
          this.contextManager.emit(ApiEvent.AfterRequest, { tier: ApiTier.Tier2, method: prop, data: transformed });
          return transformed;
        } catch (error) {
          this.contextManager.emit(ApiEvent.Error, { tier: ApiTier.Tier2, method: prop, error });
          throw error;
        }
      };
    }

    return value;
  }

  private transformInput(method: string | symbol, args: any[]): any[] {
    // Apply context-specific input transformations
    const context = this.contextManager.getContext();
    if (context.naming) {
      // Transform based on naming strategy
      return args; // Placeholder
    }
    return args;
  }

  private transformOutput(method: string | symbol, result: any): any {
    // Apply registered transformers
    const transformer = this.transformers.get(method);
    if (transformer) {
      return transformer(result);
    }

    // Apply context-specific transformations
    const context = this.contextManager.getContext();
    if (context.naming) {
      // Transform based on naming strategy
      return result; // Placeholder
    }

    return result;
  }
}

/**
 * Tier-specific proxy handler for Tier 3 (fluent builder) API access.
 */
export class BuilderClient<T extends object> implements ProxyHandler<T> {
  private builderChain: any[] = [];

  constructor(
    private contextManager: ContextManager,
    private builderFactory: (chain: any[]) => any
  ) {}

  get(target: T, prop: string | symbol, receiver: any): any {
    // Check if this is a builder method
    if (this.isBuilderMethod(prop)) {
      return (...args: any[]) => {
        this.builderChain.push({ method: prop, args });

        // Return proxy for chaining
        return new Proxy(target, {
          get: (obj, nextProp) => this.get(obj, nextProp, receiver)
        });
      };
    }

    // Check if this is a terminal method
    if (this.isTerminalMethod(prop)) {
      return (...args: any[]) => {
        this.builderChain.push({ method: prop, args });

        // Build and execute the query
        const builder = this.builderFactory(this.builderChain);
        this.builderChain = []; // Reset chain
        const result: any = builder.execute();
        this.contextManager.emit(ApiEvent.BeforeRequest, { tier: ApiTier.Tier3, builder });

        try {
          const result: any = builder.execute();

          // Handle different return types
          if (result instanceof Observable) {
            return result.pipe(
              map((data) => {
                this.contextManager.emit(ApiEvent.AfterRequest, { tier: ApiTier.Tier3, data });
                return data;
              })
            );
          }

          if (result && typeof result.then === "function") {
            return result
              .then((data: any) => {
                this.contextManager.emit(ApiEvent.AfterRequest, { tier: ApiTier.Tier3, data });
                return data;
              })
              .catch((error: any) => {
                this.contextManager.emit(ApiEvent.Error, { tier: ApiTier.Tier3, error });
                throw error;
              });
          }

          this.contextManager.emit(ApiEvent.AfterRequest, { tier: ApiTier.Tier3, data: result });
          return result;
        } catch (error) {
          this.contextManager.emit(ApiEvent.Error, { tier: ApiTier.Tier3, error });
          throw error;
        }
      };
    }

    // Default behavior
    return Reflect.get(target, prop, receiver);
  }

  private isBuilderMethod(prop: string | symbol): boolean {
    const builderMethods = ["where", "orderBy", "limit", "offset", "include", "select"];
    return typeof prop === "string" && builderMethods.includes(prop);
  }

  private isTerminalMethod(prop: string | symbol): boolean {
    const terminalMethods = ["execute", "first", "count", "stream"];
    return typeof prop === "string" && terminalMethods.includes(prop);
  }
}

/**
 * Create a context-aware API client with tier switching.
 */
export function createContextAwareApi<T extends object>(
  baseApi: T,
  defaultContext: ApiContext = { tier: ApiTier.Tier1 }
): T & { context: ContextManager } {
  const contextManager = new ContextManager(defaultContext);

  // Create tier-specific handlers
  const tierHandlers = new Map<ApiTier, ProxyHandler<T>>([
    [ApiTier.Tier1, new Tier1ProxyHandler(contextManager)],
    [ApiTier.Tier2, new Tier2ProxyHandler(contextManager, new Map())],
    [ApiTier.Tier3, new BuilderClient(contextManager, (chain) => ({ execute: () => chain }))]
  ]);

  // Create the proxied API
  const proxiedApi = createApiProxy(baseApi, contextManager, tierHandlers);

  // Add context manager as a proper
  return Object.assign(proxiedApi, { context: contextManager });
}
