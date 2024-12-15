/**
 * @file messagingBaseTypes.ts
 * @path src/types/llm/message/messagingBaseTypes.ts
 * @description Custom metadata and history types for LLM messaging
 * 
 * Note: Base message types are now handled by Langchain:
 * - Use BaseMessage from @langchain/core/messages
 * - Use AIMessage from @langchain/core/messages
 * - Use HumanMessage from @langchain/core/messages
 * - Use SystemMessage from @langchain/core/messages
 */

import { BaseMessage } from '@langchain/core/messages';
import type { ILLMUsageMetrics } from '../llmMetricTypes';

/**
 * Standard cost details for message operations
 */
export interface IStandardCostDetails {
    /** Total cost in USD */
    totalCost: number;
    /** Cost breakdown by component */
    breakdown: {
        /** Input tokens cost */
        inputCost: number;
        /** Output tokens cost */
        outputCost: number;
        /** Additional costs (e.g., API fees) */
        additionalCosts: number;
    };
    /** Cost per token */
    ratePerToken: {
        /** Input token rate */
        input: number;
        /** Output token rate */
        output: number;
    };
    /** Timestamp of cost calculation */
    timestamp: number;
}

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
     * Check if value is standard cost details
     */
    isStandardCostDetails: (value: unknown): value is IStandardCostDetails => {
        if (typeof value !== 'object' || value === null) return false;
        const cost = value as Partial<IStandardCostDetails>;
        return (
            typeof cost.totalCost === 'number' &&
            typeof cost.breakdown === 'object' &&
            typeof cost.breakdown.inputCost === 'number' &&
            typeof cost.breakdown.outputCost === 'number' &&
            typeof cost.breakdown.additionalCosts === 'number' &&
            typeof cost.ratePerToken === 'object' &&
            typeof cost.ratePerToken.input === 'number' &&
            typeof cost.ratePerToken.output === 'number' &&
            typeof cost.timestamp === 'number'
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
