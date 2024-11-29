/**
 * @file messageUtils.ts
 * @path src/utils/llm/messageUtils.ts
 * @description Utility functions for handling LLM messages
 */

import { BaseMessage, AIMessage, HumanMessage, SystemMessage, FunctionMessage, BaseMessageLike } from '@langchain/core/messages';
import { MessageRole, IMessageContent, IMessageContext } from '../../types/llm/message/messageTypes';
import { MESSAGE_STATUS_enum } from '../../types/common/commonEnums';

/**
 * Convert a message array to Langchain BaseMessage format
 */
export function convertToBaseMessages(messages: BaseMessageLike[][]): BaseMessage[] {
    // If messages is already flattened, wrap it in an array
    const messageArrays = Array.isArray(messages[0]) ? messages : [messages];
    
    return messageArrays.flat().map(msg => {
        if (msg instanceof BaseMessage) {
            return msg;
        }

        if (typeof msg === 'string') {
            return new HumanMessage({ content: msg });
        }

        if (Array.isArray(msg)) {
            const [type, content] = msg;
            switch (type) {
                case 'system':
                    return new SystemMessage({ content: String(content) });
                case 'assistant':
                    return new AIMessage({ content: String(content) });
                case 'function':
                    return new FunctionMessage({
                        content: String(content),
                        name: 'function'
                    });
                case 'user':
                default:
                    return new HumanMessage({ content: String(content) });
            }
        }

        if (typeof msg === 'object' && msg !== null && 'content' in msg) {
            const content = String(msg.content);
            const type = msg.type || 'user';
            
            switch (type) {
                case 'system':
                    return new SystemMessage({ content });
                case 'assistant':
                    return new AIMessage({ content });
                case 'function':
                    return new FunctionMessage({
                        content,
                        name: msg.name || 'function'
                    });
                case 'user':
                default:
                    return new HumanMessage({ content });
            }
        }

        // Default to HumanMessage if type cannot be determined
        return new HumanMessage({ content: String(msg) });
    });
}

/**
 * Convert a BaseMessage to message context
 */
export function convertToMessageContext(message: BaseMessage): IMessageContext {
    return {
        role: getRoleFromMessage(message),
        content: message.content as string,
        timestamp: Date.now(),
        metadata: {
            id: message.id || Date.now().toString(),
            timestamp: Date.now(),
            status: MESSAGE_STATUS_enum.INITIAL,
            retryCount: 0,
            priority: 1,
            ttl: 3600,
            tags: []
        }
    };
}

/**
 * Get message role from BaseMessage
 */
function getRoleFromMessage(message: BaseMessage): MessageRole {
    if (message instanceof SystemMessage) return 'system';
    if (message instanceof AIMessage) return 'assistant';
    if (message instanceof FunctionMessage) return 'function';
    return 'user';
}

/**
 * Convert message content to string
 */
export function getMessageContent(content: IMessageContent | string): string {
    if (typeof content === 'string') return content;
    return content.text;
}

/**
 * Create a message context
 */
export function createMessageContext(
    role: MessageRole,
    content: string | IMessageContent,
    metadata?: Record<string, unknown>
): IMessageContext {
    return {
        role,
        content: typeof content === 'string' ? content : content.text,
        timestamp: Date.now(),
        metadata: {
            id: Date.now().toString(),
            timestamp: Date.now(),
            status: MESSAGE_STATUS_enum.INITIAL,
            retryCount: 0,
            priority: 1,
            ttl: 3600,
            tags: [],
            ...metadata
        }
    };
}

/**
 * Convert a single message to BaseMessage
 */
export function convertToBaseMessage(message: BaseMessageLike): BaseMessage {
    if (message instanceof BaseMessage) {
        return message;
    }

    if (typeof message === 'string') {
        return new HumanMessage({ content: message });
    }

    if (Array.isArray(message)) {
        const [type, content] = message;
        switch (type) {
            case 'system':
                return new SystemMessage({ content: String(content) });
            case 'assistant':
                return new AIMessage({ content: String(content) });
            case 'function':
                return new FunctionMessage({
                    content: String(content),
                    name: 'function'
                });
            case 'user':
            default:
                return new HumanMessage({ content: String(content) });
        }
    }

    if (typeof message === 'object' && message !== null && 'content' in message) {
        const content = String(message.content);
        const type = message.type || 'user';
        
        switch (type) {
            case 'system':
                return new SystemMessage({ content });
            case 'assistant':
                return new AIMessage({ content });
            case 'function':
                return new FunctionMessage({
                    content,
                    name: message.name || 'function'
                });
            case 'user':
            default:
                return new HumanMessage({ content });
        }
    }

    return new HumanMessage({ content: String(message) });
}
