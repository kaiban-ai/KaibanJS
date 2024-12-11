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
 * Usage:
 * const MakeTool = new MakeWebhook({
 *   url: 'https://hooks.Make.com/hooks/catch/4716958/2sdvyu2', // Set your Make webhook URL here
 *   schema: z.object({
 *     emailSubject: z.string().describe('The subject of the email.'),
 *     issuesSummary: z.string().describe('The summary of the issues.'),
 *   }),
 * });
 * const response = await MakeTool._call({
 *   emailSubject: 'Weekly GitHub Issues Report',
 *   issuesSummary: 'Summary of the issues found in the repository.',
 * });
 *
 * For more information about Make, visit: https://Make.com/
 */

import { Tool } from '@langchain/core/tools';
import ky from 'ky';
import { HTTPError } from 'ky';

/**
 * Class representing a Make Webhook tool.
 * @extends Tool
 */
export class MakeWebhook extends Tool {
  /**
   * Create a MakeWebhook tool.
   * @param {Object} fields - The configuration fields for the tool.
   * @param {string} fields.url - The Make webhook URL.
   * @param {Object} fields.schema - The schema for the input data using Zod.
   */
  constructor(fields) {
    super(fields);
    this.url = fields.url;
    this.name = 'make_webhook';
    this.description =
      'A tool for triggering Make webhooks to integrate with various services. Input should be a JSON object with the necessary data for the webhook.';

    this.httpClient = ky;
    this.schema = fields.schema;
  }

  /**
   * Call the Make webhook with the provided input data.
   * @param {Object} input - The input data for the webhook.
   * @returns {Promise<string>} The response from the webhook as a JSON string.
   */
  async _call(input) {
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
        return `An unexpected error occurred: ${error.message}`;
      }
    }
  }
}
