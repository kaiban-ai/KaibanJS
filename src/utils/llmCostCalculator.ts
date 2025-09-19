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

/** Available model pricing configurations (updated Sep 19, 2025) */
const modelsPricing: ModelPricing[] = [
  // GPT Models from OpenAI
  {
    modelCode: 'gpt-5',
    provider: 'openai',
    inputPricePerMillionTokens: 1.25,
    outputPricePerMillionTokens: 10.0,
    features:
      'Latest generation model; excellent for coding and agentic tasks across domains',
  },
  {
    modelCode: 'gpt-5-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 0.25,
    outputPricePerMillionTokens: 2.0,
    features: 'Faster, cost-efficient version of GPT-5 for well-defined tasks',
  },
  {
    modelCode: 'gpt-5-nano',
    provider: 'openai',
    inputPricePerMillionTokens: 0.05,
    outputPricePerMillionTokens: 0.4,
    features: 'Fastest, most cost-efficient tier of GPT-5',
  },
  {
    modelCode: 'gpt-4o',
    provider: 'openai',
    inputPricePerMillionTokens: 5.0,
    outputPricePerMillionTokens: 15.0,
    features:
      'Multimodal model supporting text, image, and audio; general-purpose high capability',
  },
  {
    modelCode: 'gpt-4o-mini',
    provider: 'openai',
    inputPricePerMillionTokens: 0.15,
    outputPricePerMillionTokens: 0.6,
    features: 'Cost-efficient multimodal variant of GPT-4o',
  },
  // Legacy / compatibility GPT-4 / GPT-4-turbo
  {
    modelCode: 'gpt-4-turbo',
    provider: 'openai',
    inputPricePerMillionTokens: 10.0,
    outputPricePerMillionTokens: 30.0,
    features: 'Legacy high-speed GPT-4 variant (availability may be limited)',
  },
  {
    modelCode: 'gpt-4',
    provider: 'openai',
    inputPricePerMillionTokens: 30.0,
    outputPricePerMillionTokens: 60.0,
    features: 'Legacy flagship GPT-4 model (availability may be limited)',
  },
  {
    modelCode: 'gpt-3.5-turbo',
    provider: 'openai',
    inputPricePerMillionTokens: 0.5,
    outputPricePerMillionTokens: 1.5,
    features: 'Legacy cost-effective option; mostly superseded by newer models',
  },
  {
    modelCode: 'gpt-3.5-turbo-0125',
    provider: 'openai',
    inputPricePerMillionTokens: 0.5,
    outputPricePerMillionTokens: 1.5,
    features: 'Legacy pinned version for compatibility',
  },

  // Claude Models from Anthropic
  {
    modelCode: 'claude-opus-4.1',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features:
      'Top-tier model for deep reasoning, complex tasks, and high-quality output',
  },
  {
    modelCode: 'claude-opus-4',
    provider: 'anthropic',
    inputPricePerMillionTokens: 15.0,
    outputPricePerMillionTokens: 75.0,
    features: 'Frontier performance for demanding use cases',
  },
  {
    modelCode: 'claude-sonnet-4',
    provider: 'anthropic',
    inputPricePerMillionTokens: 3.0,
    outputPricePerMillionTokens: 15.0,
    features:
      'Balanced model; good trade-off between cost, speed, and capability',
  },
  {
    modelCode: 'claude-4-haiku', // alias if exists; using haiku nomenclature if updated
    provider: 'anthropic',
    inputPricePerMillionTokens: 0.25,
    outputPricePerMillionTokens: 1.25,
    features: 'Low-latency, cost-sensitive tasks; simpler and faster responses',
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
