import { Client } from "@notionhq/client";

/**
 * @module
 * This module defines the core Notion SDK client, which serves as the primary
 * entry point for all interactions with the Notion API. It wraps the official
 * `@notionhq/client` and provides a multi-layered, type-safe interface for
 * querying, creating, and updating Notion data.
 */

/**
 * Defines the configuration options for the Notion client.
 */
export interface NotionClientOptions {
  /**
   * The Notion integration token. This can be obtained from the Notion
   * integration settings page.
   *
   * @see https://www.notion.so/my-integrations
   */
  auth: string;
}

/**
 * The main client for interacting with the Notion API.
 * It provides a tiered interface for progressive disclosure of complexity,
 * from simple string-based queries to advanced, type-safe builders.
 */
export class NotionClient {
  private readonly notion: Client;

  /**
   * Creates a new instance of the NotionClient.
   *
   * @param options - The configuration options for the client.
   */
  constructor(options?: NotionClientOptions) {
    if (!options?.auth) {
      throw new Error("Notion API authentication token is required. Please provide it in the client options.");
    }

    this.notion = new Client({
      auth: options.auth
    });
  }
}
