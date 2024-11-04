/**
 * @file index.ts
 * @path src/utils/managers/index.ts
 * @description Manager implementations exports
 * 
 * This file exports manager classes used for handling various stateful operations
 * across the application, such as message history and status management.
 * 
 * @packageDocumentation
 * @module @managers
 */

/**
 * Export MessageHistoryManager class and its types
 */
export { default as MessageHistoryManager } from './messageHistoryManager';

/**
 * Export types from message history
 */
export type {
    MessageHistoryConfig,
    MessageHistoryState,
    MessageHistoryMetrics,
    IMessageHistory
} from '@/utils/types/messaging';

/**
 * Export StatusManager when available
 * @todo Implement StatusManager for handling agent and task status transitions
 */
// export { StatusManager } from './statusManager';
// Note: StatusManager will be implemented in a future update