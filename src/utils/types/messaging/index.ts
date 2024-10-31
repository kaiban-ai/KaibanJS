/**
 * @file index.ts
 * @path src/types/messaging/index.ts
 * @description Central export point for all messaging-related types
 *
 * @packageDocumentation
 * @module @types/messaging
 */

// Base message types
export * from './base';

// Message handler types
export * from './handlers';

// Message history types
export * from './history';

// Re-export common types from external dependencies
export type { 
    BaseMessage,
    SystemMessage,
    HumanMessage,
    AIMessage,
    FunctionMessage,
    ChatMessage as LangChainChatMessage
} from "@langchain/core/messages";