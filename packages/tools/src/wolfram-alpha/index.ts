/**
 * WolframAlpha Tool
 *
 * This tool integrates with WolframAlpha (https://www.wolframalpha.com/), a computational
 * intelligence engine that provides robust and detailed answers to complex queries across
 * various domains.
 *
 * Key features:
 * - Advanced computations and data analysis
 * - Scientific and mathematical calculations
 * - Real-time data processing
 * - Domain-specific knowledge in:
 *   - Mathematics
 *   - Physics
 *   - Chemistry
 *   - Engineering
 *   - Earth Sciences
 *   - Life Sciences
 *   - Units & Measures
 *   - Financial calculations
 *   - And more
 *
 * For more information about WolframAlpha, visit: https://www.wolframalpha.com/
 * To get an API key, sign up at: https://developer.wolframalpha.com/
 */

import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import ky, { HTTPError } from 'ky';

interface WolframAlphaFields {
  appId: string;
}

export class WolframAlphaTool extends StructuredTool {
  private appId: string;
  private httpClient: typeof ky;
  name = 'wolfram_alpha';
  description =
    'The WolframAlpha tool integrates the power of WolframAlpha, a computational intelligence engine, to provide detailed answers to complex queries across various domains. It offers advanced computation and data analysis capabilities, including mathematics, physics, chemistry, engineering, and life sciences. Ideal for educational tasks, research, and professional applications, it allows users to perform precise calculations and obtain scientific information in real-time, thereby enhancing the capabilities of any system that requires computational intelligence.';
  schema = z.object({
    query: z
      .string()
      .min(1, 'The query cannot be empty')
      .describe('The query to send to WolframAlpha'),
  });

  constructor(fields: WolframAlphaFields) {
    super();
    this.appId = fields.appId;
    this.httpClient = ky;
  }

  async _call(
    input: z.infer<typeof this.schema>
  ): Promise<Record<string, any> | string> {
    try {
      const url = 'https://www.kaibanjs.com/proxy/wolframalpha';

      const bodyData = {
        query: input.query,
      };

      const response = await this.httpClient
        .post(url, {
          json: bodyData,
          headers: {
            'X-APP-ID': this.appId,
            'Content-Type': 'application/json',
          },
        })
        .json<Record<string, any>>();

      return response;
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
