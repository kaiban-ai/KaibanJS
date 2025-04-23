/**
 * Make Webhook Tool
 *
 * This tool allows integration with Make's webhook service, enabling seamless
 * interaction with thousands of apps and services supported by Make. It is
 * designed to trigger workflows and automate tasks across various applications
 * using Make's webhook functionality.
 *
 * Key features of Make Webhook Tool:
 * - Easy integration with Make's webhook service
 * - Trigger workflows and automate tasks across thousands of apps
 * - Configurable options for webhook events and payloads
 *
 * For more information about Make, visit: https://Make.com/
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

/**
 * Configuration options for the MakeWebhook tool
 * @interface MakeWebhookFields
 * @property {string} url - The Make webhook URL
 * @property {z.ZodObject<any>} schema - The schema for the input data using Zod
 */
interface MakeWebhookFields {
  url: string;
  schema: z.ZodObject<any>;
}

/**
 * Input parameters for the MakeWebhook tool
 * @interface MakeWebhookParams
 * @property {z.ZodObject<any>} input - The input data for the webhook
 */
type MakeWebhookParams = z.ZodObject<any>;

/**
 * Response type for the MakeWebhook tool
 * @typedef {string} MakeWebhookResponse
 * @example
 * "Webhook response success"
 */
type MakeWebhookResponse = string;

/**
 * Error type for the MakeWebhook tool
 * @typedef {string} MakeWebhookError
 * @example
 * "API request failed: Client Error (404)"
 */
type MakeWebhookError = string;

/**
 * MakeWebhook tool for triggering Make webhooks
 *
 * This tool allows integration with Make's webhook service, enabling seamless
 * interaction with thousands of apps and services supported by Make. It is
 * designed to trigger workflows and automate tasks across various applications
 * using Make's webhook functionality.
 *
 * Key features of Make Webhook Tool:
 * - Easy integration with Make's webhook service
 * - Trigger workflows and automate tasks across thousands of apps
 *
 * For more information about Make, visit: https://Make.com/
 */

export class MakeWebhook extends StructuredTool {
  private url: string;
  private httpClient: typeof ky;
  name = 'make_webhook';
  description =
    'A tool for triggering Make webhooks to integrate with various services. Input should be a JSON object with the necessary data for the webhook.';
  schema: z.ZodObject<any>;

  /**
   * Create a MakeWebhook tool.
   * @param fields - The configuration fields for the tool.
   * @param fields.url - The Make webhook URL.
   * @param fields.schema - The schema for the input data using Zod.
   */
  constructor(fields: MakeWebhookFields) {
    super();
    this.url = fields.url;
    this.schema = fields.schema;
    this.httpClient = ky;
  }

  /**
   * Call the Make webhook with the provided input data.
   * @param input - The input data for the webhook.
   * @returns The response from the webhook.
   */
  async _call(
    input: MakeWebhookParams
  ): Promise<MakeWebhookResponse | MakeWebhookError> {
    try {
      const response = await this.httpClient.post(this.url, {
        json: input,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return 'Could not parse Make webhook response. Please try again.';
      }

      return 'Webhook response success';
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
