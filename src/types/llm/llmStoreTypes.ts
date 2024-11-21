/**
 * @file llmStoreTypes.ts
 * @path KaibanJS/src/types/llm/llmStoreTypes.ts
 * @description Store types and interfaces for LLM state management
 *
 * @module types/llm
 */

import type { IBaseStoreState, IBaseStoreMethods } from '../store/baseStoreTypes';
import type { IHandlerResult } from '../common/commonHandlerTypes';
import type { IBaseError } from '../common/commonErrorTypes';
import type { IResourceMetrics, IUsageMetrics } from '../common/commonMetricTypes';
import type { ILLMConfig, ILLMResponse } from './llmBaseTypes';

export interface ILLMState extends IBaseStoreState {
    config: ILLMConfig;
    metrics: {
        resources: IResourceMetrics;
        usage: IUsageMetrics;
    };
    lastResponse?: ILLMResponse;
    error?: IBaseError;
    streaming: boolean;
    processing: boolean;
}

export interface ILLMErrorActions {
    handleError: (error: IBaseError) => Promise<IHandlerResult>;
    clearError: () => void;
}

export interface ILLMStreamingActions {
    startStreaming: () => Promise<IHandlerResult>;
    stopStreaming: () => Promise<IHandlerResult>;
    handleStreamingError: (error: IBaseError) => Promise<IHandlerResult>;
}

export interface ILLMConfigActions {
    updateConfig: (config: Partial<ILLMConfig>) => Promise<IHandlerResult>;
    resetConfig: () => void;
}

export interface ILLMStoreActions extends
    ILLMErrorActions,
    ILLMStreamingActions,
    ILLMConfigActions {}

export interface ILLMStoreMethods extends 
    IBaseStoreMethods<ILLMState>,
    ILLMStoreActions {}

export const ILLMStoreTypeGuards = {
    isLLMState: (value: unknown): value is ILLMState => {
        if (typeof value !== 'object' || value === null) return false;
        const state = value as Partial<ILLMState>;
        return (
            typeof state.config === 'object' &&
            state.config !== null &&
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
    }
};
