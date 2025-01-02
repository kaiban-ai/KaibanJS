/**
* @file index.ts
* @path src/types/llm/message/index.ts
* @description Message type exports for LLM domain
*
* @module @types/llm/message
*/

// Core Message Types from Langchain
export type {
    BaseMessage,
    SystemMessage,
    HumanMessage,
    AIMessage,
    FunctionMessage,
    AIMessageChunk,
    BaseMessageChunk
} from '@langchain/core/messages';

// Type Guards from Langchain
export {
    isAIMessage,
    isHumanMessage,
    isSystemMessage,
    isFunctionMessage,
    isBaseMessage,
    isAIMessageChunk
} from '@langchain/core/messages';

// Error Types
export type {
    IMessageErrorDetails,
    IMessageErrorContext,
    IMessageErrorFactory,
    IMessageErrorHandler,
    IMessageErrorMetrics
} from './messageErrorTypes';
export { MessageErrorFactory } from './messageErrorTypes';

// Base Message Types
export type {
    IBaseMessageMetadata,
    IBaseMessageMetadataFields,
    IMessageHistory,
    IMessageHistoryEntry
} from './messagingBaseTypes';
export { MessageTypeGuards } from './messagingBaseTypes';

// Metric Types
/** @deprecated Use BaseMetricsManager for resource metrics */
export type {
    IMessagePerformanceMetrics,
    IMessageUsageMetrics
} from './messageMetricTypes';
export { MessageMetricTypeGuards } from './messageMetricTypes';

// Handler Types
export type {
    IMessageHandlerConfig,
    IMessageStreamConfig,
    IMessageValidationConfig,
    IMessageBuildParams,
    IMessageProcessResult,
    IMessageTransformOptions,
    IMessageResult
} from './messagingHandlersTypes';
export { MessageHandlerTypeGuards } from './messagingHandlersTypes';

// Validation Types
export type {
    IMessageContentValidator,
    IMessageMetadataValidator,
    IMessageStateValidator,
    IMessageValidator,
    IMessageValidationRules,
    IMessageValidationContext,
    IMessageValidationResult
} from './messageValidationTypes';

// Note: Enums are imported from common/enumTypes:
// import { LLM_PROVIDER_enum, MESSAGE_STATUS_enum } from '../../common/enumTypes';
