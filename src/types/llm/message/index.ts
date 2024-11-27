/**
 * @file index.ts
 * @path KaibanJS/src/types/llm/message/index.ts
 * @description Message-related type definitions and exports for LLM domain
 * 
 * @module @types/llm/message
 */

// Core Message Types
export type { MessageRole } from './messageTypes';
export type {
  IFunctionCall,
  IToolCall,
  IAdditionalKwargs,
  IMessageMetadata,
  IMessageContent,
  IMessageContext,
  IInternalChatMessage,
  IChatMessage,
  IMessageConfig,
  IMessageRules,
  IMessageResult
} from './messageTypes';

// Message Handler Types
export type {
  IMessageHandlerConfig,
  IMessageStreamConfig,
  IMessageValidationConfig,
  IMessageBuildParams,
  IMessageProcessResult,
  IMessageTransformOptions
} from './messagingHandlersTypes';

// Message History Types
export type {
  IMessageHistoryConfig,
  IMessageHistory,
  IMessageHistoryState,
  IMessageHistoryMetrics
} from './messagingHistoryTypes';

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

// Metric Types
export type {
  IMessageResourceMetrics,
  IMessagePerformanceMetrics,
  IMessageUsageMetrics,
  IMessageMetrics
} from './messageMetricTypes';
export { DefaultMessageMetrics } from './messageMetricTypes';

// Type Guards
export {
  MessageTypeGuards,
  LangChainMessageTypeGuards,
  MessageMetricTypeGuards,
  MessageResultTypeGuards
} from './messageTypeGuards';

// Re-export commonly used types from other modules
export type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../metrics/base/performanceMetrics';
export type { IRateLimitMetrics } from '../../metrics/base/usageMetrics';
export { MESSAGE_STATUS_enum, ERROR_TYPE_enum } from '../../common/commonEnums';
