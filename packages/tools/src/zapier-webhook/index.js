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
 * Usage:
 * const zapierTool = new ZapierWebhook({
 *   url: 'https://hooks.zapier.com/hooks/catch/4716958/2sdvyu2', // Set your Zapier webhook URL here
 *   schema: z.object({
 *     emailSubject: z.string().describe('The subject of the email.'),
 *     issuesSummary: z.string().describe('The summary of the issues.'),
 *   }),
 * });
 * const response = await zapierTool._call({
 *   emailSubject: 'Weekly GitHub Issues Report',
 *   issuesSummary: 'Summary of the issues found in the repository.',
 * });
 *
 * For more information about Zapier, visit: https://zapier.com/
 */

import { Tool } from '@langchain/core/tools';
import ky from 'ky';
import { HTTPError } from 'ky';

/**
 * Class representing a Zapier Webhook tool.
 * @extends Tool
 */
export class ZapierWebhook extends Tool {
  /**
   * Create a ZapierWebhook tool.
   * @param {Object} fields - The configuration fields for the tool.
   * @param {string} fields.url - The Zapier webhook URL.
   * @param {Object} fields.schema - The schema for the input data using Zod.
   */
  constructor(fields) {
    super(fields);
    this.url = fields.url;
    this.name = 'zapier_webhook';
    this.description =
      'A tool for triggering Zapier webhooks to integrate with various services. Input should be a JSON object with the necessary data for the webhook.';

    this.httpClient = ky;
    this.schema = fields.schema;
  }

  /**
   * Call the Zapier webhook with the provided input data.
   * @param {Object} input - The input data for the webhook.
   * @returns {Promise<string>} The response from the webhook as a JSON string.
   */
  async _call(input) {
    try {
      const jsonData = await this.httpClient
        .post(this.url, {
          body: JSON.stringify(input),
        })
        .json();

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
        return `An unexpected error occurred: ${error.message}`;
      }
    }
  }
}
