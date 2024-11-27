/**
* @file commonEventTypes.ts
* @path src/types/common/commonEventTypes.ts
* @description Common event type definitions to replace store dependencies
*
* @module @types/common
*/

import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum } from './commonEnums';
import type { IBaseHandlerMetadata } from './commonMetadataTypes';
import type { IValidationResult } from './commonValidationTypes';

// Re-export types for use in event-related code
export { IBaseHandlerMetadata, IValidationResult };

// ─── Base Event Types ──────────────────────────────────────────────────────────

/**
 * Base event interface that all domain events must extend
 */
export interface IBaseEvent {
  id: string;
  timestamp: number;
  type: string;
  metadata: IBaseHandlerMetadata;
}

/**
 * Base state change event interface
 */
export interface IStateChangeEvent<T> extends IBaseEvent {
  previousState: T;
  newState: T;
  validationResult: IValidationResult;
}

/**
 * Base status change event interface
 */
export interface IStatusChangeEvent extends IBaseEvent {
  entityId: string;
  entityType: 'workflow' | 'task' | 'agent';
  previousStatus: WORKFLOW_STATUS_enum | TASK_STATUS_enum | AGENT_STATUS_enum;
  newStatus: WORKFLOW_STATUS_enum | TASK_STATUS_enum | AGENT_STATUS_enum;
  validationResult: IValidationResult;
}

// ─── Event Handler Types ───────────────────────────────────────────────────────

/**
 * Base event handler interface
 */
export interface IEventHandler<T extends IBaseEvent> {
  handle(event: T): Promise<void>;
  validate(event: T): Promise<IValidationResult>;
}

/**
 * Base event emitter interface
 */
export interface IEventEmitter {
  emit<T extends IBaseEvent>(event: T): Promise<void>;
  on<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void;
  off<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void;
}

// ─── Event Bus Types ─────────────────────────────────────────────────────────

/**
 * Event subscription interface
 */
export interface IEventSubscription {
  unsubscribe(): void;
}

/**
 * Event bus interface
 */
export interface IEventBus {
  publish<T extends IBaseEvent>(event: T): Promise<void>;
  subscribe<T extends IBaseEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): IEventSubscription;
}

// ─── Event Registry Types ─────────────────────────────────────────────────────

/**
 * Event registry interface for managing event handlers
 */
export interface IEventRegistry {
  registerHandler<T extends IBaseEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void;
  unregisterHandler<T extends IBaseEvent>(
    eventType: string,
    handler: IEventHandler<T>
  ): void;
  getHandlers<T extends IBaseEvent>(eventType: string): IEventHandler<T>[];
}

// ─── Event Validation Types ────────────────────────────────────────────────────

/**
 * Event validation metadata
 */
export interface IEventValidationMetadata {
  timestamp: number;
  duration: number;
  validatorName: string;
}

/**
 * Event validation result
 */
export interface IEventValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: IEventValidationMetadata;
}
