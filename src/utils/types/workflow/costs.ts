/**
 * @file costs.ts
 * @path src/utils/types/workflow/costs.ts
 * @description Type definitions for LLM cost calculations and pricing
 */

// Model pricing configuration
export interface ModelPricing {
    modelCode: string;
    provider: string;
    inputPricePerMillionTokens: number;
    outputPricePerMillionTokens: number;
    features: string;
}

// Required pricing fields for overrides
export type RequiredPricingFields = Pick<
    ModelPricing,
    'inputPricePerMillionTokens' | 'outputPricePerMillionTokens'
>;

// Cost calculation configuration
export interface CostCalculationConfig {
    includeFailedRequests?: boolean;
    currency?: string;
    pricingOverrides?: Record<string, RequiredPricingFields>;
    precision?: number;
}

// Token cost breakdown
export interface TokenCostBreakdown {
    count: number;
    cost: number;
}

// Detailed cost breakdown
export interface CostBreakdown {
    promptTokens: TokenCostBreakdown;
    completionTokens: TokenCostBreakdown;
    functionCalls?: TokenCostBreakdown;
}

// Complete cost details
export interface CostDetails {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    breakdown: CostBreakdown;
}

// Cost alert configuration
export interface CostAlertConfig {
    warningThreshold?: number;
    criticalThreshold?: number;
    onThresholdExceeded?: (details: CostDetails) => void;
}
