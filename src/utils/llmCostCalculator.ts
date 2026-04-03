/**
 * LLM Cost Calculation Utilities.
 *
 * This module provides functions for calculating costs associated with using large language models (LLMs)
 * based on token usage and model-specific pricing. It helps in budgeting and monitoring the financial
 * aspects of LLM usage within the KaibanJS library.
 *
 * @module llmCostCalculator
 */

import { logger } from './logger';
import { LLMProvider } from './llm.types';

/** Model pricing information */
export type ModelPricing = {
  /** Unique identifier for the model */
  modelCode: string;
  /** Provider of the model */
  provider: LLMProvider;
  /** Cost per million input tokens */
  inputPricePerMillionTokens: number;
  /** Cost per million output tokens */
  outputPricePerMillionTokens: number;
  /** Description of model features */
  features: string;
};

/** LLM usage statistics */
export type LLMUsageStats = {
  /** Number of input tokens processed */
  inputTokens: number;
  /** Number of output tokens generated */
  outputTokens: number;
  /** Total number of API calls made */
  callsCount: number;
  /** Number of failed API calls */
  callsErrorCount: number;
  /** Number of parsing errors encountered */
  parsingErrors: number;
};

/** Cost calculation result */
export type CostResult = {
  /** Cost for input tokens (-1 if calculation failed) */
  costInputTokens: number;
  /** Cost for output tokens (-1 if calculation failed) */
  costOutputTokens: number;
  /** Total cost (-1 if calculation failed) */
  totalCost: number;
};

/** Model usage statistics by model code */
export type ModelUsageStats = Record<
  string,
  {
    inputTokens: number;
    outputTokens: number;
  }
>;

/** Model pricing — OpenAI & Anthropic IDs aligned with platform docs (Apr 2026); standard tier unless noted */
const modelsPricing: ModelPricing[] = [
  // GPT / frontier models — OpenAI (standard pricing, platform.openai.com/docs/pricing)
  {
    modelCode: 'gpt-5.4',
    provider: 'openai',
    inputPricePerMillionTokens: 2.5,
    outputPricePerMillionTokens: 15.0,
    features:
      'Flagship frontier; complex reasoning and coding; long context (see OpenAI pricing for >272K tiers)',
  },
  {
    modelCode: 'gpt-5.4-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 0.75,
    outputPricePerMillionTokens: 4.5,
    features: 'Lower-latency GPT-5.4 family; strong capability per cost',
  },
  {
    modelCode: 'gpt-5.4-nano',
    provider: 'openai',
    inputPricePerMillionTokens: 0.2,
    outputPricePerMillionTokens: 1.25,
    features: 'Fastest, lowest-cost GPT-5.4 tier',
  },
  {
    modelCode: 'gpt-5.4-pro',
    provider: 'openai',
    inputPricePerMillionTokens: 30.0,
    outputPricePerMillionTokens: 180.0,
    features: 'Highest capability GPT-5.4 variant; premium pricing',
  },
  {
    modelCode: 'gpt-5.2',
    provider: 'openai',
    inputPricePerMillionTokens: 1.75,
    outputPricePerMillionTokens: 14.0,
    features: 'GPT-5.2 series; strong general and coding use',
  },
  {
    modelCode: 'gpt-5.2-pro',
    provider: 'openai',
    inputPricePerMillionTokens: 21.0,
    outputPricePerMillionTokens: 168.0,
    features: 'Pro tier GPT-5.2',
  },
  {
    modelCode: 'gpt-5.1',
    provider: 'openai',
    inputPricePerMillionTokens: 1.25,
    outputPricePerMillionTokens: 10.0,
    features: 'GPT-5.1 series',
  },
  {
    modelCode: 'gpt-5',
    provider: 'openai',
    inputPricePerMillionTokens: 1.25,
    outputPricePerMillionTokens: 10.0,
    features:
      'GPT-5 series; excellent for coding and agentic tasks across domains',
  },
  {
    modelCode: 'gpt-5-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 0.25,
    outputPricePerMillionTokens: 2.0,
    features: 'Faster, cost-efficient GPT-5 for well-defined tasks',
  },
  {
    modelCode: 'gpt-5-nano',
    provider: 'openai',
    inputPricePerMillionTokens: 0.05,
    outputPricePerMillionTokens: 0.4,
    features: 'Fastest, most cost-efficient GPT-5 tier',
  },
  {
    modelCode: 'gpt-5-pro',
    provider: 'openai',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 120.0,
    features: 'Pro tier GPT-5',
  },
  {
    modelCode: 'gpt-4.1',
    provider: 'openai',
    inputPricePerMillionTokens: 2.0,
    outputPricePerMillionTokens: 8.0,
    features:
      'GPT-4.1; strong for long context and latency-sensitive workloads',
  },
  {
    modelCode: 'gpt-4.1-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 0.4,
    outputPricePerMillionTokens: 1.6,
    features: 'Cost-efficient GPT-4.1 variant',
  },
  {
    modelCode: 'gpt-4.1-nano',
    provider: 'openai',
    inputPricePerMillionTokens: 0.1,
    outputPricePerMillionTokens: 0.4,
    features: 'Lightest GPT-4.1 tier',
  },
  {
    modelCode: 'gpt-4o',
    provider: 'openai',
    inputPricePerMillionTokens: 2.5,
    outputPricePerMillionTokens: 10.0,
    features:
      'Multimodal; text and vision; current standard gpt-4o list pricing',
  },
  {
    modelCode: 'gpt-4o-2024-05-13',
    provider: 'openai',
    inputPricePerMillionTokens: 5.0,
    outputPricePerMillionTokens: 15.0,
    features:
      'Pinned GPT-4o snapshot; higher per-token rates than default gpt-4o',
  },
  {
    modelCode: 'gpt-4o-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 0.15,
    outputPricePerMillionTokens: 0.6,
    features: 'Cost-efficient multimodal variant of GPT-4o',
  },
  // Reasoning / o-series (standard pricing)
  {
    modelCode: 'o1',
    provider: 'openai',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 60.0,
    features: 'Reasoning model; complex multi-step problems',
  },
  {
    modelCode: 'o1-pro',
    provider: 'openai',
    inputPricePerMillionTokens: 150.0,
    outputPricePerMillionTokens: 600.0,
    features: 'Highest-tier o1 capability',
  },
  {
    modelCode: 'o1-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 1.1,
    outputPricePerMillionTokens: 4.4,
    features: 'Faster, cheaper reasoning model',
  },
  {
    modelCode: 'o3',
    provider: 'openai',
    inputPricePerMillionTokens: 2.0,
    outputPricePerMillionTokens: 8.0,
    features: 'Reasoning model; successor-class to o1 for many tasks',
  },
  {
    modelCode: 'o3-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 1.1,
    outputPricePerMillionTokens: 4.4,
    features: 'Efficient o3-class reasoning',
  },
  {
    modelCode: 'o3-pro',
    provider: 'openai',
    inputPricePerMillionTokens: 20.0,
    outputPricePerMillionTokens: 80.0,
    features: 'Pro-tier o3 reasoning',
  },
  {
    modelCode: 'o4-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 1.1,
    outputPricePerMillionTokens: 4.4,
    features: 'Compact reasoning model in the o4 line',
  },
  {
    modelCode: 'o3-deep-research',
    provider: 'openai',
    inputPricePerMillionTokens: 10.0,
    outputPricePerMillionTokens: 40.0,
    features: 'Deep research specialized model',
  },
  {
    modelCode: 'o4-mini-deep-research',
    provider: 'openai',
    inputPricePerMillionTokens: 2.0,
    outputPricePerMillionTokens: 8.0,
    features: 'Cost-efficient deep research variant',
  },
  {
    modelCode: 'computer-use-preview',
    provider: 'openai',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 12.0,
    features: 'Computer-use preview model (OpenAI pricing)',
  },
  // Legacy / compatibility GPT-4 and GPT-3.5
  {
    modelCode: 'gpt-4-turbo',
    provider: 'openai',
    inputPricePerMillionTokens: 10.0,
    outputPricePerMillionTokens: 30.0,
    features: 'Legacy GPT-4 Turbo alias (availability may be limited)',
  },
  {
    modelCode: 'gpt-4-turbo-2024-04-09',
    provider: 'openai',
    inputPricePerMillionTokens: 10.0,
    outputPricePerMillionTokens: 30.0,
    features: 'Pinned GPT-4 Turbo snapshot',
  },
  {
    modelCode: 'gpt-4-0125-preview',
    provider: 'openai',
    inputPricePerMillionTokens: 10.0,
    outputPricePerMillionTokens: 30.0,
    features: 'Legacy GPT-4 preview snapshot',
  },
  {
    modelCode: 'gpt-4-1106-preview',
    provider: 'openai',
    inputPricePerMillionTokens: 10.0,
    outputPricePerMillionTokens: 30.0,
    features: 'Legacy GPT-4 preview snapshot',
  },
  {
    modelCode: 'gpt-4-1106-vision-preview',
    provider: 'openai',
    inputPricePerMillionTokens: 10.0,
    outputPricePerMillionTokens: 30.0,
    features: 'Legacy GPT-4 vision preview snapshot',
  },
  {
    modelCode: 'gpt-4-0613',
    provider: 'openai',
    inputPricePerMillionTokens: 30.0,
    outputPricePerMillionTokens: 60.0,
    features: 'Legacy dated GPT-4',
  },
  {
    modelCode: 'gpt-4-0314',
    provider: 'openai',
    inputPricePerMillionTokens: 30.0,
    outputPricePerMillionTokens: 60.0,
    features: 'Legacy dated GPT-4',
  },
  {
    modelCode: 'gpt-4-32k',
    provider: 'openai',
    inputPricePerMillionTokens: 60.0,
    outputPricePerMillionTokens: 120.0,
    features: 'Legacy GPT-4 32k context',
  },
  {
    modelCode: 'gpt-4',
    provider: 'openai',
    inputPricePerMillionTokens: 30.0,
    outputPricePerMillionTokens: 60.0,
    features: 'Legacy flagship GPT-4 (availability may be limited)',
  },
  {
    modelCode: 'gpt-3.5-turbo',
    provider: 'openai',
    inputPricePerMillionTokens: 0.5,
    outputPricePerMillionTokens: 1.5,
    features: 'Legacy cost-effective option; mostly superseded',
  },
  {
    modelCode: 'gpt-3.5-turbo-0125',
    provider: 'openai',
    inputPricePerMillionTokens: 0.5,
    outputPricePerMillionTokens: 1.5,
    features: 'Legacy pinned GPT-3.5 snapshot',
  },
  {
    modelCode: 'gpt-3.5-turbo-1106',
    provider: 'openai',
    inputPricePerMillionTokens: 1.0,
    outputPricePerMillionTokens: 2.0,
    features: 'Legacy GPT-3.5 snapshot',
  },
  {
    modelCode: 'gpt-3.5-turbo-0613',
    provider: 'openai',
    inputPricePerMillionTokens: 1.5,
    outputPricePerMillionTokens: 2.0,
    features: 'Legacy GPT-3.5 snapshot',
  },

  // Claude Models from Anthropic (latest generation — 1M context Opus/Sonnet 4.6 per Anthropic docs)
  {
    modelCode: 'claude-opus-4-6',
    provider: 'anthropic',
    inputPricePerMillionTokens: 5.0,
    outputPricePerMillionTokens: 25.0,
    features:
      'Latest flagship; agents, coding, reasoning; 1M context (standard Messages API)',
  },
  {
    modelCode: 'claude-sonnet-4-6',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features:
      'Latest balanced model; speed and capability; 1M context (standard Messages API)',
  },
  {
    modelCode: 'claude-haiku-4-5',
    provider: 'anthropic',
    inputPricePerMillionTokens: 1.0,
    outputPricePerMillionTokens: 5.0,
    features:
      'Fast Haiku 4.5; near-frontier intelligence; alias resolves to dated snapshot',
  },
  {
    modelCode: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    inputPricePerMillionTokens: 1.0,
    outputPricePerMillionTokens: 5.0,
    features: 'Claude Haiku 4.5 dated snapshot (200k context)',
  },
  // Claude 4.5 generation (200k context)
  {
    modelCode: 'claude-opus-4-5',
    provider: 'anthropic',
    inputPricePerMillionTokens: 5.0,
    outputPricePerMillionTokens: 25.0,
    features: 'Opus 4.5 alias; strong reasoning and coding',
  },
  {
    modelCode: 'claude-opus-4-5-20251101',
    provider: 'anthropic',
    inputPricePerMillionTokens: 5.0,
    outputPricePerMillionTokens: 25.0,
    features: 'Opus 4.5 dated snapshot',
  },
  {
    modelCode: 'claude-sonnet-4-5',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features: 'Sonnet 4.5 alias',
  },
  {
    modelCode: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features: 'Sonnet 4.5 dated snapshot',
  },
  // Claude 4.0 line (snapshots and API aliases from Anthropic)
  {
    modelCode: 'claude-opus-4-20250514',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Opus 4 dated snapshot',
  },
  {
    modelCode: 'claude-opus-4-0',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Opus 4 API alias (same as claude-opus-4-20250514)',
  },
  {
    modelCode: 'claude-opus-4',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Opus 4 shorthand (match snapshot/alias used at runtime)',
  },
  {
    modelCode: 'claude-opus-4-1-20250805',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Opus 4.1 dated snapshot',
  },
  {
    modelCode: 'claude-opus-4-1',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Opus 4.1 API alias',
  },
  {
    modelCode: 'claude-opus-4.1',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Legacy calculator id; prefer claude-opus-4-1 per Anthropic API',
  },
  {
    modelCode: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features: 'Sonnet 4 dated snapshot',
  },
  {
    modelCode: 'claude-sonnet-4-0',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features: 'Sonnet 4 API alias',
  },
  {
    modelCode: 'claude-sonnet-4',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features:
      'Balanced Sonnet 4; good trade-off between cost, speed, and capability',
  },
  {
    modelCode: 'claude-4-haiku',
    provider: 'anthropic',
    inputPricePerMillionTokens: 1.0,
    outputPricePerMillionTokens: 5.0,
    features:
      'Informal id; pricing aligned with Claude Haiku 4.5 — prefer claude-haiku-4-5',
  },
  // Retain legacy 3.x for compatibility
  {
    modelCode: 'claude-3-5-sonnet-20240620',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features: 'Legacy Claude 3.5 Sonnet',
  },
  {
    modelCode: 'claude-3-opus-20240229',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Legacy Claude 3 Opus',
  },
  {
    modelCode: 'claude-3-sonnet-20240229',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features: 'Legacy Claude 3 Sonnet',
  },
  {
    modelCode: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    inputPricePerMillionTokens: 0.25,
    outputPricePerMillionTokens: 1.25,
    features: 'Legacy Claude 3 Haiku (fast, low cost)',
  },

  // New / Updated Gemini Models from Google
  {
    modelCode: 'gemini-2.5-pro',
    provider: 'google',
    inputPricePerMillionTokens: 1.25,
    outputPricePerMillionTokens: 10.0,
    features:
      'Next-generation multipurpose model; strong performance for large-context tasks',
  },
  {
    modelCode: 'gemini-2.5-flash',
    provider: 'google',
    inputPricePerMillionTokens: 0.3,
    outputPricePerMillionTokens: 2.5,
    features: 'Flash version optimized for speed with moderate capability',
  },
  {
    modelCode: 'gemini-2.5-flash-lite',
    provider: 'google',
    inputPricePerMillionTokens: 0.1,
    outputPricePerMillionTokens: 0.4,
    features: 'Ultra-light version intended for high volume low-cost inference',
  },
  {
    modelCode: 'gemini-1.5-pro',
    provider: 'google',
    inputPricePerMillionTokens: 3.5, // update to 1.25
    outputPricePerMillionTokens: 10.5, // update to 5.0
    features: 'Stable mid-tier performance, general-purpose uses',
  },
  {
    modelCode: 'gemini-1.5-flash',
    provider: 'google',
    inputPricePerMillionTokens: 0.35, // update to 0.075
    outputPricePerMillionTokens: 1.05, // update to 0.6
    features: 'Flash variant with speed-cost trade-off',
  },
  {
    modelCode: 'gemini-1.0-pro',
    provider: 'google',
    inputPricePerMillionTokens: 0.5,
    outputPricePerMillionTokens: 1.5,
    features: 'Legacy model for text/image reasoning',
  },

  // Mistral Models
  {
    modelCode: 'open-mistral-nemo-2407',
    provider: 'mistral',
    inputPricePerMillionTokens: 0.3,
    outputPricePerMillionTokens: 0.3,
    features: 'Mistral NeMo 12B; general-purpose affordable performer',
  },
  {
    modelCode: 'mistral-large-2407',
    provider: 'mistral',
    inputPricePerMillionTokens: 2.0,
    outputPricePerMillionTokens: 6.0,
    features: 'High-performance model; suited for complex reasoning',
  },
  {
    modelCode: 'codestral-2405',
    provider: 'mistral',
    inputPricePerMillionTokens: 1.0,
    outputPricePerMillionTokens: 3.0,
    features: 'Legacy code-specialized model (2024)',
  },
  {
    modelCode: 'codestral-2508',
    provider: 'mistral',
    inputPricePerMillionTokens: 0.3,
    outputPricePerMillionTokens: 0.9,
    features: 'New generation code-specialized model (version 25.08)',
  },

  // DeepSeek Models
  {
    modelCode: 'deepseek-chat',
    provider: 'deepseek',
    inputPricePerMillionTokens: 0.27, // cache miss
    outputPricePerMillionTokens: 1.1,
    features:
      'DeepSeek Chat V3; general-purpose chat with caching optimizations',
  },
  {
    modelCode: 'deepseek-reasoner',
    provider: 'deepseek',
    inputPricePerMillionTokens: 0.55,
    outputPricePerMillionTokens: 2.19,
    features:
      'DeepSeek Reasoner; stronger reasoning capabilities suited for complex tasks',
  },
  {
    modelCode: 'deepseek-coder',
    provider: 'deepseek',
    inputPricePerMillionTokens: 0.15,
    outputPricePerMillionTokens: 0.6,
    features:
      'DeepSeek Coder; specialized for code generation (legacy / provider‐dependent pricing)',
  },

  // xAI Models
  {
    modelCode: 'grok-4',
    provider: 'xai',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features:
      'Grok 4; powerful general model with higher accuracy and multi-modal features',
  },
  {
    modelCode: 'grok-3',
    provider: 'xai',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features: 'Grok 3; strong baseline model',
  },
  {
    modelCode: 'grok-3-mini',
    provider: 'xai',
    inputPricePerMillionTokens: 0.3,
    outputPricePerMillionTokens: 0.5,
    features: 'Grok 3 Mini; lightweight version for low cost use',
  },
  {
    modelCode: 'grok-3-fast',
    provider: 'xai',
    inputPricePerMillionTokens: 5.0,
    outputPricePerMillionTokens: 25.0,
    features: 'Grok 3 Fast; optimized for speed with premium cost',
  },
  {
    modelCode: 'grok-3-mini-fast',
    provider: 'xai',
    inputPricePerMillionTokens: 0.6,
    outputPricePerMillionTokens: 4.0,
    features: 'Grok 3 Mini Fast; speed-oriented lightweight model',
  },
];

/**
 * Calculates the approximate cost of using a specified AI model based on token usage
 * @param modelCode - The unique code identifier for the AI model
 * @param llmUsageStats - Object containing usage statistics
 * @returns Cost calculation result
 *
 * @example
 * ```typescript
 * const stats = {
 *   inputTokens: 500000,
 *   outputTokens: 200000,
 *   callsCount: 10,
 *   callsErrorCount: 1,
 *   parsingErrors: 0
 * };
 * const costs = calculateTaskCost('gpt-4o-mini', stats);
 * console.log(costs);
 * ```
 */
export function calculateTaskCost(
  modelCode: string,
  llmUsageStats: LLMUsageStats
): CostResult {
  const model = modelsPricing.find((m) => m.modelCode === modelCode);
  if (!model) {
    return {
      costInputTokens: -1,
      costOutputTokens: -1,
      totalCost: -1,
    };
  }

  const inputCost =
    (llmUsageStats.inputTokens / 1000000) * model.inputPricePerMillionTokens;
  const outputCost =
    (llmUsageStats.outputTokens / 1000000) * model.outputPricePerMillionTokens;
  const totalCost = inputCost + outputCost;

  return {
    costInputTokens: parseFloat(inputCost.toFixed(4)),
    costOutputTokens: parseFloat(outputCost.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4)),
  };
}

/**
 * Calculates the total cost across all models used in a workflow
 * @param modelUsageStats - Object mapping model codes to their usage statistics
 * @returns Combined cost calculation result
 */
export function calculateTotalWorkflowCost(
  modelUsageStats: ModelUsageStats
): CostResult {
  let totalInputCost = 0;
  let totalOutputCost = 0;
  let totalCost = 0;
  let allPricesAvailable = true;

  Object.keys(modelUsageStats).forEach((modelCode) => {
    const stats = modelUsageStats[modelCode];
    const model = modelsPricing.find((m) => m.modelCode === modelCode);

    if (!model) {
      logger.warn(`No pricing information found for model ${modelCode}`);
      allPricesAvailable = false;
      return;
    }

    const inputCost =
      (stats.inputTokens / 1000000) * model.inputPricePerMillionTokens;
    const outputCost =
      (stats.outputTokens / 1000000) * model.outputPricePerMillionTokens;
    totalInputCost += inputCost;
    totalOutputCost += outputCost;
    totalCost += inputCost + outputCost;
  });

  if (!allPricesAvailable) {
    return {
      costInputTokens: -1,
      costOutputTokens: -1,
      totalCost: -1,
    };
  }

  return {
    costInputTokens: parseFloat(totalInputCost.toFixed(4)),
    costOutputTokens: parseFloat(totalOutputCost.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4)),
  };
}
