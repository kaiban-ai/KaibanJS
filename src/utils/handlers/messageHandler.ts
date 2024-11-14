/**
 * @file MessageHandler.ts
 * @path KaibanJS/src/utils/handlers/messageHandler.ts
 * @description High-level message handling and orchestration using MessageManager
 */

// Core utilities
import { logger } from "@/utils/core/logger";
import { MessageManager } from "@/utils/managers/domain/llm/MessageManager";

// Import from canonical locations
import type { 
    MessageRole,
    MessageContext,
    MessageProcessResult,
    MessageBuildParams 
} from '@/utils/types/messaging/base';

import type { 
    BaseMessage, 
    SystemMessage, 
    HumanMessage, 
    AIMessage, 
    FunctionMessage 
} from "@langchain/core/messages";

/**
 * High-level message handling orchestration
 */
export class MessageHandler {
    private readonly messageManager: MessageManager;

    constructor() {
        this.messageManager = MessageManager.getInstance();
    }

    // ─── Message Building ─────────────────────────────────────────────────────────

    public async buildMessage(params: MessageBuildParams): Promise<BaseMessage> {
        try {
            return await this.messageManager.buildMessage(params);
        } catch (error) {
            logger.error('Error building message:', error);
            throw error;
        }
    }

    // ─── Message Processing ────────────────────────────────────────────────────────

    public async processMessage(
        content: string,
        role: MessageRole = 'ai',
        context?: MessageContext
    ): Promise<MessageProcessResult> {
        try {
            return await this.messageManager.processMessage(content, role, context);
        } catch (error) {
            logger.error('Error processing message:', error);
            throw error;
        }
    }

    // ─── Content Adding ────────────────────────────────────────────────────────

    public async addSystemMessage(content: string): Promise<void> {
        try {
            await this.messageManager.addSystemMessage(content);
        } catch (error) {
            logger.error('Error adding system message:', error);
            throw error;
        }
    }

    public async addUserMessage(content: string): Promise<void> {
        try {
            await this.messageManager.addUserMessage(content);
        } catch (error) {
            logger.error('Error adding user message:', error);
            throw error;
        }
    }

    public async addAIMessage(content: string): Promise<void> {
        try {
            await this.messageManager.addAIMessage(content);
        } catch (error) {
            logger.error('Error adding AI message:', error);
            throw error;
        }
    }

    public async addFunctionMessage(name: string, content: string): Promise<void> {
        try {
            await this.messageManager.addFunctionMessage(name, content);
        } catch (error) {
            logger.error('Error adding function message:', error);
            throw error;
        }
    }

    // ─── Message History ───────────────────────────────────────────────────────

    public async getMessageHistory(): Promise<BaseMessage[]> {
        try {
            return await this.messageManager.getMessageHistory();
        } catch (error) {
            logger.error('Error getting message history:', error);
            throw error;
        }
    }

    public async clearHistory(): Promise<void> {
        try {
            await this.messageManager.clearHistory();
        } catch (error) {
            logger.error('Error clearing message history:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const messageHandler = new MessageHandler();
export default messageHandler;