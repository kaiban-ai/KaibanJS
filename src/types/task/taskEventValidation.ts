/**
 * @file taskEventValidation.ts
 * @path src/types/task/taskEventValidation.ts
 * @description Task event validation type definitions
 *
 * @module @types/task
 */

import { 
    type IValidationResult,
    type ValidationErrorType,
    createValidationMetadata,
    createValidationResult,
    createValidationError
} from '../common/commonValidationTypes';
import { TASK_EVENT_TYPE_enum } from '../common/commonEnums';
import type { TaskEvent } from './taskEventTypes';

// ─── Event Validation Result ────────────────────────────────────────────────────

export const createTaskValidationResult = (params: {
    isValid: boolean;
    errors: ValidationErrorType[];
    warnings?: ValidationErrorType[];
    validatorName: string;
    duration?: number;
    component?: string;
    validatedFields?: string[];
}): IValidationResult => {
    return createValidationResult({
        isValid: params.isValid,
        errors: params.errors,
        warnings: params.warnings || [],
        metadata: createValidationMetadata({
            component: params.component || 'task',
            validatorName: params.validatorName,
            validationDuration: params.duration,
            validatedFields: params.validatedFields || ['task']
        })
    });
};

// ─── Event Validation Functions ────────────────────────────────────────────────

export const validateTaskEvent = (params: {
    event: TaskEvent;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    
    if (!params.event.type || !Object.values(TASK_EVENT_TYPE_enum).includes(params.event.type)) {
        errors.push(createValidationError({
            code: 'INVALID_EVENT_TYPE',
            message: 'Invalid task event type'
        }));
    }

    if (!params.event.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.event',
        validatedFields: ['type', 'taskId']
    });
};

export const validateTaskCreated = (params: {
    taskId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.created',
        validatedFields: ['taskId']
    });
};

export const validateTaskUpdated = (params: {
    taskId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.updated',
        validatedFields: ['taskId']
    });
};

export const validateTaskDeleted = (params: {
    taskId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.deleted',
        validatedFields: ['taskId']
    });
};

export const validateTaskStatusChanged = (params: {
    taskId: string;
    status: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }
    if (!params.status) {
        errors.push(createValidationError({
            code: 'INVALID_STATUS',
            message: 'Status is required'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.status',
        validatedFields: ['taskId', 'status']
    });
};

export const validateTaskProgressUpdated = (params: {
    taskId: string;
    progress: number;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }
    if (typeof params.progress !== 'number' || params.progress < 0 || params.progress > 100) {
        errors.push(createValidationError({
            code: 'INVALID_PROGRESS',
            message: 'Progress must be a number between 0 and 100'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.progress',
        validatedFields: ['taskId', 'progress']
    });
};

export const validateTaskCompleted = (params: {
    taskId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.completed',
        validatedFields: ['taskId']
    });
};

export const validateTaskFailed = (params: {
    taskId: string;
    error: Error;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.taskId) {
        errors.push(createValidationError({
            code: 'INVALID_TASK_ID',
            message: 'Task ID is required'
        }));
    }
    if (!params.error) {
        errors.push(createValidationError({
            code: 'INVALID_ERROR',
            message: 'Error is required'
        }));
    }

    return createTaskValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'task.failed',
        validatedFields: ['taskId', 'error']
    });
};
