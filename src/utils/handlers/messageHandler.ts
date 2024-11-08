/**
 * @file messageHandler.ts
 * @path src/utils/handlers/messageHandler.ts
 * @description Message processing and management implementation
 */

import { 
    BaseMessage,
    SystemMessage,
    HumanMessage,
    AIMessage,
    FunctionMessage 
} from "@langchain/core/messages";
import { logger } from "../core/logger";
import { 
    HandlerResult,
    MessageMetadataFields,
    FunctionCall
} from '@/utils/types';

/**
 * Message handler implementation
 */
export class MessageHandler {
    /**
     * Handle system message creation
     */
    async handleSystemMessage(
        content: string,
        metadata?: MessageMetadataFields
    ): Promise<HandlerResult<SystemMessage>> {
        try {
            const message = new SystemMessage({
                content,
                additional_kwargs: this.prepareMetadata(metadata)
            });

            logger.debug('Created system message:', content);
            return {
                success: true,
                data: message
            };
        } catch (error) {
            logger.error('Error creating system message:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle user message creation
     */
    async handleUserMessage(
        content: string,
        metadata?: MessageMetadataFields
    ): Promise<HandlerResult<HumanMessage>> {
        try {
            const message = new HumanMessage({
                content,
                additional_kwargs: this.prepareMetadata(metadata)
            });

            logger.debug('Created user message:', content);
            return {
                success: true,
                data: message
            };
        } catch (error) {
            logger.error('Error creating user message:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle AI message creation
     */
    async handleAIMessage(
        content: string,
        metadata?: MessageMetadataFields
    ): Promise<HandlerResult<AIMessage>> {
        try {
            const message = new AIMessage({
                content,
                additional_kwargs: this.prepareMetadata(metadata)
            });

            logger.debug('Created AI message:', content);
            return {
                success: true,
                data: message
            };
        } catch (error) {
            logger.error('Error creating AI message:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle function message creation
     */
    async handleFunctionMessage(
        name: string,
        content: string,
        functionCall?: FunctionCall,
        metadata?: MessageMetadataFields
    ): Promise<HandlerResult<FunctionMessage>> {
        try {
            const message = new FunctionMessage({
                content,
                name,
                additional_kwargs: this.prepareMetadata({
                    ...metadata,
                    function_call: functionCall ? {
                        name: functionCall.name,
                        arguments: typeof functionCall.arguments === 'string'
                            ? functionCall.arguments
                            : JSON.stringify(functionCall.arguments)
                    } : undefined
                })
            });

            logger.debug('Created function message:', { name, content });
            return {
                success: true,
                data: message
            };
        } catch (error) {
            logger.error('Error creating function message:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle message history addition
     */
    async handleMessageAddition(
        message: BaseMessage,
        metadata?: MessageMetadataFields
    ): Promise<HandlerResult<BaseMessage>> {
        try {
            const newMessage = new (message.constructor as any)({
                content: message.content,
                ...(message instanceof FunctionMessage && { name: message.name }),
                additional_kwargs: this.prepareMetadata({
                    ...message.additional_kwargs,
                    ...metadata
                })
            });

            logger.debug('Added message to history:', {
                type: message.constructor.name,
                content: message.content
            });

            return {
                success: true,
                data: newMessage
            };
        } catch (error) {
            logger.error('Error adding message to history:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Prepare metadata for messages
     */
    private prepareMetadata(metadata?: MessageMetadataFields): Record<string, unknown> {
        const baseMetadata = {
            timestamp: Date.now(),
            ...metadata
        };

        // Handle function calls
        if (baseMetadata.function_call) {
            const functionCall = baseMetadata.function_call as FunctionCall;
            baseMetadata.function_call = {
                name: functionCall.name,
                arguments: typeof functionCall.arguments === 'string'
                    ? functionCall.arguments
                    : JSON.stringify(functionCall.arguments)
            };
        }

        return baseMetadata;
    }
}

// Export singleton instance
export const messageHandler = new MessageHandler();
