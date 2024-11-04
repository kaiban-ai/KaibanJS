/**
 * @file costs.ts
 * @path src/utils/types/workflow/costs.ts
 * @description Type definitions for LLM cost calculations and pricing
 */

/**
 * Model pricing configuration
 */
export interface ModelPricing {
    /** Model identifier */
    modelCode: string;
    
    /** Provider name */
    provider: string;
    
    /** Cost per million input tokens */
    inputPricePerMillionTokens: number;
    
    /** Cost per million output tokens */
    outputPricePerMillionTokens: number;
    
    /** Model features description */
    features: string;
}

/**
 * Required pricing fields for overrides
 */
export type RequiredPricingFields = Pick<
    ModelPricing,
    'inputPricePerMillionTokens' | 'outputPricePerMillionTokens'
>;

/**
 * Cost calculation configuration
 */
export interface CostCalculationConfig {
    /** Include failed requests in cost */
    includeFailedRequests?: boolean;
    
    /** Currency for cost calculation */
    currency?: string;
    
    /** Custom pricing overrides - must include required pricing fields */
    pricingOverrides?: Record<string, RequiredPricingFields>;
    
    /** Decimal precision for cost calculations */
    precision?: number;
}

/**
 * Token cost breakdown
 */
export interface TokenCostBreakdown {
    /** Token count */
    count: number;
    
    /** Cost for tokens */
    cost: number;
}

/**
 * Detailed cost breakdown
 */
export interface CostBreakdown {
    /** Input token costs */
    promptTokens: TokenCostBreakdown;
    
    /** Output token costs */
    completionTokens: TokenCostBreakdown;
    
    /** Function call costs if applicable */
    functionCalls?: TokenCostBreakdown;
}

/**
 * Complete cost details
 */
export interface CostDetails {
    /** Total input cost */
    inputCost: number;
    
    /** Total output cost */
    outputCost: number;
    
    /** Total combined cost */
    totalCost: number;
    
    /** Currency code */
    currency: string;
    
    /** Detailed cost breakdown */
    breakdown: CostBreakdown;
}

/**
 * Cost alert configuration
 */
export interface CostAlertConfig {
    /** Warning threshold */
    warningThreshold?: number;
    
    /** Critical threshold */
    criticalThreshold?: number;
    
    /** Alert callback */
    onThresholdExceeded?: (details: CostDetails) => void;
}