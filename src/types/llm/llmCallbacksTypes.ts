/**
 * @file llmCallbacksTypes.ts
 * @description LLM callback type definitions using Langchain
 */

import { CallbackHandlerMethods, NewTokenIndices, HandleLLMNewTokenCallbackFields } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { BaseMessage } from '@langchain/core/messages';
import { Serialized } from '@langchain/core/load/serializable';
import { LLM_PROVIDER_enum } from '../common/commonEnums';
import { LLMProviders } from './llmCommonTypes';
import { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import { IBaseMetrics } from '../metrics/base/baseMetrics';
import { ValidationErrorType, ValidationWarningType } from '../common/commonValidationTypes';
import { IPerformanceMetrics } from '../metrics/base/performanceMetrics';

// ─── Event Metadata Types ────────────────────────────────────────────────────

/**
 * LLM event metadata extending base handler metadata
 */
export interface ILLMEventMetadata extends IBaseHandlerMetadata {
    provider: LLM_PROVIDER_enum;
    model: string;
    metrics: IBaseMetrics;
    timestamp: number;
    runId: string;
    parentRunId?: string;
    tags?: string[];
    component: string;
    operation: string;
    performance: IPerformanceMetrics;
    context: {
        source: string;
        target: string;
        correlationId: string;
        causationId: string;
        [key: string]: unknown;
    };
    validation: {
        isValid: boolean;
        errors: ReadonlyArray<ValidationErrorType>;
        warnings: ReadonlyArray<ValidationWarningType>;
    };
}

// ─── Callback Handler Types ────────────────────────────────────────────────────

/**
 * LLM callback handler extending Langchain's base handler
 */
export interface ILLMCallbackHandler extends CallbackHandlerMethods {
    handleLLMStart(
        llm: Serialized,
        prompts: string[],
        runId: string,
        parentRunId?: string,
        extraParams?: Record<string, unknown>,
        tags?: string[],
        metadata?: Record<string, unknown>,
        runName?: string
    ): Promise<void>;

    handleLLMNewToken(
        token: string,
        idx: NewTokenIndices,
        runId: string,
        parentRunId?: string,
        tags?: string[],
        fields?: HandleLLMNewTokenCallbackFields
    ): Promise<void>;

    handleLLMEnd(
        output: LLMResult,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void>;

    handleLLMError(
        error: Error,
        runId: string,
        parentRunId?: string,
        tags?: string[]
    ): Promise<void>;
}

// ─── Callback Config Types ────────────────────────────────────────────────────

/**
 * LLM callback configuration
 */
export interface ILLMCallbackConfig {
    handlers?: ILLMCallbackHandler[];
    metadata?: ILLMEventMetadata;
    tags?: string[];
    verbose?: boolean;
}

// ─── Event Types ────────────────────────────────────────────────────────────

/**
 * LLM event types including all possible events
 */
export type LLMEventType =
    // Core LLM events
    | 'llm_start'
    | 'llm_end'
    | 'llm_error'
    | 'llm_new_token'
    // Chain events
    | 'chain_start'
    | 'chain_end'
    | 'chain_error'
    // Tool events
    | 'tool_start'
    | 'tool_end'
    | 'tool_error'
    // Text events
    | 'text'
    // Agent events
    | 'agent_action'
    | 'agent_end'
    // Request events
    | 'request.start'
    | 'request.end'
    | 'request.error'
    // Token events
    | 'token.received'
    // Rate limit events
    | 'rate.limited'
    // Cache events
    | 'cache.hit'
    | 'cache.miss'
    // Memory events
    | 'memory.pruned'
    // Budget events
    | 'budget.exceeded';

/**
 * Base event interface without data
 */
interface IBaseLLMEvent {
    type: LLMEventType;
    metadata: ILLMEventMetadata;
    timestamp: number;
    runId: string;
    parentRunId: string | undefined;
    tags?: string[];
}

/**
 * LLM event base interface with optional data
 */
export interface ILLMEvent extends IBaseLLMEvent {
    data?: Record<string, unknown>;
}

/**
 * LLM start event
 */
export interface ILLMStartEvent extends IBaseLLMEvent {
    type: 'llm_start' | 'request.start';
    data: {
        prompts: string[];
        extraParams?: Record<string, unknown>;
    };
}

/**
 * LLM end event
 */
export interface ILLMEndEvent extends IBaseLLMEvent {
    type: 'llm_end' | 'request.end';
    data: {
        result: LLMResult;
    };
}

/**
 * LLM error event
 */
export interface ILLMErrorEvent extends IBaseLLMEvent {
    type: 'llm_error' | 'request.error';
    data: {
        error: Error;
    };
}

/**
 * LLM new token event
 */
export interface ILLMNewTokenEvent extends IBaseLLMEvent {
    type: 'llm_new_token' | 'token.received';
    data: {
        token: string;
        idx?: NewTokenIndices;
        fields?: HandleLLMNewTokenCallbackFields;
    };
}

/**
 * LLM rate limit event
 */
export interface ILLMRateLimitEvent extends IBaseLLMEvent {
    type: 'rate.limited';
    data: {
        limit: number;
        remaining: number;
        reset: number;
        retryAfter: number;
    };
}

/**
 * LLM cache event
 */
export interface ILLMCacheEvent extends IBaseLLMEvent {
    type: 'cache.hit' | 'cache.miss';
    data: {
        key: string;
        size: number;
    };
}

/**
 * LLM memory event
 */
export interface ILLMMemoryEvent extends IBaseLLMEvent {
    type: 'memory.pruned';
    data: {
        freedBytes: number;
        totalBytes: number;
    };
}

/**
 * LLM budget event
 */
export interface ILLMBudgetEvent extends IBaseLLMEvent {
    type: 'budget.exceeded';
    data: {
        limit: number;
        current: number;
        overage: number;
    };
}

// Union type for all specific event types
export type LLMSpecificEvent =
    | ILLMStartEvent
    | ILLMEndEvent
    | ILLMErrorEvent
    | ILLMNewTokenEvent
    | ILLMRateLimitEvent
    | ILLMCacheEvent
    | ILLMMemoryEvent
    | ILLMBudgetEvent;

// ─── Type Guards ────────────────────────────────────────────────────────────

/**
 * Type guard for LLM events
 */
export const isLLMEvent = (event: unknown): event is ILLMEvent => {
    if (typeof event !== 'object' || event === null) return false;
    const e = event as ILLMEvent;
    return (
        typeof e.type === 'string' &&
        typeof e.timestamp === 'number' &&
        typeof e.runId === 'string' &&
        e.metadata !== undefined
    );
};

/**
 * Type guard for specific LLM events
 */
export const isLLMSpecificEvent = (event: ILLMEvent): event is LLMSpecificEvent => {
    return event.data !== undefined;
};

/**
 * Type guard for LLM callback handlers
 */
export const isLLMCallbackHandler = (handler: unknown): handler is ILLMCallbackHandler => {
    if (typeof handler !== 'object' || handler === null) return false;
    const h = handler as ILLMCallbackHandler;
    return (
        typeof h.handleLLMStart === 'function' &&
        typeof h.handleLLMEnd === 'function' &&
        typeof h.handleLLMError === 'function'
    );
};
