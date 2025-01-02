/**
 * @file messagingBaseTypes.ts
 * @path src/types/llm/message/messagingBaseTypes.ts
 * @description Metadata and validation types for LLM messaging
 * 
 * Note: Base message types are handled by Langchain:
 * - Use BaseMessage from @langchain/core/messages
 * - Use AIMessage from @langchain/core/messages
 * - Use HumanMessage from @langchain/core/messages
 * - Use SystemMessage from @langchain/core/messages
 */

import { BaseMessage } from '@langchain/core/messages';
import type { ILLMUsageMetrics } from '../llmMetricTypes';
import type { IStandardCostDetails } from '../../common/baseTypes';

// ─── Message Metadata Types ────────────────────────────────────────────────────

/**
 * Base message metadata fields
 */
export interface IBaseMessageMetadataFields {
    timestamp: number;
    component: string;
    operation: string;
    llmUsageMetrics: ILLMUsageMetrics;
    costDetails: IStandardCostDetails;
    importance?: number;
}

/**
 * Base message metadata
 */
export interface IBaseMessageMetadata {
    timestamp: number;
    component: string;
    operation: string;
    importance?: number;
    llmUsageMetrics?: ILLMUsageMetrics;
    costDetails?: IStandardCostDetails;
}

// ─── Message History Types ─────────────────────────────────────────────────────

/**
 * Message history entry
 */
export interface IMessageHistoryEntry {
    message: BaseMessage;
    timestamp: number;
    metadata?: IBaseMessageMetadata;
}

/**
 * Message history interface
 */
export interface IMessageHistory {
    messages: IMessageHistoryEntry[];
    metadata?: {
        conversationId?: string;
        sessionId?: string;
        llmUsageMetrics?: ILLMUsageMetrics;
        costDetails?: IStandardCostDetails;
    };
}

// ─── Message Validation Types ────────────────────────────────────────────────

/**
 * Message validation result
 */
export interface IMessageValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
    metadata?: {
        timestamp: number;
        component: string;
        operation: string;
        validatedFields: string[];
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const MessageTypeGuards = {
    /**
     * Check if value is a base message
     */
    isBaseMessage: (value: unknown): value is BaseMessage => {
        if (typeof value !== 'object' || value === null) return false;
        const message = value as Partial<BaseMessage>;
        return (
            typeof message.content === 'string' &&
            typeof message._getType === 'function'
        );
    },

    /**
     * Check if value is standard cost details
     */
    isStandardCostDetails: (value: unknown): value is IStandardCostDetails => {
        if (typeof value !== 'object' || value === null) return false;
        const cost = value as Partial<IStandardCostDetails>;
        return (
            typeof cost.inputCost === 'number' &&
            typeof cost.outputCost === 'number' &&
            typeof cost.totalCost === 'number' &&
            typeof cost.currency === 'string' &&
            typeof cost.breakdown === 'object' &&
            cost.breakdown !== null &&
            typeof cost.breakdown.promptTokens === 'object' &&
            cost.breakdown.promptTokens !== null &&
            typeof cost.breakdown.promptTokens.count === 'number' &&
            typeof cost.breakdown.promptTokens.cost === 'number' &&
            typeof cost.breakdown.completionTokens === 'object' &&
            cost.breakdown.completionTokens !== null &&
            typeof cost.breakdown.completionTokens.count === 'number' &&
            typeof cost.breakdown.completionTokens.cost === 'number'
        );
    },

    /**
     * Check if value is base message metadata
     */
    isBaseMessageMetadata: (value: unknown): value is IBaseMessageMetadata => {
        if (typeof value !== 'object' || value === null) return false;
        const metadata = value as Partial<IBaseMessageMetadata>;
        return (
            typeof metadata.timestamp === 'number' &&
            typeof metadata.component === 'string' &&
            typeof metadata.operation === 'string'
        );
    },

    /**
     * Check if value is message history entry
     */
    isMessageHistoryEntry: (value: unknown): value is IMessageHistoryEntry => {
        if (typeof value !== 'object' || value === null) return false;
        const entry = value as Partial<IMessageHistoryEntry>;
        return (
            typeof entry.timestamp === 'number' &&
            entry.message instanceof BaseMessage
        );
    }
};
