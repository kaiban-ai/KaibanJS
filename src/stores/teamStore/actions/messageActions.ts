/**
 * @file messageActions.ts
 * @path src/stores/teamStore/actions/messageActions.ts
 * @description Message handling actions for the team store
 */

import { logger } from '@/utils/core/logger';
import { BaseMessage, MessageContent } from "@langchain/core/messages";
import { MessageHistoryManager } from '@/utils/managers/messageHistoryManager';
import { MessageUtils } from '../utils/messageUtils';
import { MessageMetadataFields } from '@/utils/types/messaging/base';
import type { TeamState } from '@/utils/types';

// Creates message handling actions
export const createMessageActions = (
    get: () => TeamState,
    set: (fn: (state: TeamState) => Partial<TeamState>) => void,
    messageHistoryManager: MessageHistoryManager
) => ({
    handleSystemMessage: (message: string): void => {
        logger.info(`System message: ${message}`);
        messageHistoryManager.addSystemMessage(message).catch(error => {
            logger.error('Error adding system message:', error);
            throw error;
        });
    },

    addSystemMessage: async (message: string): Promise<void> => {
        try {
            if (!MessageUtils.validateMessageContent(message)) {
                throw new Error('Invalid system message content');
            }

            await messageHistoryManager.addSystemMessage(message);
            logger.debug('System message added:', message);
        } catch (error) {
            MessageUtils.handleMessageError(error, 'addSystemMessage');
        }
    },

    addUserMessage: async (message: string): Promise<void> => {
        try {
            if (!MessageUtils.validateMessageContent(message)) {
                throw new Error('Invalid user message content');
            }

            await messageHistoryManager.addUserMessage(message);
            logger.debug('User message added:', message);
        } catch (error) {
            MessageUtils.handleMessageError(error, 'addUserMessage');
        }
    },

    addAIMessage: async (message: MessageContent): Promise<void> => {
        try {
            if (!MessageUtils.validateMessageContent(message)) {
                throw new Error('Invalid AI message content');
            }

            await messageHistoryManager.addAIMessage(MessageUtils.convertToString(message));
            logger.debug('AI message added:', message);
        } catch (error) {
            MessageUtils.handleMessageError(error, 'addAIMessage');
        }
    },

    addFunctionMessage: async (name: string, content: string): Promise<void> => {
        try {
            if (!name || !MessageUtils.validateMessageContent(content)) {
                throw new Error('Invalid function message parameters');
            }

            await messageHistoryManager.addFunctionMessage(name, content);
            logger.debug('Function message added:', { name, content });
        } catch (error) {
            MessageUtils.handleMessageError(error, 'addFunctionMessage');
        }
    },

    addMessage: async (message: BaseMessage): Promise<void> => {
        try {
            await messageHistoryManager.addMessage(message);
            logger.debug('Message added:', message);
        } catch (error) {
            MessageUtils.handleMessageError(error, 'addMessage');
        }
    },

    getMessageHistory: async (): Promise<BaseMessage[]> => {
        try {
            return await messageHistoryManager.getMessages();
        } catch (error) {
            logger.error('Error getting message history:', error);
            throw error;
        }
    },

    clearMessageHistory: async (): Promise<void> => {
        try {
            await messageHistoryManager.clear();
            logger.debug('Message history cleared');
        } catch (error) {
            logger.error('Error clearing message history:', error);
            throw error;
        }
    },

    handleFunctionCallMessage: async (
        name: string,
        args: Record<string, unknown>
    ): Promise<void> => {
        try {
            await messageHistoryManager.addFunctionMessage(
                name,
                MessageUtils.stringifyFunctionArgs(args)
            );

            logger.debug('Function call message added:', { name, args });
        } catch (error) {
            MessageUtils.handleMessageError(error, 'handleFunctionCallMessage');
        }
    },

    processMessageMetadata: (
        metadata?: MessageMetadataFields
    ): MessageMetadataFields => {
        return MessageUtils.createMessageMetadata(metadata);
    },

    validateMessage: (
        content: MessageContent,
        metadata?: MessageMetadataFields
    ): boolean => {
        return (
            MessageUtils.validateMessageContent(content) &&
            (!metadata || MessageUtils.validateMessageMetadata(metadata))
        );
    }
});

export type MessageActions = ReturnType<typeof createMessageActions>;
export default createMessageActions;
