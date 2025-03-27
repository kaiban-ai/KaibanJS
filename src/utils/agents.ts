/**
 * Agent Utility Functions.
 *
 * This module provides utility functions specifically designed to support agent operations.
 * Functions include retrieving API keys based on agent configurations and handling agent attributes.
 *
 * @module agents
 */

import { Env } from '../agents/baseAgent';
import { LLMProvider } from './llm.types';

/** LLM configuration options */
export type LLMConfig = {
  /** API key for the LLM service */
  apiKey?: string;
  /** LLM service provider */
  provider: LLMProvider;
  /** LLM model */
  model: string;
};

/** Agent attributes for prompt templates */
export type AgentAttributes = {
  /** Agent's name */
  name: string;
  /** Agent's role description */
  role: string;
  /** Agent's background information */
  background: string;
  /** Agent's goal */
  goal: string;
  /** Additional context for the agent */
  context?: string;
  /** Expected output format */
  expectedOutput?: string;
};

/**
 * Gets the appropriate API key based on LLM configuration and environment
 * @param llmConfig - LLM configuration object
 * @param env - Environment variables containing API keys
 * @param fromEnvFirst - Whether to prioritize environment variables over config
 * @returns API key string or undefined if not found
 */
export function getApiKey(
  llmConfig: LLMConfig | undefined,
  env: Env,
  fromEnvFirst = false
): string | undefined {
  if (!fromEnvFirst && llmConfig?.apiKey) return llmConfig.apiKey;

  const apiKeys: Record<LLMProvider, string | undefined> = {
    anthropic: env.ANTHROPIC_API_KEY,
    google: env.GOOGLE_API_KEY,
    mistral: env.MISTRAL_API_KEY,
    openai: env.OPENAI_API_KEY,
  };

  return llmConfig?.provider ? apiKeys[llmConfig.provider] : llmConfig?.apiKey;
}

/**
 * Replaces placeholders in agent prompt templates with actual values
 * @param template - The prompt template string
 * @param attributes - Agent attributes to inject into the template
 * @returns Processed template with replaced values
 */
export function replaceAgentAttributes(
  template: string,
  attributes: AgentAttributes
): string {
  return template
    .replace('{name}', attributes.name)
    .replace('{role}', attributes.role)
    .replace('{background}', attributes.background)
    .replace('{goal}', attributes.goal)
    .replace('{context}', attributes.context ?? '')
    .replace('{expectedOutput}', attributes.expectedOutput ?? '');
}
