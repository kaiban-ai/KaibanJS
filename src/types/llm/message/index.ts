/**
 * @file index.ts
 * @path KaibanJS/src/types/llm/message/index.ts
 * @description Message type exports for LLM domain
 * 
 * @module @types/llm/message
 */

// Core Message Types from Langchain
export {
    BaseMessage,
    SystemMessage,
    HumanMessage,
    AIMessage,
    AIMessageChunk
} from '@langchain/core/messages';

// Custom Message Types
export type {
    IBaseMessageMetadataFields,
    IBaseMessageMetadata,
    IMessageHistoryEntry,
    IMessageHistory,
    IMessageValidationResult,
    IStandardCostDetails
} from './messagingBaseTypes';

// Error Types
export type {
    IMessageErrorDetails,
    IMessageErrorContext,
    IMessageErrorResourceMetrics,
    IMessageErrorFactory,
    IMessageErrorHandler,
    IMessageErrorMetrics,
    IMessageErrorRecoveryStrategy
} from './messageErrorTypes';
export { MessageErrorFactory } from './messageErrorTypes';

// Type Guards
export { MessageTypeGuards } from './messagingBaseTypes';

// Re-export commonly used types from other modules
export type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../metrics/base/performanceMetrics';
export type { IRateLimitMetrics } from '../../metrics/base/usageMetrics';
export { MESSAGE_STATUS_enum, ERROR_TYPE_enum } from '../../common/enumTypes';
