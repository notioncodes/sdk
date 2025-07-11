import { Client } from "@notionhq/client";
import { schemaFactory } from "./factory";
import { log } from "./logging";
import type { NamingConfig, NamingStrategy } from "./naming";
import { transformFromNotion, transformToNotion } from "./transformer";

export interface NotionConfig {
  apiKey: string;
  apiVersion?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  /** Property naming strategy configuration */
  naming?: NamingConfig;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface NotionSearchResponse<T> {
  results: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export class NotionClient {
  private client: Client;
  private rateLimitInfo: RateLimitInfo | null = null;
  private namingConfig: NamingConfig;

  constructor(private config: NotionConfig) {
    this.client = new Client({
      auth: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.notion.com",
      timeoutMs: config.timeout ?? 30000
    });

    // Default to snake_case (no transformation) if no naming config provided
    this.namingConfig = config.naming ?? { strategy: "snake_case" };
  }

  /**
   * Search pages and databases with automatic property transformation.
   */
  async search<T = any>(params: any): Promise<NotionSearchResponse<T>> {
    // Transform request parameters to Notion API format
    const notionParams = this.transformRequest(params);

    return this.execute(`search(${JSON.stringify(notionParams)})`, async () => {
      const response = await this.client.search(notionParams);

      // Transform response to target naming convention
      const transformedResults = response.results.map((result) => this.transformResponse(result));

      return {
        results: transformedResults,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined
      };
    });
  }

  /**
   * Retrieve a page with automatic property transformation.
   */
  async getPage<T = any>(pageId: string): Promise<T> {
    return this.execute(`getPage(${pageId})`, async () => {
      const response = await this.client.pages.retrieve({ page_id: pageId });
      return this.transformResponse(response);
    });
  }

  /**
   * Create a page with automatic property transformation.
   */
  async createPage<T = any>(pageData: any): Promise<T> {
    const notionData = this.transformRequest(pageData);

    return this.execute(`createPage(${JSON.stringify(notionData)})`, async () => {
      const response = await this.client.pages.create(notionData);
      return this.transformResponse(response);
    });
  }

  /**
   * Update a page with automatic property transformation.
   */
  async updatePage<T = any>(pageId: string, pageData: any): Promise<T> {
    const notionData = this.transformRequest(pageData);

    return this.execute(`updatePage(${pageId})`, async () => {
      const response = await this.client.pages.update({
        page_id: pageId,
        ...notionData
      });
      return this.transformResponse(response);
    });
  }

  /**
   * Get typed schema for a specific entity type.
   */
  getSchema<S extends NamingStrategy>(entityType: "page" | "block", strategy?: S) {
    const config = strategy ? { ...this.namingConfig, strategy } : this.namingConfig;

    switch (entityType) {
      case "page":
        return schemaFactory.createPageSchema(config as any);
      case "block":
        return schemaFactory.createBlockSchema(config as any);
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Transform request data to Notion API format.
   */
  private transformRequest(data: any): any {
    if (this.namingConfig.strategy === "snake_case") {
      return data; // No transformation needed
    }

    return transformToNotion(data, this.namingConfig);
  }

  /**
   * Transform response data to target naming convention.
   */
  private transformResponse(data: any): any {
    if (this.namingConfig.strategy === "snake_case") {
      return data; // No transformation needed
    }

    return transformFromNotion(data, this.namingConfig);
  }

  private async execute<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    log.debug(`executing Notion API call`, operation);
    try {
      const result = await fn();
      this.updateRateLimitFromResponse();
      return result;
    } catch (error: any) {
      log.error(`Notion API call failed`, { operation, error: error.message });
      throw error;
    }
  }

  private updateRateLimitFromResponse(): void {
    if (this.rateLimitInfo && this.rateLimitInfo.resetTime < new Date()) {
      this.rateLimitInfo = null;
    }
  }
}
