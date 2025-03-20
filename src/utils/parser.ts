/**
 * Data Parsing Utilities.
 *
 * This module provides functions for parsing and sanitizing data formats, particularly focusing
 * on JSON structures that agents might receive or need to process. These utilities ensure that
 * data handled by agents is in the correct format and free of errors.
 *
 * @module parser
 */

import { oset } from './objectUtils';

/** Action input data structure */
export type ActionInput = Record<string, unknown>;

/** Parsed agent response structure */
export type AgentResponse = {
  /** Agent's reasoning about the task */
  thought?: string;
  /** Action to be taken */
  action?: string;
  /** Input parameters for the action */
  actionInput?: ActionInput | null;
  /** Result of the action */
  observation?: string;
  /** Whether the agent has reached a final answer */
  isFinalAnswerReady?: boolean;
  /** The final answer from the agent */
  finalAnswer?: string;
};

/** Schema definition for parsing agent responses */
type ParsingSchema = {
  [key: string]: RegExp;
};

const RESPONSE_SCHEMA: ParsingSchema = {
  thought: /"thought"\s*:\s*"([^"]*)"/,
  action: /"action"\s*:\s*"([^"]*)"/,
  actionInput: /"actionInput"\s*:\s*({[^}]*})/,
  observation: /"observation"\s*:\s*"([^"]*)"/,
  isFinalAnswerReady: /"isFinalAnswerReady"\s*:\s*(true|false)/,
  finalAnswer: /"finalAnswer"\s*:\s*"([^"]*)"/,
};

/**
 * Parses a JSON string into a structured object, with fallback to regex-based parsing
 * @param str - The JSON string to parse
 * @returns Parsed object or empty object if parsing fails
 *
 * @example
 * ```typescript
 * const input = `{
 *   "thought": "Need to search for information",
 *   "action": "search",
 *   "actionInput": {"query": "example"}
 * }`;
 * const result = getParsedJSON(input);
 * ```
 */
export function getParsedJSON(str: string): AgentResponse {
  try {
    // First attempt to parse the JSON string directly
    return JSON.parse(str) as AgentResponse;
  } catch {
    // If JSON parsing fails, fall back to regex extraction
    const result: AgentResponse = {};

    // Iterate over each key in the schema to find matches in the input string
    Object.keys(RESPONSE_SCHEMA).forEach((key: string) => {
      const regex = RESPONSE_SCHEMA[key];
      const match = str.match(regex);

      if (match) {
        // If the key is found, parse the value appropriately
        if (key === 'actionInput') {
          // Assuming actionInput always contains a JSON-like object
          try {
            result[key] = JSON.parse(match[1].replace(/'/g, '"'));
          } catch {
            result[key] = null; // Default to null if parsing fails
          }
        } else if (key === 'isFinalAnswerReady') {
          result[key] = match[1] === 'true'; // Convert string to boolean
        } else if (key === 'finalAnswer') {
          result[key] = match[1];
        } else {
          oset(result, key, match[1]);
        }
      }
    });

    return result;
  }
}
