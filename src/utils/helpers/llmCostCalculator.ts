/**
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\llmCostCalculator.ts
 * LLM Cost Calculation Utilities.
 */

import { logger } from "../core/logger";
import type {
    LLMUsageStats, ModelPricing, CostDetails
} from '@/utils/types';

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
  },
  // Groq Models
  {
    modelCode: "llama3-groq-70b-8192-tool-use-preview",
    provider: "groq",
    inputPricePerMillionTokens: 0.89,
    outputPricePerMillionTokens: 0.89,
    features: "High-performance model optimized for tool use and function calling, #1 on BFCL benchmark"
  },
  {
    modelCode: "llama3-groq-8b-8192-tool-use-preview",
    provider: "groq",
    inputPricePerMillionTokens: 0.19,
    outputPricePerMillionTokens: 0.19,
    features: "Efficient 8B model optimized for tool use, #3 on BFCL benchmark"
  }
];

/**
 * Calculates the approximate cost of using a specified AI model based on the number of input and output tokens.
 *
 * @param {string} modelCode - The unique code identifier for the AI model.
 * @param {LLMUsageStats} llmUsageStats - An object containing usage statistics.
 * @returns {CostDetails} An object containing cost details.
 */
export function calculateTaskCost(modelCode: string, llmUsageStats: LLMUsageStats): CostDetails {
  const model = modelsPricing.find(m => m.modelCode === modelCode);
  if (!model) {
    return {
      inputCost: -1,
      outputCost: -1,
      totalCost: -1,
      currency: 'USD',
      breakdown: {
        promptTokens: {
          count: 0,
          cost: -1
        },
        completionTokens: {
          count: 0,
          cost: -1
        }
      }
    };
  }

  const inputCost = (llmUsageStats.inputTokens / 1000000) * model.inputPricePerMillionTokens;
  const outputCost = (llmUsageStats.outputTokens / 1000000) * model.outputPricePerMillionTokens;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: parseFloat(inputCost.toFixed(4)),
    outputCost: parseFloat(outputCost.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4)),
    currency: 'USD',
    breakdown: {
      promptTokens: {
        count: llmUsageStats.inputTokens,
        cost: parseFloat(inputCost.toFixed(4))
      },
      completionTokens: {
        count: llmUsageStats.outputTokens,
        cost: parseFloat(outputCost.toFixed(4))
      }
    }
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
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
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
    totalPromptTokens += stats.inputTokens;
    totalCompletionTokens += stats.outputTokens;
  });

  if (!allPricesAvailable) {
    return {
      inputCost: -1,
      outputCost: -1,
      totalCost: -1,
      currency: 'USD',
      breakdown: {
        promptTokens: {
          count: 0,
          cost: -1
        },
        completionTokens: {
          count: 0,
          cost: -1
        }
      }
    };
  }

  const totalCost = totalInputCost + totalOutputCost;

  return {
    inputCost: parseFloat(totalInputCost.toFixed(4)),
    outputCost: parseFloat(totalOutputCost.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4)),
    currency: 'USD',
    breakdown: {
      promptTokens: {
        count: totalPromptTokens,
        cost: parseFloat(totalInputCost.toFixed(4))
      },
      completionTokens: {
        count: totalCompletionTokens,
        cost: parseFloat(totalOutputCost.toFixed(4))
      }
    }
  };
}