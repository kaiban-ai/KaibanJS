import { ZodAny } from "@langchain/core/dist/types/zod";
import { StructuredToolInterface } from "@langchain/core/tools";

/**
 * An object representing the environment variables.
 * @default null
 */
export type TEnv = Record<string, any> | null;

/**
 * An object for the various api keys.
 */
export interface IApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
  mistral?: string;
}

/**
 * An object representing the agent's LLM config.
 */
export interface ILLMConfig {
  /**
   * @property {('openai' | 'google' | 'anthropic' | 'mistral')} provider - The provider of the language model, defaults to "openai".
   * @default "openai"
   */
  provider: "openai" | "google" | "anthropic" | "mistral";
  /**
   * @property {string} model - Specific language model to use, defaults to "gpt-4o-mini".
   * @default "gpt-4o-mini"
   */
  model: string;
  /**
   * @property {number} maxRetries - Number of retries for calling the model, defaults to 1.
   * @default 1
   */
  maxRetries: number;
  apiKey?: IApiKeys;
}

/**
 * An object representing the usage details.
 */
export interface IUsageStats {
  inputTokens: number;
  outputTokens: number;
  callsCount?: number;
  callsErrorCount?: number;
  parsingErrors?: number;
}

/**
 * An object representing the LLM tool.
 */
export interface ILLMTool<T extends ZodAny = ZodAny>
  extends StructuredToolInterface<T> {}

/**
 * An object representing the thinking result.
 */
export interface IThinkingResult {
  parsedLLMOutput: any;
  llmOutput: string;
  llmUsageStats: IUsageStats;
}
