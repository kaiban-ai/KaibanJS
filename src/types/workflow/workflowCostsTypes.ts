/**
 * @file workflowCostsTypes.ts
 * @path KaibanJS/src/types/workflow/workflowCostsTypes.ts
 * @description Type definitions for LLM cost calculations and pricing
 *
 * @module types/workflow
 */

// ─── Model Pricing Types ─────────────────────────────────────────────────────────

/**
 * Model pricing configuration
 */
export interface IModelPricing {
    modelCode: string;
    provider: string;
    inputPricePerMillionTokens: number;
    outputPricePerMillionTokens: number;
    features: string;
}

/**
 * Required pricing fields for overrides
 */
export type RequiredPricingFields = Pick<
    IModelPricing,
    'inputPricePerMillionTokens' | 
    'outputPricePerMillionTokens'
>;

/**
 * Cost calculation configuration
 */
export interface ICostCalculationConfig {
    includeFailedRequests?: boolean;
    currency?: string;
    pricingOverrides?: Record<string, RequiredPricingFields>;
    precision?: number;
}

// ─── Cost Breakdown Types ──────────────────────────────────────────────────────

/**
 * Token cost breakdown
 */
export interface ITokenCostBreakdown {
    count: number;
    cost: number;
}

/**
 * Detailed cost breakdown
 */
export interface ICostBreakdown {
    promptTokens: ITokenCostBreakdown;
    completionTokens: ITokenCostBreakdown;
    functionCalls?: ITokenCostBreakdown;
}

/**
 * Complete cost details
 */
export interface ICostDetails {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    breakdown: ICostBreakdown;
}

// ─── Cost Alert Types ─────────────────────────────────────────────────────────

/**
 * Cost alert configuration
 */
export interface ICostAlertConfig {
    warningThreshold?: number;
    criticalThreshold?: number;
    onThresholdExceeded?: (details: ICostDetails) => void;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export const ICostTypeGuards = {
    isModelPricing: (value: unknown): value is IModelPricing => {
        if (typeof value !== 'object' || value === null) return false;
        const pricing = value as Partial<IModelPricing>;
        return (
            typeof pricing.modelCode === 'string' &&
            typeof pricing.provider === 'string' &&
            typeof pricing.inputPricePerMillionTokens === 'number' &&
            typeof pricing.outputPricePerMillionTokens === 'number'
        );
    },

    isCostDetails: (value: unknown): value is ICostDetails => {
        if (typeof value !== 'object' || value === null) return false;
        const details = value as Partial<ICostDetails>;
        return (
            typeof details.inputCost === 'number' &&
            typeof details.outputCost === 'number' &&
            typeof details.totalCost === 'number' &&
            typeof details.currency === 'string' &&
            typeof details.breakdown === 'object'
        );
    }
};
