/**
 * @file llmAgentFactory.ts
 * @path src/managers/domain/llm/agent/llmAgentFactory.ts
 * @description [DEPRECATED] Factory for creating provider-specific LLM agents
 * 
 * @deprecated This file is deprecated and will be removed in a future version.
 * Use ProviderAdapterFactory from providerAdapter.ts instead.
 * The LLM functionality has been moved to use the provider adapter pattern directly.
 * 
 * Migration path:
 * 1. Use ProviderAdapterFactory to create provider-specific adapters
 * 2. Replace LLMAgentFactory.createAgent() with ProviderAdapterFactory.createAdapter()
 * 3. Update any direct references to use the new provider adapter pattern
 * 
 * Example migration:
 * Before:
 *   const agent = llmAgentFactory.createAgent(config);
 * 
 * After:
 *   const adapter = providerAdapterFactory.createAdapter(config);
 */

/**
 * @deprecated Use ProviderAdapterFactory from providerAdapter.ts instead
 */
export const llmAgentFactory = {
    /**
     * @deprecated Use providerAdapterFactory.createAdapter() instead
     */
    createAdapter: () => {
        throw new Error('LLMAgentFactory is deprecated. Use ProviderAdapterFactory from providerAdapter.ts instead.');
    }
};
