/**
 * @file taskBaseTypes.ts
 * @path KaibanJS/src/types/task/taskBaseTypes.ts
 * @description Core task interface definitions and base types
 *
 * @module types/task
 */

import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITeamStoreMethods } from '../team/teamBaseTypes';
import type { TASK_STATUS_enum, FEEDBACK_STATUS_enum } from '../common/commonEnums';
import type { ITaskMetrics, ITaskHandlerResult, ITaskHandlerMetadata } from './taskHandlerTypes';

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
}

/**
 * Task progress tracking
 */
export interface ITaskProgress {
    status: keyof typeof TASK_STATUS_enum;
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
        from: keyof typeof TASK_STATUS_enum;
        to: keyof typeof TASK_STATUS_enum;
    };
    agent?: string;
    details?: Record<string, unknown>;
}

/**
 * Task feedback
 */
export interface ITaskFeedback {
    id: string;
    content: string;
    status: keyof typeof FEEDBACK_STATUS_enum;
    timestamp: Date;
    userId: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    assignedTo?: string;
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
    status: keyof typeof TASK_STATUS_enum;
    
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
            typeof task.stepId === 'string'
        );
    },

    /**
     * Check if value is TaskFeedback
     */
    isTaskFeedback: (value: unknown): value is ITaskFeedback => {
        if (typeof value !== 'object' || value === null) return false;
        const feedback = value as Partial<ITaskFeedback>;
        return (
            typeof feedback.id === 'string' &&
            typeof feedback.content === 'string' &&
            'status' in feedback &&
            feedback.timestamp instanceof Date &&
            typeof feedback.userId === 'string'
        );
    }
};
