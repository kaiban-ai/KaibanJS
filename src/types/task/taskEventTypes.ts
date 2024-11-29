/**
 * @file taskEventTypes.ts
 * @path src/types/task/taskEventTypes.ts
 * @description Task event type definitions using Langchain's event system
 */

import { 
    MessageContent,
    MessageType,
    BaseMessageFields,
    BaseMessageChunk,
    mergeContent
} from '@langchain/core/messages';
import { ChainValues } from '@langchain/core/utils/types';
import { TASK_EVENT_TYPE_enum, TASK_STATUS_enum } from '../common/commonEnums';
import type { IBaseEvent } from '../common/commonEventTypes';
import type { IBaseHandlerMetadata } from '../common/commonMetadataTypes';
import { 
    IBaseValidationResult,
    createValidationMetadata,
    createValidationResult
} from '../common/commonValidationTypes';
import type { ITaskMetrics, ITaskValidationResult } from './taskHandlerTypes';

// ─── Message Chunk Implementation ────────────────────────────────────────────

export class TaskMessageChunk extends BaseMessageChunk {
    _getType(): MessageType {
        return "task" as MessageType;
    }

    constructor(fields: BaseMessageFields) {
        super(fields);
    }

    concat(chunk: BaseMessageChunk): BaseMessageChunk {
        const content = mergeContent(this.content, chunk.content);
        return new TaskMessageChunk({
            content,
            additional_kwargs: {
                ...this.additional_kwargs,
                ...chunk.additional_kwargs
            },
            name: this.name
        });
    }
}

// ─── Event Metadata ───────────────────────────────────────────────────────────

export interface ITaskEventMetadata extends IBaseHandlerMetadata {
    duration?: number;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    correlationId: string; // This serves as the runId
    causationId?: string; // This serves as the parentRunId
    tags?: string[];
    metadata?: Record<string, unknown>;
}

// ─── Base Event Interface ────────────────────────────────────────────────────

export interface IBaseTaskEvent extends IBaseEvent {
    type: TASK_EVENT_TYPE_enum;
    taskId: string;
    timestamp: number;
    metadata: ITaskEventMetadata;
}

// ─── Event Type Interfaces ────────────────────────────────────────────────────

export interface ITaskCreatedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_CREATED;
    task: {
        title: string;
        description?: string;
        priority?: number;
        inputs?: ChainValues;
    };
}

export interface ITaskUpdatedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_UPDATED;
    previousState: ChainValues;
    newState: ChainValues;
}

export interface ITaskDeletedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_DELETED;
    finalState: ChainValues;
}

export interface ITaskStatusChangedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_STATUS_CHANGED;
    previousStatus: TASK_STATUS_enum;
    newStatus: TASK_STATUS_enum;
    reason: string;
}

export interface ITaskProgressUpdatedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_PROGRESS_UPDATED;
    progress: number;
    previousProgress: number;
    newProgress: number;
}

export interface ITaskCompletedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_COMPLETED;
    outputs: ChainValues;
    duration: number;
}

export interface ITaskFailedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_FAILED;
    error: Error;
    inputs?: ChainValues;
    context?: Record<string, unknown>;
}

export interface ITaskValidationCompletedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_VALIDATION_COMPLETED;
    validationResult: ITaskValidationResult;
}

export interface ITaskFeedbackAddedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_FEEDBACK_ADDED;
    feedback: {
        content: MessageContent;
        rating?: number;
        tags?: string[];
    };
}

export interface ITaskMetricsUpdatedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_METRICS_UPDATED;
    metrics: ITaskMetrics;
    previousMetrics?: ITaskMetrics;
}

export interface ITaskErrorOccurredEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_OCCURRED;
    error: Error;
    inputs?: ChainValues;
    context?: Record<string, unknown>;
}

export interface ITaskErrorHandledEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_HANDLED;
    error: Error;
    resolution: string;
}

export interface ITaskErrorRecoveryStartedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_STARTED;
    error: Error;
    strategy: string;
}

export interface ITaskErrorRecoveryCompletedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_COMPLETED;
    error: Error;
    outputs: ChainValues;
}

export interface ITaskErrorRecoveryFailedEvent extends IBaseTaskEvent {
    type: TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_FAILED;
    originalError: Error;
    recoveryError: Error;
}

// ─── Event Union Type ─────────────────────────────────────────────────────────

export type TaskEvent =
    | ITaskCreatedEvent
    | ITaskUpdatedEvent
    | ITaskDeletedEvent
    | ITaskStatusChangedEvent
    | ITaskProgressUpdatedEvent
    | ITaskCompletedEvent
    | ITaskFailedEvent
    | ITaskValidationCompletedEvent
    | ITaskFeedbackAddedEvent
    | ITaskMetricsUpdatedEvent
    | ITaskErrorOccurredEvent
    | ITaskErrorHandledEvent
    | ITaskErrorRecoveryStartedEvent
    | ITaskErrorRecoveryCompletedEvent
    | ITaskErrorRecoveryFailedEvent;

// ─── Type Guards ────────────────────────────────────────────────────────────

export const isTaskCreatedEvent = (event: TaskEvent): event is ITaskCreatedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_CREATED;
};

export const isTaskUpdatedEvent = (event: TaskEvent): event is ITaskUpdatedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_UPDATED;
};

export const isTaskDeletedEvent = (event: TaskEvent): event is ITaskDeletedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_DELETED;
};

export const isTaskStatusChangedEvent = (event: TaskEvent): event is ITaskStatusChangedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_STATUS_CHANGED;
};

export const isTaskProgressUpdatedEvent = (event: TaskEvent): event is ITaskProgressUpdatedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_PROGRESS_UPDATED;
};

export const isTaskCompletedEvent = (event: TaskEvent): event is ITaskCompletedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_COMPLETED;
};

export const isTaskFailedEvent = (event: TaskEvent): event is ITaskFailedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_FAILED;
};

export const isTaskValidationCompletedEvent = (event: TaskEvent): event is ITaskValidationCompletedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_VALIDATION_COMPLETED;
};

export const isTaskFeedbackAddedEvent = (event: TaskEvent): event is ITaskFeedbackAddedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_FEEDBACK_ADDED;
};

export const isTaskMetricsUpdatedEvent = (event: TaskEvent): event is ITaskMetricsUpdatedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_METRICS_UPDATED;
};

export const isTaskErrorOccurredEvent = (event: TaskEvent): event is ITaskErrorOccurredEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_ERROR_OCCURRED;
};

export const isTaskErrorHandledEvent = (event: TaskEvent): event is ITaskErrorHandledEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_ERROR_HANDLED;
};

export const isTaskErrorRecoveryStartedEvent = (event: TaskEvent): event is ITaskErrorRecoveryStartedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_STARTED;
};

export const isTaskErrorRecoveryCompletedEvent = (event: TaskEvent): event is ITaskErrorRecoveryCompletedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_COMPLETED;
};

export const isTaskErrorRecoveryFailedEvent = (event: TaskEvent): event is ITaskErrorRecoveryFailedEvent => {
    return event.type === TASK_EVENT_TYPE_enum.TASK_ERROR_RECOVERY_FAILED;
};

// ─── Utility Functions ─────────────────────────────────────────────────────────

export function createTaskEventMetadata(
    component: string,
    operation: string,
    runId: string,
    duration?: number,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
): ITaskEventMetadata {
    return {
        timestamp: Date.now(),
        component,
        operation,
        correlationId: runId,
        causationId: parentRunId,
        tags,
        metadata,
        duration,
        previousState,
        newState,
        performance: {
            executionTime: {
                total: duration || 0,
                average: 0,
                min: 0,
                max: 0
            },
            throughput: {
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0
            },
            errorMetrics: {
                totalErrors: 0,
                errorRate: 0
            },
            resourceUtilization: {
                cpuUsage: 0,
                memoryUsage: process.memoryUsage().heapUsed,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        },
        context: {
            source: component,
            target: operation,
            correlationId: runId,
            causationId: parentRunId
        },
        validation: createValidationResult({
            isValid: true,
            errors: [],
            warnings: [],
            metadata: createValidationMetadata({
                component,
                operation,
                validatedFields: []
            })
        })
    };
};
