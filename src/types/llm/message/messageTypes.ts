// Migrated to Langchain's BaseMessage
// See docs/LANGCHAIN_MIGRATION_GUIDE.md for migration details
import { BaseMessage } from '@langchain/core/messages';
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
export type { BaseMessage, SystemMessage, HumanMessage, AIMessage };

// Re-export base types needed for backward compatibility during migration
import type { IBaseMessageMetadata, IBaseMessage } from './messagingBaseTypes';
export type { IBaseMessageMetadata, IBaseMessage };

// Mark as deprecated to encourage migration
/** @deprecated Use Langchain's BaseMessage instead */
export interface IMessage extends IBaseMessage {
    metadata?: IBaseMessageMetadata;
}
