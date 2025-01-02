/**
 * @file agentUtils.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\helpers\agent\agentUtils.ts
 * @description Utility functions for agent operations
 */

import type { IBaseLLMConfig } from '../../../types/llm/llmProviderTypes';
import type { IBaseAgent } from '../../../types/agent/agentBaseTypes';
import logger from '../../../managers/core/logManager';

type AgentAttributes = Pick<IBaseAgent, 'name' | 'role' | 'background' | 'goal'> & {
    context?: string;
    expectedOutput?: string;
};

/**
 * Retrieves the API key for a given LLM configuration and environment
 * @param llmConfig - The LLM configuration object
 * @param env - Environment variables containing API keys
 * @returns API key if found, undefined otherwise
 */
export function getApiKey(
    llmConfig: Pick<IBaseLLMConfig, 'apiKey' | 'provider'>, 
    env: Record<string, string>
): string | undefined {
    // Return existing API key if present
    if (llmConfig?.apiKey) return llmConfig.apiKey;

    // Map of provider to environment variable name
    const apiKeys: Record<string, string | undefined> = {
        anthropic: env.ANTHROPIC_API_KEY,
        google: env.GOOGLE_API_KEY,
        mistral: env.MISTRAL_API_KEY,
        openai: env.OPENAI_API_KEY,
        groq: env.GROQ_API_KEY
    };

    // Return appropriate API key based on provider
    const key = apiKeys[llmConfig?.provider || ''];
    if (!key) {
        logger.warn(`No API key found for provider: ${llmConfig?.provider}`);
    }
    return key;
}

/**
 * Replaces placeholders in the agent prompt with actual attributes
 * @param template - Template string with placeholders
 * @param attributes - Agent attributes to insert
 * @returns Template with placeholders replaced by values
 */
export function replaceAgentAttributes(
    template: string, 
    attributes: AgentAttributes
): string {
    try {
        return template
            .replace('{name}', attributes.name)
            .replace('{role}', attributes.role)
            .replace('{background}', attributes.background)
            .replace('{goal}', attributes.goal)
            .replace('{context}', attributes.context || '')
            .replace('{expectedOutput}', attributes.expectedOutput || '');
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error('Error replacing agent attributes:', err);
        throw new Error('Failed to replace agent attributes in template');
    }
}

/**
 * Validates required agent attributes
 * @param attributes - Agent attributes to validate
 * @returns True if valid, throws error if invalid
 */
export function validateAgentAttributes(attributes: Partial<AgentAttributes>): boolean {
    const requiredFields = ['name', 'role', 'background', 'goal'];
    const missingFields = requiredFields.filter(field => !attributes[field as keyof AgentAttributes]);

    if (missingFields.length > 0) {
        throw new Error(`Missing required agent attributes: ${missingFields.join(', ')}`);
    }

    return true;
}
