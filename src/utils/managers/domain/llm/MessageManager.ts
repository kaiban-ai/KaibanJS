/**
 * @file MessageManager.ts
 * @path KaibanJS/src/managers/domain/llm/MessageManager.ts
 * @description Domain-level message management and processing
 */

import CoreManager from '../../core/CoreManager';
import { StatusManager } from '../../core/StatusManager';

// Core utilities
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';

// Import types from canonical locations
import type { 
    MessageRole,
    MessageContext,
    MessageProcessResult,
    MessageBuildParams,
    MessageValidationConfig,
    MessageStreamConfig,
    MessageTransformOptions,
    MessageMetadataFields
} from '@/utils/types/messaging/base';

import type {
    FunctionCall,
    ToolCall,
    BaseMessageMetadataFields,
    ChatMessageMetadataFields,
    LogMessageMetadataFields
} from '@/utils/types/messaging/base';

import type {
    BaseMessage,
    SystemMessage,
    HumanMessage,
    AIMessage,
    FunctionMessage
} from "@langchain/core/messages";

import { MESSAGE_STATUS_enum } from '@/utils/types/common/enums';

// ─── Message Manager Implementation ──────────────────────────────────────────────

export class MessageManager extends CoreManager {
    private static instance: MessageManager;
    private readonly statusManager: StatusManager;
    private readonly messageQueue: BaseMessage[];
    private readonly messageValidation: MessageValidationConfig;

    private constructor(config?: MessageValidationConfig) {
        super();
        this.statusManager = StatusManager.getInstance();
        this.messageQueue = [];
        this.messageValidation = {
            maxLength: config?.maxLength ?? 32768,
            allowedRoles: config?.allowedRoles ?? ['system', 'user', 'assistant', 'function'],
            requiredMetadata: config?.requiredMetadata ?? ['messageId', 'timestamp'],
            customValidators: config?.customValidators ?? []
        };
    }

    // ─── Singleton Access ───────────────────────────────────────────────────────

    public static getInstance(config?: MessageValidationConfig): MessageManager {
        if (!MessageManager.instance) {
            MessageManager.instance = new MessageManager(config);
        }
        return MessageManager.instance;
    }

    // ─── Message Processing ────────────────────────────────────────────────────

    public async processMessage(
        content: string,
        role: MessageRole = 'assistant',
        context?: MessageContext
    ): Promise<MessageProcessResult> {
        try {
            // Validate message
            const validationResult = await this.validateMessage({
                role,
                content,
                metadata: context
            });

            if (!validationResult.success) {
                throw new Error(validationResult.error?.message);
            }

            // Build message
            const message = await this.buildMessage({
                role,
                content,
                metadata: context
            });

            // Add to queue
            this.messageQueue.push(message);

            return {
                success: true,
                message,
                metadata: {
                    timestamp: Date.now(),
                    ...context
                }
            };

        } catch (error) {
            return this.handleProcessingError(error);
        }
    }

    // ─── Message Building ─────────────────────────────────────────────────────

    public async buildMessage(params: MessageBuildParams): Promise<BaseMessage> {
        const { role, content, metadata, name } = params;

        try {
            switch (role) {
                case 'system':
                    return new SystemMessage({
                        content,
                        additional_kwargs: this.prepareMetadata(metadata)
                    });

                case 'user':
                    return new HumanMessage({
                        content,
                        additional_kwargs: this.prepareMetadata(metadata)
                    });

                case 'assistant':
                    return new AIMessage({
                        content,
                        additional_kwargs: this.prepareMetadata(metadata)
                    });

                case 'function':
                    if (!name) {
                        throw new Error('Function name is required for function messages');
                    }
                    return new FunctionMessage({
                        content,
                        name,
                        additional_kwargs: this.prepareMetadata(metadata)
                    });

                default:
                    throw new Error(`Unsupported message role: ${role}`);
            }

        } catch (error) {
            throw new PrettyError({
                message: 'Failed to build message',
                context: { role, content, name },
                rootError: error instanceof Error ? error : undefined
            });
        }
    }

    // ─── Stream Processing ─────────────────────────────────────────────────────

    public async processStream(
        content: string,
        config: MessageStreamConfig
    ): Promise<void> {
        const chunks = content.split('');
        let buffer = '';

        for (const chunk of chunks) {
            buffer += chunk;

            if (buffer.length >= (config.bufferSize || 100)) {
                if (config.onToken) {
                    config.onToken(buffer);
                }
                buffer = '';
            }
        }

        if (buffer && config.onToken) {
            config.onToken(buffer);
        }

        if (config.onComplete) {
            config.onComplete(content);
        }
    }

    // ─── Message Queue Management ──────────────────────────────────────────────

    public async flushQueue(): Promise<BaseMessage[]> {
        const messages = [...this.messageQueue];
        this.messageQueue.length = 0;
        return messages;
    }

    public async getQueueSize(): Promise<number> {
        return this.messageQueue.length;
    }

    // ─── Message Transformation ──────────────────────────────────────────────────

    public async transformMessage(
        message: BaseMessage,
        options: MessageTransformOptions
    ): Promise<BaseMessage> {
        let transformed = message;

        if (options.removeMetadata) {
            transformed = await this.buildMessage({
                role: this.getRoleFromMessage(transformed),
                content: transformed.content as string
            });
        }

        if (options.sanitizeContent && typeof transformed.content === 'string') {
            transformed = await this.buildMessage({
                role: this.getRoleFromMessage(transformed),
                content: this.sanitizeContent(transformed.content),
                metadata: transformed.additional_kwargs
            });
        }

        if (options.customTransforms) {
            for (const transform of options.customTransforms) {
                transformed = transform(transformed);
            }
        }

        return transformed;
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private prepareMetadata(metadata?: MessageMetadataFields): Record<string, unknown> {
        return {
            timestamp: Date.now(),
            ...metadata,
            function_call: metadata?.function_call ? {
                name: metadata.function_call.name,
                arguments: typeof metadata.function_call.arguments === 'string'
                    ? metadata.function_call.arguments
                    : JSON.stringify(metadata.function_call.arguments)
            } : undefined
        };
    }

    private getRoleFromMessage(message: BaseMessage): MessageRole {
        if (message instanceof SystemMessage) return 'system';
        if (message instanceof HumanMessage) return 'user';
        if (message instanceof AIMessage) return 'assistant';
        if (message instanceof FunctionMessage) return 'function';
        throw new Error('Unknown message type');
    }

    private sanitizeContent(content: string): string {
        return content
            .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
            .trim();
    }

    private async validateMessage(params: MessageBuildParams): Promise<MessageProcessResult> {
        const { role, content, metadata } = params;

        // Check content length
        if (content.length > this.messageValidation.maxLength) {
            return {
                success: false,
                error: new Error(`Message exceeds maximum length of ${this.messageValidation.maxLength}`)
            };
        }

        // Check role
        if (!this.messageValidation.allowedRoles.includes(role)) {
            return {
                success: false,
                error: new Error(`Invalid message role: ${role}`)
            };
        }

        // Check required metadata
        if (this.messageValidation.requiredMetadata) {
            for (const field of this.messageValidation.requiredMetadata) {
                if (!metadata || !(field in metadata)) {
                    return {
                        success: false,
                        error: new Error(`Missing required metadata field: ${field}`)
                    };
                }
            }
        }

        // Run custom validators
        if (this.messageValidation.customValidators) {
            for (const validator of this.messageValidation.customValidators) {
                const message = await this.buildMessage(params);
                if (!validator(message)) {
                    return {
                        success: false,
                        error: new Error('Message failed custom validation')
                    };
                }
            }
        }

        return { success: true };
    }

    private handleProcessingError(error: unknown): MessageProcessResult {
        const processingError = new PrettyError({
            message: 'Message processing failed',
            context: { error },
            rootError: error instanceof Error ? error : undefined
        });

        logger.error('Message processing error:', processingError);

        return {
            success: false,
            error: processingError
        };
    }
}

export default MessageManager;