/**
 * Agent Utility Functions.
 *
 * This file provides utility functions specifically designed to support agent operations within the AgenticJS library.
 * Functions include retrieving API keys based on agent configurations and cleaning JSON strings for parsing. These utilities
 * aid in configuring agents accurately and handling their data interactions.
 *
 * Usage:
 * Use these utilities to manage agent configurations and preprocess data formats essential for the smooth operation of agents.
 */

import { ILLMConfig, TEnv } from "./types";

/**
 * Utility function to retrieve the API key based on the LLM configuration and environment variables.
 */
const getApiKey = (llmConfig: ILLMConfig, env: TEnv) => {
  if (llmConfig?.apiKey) return llmConfig.apiKey;

  const apiKeys = {
    anthropic: env.ANTHROPIC_API_KEY ?? "",
    google: env.GOOGLE_API_KEY ?? "",
    mistral: env.MISTRAL_API_KEY ?? "",
    openai: env.OPENAI_API_KEY ?? "",
  };

  return apiKeys[llmConfig?.provider];
};

/**
 * Utility function to replace placeholders in the agent prompt.
 */
const replaceAgentAttributes = (
  template: string,
  attributes: {
    name: string;
    role: string;
    background: string;
    goal: string;
    context: string;
    expectedOutput: string;
  }
) => {
  return template
    .replace("{name}", attributes.name)
    .replace("{role}", attributes.role)
    .replace("{background}", attributes.background)
    .replace("{goal}", attributes.goal)
    .replace("{context}", attributes.context)
    .replace("{expectedOutput}", attributes.expectedOutput);
};

/**
 * Utility function to clean up JSON string to be able to parse it later.
 *
 * Example 1
 * {
 *   "thought": "To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information. Since this is a future event (as of my last update), I should verify if it has already taken place or if there are any changes to the schedule."
 *   "action": "tavily_search_results_json",
 *   "actionInput": {
 *     "query": "Copa America 2024 winner results details"
 *   }
 * }
 *
 * Example 2
 * {
 *   "thought": "To find detailed information about the Copa America 2024 winner, I need to search for the most recent and relevant information. Since this is a future event, I should be cautious about the results and verify if the tournament has actually taken place."
 *   "action": "tavily_search_results_json",
 *   "actionInput": {
 *     "query": "Copa America 2024 winner results details"
 *   }
 * }
 */
const getParsedJSON = (str: string) => {
  try {
    // Directly attempt to parse the JSON first
    return JSON.parse(str);
  } catch (error) {
    // Attempt to fix common JSON issues
    const sanitizedStr = str
      .trim()
      // Normalize line breaks and spaces
      .replace(/\s*\n\s*/g, "")
      // Replace single quotes with double quotes
      .replace(/'/g, '"')
      // Ensure proper quoting around keys
      .replace(/([{,]\s*)([^"\s][a-zA-Z0-9_]+\s*):/g, '$1"$2":')
      // Ensure proper quoting around string values that are unquoted
      .replace(/:\s*([^"\s][^,}\s]*)(\s*[},])/g, ': "$1"$2')
      // Add missing commas between key-value pairs, accommodating various edge cases
      .replace(/(?<=}|\])(\s*{)/g, ",$1")
      .replace(/(["}\]])(\s*["{])/g, "$1,$2")
      // Remove trailing commas within objects or arrays
      .replace(/,\s*([}\]])/g, "$1");

    try {
      // Attempt to parse the sanitized string
      return JSON.parse(sanitizedStr);
    } catch (error) {
      console.error("Error parsing sanitized JSON:", error);
      return null;
    }
  }
};

export { getApiKey, replaceAgentAttributes, getParsedJSON };
