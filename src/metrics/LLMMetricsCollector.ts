/**
 * @file LLMMetricsCollector.ts
 * @path src/metrics/LLMMetricsCollector.ts
 * @description DEPRECATED: This file is deprecated and will be removed.
 * 
 * Metrics collection is now handled by:
 * - messageMetricsManager.ts for message-level metrics
 * - providerManager.ts for provider-specific metrics
 * - baseLLMManager.ts for core LLM metrics
 * 
 * @deprecated Use the appropriate manager classes instead:
 * - MessageMetricsManager for message metrics
 * - ProviderManager for provider-specific metrics
 * - BaseLLMManager for core LLM metrics
 */

/**
 * @deprecated Use MessageMetricsManager, ProviderManager, or BaseLLMManager instead.
 * This class is deprecated and will be removed in a future version.
 * 
 * For message metrics: Use MessageMetricsManager
 * For provider metrics: Use ProviderManager
 * For core LLM metrics: Use BaseLLMManager
 */
export class LLMMetricsCollector {
    /** @deprecated */
    constructor() {
        throw new Error(
            'LLMMetricsCollector is deprecated. Use MessageMetricsManager, ' +
            'ProviderManager, or BaseLLMManager instead.'
        );
    }

    /** @deprecated */
    static getInstance(): never {
        throw new Error(
            'LLMMetricsCollector is deprecated. Use MessageMetricsManager, ' +
            'ProviderManager, or BaseLLMManager instead.'
        );
    }

    /** @deprecated */
    createMetricsCollector(): never {
        throw new Error(
            'LLMMetricsCollector is deprecated. Use MessageMetricsManager, ' +
            'ProviderManager, or BaseLLMManager instead.'
        );
    }
}

/**
 * @deprecated Use MessageMetricsManager, ProviderManager, or BaseLLMManager instead.
 * This export is deprecated and will be removed in a future version.
 */
export default {
    /** @deprecated */
    createMetricsCollector(): never {
        throw new Error(
            'LLMMetricsCollector is deprecated. Use MessageMetricsManager, ' +
            'ProviderManager, or BaseLLMManager instead.'
        );
    }
};
