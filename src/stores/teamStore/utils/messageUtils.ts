/**
 * @file messageUtils.ts
 * @path src/stores/teamStore/utils/messageUtils.ts
 * @description Message handling utilities for the team store
 */

import { BaseMessage, FunctionMessage } from "@langchain/core/messages";
import { logger } from '@/utils/core/logger';

import { MessageContent } from "@langchain/core/messages";
import { MessageMetadataFields } from "@/utils/types/messaging";
import { FunctionCall } from "@/utils/types/messaging";

import type { 
    MessageHistoryConfig 
} from '@/utils/types';

/**
 * Utilities for handling messages in the team store
 */
export const MessageUtils = {
    /**
     * Converts function arguments to string format
     */
    stringifyFunctionArgs(args: Record<string, unknown>): string {
        try {
            return JSON.stringify(args);
        } catch (error) {
            logger.error('Error stringifying function arguments:', error);
            return '{}';
        }
    },

    /**
     * Parses function arguments from string format
     */
    parseFunctionArgs(argsString: string): Record<string, unknown> {
        try {
            return JSON.parse(argsString);
        } catch (error) {
            logger.error('Error parsing function arguments:', error);
            return {};
        }
    },

    /**
     * Converts metadata to LangChain kwargs format
     */
    convertToLangChainKwargs(metadata: MessageMetadataFields): Record<string, unknown> {
        const kwargs: Record<string, unknown> = { ...metadata };
        if (metadata.function_call) {
            kwargs.function_call = {
                name: metadata.function_call.name,
                arguments: typeof metadata.function_call.arguments === 'string'
                    ? metadata.function_call.arguments
                    : this.stringifyFunctionArgs(metadata.function_call.arguments as Record<string, unknown>)
            };
        }
        return kwargs;
    },

    /**
     * Converts message content to string format
     */
    convertToString(content: MessageContent | null): string {
        if (content === null) return "";
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content.map(item => 
                typeof item === 'string' ? item : JSON.stringify(item)
            ).join(' ');
        }
        return JSON.stringify(content);
    },

    /**
     * Creates additional kwargs for messages
     */
    createAdditionalKwargs(metadata?: MessageMetadataFields): Record<string, unknown> {
        return {
            timestamp: Date.now(),
            ...metadata
        };
    },

    /**
     * Handles function call formatting
     */
    handleFunctionCall(functionCall?: FunctionCall): FunctionCall | undefined {
        if (!functionCall) return undefined;

        return {
            name: functionCall.name,
            arguments: typeof functionCall.arguments === 'string'
                ? functionCall.arguments
                : this.stringifyFunctionArgs(functionCall.arguments as Record<string, unknown>)
        };
    },

    /**
     * Validates message content
     */
    validateMessageContent(content: MessageContent): boolean {
        if (content === null) return false;
        if (typeof content === 'string') return content.length > 0;
        if (Array.isArray(content)) return content.length > 0;
        return Object.keys(content).length > 0;
    },

    /**
     * Creates message configuration
     */
    createMessageConfig(
        content: string | MessageContent,
        metadata?: MessageMetadataFields
    ): MessageHistoryConfig {
        return {
            content: this.convertToString(content as MessageContent),
            additional_kwargs: this.createAdditionalKwargs(metadata)
        };
    },

    /**
     * Extracts function call details from a message
     */
    extractFunctionCall(message: BaseMessage): FunctionCall | null {
        if (message instanceof FunctionMessage) {
            const functionCall = message.additional_kwargs?.function_call;
            if (functionCall) {
                return {
                    name: functionCall.name,
                    arguments: this.parseFunctionArgs(functionCall.arguments as string)
                };
            }
        }
        return null;
    },

    /**
     * Creates a metadata object for messages
     */
    createMessageMetadata(
        metadata?: Partial<MessageMetadataFields>
    ): MessageMetadataFields {
        return {
            timestamp: Date.now(),
            ...metadata,
            function_call: metadata?.function_call 
                ? this.handleFunctionCall(metadata.function_call)
                : undefined
        };
    },

    /**
     * Validates message metadata
     */
    validateMessageMetadata(metadata: MessageMetadataFields): boolean {
        if (!metadata) return false;
        if (metadata.function_call) {
            return (
                typeof metadata.function_call.name === 'string' &&
                metadata.function_call.name.length > 0 &&
                (typeof metadata.function_call.arguments === 'string' ||
                typeof metadata.function_call.arguments === 'object')
            );
        }
        return true;
    },

    /**
     * Handles message error cases
     */
    handleMessageError(error: unknown, context: string): void {
        logger.error(`Message error in ${context}:`, error);
        throw error;
    }
};

export default MessageUtils;