/**
 * @file messageUtils.ts
 * @path src/utils/llm/messageUtils.ts
 * @description Utility functions for handling LLM messages
 */

import { 
    BaseMessage, 
    AIMessage, 
    HumanMessage, 
    SystemMessage, 
    FunctionMessage, 
    BaseMessageLike 
} from '@langchain/core/messages';
import { 
    IBaseMessageMetadata,
    IMessageHistory
} from '../../types/llm/message/messagingBaseTypes';

/**
 * Convert a message array to Langchain BaseMessage format
 */
export function convertToBaseMessages(messages: BaseMessageLike[][]): BaseMessage[] {
    // If messages is already flattened, wrap it in an array
    const messageArrays = Array.isArray(messages[0]) ? messages : [messages];
    
    return messageArrays.flat().map(message => {
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

        // Default to HumanMessage if type cannot be determined
        return new HumanMessage({ content: String(message) });
    });
}

/**
 * Convert a BaseMessage to message with metadata
 */
export function convertToMessageWithMetadata(message: BaseMessage): { message: BaseMessage; metadata: IBaseMessageMetadata } {
    return {
        message,
        metadata: {
            timestamp: Date.now(),
            component: 'MessageConverter',
            operation: 'convertToMessageWithMetadata',
            importance: 1,
            llmUsageMetrics: {
                totalRequests: 1,
                activeUsers: 1,
                activeInstances: 1,
                requestsPerSecond: 1,
                averageResponseSize: message.content.length,
                peakMemoryUsage: 0,
                uptime: 0,
                rateLimit: {
                    current: 0,
                    limit: 0,
                    remaining: 0,
                    resetTime: 0
                },
                tokenDistribution: {
                    prompt: 0,
                    completion: 0,
                    total: 0
                },
                modelDistribution: {
                    gpt4: 0,
                    gpt35: 0,
                    other: 0
                },
                timestamp: Date.now(),
                component: '',
                category: '',
                version: ''
            }
        }
    };
}

/**
 * Create a message history entry
 */
export function createMessageHistoryEntry(
    message: BaseMessage,
    metadata?: IBaseMessageMetadata
): IMessageHistory['messages'][0] {
    return {
        message,
        timestamp: Date.now(),
        metadata: metadata || {
            timestamp: Date.now(),
            component: 'MessageHistory',
            operation: 'createEntry'
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
