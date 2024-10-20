/**
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\llmCostCalculator.ts
 * LLM Cost Calculation Utilities.
 *
 * This file contains functions for calculating the costs associated with using large language models (LLMs) based on 
 * token usage and model-specific pricing. It helps in budgeting and monitoring the financial aspects of using LLMs within 
 * the KaibanJS library.
 *
 * Usage:
 * Apply these functions to compute and track costs as part of operational management and optimization of LLM usage in projects.
 */

import { logger } from "./logger";

interface ModelPricing {
  modelCode: string;
  provider: string;
  inputPricePerMillionTokens: number;
  outputPricePerMillionTokens: number;
  features: string;
}

interface LLMUsageStats {
  inputTokens: number;
  outputTokens: number;
  callsCount: number;
  callsErrorCount: number;
  parsingErrors: number;
}

interface CostDetails {
  costInputTokens: number;
  costOutputTokens: number;
  totalCost: number;
}

const modelsPricing: ModelPricing[] = [
  // GPT Models from OpenAI
  {
    modelCode: "gpt-4o-mini",
    provider: "openai",
    inputPricePerMillionTokens: 0.150,
    outputPricePerMillionTokens: 0.600,
    features: "Most cost-efficient with vision capabilities"
  },
  {
    modelCode: "gpt-3.5-turbo",
    provider: "openai",
    inputPricePerMillionTokens: 0.50,
    outputPricePerMillionTokens: 1.50,
    features: "Cost-effective option"
  },
  {
    modelCode: "gpt-4",
    provider: "openai",
    inputPricePerMillionTokens: 30.00,
    outputPricePerMillionTokens: 60.00,
    features: "Latest generation AI"
  },
  // Anthropic Models
  {
    modelCode: "claude-3-5-sonnet-20240620",
    provider: "anthropic",
    inputPricePerMillionTokens: 3,
    outputPricePerMillionTokens: 15,
    features: "Highest level of intelligence and capability"
  },
  // Google Models
  {
    modelCode: "gemini-1.5-flash",
    provider: "google",
    inputPricePerMillionTokens: 0.35,
    outputPricePerMillionTokens: 1.05,
    features: "Fast multimodal model with 1 million token context window"
  },
  // Mistral Models
  {
    modelCode: "open-mistral-nemo-2407",
    provider: "mistral",
    inputPricePerMillionTokens: 0.3,
    outputPricePerMillionTokens: 0.3,
    features: "Mistral Nemo is a state-of-the-art 12B model developed with NVIDIA"
  },
  {
    modelCode: "codestral-2405",
    provider: "mistral",
    inputPricePerMillionTokens: 1,
    outputPricePerMillionTokens: 3,
    features: "State-of-the-art Mistral model trained specifically for code tasks"
  }
  // (other models can be added here)
];

/**
 * Calculates the approximate cost of using a specified AI model based on the number of input and output tokens.
 * If the model code does not match any in the predefined list, it returns a standardized error response with costs set to -1.
 *
 * @param {string} modelCode - The unique code identifier for the AI model.
 * @param {LLMUsageStats} llmUsageStats - An object containing usage statistics.
 * @returns {CostDetails} An object containing cost details.
 */
export function calculateTaskCost(modelCode: string, llmUsageStats: LLMUsageStats): CostDetails {
  const model = modelsPricing.find(m => m.modelCode === modelCode);
  if (!model) {
    return {
      costInputTokens: -1,
      costOutputTokens: -1,
      totalCost: -1
    };
  }

  const inputCost = (llmUsageStats.inputTokens / 1000000) * model.inputPricePerMillionTokens;
  const outputCost = (llmUsageStats.outputTokens / 1000000) * model.outputPricePerMillionTokens;
  const totalCost = inputCost + outputCost;

  return {
    costInputTokens: parseFloat(inputCost.toFixed(4)),
    costOutputTokens: parseFloat(outputCost.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4))
  };
}

/**
 * Calculates the total cost of a workflow based on usage statistics for multiple models.
 * 
 * @param {Record<string, LLMUsageStats>} modelUsageStats - An object containing usage statistics for each model used.
 * @returns {CostDetails} An object containing the total cost details.
 */
export function calculateTotalWorkflowCost(modelUsageStats: Record<string, LLMUsageStats>): CostDetails {
  let totalInputCost = 0;
  let totalOutputCost = 0;
  let totalCost = 0;
  let allPricesAvailable = true;

  Object.keys(modelUsageStats).forEach(modelCode => {
    const stats = modelUsageStats[modelCode];
    const model = modelsPricing.find(m => m.modelCode === modelCode);
    if (!model) {
      logger.warn(`No pricing information found for model ${modelCode}`);
      allPricesAvailable = false;
      return;
    }
    const inputCost = (stats.inputTokens / 1000000) * model.inputPricePerMillionTokens;
    const outputCost = (stats.outputTokens / 1000000) * model.outputPricePerMillionTokens;
    totalInputCost += inputCost;
    totalOutputCost += outputCost;
    totalCost += inputCost + outputCost;
  });

  if (!allPricesAvailable) {
    return {
      costInputTokens: -1,
      costOutputTokens: -1,
      totalCost: -1
    };
  }

  return {
    costInputTokens: parseFloat(totalInputCost.toFixed(4)),
    costOutputTokens: parseFloat(totalOutputCost.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4))
  };
}
