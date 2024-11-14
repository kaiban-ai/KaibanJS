/**
 * @file llmCostCalculator.ts
 * @path KaibanJS/src/utils/helpers/costs/llmCostCalculator.ts
 * @description Implementation of LLM cost calculations
 */

import { logger } from "../../core/logger";

import { ModelPricing } from "@/utils/types/workflow";
import { RequiredPricingFields } from "@/utils/types/workflow";
import { CostCalculationConfig } from "@/utils/types/workflow";
import { 
    
    ModelUsageStats,
    CostDetails,
    LLMUsageStats 
} from '@/utils/types';

/**
 * Standard model pricing configurations
 */
const modelsPricing: ModelPricing[] = [
    // GPT Models
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
        features: "Mistral Nemo is a state-of-the-art 12B model"
    },
    {
        modelCode: "codestral-2405",
        provider: "mistral",
        inputPricePerMillionTokens: 1,
        outputPricePerMillionTokens: 3,
        features: "State-of-the-art Mistral model for code tasks"
    },
    // Groq Models
    {
        modelCode: "llama3-groq-70b-8192-tool-use-preview",
        provider: "groq",
        inputPricePerMillionTokens: 0.89,
        outputPricePerMillionTokens: 0.89,
        features: "High-performance model optimized for tool use"
    },
    {
        modelCode: "llama3-groq-8b-8192-tool-use-preview",
        provider: "groq",
        inputPricePerMillionTokens: 0.19,
        outputPricePerMillionTokens: 0.19,
        features: "Efficient 8B model optimized for tool use"
    }
];

/**
 * Default cost calculation configuration
 */
const DEFAULT_CONFIG: Required<CostCalculationConfig> = {
    includeFailedRequests: false,
    currency: 'USD',
    pricingOverrides: {},
    precision: 4
};

/**
 * Get pricing for a model, including overrides
 */
function getModelPricing(modelCode: string, overrides?: Record<string, RequiredPricingFields>): RequiredPricingFields | null {
    const model = modelsPricing.find(m => m.modelCode === modelCode);
    if (!model) return null;

    // If there's an override, use it, otherwise use base model pricing
    const pricing = overrides?.[modelCode] || {
        inputPricePerMillionTokens: model.inputPricePerMillionTokens,
        outputPricePerMillionTokens: model.outputPricePerMillionTokens
    };

    return pricing;
}

/**
 * Calculate cost for a specific task
 */
export function calculateTaskCost(
    modelCode: string, 
    llmUsageStats: LLMUsageStats,
    config: CostCalculationConfig = {}
): CostDetails {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const pricing = getModelPricing(modelCode, finalConfig.pricingOverrides);

    if (!pricing) {
        logger.warn(`No pricing information found for model ${modelCode}`);
        return createDefaultCostDetails(finalConfig.currency);
    }
    
    // Calculate costs using the pricing (now guaranteed to have required fields)
    const inputCost = (llmUsageStats.inputTokens / 1000000) * pricing.inputPricePerMillionTokens;
    const outputCost = (llmUsageStats.outputTokens / 1000000) * pricing.outputPricePerMillionTokens;
    const totalCost = inputCost + outputCost;

    return {
        inputCost: roundToDecimal(inputCost, finalConfig.precision),
        outputCost: roundToDecimal(outputCost, finalConfig.precision),
        totalCost: roundToDecimal(totalCost, finalConfig.precision),
        currency: finalConfig.currency,
        breakdown: {
            promptTokens: {
                count: llmUsageStats.inputTokens,
                cost: roundToDecimal(inputCost, finalConfig.precision)
            },
            completionTokens: {
                count: llmUsageStats.outputTokens,
                cost: roundToDecimal(outputCost, finalConfig.precision)
            }
        }
    };
}

/**
 * Calculate total workflow cost
 */
export function calculateTotalWorkflowCost(
    modelUsageStats: ModelUsageStats,
    config: CostCalculationConfig = {}
): CostDetails {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    let totalInputCost = 0;
    let totalOutputCost = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    for (const [modelCode, stats] of Object.entries(modelUsageStats)) {
        const pricing = getModelPricing(modelCode, finalConfig.pricingOverrides);
        if (!pricing) {
            logger.warn(`No pricing information found for model ${modelCode}`);
            return createDefaultCostDetails(finalConfig.currency);
        }

        // Adjusted to use tokens.input and tokens.output
        totalInputCost += (stats.tokens.input / 1000000) * pricing.inputPricePerMillionTokens;
        totalOutputCost += (stats.tokens.output / 1000000) * pricing.outputPricePerMillionTokens;
        totalPromptTokens += stats.tokens.input;
        totalCompletionTokens += stats.tokens.output;
    }

    return {
        inputCost: roundToDecimal(totalInputCost, finalConfig.precision),
        outputCost: roundToDecimal(totalOutputCost, finalConfig.precision),
        totalCost: roundToDecimal(totalInputCost + totalOutputCost, finalConfig.precision),
        currency: finalConfig.currency,
        breakdown: {
            promptTokens: {
                count: totalPromptTokens,
                cost: roundToDecimal(totalInputCost, finalConfig.precision)
            },
            completionTokens: {
                count: totalCompletionTokens,
                cost: roundToDecimal(totalOutputCost, finalConfig.precision)
            }
        }
    };
}


/**
 * Create default cost details
 */
function createDefaultCostDetails(currency: string): CostDetails {
    return {
        inputCost: -1,
        outputCost: -1,
        totalCost: -1,
        currency,
        breakdown: {
            promptTokens: { count: 0, cost: -1 },
            completionTokens: { count: 0, cost: -1 }
        }
    };
}

/**
 * Round to specified decimal places
 */
function roundToDecimal(value: number, precision: number): number {
    return Number(value.toFixed(precision));
}

/**
 * Format cost for display
 */
export function formatCost(cost: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    }).format(cost);
}