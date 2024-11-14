/**
 * @file config.ts
 * @path KaibanJS/src/utils/helpers/config.ts
 * @description Default configurations for LLM providers
 */

import type { GroqConfig } from '@/utils/types';

export const defaultGroqConfig: GroqConfig = {
    provider: 'groq',
    model: 'llama3-groq-70b-8192-tool-use-preview',
    temperature: 0.1,
    streaming: true,
    max_tokens: 8192,
    stop: null,
    apiKey: process.env.GROQ_API_KEY || ''
};

export const defaultModelConfig = {
    groq: defaultGroqConfig,
    // Add other provider defaults as needed
};
