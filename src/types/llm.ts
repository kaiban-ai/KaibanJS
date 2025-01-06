/**
 * ### Various LLM API keys
 * @interface IApiKeys
 * @property {string} [openai] - The OpenAI API key.
 * @property {string} [google] - The Google API key.
 * @property {string} [anthropic] - The Anthropic API key.
 * @property {string} [mistral] - The Mistral API key.
 */
export interface IApiKeys {
  openai?: string;
  google?: string;
  anthropic?: string;
  mistral?: string;
}

/**
 * ### LLM configuration
 * @interface ILLMConfig
 * @property {("openai" | "google" | "anthropic" | "mistral")} provider - The provider of the language model.
 * @property {string} model - The model to be used.
 * @property {number} maxRetries - The maximum number of retries.
 * @property {number} apiBaseUrl - The API's URL or endpoint.
 * @property {IApiKeys} [apiKey] - The API key for the provider.
 */
export interface ILLMConfig {
  provider: 'openai' | 'google' | 'anthropic' | 'mistral';
  model: string;
  maxRetries: number;
  apiBaseUrl?: string;
  apiKey?: IApiKeys;
}

/**
 * ### Normalized LLM configuration
 * @interface INLLMConfig
 * @extends ILLMConfig
 * @property {string} model - The model to be used.
 * @property {number} maxRetries - The maximum number of retries.
 * @property {number} apiBaseUrl - The API's URL or endpoint.
 * @property {IApiKeys} [apiKey] - The API key for the provider.
 */
export interface INLLMConfig extends ILLMConfig {
  // For Open AI
  configuration?: {
    basePath: string;
  };

  // Anthropic
  anthropicApiUrl?: string;

  // Google
  baseUrl?: string;

  // Mistral
  endpoint?: string;
}

/**
 * ### LLM usage stats
 * @interface ILLMUsageStats
 * @property {number} inputTokens - The number of input tokens.
 * @property {number} outputTokens - The number of output tokens.
 * @property {number} callsCount - The number of calls.
 * @property {number} callsErrorCount - The number of calls with errors.
 * @property {number} parsingErrors - The number of parsing errors.
 */
export interface ILLMUsageStats {
  inputTokens: number;
  outputTokens: number;
  callsCount: number;
  callsErrorCount: number;
  parsingErrors: number;
}
