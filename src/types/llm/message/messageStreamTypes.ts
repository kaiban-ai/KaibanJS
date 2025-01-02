/**
 * @file messageStreamTypes.ts
 * @path src/types/llm/message/messageStreamTypes.ts
 * @description Extended message types for LLM streaming interactions
 */

import { BaseMessage, AIMessage, MessageType } from '@langchain/core/messages';

/**
 * Extended AIMessageChunk that includes required BaseMessage methods
 */
export class ExtendedAIMessageChunk extends AIMessage {
    constructor(fields: { content: string; additional_kwargs?: Record<string, unknown> }) {
        super(fields);
    }

    _getType(): MessageType {
        return 'ai';
    }

    concat(chunk: ExtendedAIMessageChunk): ExtendedAIMessageChunk {
        return new ExtendedAIMessageChunk({
            content: String(this.content) + String(chunk.content),
            additional_kwargs: {
                ...this.additional_kwargs,
                ...chunk.additional_kwargs,
            },
        });
    }
}

/**
 * Type guard for ExtendedAIMessageChunk
 */
export function isExtendedAIMessageChunk(message: BaseMessage): message is ExtendedAIMessageChunk {
    return message instanceof ExtendedAIMessageChunk;
}
