import { Client } from "@notionhq/client";
import { SearchParameters } from "./schemas/request";
import { log } from "./util/logging";

export interface NotionConfig {
  apiKey: string;
  apiVersion?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export class NotionClient {
  private client: Client;
  private rateLimitInfo: RateLimitInfo | null = null;

  constructor(private config: NotionConfig) {
    this.client = new Client({
      auth: config.apiKey,
      baseUrl: config.baseUrl ?? "https://api.notion.com",
      timeoutMs: config.timeout ?? 30000
    });
  }

  async paginate<T>(parms: SearchParameters): Promise<NotionSearchResponse<T>> {
    return this.execute(`notion-client.paginate(${JSON.stringify(parms)})`, async () => {
      const response = await this.client.search(parms);
      const results = response.results.map((result) => {});

      return {
        results,
        hasMore: response.has_more,
        nextCursor: response.next_cursor || undefined
      };
    });
  }

  private async execute<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    log.debug(`executing Notion API call`, operation);
    try {
      const result = await fn();
      this.updateRateLimitFromResponse(); // Placeholder for future implementation
      return result;
    } catch (error: any) {
      // if (this.isRateLimitError(error)) {
      //   this.handleRateLimitError(error); // This will throw a RateLimitError
      // }
      log.error(`Notion API call failed`, { operation, error: error.message });
      throw error;
    }
  }

  private updateRateLimitFromResponse(): void {
    // This is a placeholder. In a real implementation, you would extract
    // rate limit information from the response headers of the Notion API.
    // For now, we'll just clear any existing rate limit info on successful requests
    // if the reset time has passed.
    if (this.rateLimitInfo && this.rateLimitInfo.resetTime < new Date()) {
      this.rateLimitInfo = null;
    }
  }
}
