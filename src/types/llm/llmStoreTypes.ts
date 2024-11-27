/**
 * @file llmStoreTypes.ts
 * @path KaibanJS/src/types/llm/llmStoreTypes.ts
 * @description Store types and interfaces for LLM state management
 *
 * @module types/llm
 */

import type { IBaseStoreState, IBaseStoreMethods } from '../store/baseStoreTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import type { IBaseError } from '../common/commonErrorTypes';
import type { IResourceMetrics, IUsageMetrics, IPerformanceMetrics } from '../common/commonMetricTypes';
import type { ILLMConfig, ILLMResponse } from './llmBaseTypes';

// ─── LLM Handler Types ──────────────────────────────────────────────────────

/** LLM-specific token metrics interface */
export interface ILLMTokenMetrics {
    tokensUsed: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requestLatency: number;
}

/** LLM-specific metadata interface */
export interface ILLMHandlerMetadata extends IBaseHandlerMetadata {
    modelId: string;
    modelName: string;
    modelVersion: string;
    requestType: 'completion' | 'chat' | 'embedding' | 'stream';
    metrics: {
        resources: IResourceMetrics;
        usage: IUsageMetrics;
        performance: IPerformanceMetrics;
        tokens: ILLMTokenMetrics;
    };
    streamStats?: {
        chunkCount: number;
        averageChunkSize: number;
        totalStreamDuration: number;
    };
}

/** LLM handler result type */
export type ILLMHandlerResult<T = unknown> = IHandlerResult<T, ILLMHandlerMetadata>;

// ─── Store State Types ─────────────────────────────────────────────────────────

export interface ILLMState extends IBaseStoreState {
    config: ILLMConfig;
    metrics: {
        resources: IResourceMetrics;
        usage: IUsageMetrics;
        performance: IPerformanceMetrics;
    };
    lastResponse?: ILLMResponse;
    error?: IBaseError;
    streaming: boolean;
    processing: boolean;
}

// ─── Store Action Types ────────────────────────────────────────────────────────

export interface ILLMErrorActions {
    handleError: (error: IBaseError) => Promise<ILLMHandlerResult<IBaseError>>;
    clearError: () => void;
}

export interface ILLMStreamingActions {
    startStreaming: () => Promise<ILLMHandlerResult<void>>;
    stopStreaming: () => Promise<ILLMHandlerResult<void>>;
    handleStreamingError: (error: IBaseError) => Promise<ILLMHandlerResult<IBaseError>>;
}

export interface ILLMConfigActions {
    updateConfig: (config: Partial<ILLMConfig>) => Promise<ILLMHandlerResult<ILLMConfig>>;
    resetConfig: () => void;
}

export interface ILLMStoreActions extends
    ILLMErrorActions,
    ILLMStreamingActions,
    ILLMConfigActions {}

export interface ILLMStoreMethods extends 
    IBaseStoreMethods<ILLMState>,
    ILLMStoreActions {}

// ─── Type Guards ────────────────────────────────────────────────────────────────

export const ILLMStoreTypeGuards = {
    isLLMState: (value: unknown): value is ILLMState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<ILLMState>;
        return (
            typeof state.config === 'object' &&
            state.config !== null &&
            typeof state.metrics === 'object' &&
            state.metrics !== null &&
            typeof state.metrics.resources === 'object' &&
            typeof state.metrics.usage === 'object' &&
            typeof state.metrics.performance === 'object' &&
            typeof state.streaming === 'boolean' &&
            typeof state.processing === 'boolean'
        );
    },

    hasLLMStoreMethods: (value: unknown): value is ILLMStoreMethods => {
        if (typeof value !== 'object' || value === null) return false;
        const methods = value as Partial<ILLMStoreMethods>;
        return (
            typeof methods.handleError === 'function' &&
            typeof methods.startStreaming === 'function' &&
            typeof methods.updateConfig === 'function'
        );
    },

    isLLMHandlerMetadata: (value: unknown): value is ILLMHandlerMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<ILLMHandlerMetadata>;
        return (
            typeof metadata.modelId === 'string' &&
            typeof metadata.modelName === 'string' &&
            typeof metadata.modelVersion === 'string' &&
            typeof metadata.requestType === 'string' &&
            ['completion', 'chat', 'embedding', 'stream'].includes(metadata.requestType) &&
            typeof metadata.metrics === 'object' &&
            metadata.metrics !== null &&
            typeof metadata.metrics.resources === 'object' &&
            typeof metadata.metrics.usage === 'object' &&
            typeof metadata.metrics.performance === 'object' &&
            typeof metadata.metrics.tokens === 'object' &&
            typeof metadata.metrics.tokens.tokensUsed === 'number' &&
            typeof metadata.metrics.tokens.promptTokens === 'number' &&
            typeof metadata.metrics.tokens.completionTokens === 'number' &&
            typeof metadata.metrics.tokens.totalTokens === 'number' &&
            typeof metadata.metrics.tokens.requestLatency === 'number'
        );
    }
};
