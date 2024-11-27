/**
 * @file commonStatus.ts
 * @description Core status types and interfaces
 */

import type { ITaskType } from "../task/taskBaseTypes";
import type { IAgentType } from "../agent/agentBaseTypes";
import type { IStatusChangeMetadata } from "./commonMetadataTypes";
import type { IPerformanceMetrics, IResourceMetrics } from "./commonMetricTypes";
import type { IBaseError } from "./commonErrorTypes";
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
    metadata?: IStatusChangeMetadata;
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
    metadata?: IStatusChangeMetadata;
}

// ─── Error Context Types ─────────────────────────────────────────────────────

export interface IErrorContext {
    error: IBaseError;
    recoverable: boolean;
    retryCount: number;
    lastRetryTimestamp?: number;
    failureReason?: string;
    recommendedAction?: string;
    diagnostics?: Record<string, unknown>;
}

// ─── Status Transition Types ─────────────────────────────────────────────────

export interface IStatusTransition {
    currentStatus: IStatusType;
    targetStatus: IStatusType;
    metadata?: IStatusChangeMetadata;
}

export interface IStatusTransitionContext extends IStatusTransition {
    entity: IStatusEntity;
    entityId: string;
    // Operation metadata
    operation: string;
    phase: 'pre-execution' | 'execution' | 'post-execution' | 'error';
    startTime: number;
    duration?: number;
    
    // Performance tracking
    resourceMetrics: IResourceMetrics;
    performanceMetrics: IPerformanceMetrics;
    
    // Error handling
    errorContext?: IErrorContext;
    
    // Entity references
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
    metadata: IStatusChangeMetadata;
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

export function isErrorContext(value: unknown): value is IErrorContext {
    if (!value || typeof value !== 'object') return false;
    const context = value as Partial<IErrorContext>;
    return (
        typeof context.error === 'object' &&
        context.error !== null &&
        typeof context.recoverable === 'boolean' &&
        typeof context.retryCount === 'number'
    );
}

export function isStatusTransitionContext(value: unknown): value is IStatusTransitionContext {
    if (!isStatusTransition(value)) return false;
    const context = value as Partial<IStatusTransitionContext>;
    return (
        isStatusEntity(context.entity as string) &&
        typeof context.entityId === 'string' &&
        typeof context.operation === 'string' &&
        ['pre-execution', 'execution', 'post-execution', 'error'].includes(context.phase as string) &&
        typeof context.startTime === 'number' &&
        (context.duration === undefined || typeof context.duration === 'number') &&
        typeof context.resourceMetrics === 'object' &&
        context.resourceMetrics !== null &&
        typeof context.performanceMetrics === 'object' &&
        context.performanceMetrics !== null &&
        (context.errorContext === undefined || isErrorContext(context.errorContext))
    );
}

export function isStatusChangeEvent(value: unknown): value is IStatusChangeEvent {
    if (!value || typeof value !== 'object') return false;
    const event = value as Partial<IStatusChangeEvent>;
    return (
        isStatusEntity(event.entity as string) &&
        typeof event.entityId === 'string' &&
        typeof event.from === 'string' &&
        typeof event.to === 'string' &&
        typeof event.timestamp === 'number' &&
        typeof event.metadata === 'object' &&
        event.metadata !== null
    );
}
