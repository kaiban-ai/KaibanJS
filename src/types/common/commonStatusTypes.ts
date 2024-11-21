/**
 * @file commonStatus.ts
 * @path KaibanJS/src/types/common/commonStatus.ts
 * @description Core status types and interfaces
 * 
 * @module @types/common
 */

import type { ITaskType } from "../task/taskBaseTypes";
import type { IAgentType } from "../agent/agentBaseTypes";
import type {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from './commonEnums';

// ─── Core Status Types ─────────────────────────────────────────────────────────

export type IStatusEntity = 'agent' | 'message' | 'task' | 'workflow';

export type IStatusType =
    | keyof typeof AGENT_STATUS_enum
    | keyof typeof MESSAGE_STATUS_enum
    | keyof typeof TASK_STATUS_enum
    | keyof typeof WORKFLOW_STATUS_enum;

// ─── Status Update Types ───────────────────────────────────────────────────────

export interface IStatusUpdateParams {
    task: ITaskType;
    agent: IAgentType;
    status: IStatusType;
    metadata?: Record<string, unknown>;
    description?: string;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export type IStatusErrorType =
    | 'INVALID_TRANSITION'
    | 'VALIDATION_FAILED'
    | 'TIMEOUT'
    | 'CONCURRENT_TRANSITION'
    | 'INVALID_STATE';

export interface IStatusError {
    type: IStatusErrorType;
    message: string;
    context?: IStatusTransitionContext;
    metadata?: Record<string, unknown>;
}

// ─── Status Transition Types ─────────────────────────────────────────────────

export interface IStatusTransition {
    currentStatus: IStatusType;
    targetStatus: IStatusType;
    metadata?: Record<string, unknown>;
}

export interface IStatusTransitionContext extends IStatusTransition {
    entity: IStatusEntity;
    entityId: string;
    // Include task and agent instances when they're relevant to the entity
    task?: ITaskType;
    agent?: IAgentType;
}

export interface IStatusTransitionRule {
    from: IStatusType | IStatusType[];
    to: IStatusType | IStatusType[];
    validation?: (context: IStatusTransitionContext) => boolean | Promise<boolean>;
    sideEffects?: (context: IStatusTransitionContext) => Promise<void>;
}

// ─── Status Change Event Types ───────────────────────────────────────────────

export interface IStatusChangeEvent {
  entity: IStatusEntity;
  entityId: string;
  from: IStatusType;
  to: IStatusType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type IStatusChangeCallback = (event: IStatusChangeEvent) => void;

// ─── Status Manager Config Type ──────────────────────────────────────────────

export interface IStatusManagerConfig {
  entity: IStatusEntity;
  initialStatus?: IStatusType;
  transitions: IStatusTransitionRule[];
  onChange?: IStatusChangeCallback;
  enableHistory?: boolean;
  maxHistoryLength?: number;
  validationTimeout?: number;
  allowConcurrentTransitions?: boolean;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isStatusEntity(value: unknown): value is IStatusEntity {
    return typeof value === 'string' && ['agent', 'message', 'task', 'workflow'].includes(value);
}

export function isStatusTransition(value: unknown): value is IStatusTransition {
    if (!value || typeof value !== 'object') return false;
    const transition = value as Partial<IStatusTransition>;
    return (
        typeof transition.currentStatus === 'string' &&
        typeof transition.targetStatus === 'string'
    );
}

export function isStatusTransitionContext(value: unknown): value is IStatusTransitionContext {
    if (!isStatusTransition(value)) return false;
    const context = value as Partial<IStatusTransitionContext>;
    return (
        isStatusEntity(context.entity as string) &&
        typeof context.entityId === 'string'
    );
}
