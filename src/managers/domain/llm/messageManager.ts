/**
 * @file messageManager.ts
 * @path src/utils/managers/domain/llm/messageManager.ts
 * @description Centralized message handling and history management that integrates with CoreManager
 *
 * @module @managers/domain/llm
 */

import CoreManager from '../../core/coreManager';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage, FunctionMessage } from "@langchain/core/messages";
import type { 
    MessageContext,
    MessageContent,
    MessageMetadataFields,
    MessageRole,
    FunctionCall 
} from '@/types/messaging/messagingBaseTypes';

import type {
    MessageHandlerConfig,
    MessageStreamConfig,
    MessageValidationConfig,
    MessageBuildParams,
    MessageProcessResult
} from '@/types/messaging/messagingHandlersTypes';

/**
 * Message management implementation with CoreManager integration
 */
export class MessageManager extends CoreManager {
    private static instance: MessageManager;
    private readonly messages: BaseMessage[];
    private readonly messageMetadata: Map<string, MessageMetadataFields>;
    private readonly messageValidators: ((message: BaseMessage) => boolean)[];

    private constructor() {
        super();
        this.messages = [];
        this.messageMetadata = new Map();
        this.messageValidators = [];
        this.registerDomainManager('MessageManager', this);
    }

    public static getInstance(): MessageManager {
        if (!MessageManager.instance) {
            MessageManager.instance = new MessageManager();
        }
        return MessageManager.instance;
    }

    // ─── Message Operations ────────────────────────────────────────────────────

    public async addMessage(message: BaseMessage): Promise<void> {
        return await this.safeExecute(async () => {
            if (!this.validateMessage(message)) {
                throw new Error('Invalid message format');
            }

            this.messages.push(message);
            await this.updateMetadata(message);
            this.logManager.debug('Message added', undefined, message.type);
        }, 'Message addition failed');
    }

    public async addUserMessage(content: string): Promise<void> {
        await this.addMessage(new HumanMessage(content));
    }

    public async addAIMessage(content: string): Promise<void> {
        await this.addMessage(new AIMessage(content));
    }

    public async addSystemMessage(content: string): Promise<void> {
        await this.addMessage(new SystemMessage(content));
    }

    public async addFunctionMessage(name: string, content: string): Promise<void> {
        await this.addMessage(new FunctionMessage(content, name));
    }

    public async getMessages(): Promise<BaseMessage[]> {
        return this.messages;
    }

    public async clear(): Promise<void> {
        return await this.safeExecute(async () => {
            this.messages.length = 0;
            this.messageMetadata.clear();
            this.logManager.info('Message history cleared');
        }, 'Message history clearing failed');
    }

    // ─── Message Processing ─────────────────────────────────────────────────────

    public async processMessage(
        content: string,
        role: MessageRole = 'assistant',
        context?: MessageContext
    ): Promise<MessageProcessResult> {
        return await this.safeExecute(async () => {
            if (!this.validateMessageContent(content, role)) {
                throw new Error('Invalid message content or role');
            }

            const message = await this.buildMessage({
                role,
                content,
                metadata: this.createMetadata(context)
            });

            await this.addMessage(message);

            return {
                success: true,
                message,
                metadata: {
                    timestamp: Date.now(),
                    ...context
                }
            };
        }, 'Message processing failed');
    }

    public async processStream(
        content: string,
        config: MessageStreamConfig
    ): Promise<void> {
        const { bufferSize = 100, onToken, onComplete } = config;
        let buffer = '';

        return await this.safeExecute(async () => {
            const streamingManager = this.getDomainManager('StreamingManager');
            
            for (const chunk of content) {
                buffer += chunk;

                if (buffer.length >= bufferSize && onToken) {
                    await onToken(buffer);
                    buffer = '';
                }
            }

            if (buffer && onToken) {
                await onToken(buffer);
            }

            if (onComplete) {
                await onComplete(content);
            }
        }, 'Stream processing failed');
    }

    // ─── Protected Helper Methods ───────────────────────────────────────────────

    protected async updateMetadata(message: BaseMessage): Promise<void> {
        const metadata: MessageMetadataFields = {
            messageId: crypto.randomUUID(),
            timestamp: Date.now(),
            role: message.type,
            content: message.content
        };

        this.messageMetadata.set(metadata.messageId, metadata);
    }

    protected validateMessage(message: BaseMessage): boolean {
        if (!message.content || !message.type) {
            return false;
        }

        return this.messageValidators.every(validator => validator(message));
    }

    protected validateMessageContent(content: string | MessageContent, role: MessageRole): boolean {
        return content !== null && content !== undefined && content !== '';
    }

    protected createMetadata(context?: MessageContext): MessageMetadataFields {
        return {
            messageId: crypto.randomUUID(),
            timestamp: Date.now(),
            ...context
        };
    }
}

export default MessageManager.getInstance();