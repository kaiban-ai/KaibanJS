/**
 * @file index.ts
 * @path src/utils/types/messaging/index.ts
 * @description Central export point for messaging-related types and interfaces
 */

// Base types and utilities
export type {
    MessageRole,
    FunctionCall,
    ToolCall,
    AdditionalKwargs,
    BaseMessageMetadataFields,
    ChatMessageMetadataFields,
    LogMessageMetadataFields,
    MessageMetadataFields,
    InternalChatMessage,
    ChatMessage,
    MessageContext
} from './base';

export {
    MessageTypeUtils
} from './base';

// History types
export type {
    MessageHistoryConfig,
    IMessageHistory,
    MessageHistoryState,
    MessageHistoryMetrics
} from './history';

export {
    MessageTypeGuards
} from './history';

// Handler types
export type {
    MessageHandlerConfig,
    MessageStreamConfig,
    MessageValidationConfig,
    MessageBuildParams,
    MessageProcessResult,
    MessageTransformOptions
} from './handlers';