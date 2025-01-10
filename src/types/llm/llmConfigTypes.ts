import { LLM_PROVIDER_enum } from '../common/enumTypes';

export interface ILLMProviderConfig {
    type: LLM_PROVIDER_enum;
    apiKey: string;
    apiEndpoint?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stopSequences?: string[];
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
    rateLimitPerMinute?: number;
    costPerToken?: number;
    metadata?: Record<string, unknown>;
}

export interface ILLMModelConfig {
    modelName: string;
    contextWindow: number;
    maxOutputTokens: number;
    supportsFunctions: boolean;
    supportsStreaming: boolean;
    costPerInputToken: number;
    costPerOutputToken: number;
    metadata?: Record<string, unknown>;
}

export interface ILLMConfig {
    provider: ILLMProviderConfig;
    model: ILLMModelConfig;
    defaultPromptTemplate?: string;
    systemPrompt?: string;
    functionDefinitions?: Record<string, unknown>[];
    metadata?: Record<string, unknown>;
}
