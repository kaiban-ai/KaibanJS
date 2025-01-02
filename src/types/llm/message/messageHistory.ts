/**
 * @file messageHistory.ts
 * @path src/types/llm/message/messageHistory.ts
 * @description Type definitions for LLM message history
 */

import { BaseMessage } from '@langchain/core/messages';
import { IMessageHistory, IMessageHistoryEntry, IBaseMessageMetadata } from './messagingBaseTypes';

export type { IMessageHistory, IMessageHistoryEntry, IBaseMessageMetadata };

export interface IMessageHistoryManager {
    getMessages(): BaseMessage[];
    addMessage(message: BaseMessage, metadata?: IBaseMessageMetadata): void;
    clear(): void;
    getHistory(): IMessageHistory;
    setHistory(history: IMessageHistory): void;
}
