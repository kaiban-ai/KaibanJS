/**
 * @file status.ts
 * @path KaibanJS/src/utils/types/common/status.ts
 * @description Core status types and interfaces
 */

import type { TaskType } from "../task/base";
import type { AgentType } from "../agent/base";
import type {
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from './enums';

// ─── Core Status Types ─────────────────────────────────────────────────────────

export type StatusEntity = 'agent' | 'message' | 'task' | 'workflow';

export type StatusType =
    | keyof typeof AGENT_STATUS_enum
    | keyof typeof MESSAGE_STATUS_enum
    | keyof typeof TASK_STATUS_enum
    | keyof typeof WORKFLOW_STATUS_enum;

// ─── Status Update Types ───────────────────────────────────────────────────────

export interface StatusUpdateParams {
    task: TaskType;
    agent: AgentType;
    status: StatusType;
    metadata?: Record<string, unknown>;
    description?: string;
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export type StatusErrorType =
    | 'INVALID_TRANSITION'
    | 'VALIDATION_FAILED'
    | 'TIMEOUT'
    | 'CONCURRENT_TRANSITION'
    | 'INVALID_STATE';

export interface StatusError {
    type: StatusErrorType;
    message: string;
    context?: StatusTransitionContext;
    metadata?: Record<string, unknown>;
}

export interface StatusValidationResult {
    isValid: boolean;
    errors?: string[];
    context?: Record<string, unknown>;
}

// ─── Status Transition Types ─────────────────────────────────────────────────

export interface StatusTransition {
    currentStatus: StatusType;
    targetStatus: StatusType;
    metadata?: Record<string, unknown>;
}

export interface StatusTransitionContext extends StatusTransition {
    entity: StatusEntity;
    entityId: string;
    // Include task and agent instances when they're relevant to the entity
    task?: TaskType;
    agent?: AgentType;
}

export interface StatusTransitionRule {
    from: StatusType | StatusType[];
    to: StatusType | StatusType[];
    validation?: (context: StatusTransitionContext) => boolean | Promise<boolean>;
    sideEffects?: (context: StatusTransitionContext) => Promise<void>;
}

// ─── Status Change Event Types ───────────────────────────────────────────────

export interface StatusChangeEvent {
  entity: StatusEntity;
  entityId: string;
  from: StatusType;
  to: StatusType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type StatusChangeCallback = (event: StatusChangeEvent) => void;

// ─── Status Manager Config Type ──────────────────────────────────────────────

export interface StatusManagerConfig {
  entity: StatusEntity;
  initialStatus?: StatusType;
  transitions: StatusTransitionRule[];
  onChange?: StatusChangeCallback;
  enableHistory?: boolean;
  maxHistoryLength?: number;
  validationTimeout?: number;
  allowConcurrentTransitions?: boolean;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isStatusEntity(value: unknown): value is StatusEntity {
    return typeof value === 'string' && ['agent', 'message', 'task', 'workflow'].includes(value);
}

export function isStatusTransition(value: unknown): value is StatusTransition {
    if (!value || typeof value !== 'object') return false;
    const transition = value as Partial<StatusTransition>;
    return (
        typeof transition.currentStatus === 'string' &&
        typeof transition.targetStatus === 'string'
    );
}

export function isStatusTransitionContext(value: unknown): value is StatusTransitionContext {
    if (!isStatusTransition(value)) return false;
    const context = value as Partial<StatusTransitionContext>;
    return (
        isStatusEntity(context.entity as string) &&
        typeof context.entityId === 'string'
    );
}
