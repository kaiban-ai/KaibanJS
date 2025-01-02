/**
 * @file llmBaseAgent.ts
 * @path src/managers/domain/llm/agent/llmBaseAgent.ts
 * @description [DEPRECATED] Base LLM agent implementation
 * 
 * @deprecated This file is deprecated and will be removed in a future version.
 * Use provider-specific adapters from providerAdapter.ts instead.
 * The LLM functionality has been moved to use the provider adapter pattern directly.
 * 
 * Migration path:
 * 1. Use LLMManager to create and manage LLM instances
 * 2. Utilize provider-specific adapters for LLM interactions
 * 3. Update any direct references to use the new provider adapter pattern
 * 
 * Example migration:
 * Before:
 *   const agent = new LLMBaseAgent(config);
 * 
 * After:
 *   const adapter = providerAdapterFactory.createAdapter(config);
 */

/**
 * @deprecated Use provider-specific adapters instead
 */
export const LLMBaseAgent = {
    /**
     * @deprecated Use providerAdapterFactory.createAdapter() instead
     */
    create: () => {
        throw new Error('LLMBaseAgent is deprecated. Use provider-specific adapters from providerAdapter.ts instead.');
    }
};
