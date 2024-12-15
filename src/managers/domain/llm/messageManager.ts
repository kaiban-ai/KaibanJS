/**
 * @file messageManager.ts
 * @path src/managers/domain/llm/messageManager.ts
 * @description Centralized message handling and history management that integrates with CoreManager and Langchain
 *
 * @module @managers/domain/llm
 */

import CoreManager from '../../core/coreManager';
import { 
    BaseMessage, 
    HumanMessage, 
    AIMessage, 
    SystemMessage, 
    FunctionMessage,
    isHumanMessage,
    isAIMessage,
    isSystemMessage,
    isFunctionMessage
} from "@langchain/core/messages";
import { MessageTypeGuards } from '../../../types/llm/message/messagingBaseTypes';
import type { 
    IBaseMessage,
    IBaseMessageMetadata,
    IBaseMessageProps,
    IMessageHistory,
    IMessageHistoryEntry,
    IMessageValidationResult
} from '../../../types/llm/message/messagingBaseTypes';
import type {
    IMessageHandlerConfig,
    IMessageStreamConfig,
    IMessageValidationConfig,
    IMessageBuildParams,
    IMessageProcessResult,
    IMessageTransformOptions
} from '../../../types/llm/message/messagingHandlersTypes';

type ExtendedBaseMessage = BaseMessage & {
    metadata?: IBaseMessageMetadata;
};

/**
 * Message management implementation with CoreManager and Langchain integration
 */
export class MessageManager extends CoreManager {
    private static instance: MessageManager;
    private readonly messages: ExtendedBaseMessage[];
    private readonly messageMetadata: Map<string, IBaseMessageMetadata>;
    private readonly messageValidators: ((message: ExtendedBaseMessage) => boolean)[];

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

    public async addMessage(message: ExtendedBaseMessage): Promise<void> {
        const result = await this.safeExecute(async () => {
            const validationResult = await this.validateMessage(message);
            if (!validationResult.isValid) {
                throw new Error(`Invalid message format: ${validationResult.errors.join(', ')}`);
            }

            // Use Langchain's message handling
            this.messages.push(message);
            
            // Maintain our enhanced metadata
            await this.updateMetadata(message);
            
            const messageType = this.getMessageType(message);
            const metadata = this.messageMetadata.get(messageType);
            this.logDebug(
                `Message added: ${messageType} (metadata: ${metadata ? JSON.stringify(metadata) : 'none'})`
            );
        }, 'Message addition failed');

        if (!result.success) {
            throw result.error;
        }
    }

    public async addUserMessage(content: string, metadata?: IBaseMessageMetadata): Promise<void> {
        const message = new HumanMessage(content) as ExtendedBaseMessage;
        message.metadata = metadata;
        await this.addMessage(message);
    }

    public async addAIMessage(content: string, metadata?: IBaseMessageMetadata): Promise<void> {
        const message = new AIMessage(content) as ExtendedBaseMessage;
        message.metadata = metadata;
        await this.addMessage(message);
    }

    public async addSystemMessage(content: string, metadata?: IBaseMessageMetadata): Promise<void> {
        const message = new SystemMessage(content) as ExtendedBaseMessage;
        message.metadata = metadata;
        await this.addMessage(message);
    }

    public async addFunctionMessage(name: string, content: string, metadata?: IBaseMessageMetadata): Promise<void> {
        const message = new FunctionMessage(content, name) as ExtendedBaseMessage;
        message.metadata = metadata;
        await this.addMessage(message);
    }

    public async getMessages(): Promise<ExtendedBaseMessage[]> {
        return this.messages;
    }

    public async clear(): Promise<void> {
        const result = await this.safeExecute(async () => {
            this.messages.length = 0;
            this.messageMetadata.clear();
            this.logInfo('Message history cleared');
        }, 'Message history clearing failed');

        if (!result.success) {
            throw result.error;
        }
    }

    // ─── Message Processing ─────────────────────────────────────────────────────

    public async processMessage(
        content: string,
        role: string = 'assistant',
        metadata?: IBaseMessageMetadata
    ): Promise<IMessageProcessResult> {
        return await this.safeExecute(async () => {
            const validationResult = await this.validateMessageContent(content, role);
            if (!validationResult.isValid) {
                throw new Error(`Invalid message content or role: ${validationResult.errors.join(', ')}`);
            }

            // Use Langchain's message creation with our metadata
            let message: ExtendedBaseMessage;
            switch (role) {
                case 'human':
                    message = new HumanMessage(content) as ExtendedBaseMessage;
                    break;
                case 'ai':
                case 'assistant':
                    message = new AIMessage(content) as ExtendedBaseMessage;
                    break;
                case 'system':
                    message = new SystemMessage(content) as ExtendedBaseMessage;
                    break;
                default:
                    throw new Error(`Unsupported message role: ${role}`);
            }

            message.metadata = metadata;
            await this.addMessage(message);

            return {
                success: true,
                message,
                metadata: {
                    timestamp: Date.now(),
                    ...metadata
                }
            };
        }, 'Message processing failed');
    }

    public async processStream(
        content: string,
        config: IMessageStreamConfig
    ): Promise<void> {
        const { bufferSize = 100, onToken, onComplete } = config;
        let buffer = '';

        const result = await this.safeExecute(async () => {
            // Use Langchain's streaming capabilities
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
                await onComplete(new AIMessage(content));
            }
        }, 'Stream processing failed');

        if (!result.success) {
            throw result.error;
        }
    }

    // ─── Protected Helper Methods ───────────────────────────────────────────────

    protected getMessageType(message: ExtendedBaseMessage): string {
        if (isHumanMessage(message)) return 'human';
        if (isAIMessage(message)) return 'ai';
        if (isSystemMessage(message)) return 'system';
        if (isFunctionMessage(message)) return 'function';
        return 'unknown';
    }

    protected async updateMetadata(message: ExtendedBaseMessage): Promise<void> {
        const metadata: IBaseMessageMetadata = {
            timestamp: Date.now(),
            component: 'MessageManager',
            operation: 'message_added',
            ...(message.metadata || {})
        };

        const messageType = this.getMessageType(message);
        this.messageMetadata.set(messageType, metadata);
        
        // Log metrics for monitoring
        this.logDebug(
            `Message metadata updated for type: ${messageType} (metadata: ${JSON.stringify(metadata)})`
        );
    }

    protected async validateMessage(message: ExtendedBaseMessage): Promise<IMessageValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic Langchain validation
        if (!message.content || this.getMessageType(message) === 'unknown') {
            errors.push('Message must have content and valid type');
        }

        // Our enhanced validation
        if (!MessageTypeGuards.isBaseMessage(message)) {
            errors.push('Message does not conform to base message interface');
        }

        // Custom validators
        const customValidationResults = await Promise.all(
            this.messageValidators.map(validator => {
                try {
                    return validator(message);
                } catch (error) {
                    warnings.push(`Custom validator failed: ${error}`);
                    return true; // Don't fail on custom validator errors
                }
            })
        );

        if (customValidationResults.some(result => !result)) {
            errors.push('Message failed custom validation');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined,
            metadata: {
                timestamp: Date.now(),
                component: 'MessageManager',
                operation: 'message_validation',
                validatedFields: ['content', 'type', 'metadata']
            }
        };
    }

    protected async validateMessageContent(content: string, role: string): Promise<IMessageValidationResult> {
        const errors: string[] = [];

        if (!content || typeof content !== 'string') {
            errors.push('Content must be a non-empty string');
        }

        if (!role || !['human', 'ai', 'assistant', 'system', 'function'].includes(role)) {
            errors.push('Invalid message role');
        }

        return {
            isValid: errors.length === 0,
            errors,
            metadata: {
                timestamp: Date.now(),
                component: 'MessageManager',
                operation: 'content_validation',
                validatedFields: ['content', 'role']
            }
        };
    }
}

export default MessageManager.getInstance();
