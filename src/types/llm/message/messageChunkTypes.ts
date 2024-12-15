/**
 * @file messageChunkTypes.ts
 * @path src/types/llm/message/messageChunkTypes.ts
 * @description DEPRECATED: This file is deprecated and will be removed.
 * 
 * Message chunk types are now handled by Langchain's AIMessageChunk:
 * - Use AIMessageChunk from @langchain/core/messages
 * - Use ChatGenerationChunk from @langchain/core/outputs
 * 
 * @deprecated Use Langchain's message types instead:
 * ```typescript
 * import { AIMessageChunk } from '@langchain/core/messages';
 * import { ChatGenerationChunk } from '@langchain/core/outputs';
 * ```
 */

import { AIMessageChunk } from '@langchain/core/messages';
export { AIMessageChunk };

/**
 * @deprecated Use AIMessageChunk from @langchain/core/messages
 */
export const MessageChunkTypeGuards = {
    /**
     * @deprecated Use isAIMessageChunk from @langchain/core/messages
     */
    isAIMessageChunk: (value: unknown): value is AIMessageChunk => {
        throw new Error(
            'MessageChunkTypeGuards is deprecated. Use isAIMessageChunk from @langchain/core/messages'
        );
    }
};
