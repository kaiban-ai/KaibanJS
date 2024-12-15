/**
 * @file taskBaseTypes.ts
 * @path KaibanJS/src/types/task/taskBaseTypes.ts
 * @description Core task interface definitions and base types
 *
 * @module types/task
 */

import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITeamStoreMethods } from '../team/teamBaseTypes';
import { TASK_STATUS_enum, BATCH_PRIORITY_enum } from '../common/enumTypes';
import type { ITaskMetrics, ITaskHandlerResult, ITaskHandlerMetadata } from './taskHandlerTypes';
import type { ITaskFeedback } from './taskFeedbackTypes';

/**
 * Task creation parameters
 */
export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: string;
    agent: IAgentType;
    isDeliverable?: boolean;
    externalValidationRequired?: boolean;
    priority?: BATCH_PRIORITY_enum; // Optional priority, defaults to MEDIUM
}

/**
 * Task progress tracking
 */
export interface ITaskProgress {
    status: TASK_STATUS_enum;
    progress: number;
    timeElapsed: number;
    estimatedTimeRemaining?: number;
    currentStep?: string;
    blockingReason?: string;
}

/**
 * Task history entry
 */
export interface ITaskHistoryEntry {
    timestamp: number;
    eventType: string;
    statusChange?: {
        from: TASK_STATUS_enum;
        to: TASK_STATUS_enum;
    };
    agent?: string;
    details?: Record<string, unknown>;
}

/**
 * Core task interface
 */
export interface ITaskType {
    // Core properties
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IAgentType;
    status: TASK_STATUS_enum;
    priority: BATCH_PRIORITY_enum; // Required priority for task scheduling
    
    // Workflow tracking
    stepId: string;
    
    // Configuration
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, unknown>;
    
    // Results and state
    result?: ITaskHandlerResult;
    error?: Error;
    metadata?: ITaskHandlerMetadata;
    
    // Tracking and metrics
    metrics: ITaskMetrics;
    progress: ITaskProgress;
    history: ITaskHistoryEntry[];
    
    // Feedback
    feedback: ITaskFeedback[];
    
    // Methods
    setStore: (store: ITeamStoreMethods) => void;
    execute: (data: unknown) => Promise<ITaskHandlerResult>;
}

/**
 * Type guards
 */
export const TaskTypeGuards = {
    /**
     * Check if value is TaskType
     */
    isTaskType: (value: unknown): value is ITaskType => {
        if (typeof value !== 'object' || value === null) return false;
        const task = value as Partial<ITaskType>;
        return (
            typeof task.id === 'string' &&
            typeof task.title === 'string' &&
            typeof task.description === 'string' &&
            typeof task.expectedOutput === 'string' &&
            Array.isArray(task.feedback) &&
            task.agent !== undefined &&
            'status' in task &&
            typeof task.stepId === 'string' &&
            'priority' in task && // Added priority check
            Object.values(BATCH_PRIORITY_enum).includes(task.priority as BATCH_PRIORITY_enum)
        );
    }
};
