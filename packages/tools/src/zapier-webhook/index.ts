/**
 * Zapier Webhook Tool
 *
 * This tool allows integration with Zapier's webhook service, enabling seamless
 * interaction with thousands of apps and services supported by Zapier. It is
 * designed to trigger workflows and automate tasks across various applications
 * using Zapier's webhook functionality.
 *
 * Key features of Zapier Webhook Tool:
 * - Easy integration with Zapier's webhook service
 * - Trigger workflows and automate tasks across thousands of apps
 * - Configurable options for webhook events and payloads
 *
 * For more information about Zapier, visit: https://zapier.com/
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

interface ZapierWebhookFields {
  url: string;
  schema: z.ZodObject<any>;
}

export class ZapierWebhook extends StructuredTool {
  private url: string;
  private httpClient: typeof ky;
  name = 'zapier_webhook';
  description =
    'A tool for triggering Zapier webhooks to integrate with various services. Input should be a JSON object with the necessary data for the webhook.';
  schema: z.ZodObject<any>;

  /**
   * Create a ZapierWebhook tool.
   * @param fields - The configuration fields for the tool.
   * @param fields.url - The Zapier webhook URL.
   * @param fields.schema - The schema for the input data using Zod.
   */
  constructor(fields: ZapierWebhookFields) {
    super();
    this.url = fields.url;
    this.schema = fields.schema;
    this.httpClient = ky;
  }

  /**
   * Call the Zapier webhook with the provided input data.
   * @param input - The input data for the webhook.
   * @returns The response from the webhook as a JSON string.
   */
  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    try {
      const jsonData = await this.httpClient
        .post(this.url, {
          body: JSON.stringify(input),
        })
        .json<Record<string, any>>();

      if (!jsonData || typeof jsonData !== 'object') {
        return 'Could not parse Zapier webhook response. Please try again.';
      }

      return JSON.stringify(jsonData);
    } catch (error) {
      if (error instanceof HTTPError) {
        const statusCode = error.response.status;
        let errorType = 'Unknown';
        if (statusCode >= 400 && statusCode < 500) {
          errorType = 'Client Error';
        } else if (statusCode >= 500) {
          errorType = 'Server Error';
        }
        return `API request failed: ${errorType} (${statusCode})`;
      } else {
        return `An unexpected error occurred: ${
          error instanceof Error ? error.message : String(error)
        }`;
      }
    }
  }
}
