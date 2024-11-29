/**
 * @file messagingBaseTypes.ts
 * @path src/types/llm/message/messagingBaseTypes.ts
 * @description Base types for LLM messaging and communication
 *
 * @module @types/llm/message
 */

import { BaseMessage } from '@langchain/core/messages';
import type { ILLMUsageMetrics } from '../llmMetricTypes';
import type { IStandardCostDetails } from '../../common/commonMetricTypes';

// ─── Base Message Types ────────────────────────────────────────────────────────

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

/**
 * Base message properties
 */
export interface IBaseMessageProps {
    content: string;
    metadata?: IBaseMessageMetadata;
    role?: string;
    name?: string;
    additional_kwargs?: Record<string, unknown>;
}

/**
 * Base message interface extending Langchain's BaseMessage
 */
export interface IBaseMessage extends BaseMessage {
    metadata?: IBaseMessageMetadata;
    role: string;
    name?: string;
    additional_kwargs: Record<string, unknown>;
}

// ─── Message History Types ─────────────────────────────────────────────────────

/**
 * Message history entry
 */
export interface IMessageHistoryEntry {
    message: IBaseMessage;
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
     * Check if value is base message
     */
    isBaseMessage: (value: unknown): value is IBaseMessage => {
        if (typeof value !== 'object' || value === null) return false;
        const message = value as Partial<IBaseMessage>;
        return (
            typeof message.content === 'string' &&
            typeof message.role === 'string' &&
            typeof message.additional_kwargs === 'object' &&
            message.additional_kwargs !== null
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
            MessageTypeGuards.isBaseMessage(entry.message as unknown)
        );
    }
};
