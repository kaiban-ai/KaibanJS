/**
 * @file index.ts
 * @path src/types/task/index.ts
 * @description Central export point for all task-related types
 *
 * @packageDocumentation
 * @module @types/task
 */

// Base task types
export * from './base';

// Handler types
export * from './handlers';

// Tracking types
export * from './tracking';

// Re-export common types from external dependencies
export type { Tool } from "langchain/tools";

// Import required types
import { TaskType } from './base';
import { TASK_STATUS_enum } from '@/utils/core/enums';
import { logger } from '@/utils/core/logger';

/**
 * Utility functions for task management
 */
export const TaskUtils = {
    /**
     * Check if a task is completable
     * @param task Task to check
     * @returns boolean indicating if task can be completed
     */
    isCompletable: (task: TaskType): boolean => {
        return (
            !task.externalValidationRequired ||
            (task.externalValidationRequired && task.status === TASK_STATUS_enum.VALIDATED)
        );
    },

    /**
     * Check if a task is blocked
     * @param task Task to check
     * @returns boolean indicating if task is blocked
     */
    isBlocked: (task: TaskType): boolean => {
        return task.status === TASK_STATUS_enum.BLOCKED;
    },

    /**
     * Check if a task needs validation
     * @param task Task to check
     * @returns boolean indicating if task needs validation
     */
    needsValidation: (task: TaskType): boolean => {
        return (
            task.externalValidationRequired &&
            task.status === TASK_STATUS_enum.AWAITING_VALIDATION
        );
    },

    /**
     * Check if a task has valid metadata
     * @param task Task to check
     * @returns boolean indicating if task has valid metadata
     */
    hasValidMetadata: (task: TaskType): boolean => {
        return (
            typeof task.startTime === 'number' &&
            typeof task.duration === 'number' &&
            typeof task.iterationCount === 'number' &&
            task.llmUsageStats !== undefined
        );
    },

    /**
     * Create error context for a task
     * @param task Task that encountered error
     * @param error Error that occurred
     * @returns Record containing error context
     */
    createErrorContext: (task: TaskType, error: Error): Record<string, unknown> => {
        logger.debug(`Creating error context for task ${task.id}`);
        return {
            taskId: task.id,
            taskStatus: task.status,
            errorMessage: error.message,
            errorStack: error.stack,
            timestamp: Date.now()
        };
    }
};

// Export type utilities for external use
export const TaskTypeGuards = {
    /**
     * Type guard for TaskType
     */
    isTaskType: (value: unknown): value is TaskType => {
        return (
            typeof value === 'object' &&
            value !== null &&
            'id' in value &&
            'status' in value &&
            'title' in value &&
            'description' in value
        );
    }
};