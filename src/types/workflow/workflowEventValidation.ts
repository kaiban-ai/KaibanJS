/**
 * @file workflowEventValidation.ts
 * @path src/types/workflow/workflowEventValidation.ts
 * @description Workflow event validation type definitions
 *
 * @module @types/workflow
 */

import { 
    createValidationMetadata, 
    createValidationResult, 
    toValidationError,
    type IValidationResult,
    type ValidationErrorType
} from '../common/validationTypes';
import type { 
    IWorkflowStepEvent,
    IWorkflowControlEvent,
    IWorkflowAgentEvent,
    IWorkflowTaskEvent,
    WorkflowEventType
} from './workflowEventTypes';

// ─── Validation Results ────────────────────────────────────────────────────────

export const createWorkflowValidationResult = (params: {
    isValid: boolean;
    errors: ValidationErrorType[];
    warnings?: ValidationErrorType[];
    validatorName: string;
    duration?: number;
    component?: string;
}): IValidationResult => {
    return createValidationResult({
        isValid: params.isValid,
        errors: params.errors,
        warnings: params.warnings || [],
        metadata: createValidationMetadata({
            component: params.component || 'workflow',
            validatedFields: ['workflow'],
            operation: params.validatorName,
            details: {
                duration: params.duration
            }
        })
    });
};

// ─── Type Guards ────────────────────────────────────────────────────────────

const isWorkflowStepEvent = (event: WorkflowEventType): event is IWorkflowStepEvent => {
    if (!('type' in event)) return false;
    const stepTypes = ['start', 'complete', 'fail', 'skip'] as const;
    return stepTypes.includes(event.type as typeof stepTypes[number]) && 'stepId' in event;
};

const isWorkflowControlEvent = (event: WorkflowEventType): event is IWorkflowControlEvent => {
    if (!('type' in event)) return false;
    const controlTypes = [
        'start', 'pause', 'resume', 'stop', 'reset',
        'workflow_control', 'workflow_error', 'workflow_recovery'
    ] as const;
    return controlTypes.includes(event.type as typeof controlTypes[number]);
};

const isWorkflowAgentEvent = (event: WorkflowEventType): event is IWorkflowAgentEvent => {
    if (!('type' in event)) return false;
    const agentTypes = ['assign', 'unassign'] as const;
    return agentTypes.includes(event.type as typeof agentTypes[number]) && 'stepId' in event;
};

const isWorkflowTaskEvent = (event: WorkflowEventType): event is IWorkflowTaskEvent => {
    if (!('type' in event)) return false;
    const taskTypes = ['add', 'remove', 'update'] as const;
    return taskTypes.includes(event.type as typeof taskTypes[number]) && 'task' in event;
};

// ─── Generic Event Validation ────────────────────────────────────────────────

export const validateWorkflowEvent = (params: {
    event: WorkflowEventType;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const { event, validatorName, duration } = params;
    const errors: ValidationErrorType[] = [];
    
    if (!event.workflowId) {
        errors.push(toValidationError('Workflow ID is required'));
        return createWorkflowValidationResult({
            isValid: false,
            errors,
            validatorName,
            duration,
            component: 'workflow.event'
        });
    }

    if (!('type' in event)) {
        errors.push(toValidationError('Event type is required'));
        return createWorkflowValidationResult({
            isValid: false,
            errors,
            validatorName,
            duration,
            component: 'workflow.event'
        });
    }

    if (isWorkflowStepEvent(event)) {
        return validateWorkflowStepEvent({ event, validatorName, duration });
    }

    if (isWorkflowControlEvent(event)) {
        return validateWorkflowControlEvent({ event, validatorName, duration });
    }

    if (isWorkflowAgentEvent(event)) {
        return validateWorkflowAgentEvent({ event, validatorName, duration });
    }

    if (isWorkflowTaskEvent(event)) {
        return validateWorkflowTaskEvent({ event, validatorName, duration });
    }

    errors.push(toValidationError('Invalid workflow event type'));
    return createWorkflowValidationResult({
        isValid: false,
        errors,
        validatorName,
        duration,
        component: 'workflow.event'
    });
};

// ─── Event-Specific Validation ────────────────────────────────────────────────

const validateWorkflowStepEvent = (params: {
    event: IWorkflowStepEvent;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];

    if (!params.event.workflowId) {
        errors.push(toValidationError('Workflow ID is required'));
    }

    if (!params.event.stepId) {
        errors.push(toValidationError('Step ID is required'));
    }

    if (params.event.type === 'fail' && !params.event.error) {
        errors.push(toValidationError('Error details are required for failure events'));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.step'
    });
};

const validateWorkflowControlEvent = (params: {
    event: IWorkflowControlEvent;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];

    if (!params.event.workflowId) {
        errors.push(toValidationError('Workflow ID is required'));
    }

    if (params.event.type === 'workflow_error' && !params.event.error) {
        errors.push(toValidationError('Error details are required for error events'));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.control'
    });
};

const validateWorkflowAgentEvent = (params: {
    event: IWorkflowAgentEvent;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];

    if (!params.event.workflowId) {
        errors.push(toValidationError('Workflow ID is required'));
    }

    if (!params.event.stepId) {
        errors.push(toValidationError('Step ID is required'));
    }

    if (params.event.type === 'assign' && !params.event.agent) {
        errors.push(toValidationError('Agent details are required for assignment events'));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.agent'
    });
};

const validateWorkflowTaskEvent = (params: {
    event: IWorkflowTaskEvent;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];

    if (!params.event.workflowId) {
        errors.push(toValidationError('Workflow ID is required'));
    }

    if (!params.event.task) {
        errors.push(toValidationError('Task details are required'));
    }

    if (params.event.type === 'update' && !params.event.status) {
        errors.push(toValidationError('Status is required for update events'));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.task'
    });
};
