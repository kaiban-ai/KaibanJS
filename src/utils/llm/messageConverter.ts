/**
 * @file messageConverter.ts
 * @path src/utils/llm/messageConverter.ts
 * @description Utility functions for converting between different message formats
 */

import {
    BaseMessage,
    HumanMessage,
    SystemMessage,
    AIMessage,
    FunctionMessage,
    BaseMessageLike,
    MessageContentComplex
} from '@langchain/core/messages';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';

/**
 * Convert message content to string
 */
function contentToString(content: string | MessageContentComplex): string {
    if (typeof content === 'string') return content;
    if ('text' in content) return content.text;
    return JSON.stringify(content);
}

/**
 * Convert a single message to BaseMessage
 */
function convertSingleMessage(msg: BaseMessageLike): BaseMessage {
    if (msg instanceof BaseMessage) return msg;

    if (typeof msg === 'string') {
        return new HumanMessage({ content: msg });
    }

    if (typeof msg === 'object' && msg !== null) {
        const content = 'content' in msg ? contentToString(msg.content) : String(msg);
        const type = 'type' in msg ? msg.type : 'user';
        const name = 'name' in msg ? msg.name : undefined;

        switch (type) {
            case 'system':
                return new SystemMessage({ content });
            case 'assistant':
                return new AIMessage({ content });
            case 'function':
                return new FunctionMessage({
                    content,
                    name: name || 'function'
                });
            case 'user':
            default:
                return new HumanMessage({ content });
        }
    }

    return new HumanMessage({ content: String(msg) });
}

/**
 * Convert input to BaseLanguageModelInput
 */
export function convertMessagesToInput(messages: BaseMessageLike[] | BaseMessageLike[][] | string): BaseLanguageModelInput {
    if (typeof messages === 'string') {
        return messages;
    }

    if (!Array.isArray(messages)) {
        throw new Error('Messages must be a string or array');
    }

    // Handle single array of messages
    if (!Array.isArray(messages[0])) {
        return (messages as BaseMessageLike[]).map(msg => convertSingleMessage(msg));
    }

    // Handle array of message arrays
    return (messages as BaseMessageLike[][]).map(msgArray => 
        msgArray.map(msg => convertSingleMessage(msg))
    ).flat();
}

/**
 * Convert BaseMessage array to BaseLanguageModelInput
 */
export function convertToLanguageModelInput(messages: BaseMessage[]): BaseLanguageModelInput {
    return messages;
}

/**
 * Convert BaseLanguageModelInput to BaseMessage array
 */
export function convertToBaseMessages(input: BaseLanguageModelInput): BaseMessage[] {
    if (typeof input === 'string') {
        return [new HumanMessage({ content: input })];
    }

    if (!Array.isArray(input)) {
        throw new Error('Input must be a string or array');
    }

    // Handle single array of messages
    if (!Array.isArray(input[0])) {
        return (input as BaseMessageLike[]).map(msg => convertSingleMessage(msg));
    }

    // Handle array of message arrays
    return (input as BaseMessageLike[][]).flat().map(msg => convertSingleMessage(msg));
}
