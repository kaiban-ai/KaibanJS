// src/utils/types/messaging/index.ts

// Importing from base.ts
import { 
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
    MessageContext,
    MessageTypeUtils
} from "./base";

// Importing from handlers.ts
import { 
    MessageHandlerConfig,
    MessageStreamConfig,
    MessageValidationConfig,
    MessageBuildParams,
    MessageProcessResult,
    MessageTransformOptions
} from "./handlers";

// Importing from history.ts
import {
    MessageHistoryConfig,
    IMessageHistory,
    MessageHistoryState,
    MessageHistoryMetrics,
    MessageTypeGuards
} from "./history";

// Exporting all modules, types, interfaces, and utility functions
export {
    // Base Types and Interfaces
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
    MessageContext,

    // Handlers Configurations
    MessageHandlerConfig,
    MessageStreamConfig,
    MessageValidationConfig,
    MessageBuildParams,
    MessageProcessResult,
    MessageTransformOptions,

    // History Management
    MessageHistoryConfig,
    IMessageHistory,
    MessageHistoryState,
    MessageHistoryMetrics,

    // Type Guards and Utilities
    MessageTypeUtils,
    MessageTypeGuards
};
