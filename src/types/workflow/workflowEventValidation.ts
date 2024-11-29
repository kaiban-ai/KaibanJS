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
    createValidationError,
    type IValidationResult,
    type ValidationErrorType
} from '../common/commonValidationTypes';
import { WORKFLOW_EVENT_TYPE_enum } from '../common/commonEnums';
import type { WorkflowEvent } from './workflowEventTypes';

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
            validatorName: params.validatorName,
            validationDuration: params.duration,
            validatedFields: ['workflow']
        })
    });
};

// ─── Generic Event Validation ────────────────────────────────────────────────

export const validateWorkflowEvent = (params: {
    event: WorkflowEvent;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    
    if (!params.event.type || !Object.values(WORKFLOW_EVENT_TYPE_enum).includes(params.event.type)) {
        errors.push(createValidationError({
            code: 'INVALID_EVENT_TYPE',
            message: 'Invalid workflow event type'
        }));
    }

    if (!params.event.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    // Validate event-specific fields based on type
    switch (params.event.type) {
        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_CREATED:
            return validateWorkflowCreated({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_UPDATED:
            return validateWorkflowUpdated({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_DELETED:
            return validateWorkflowDeleted({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_STARTED:
            return validateWorkflowStarted({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_PAUSED:
            return validateWorkflowPaused({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_RESUMED:
            return validateWorkflowResumed({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_CANCELLED:
            return validateWorkflowCancelled({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_COMPLETED:
            return validateWorkflowCompleted({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        case WORKFLOW_EVENT_TYPE_enum.WORKFLOW_FAILED:
            return validateWorkflowFailed({
                workflowId: params.event.workflowId,
                validatorName: params.validatorName,
                duration: params.duration
            });

        default:
            errors.push(createValidationError({
                code: 'UNKNOWN_EVENT_TYPE',
                message: `Unknown workflow event type: ${params.event.type}`
            }));
            return createWorkflowValidationResult({
                isValid: false,
                errors,
                validatorName: params.validatorName,
                duration: params.duration,
                component: 'workflow.event'
            });
    }
};

// ─── Workflow Event Validation ────────────────────────────────────────────────

export const validateWorkflowCreated = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.created'
    });
};

export const validateWorkflowUpdated = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.updated'
    });
};

export const validateWorkflowDeleted = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.deleted'
    });
};

export const validateWorkflowStarted = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.started'
    });
};

export const validateWorkflowPaused = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.paused'
    });
};

export const validateWorkflowResumed = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.resumed'
    });
};

export const validateWorkflowCancelled = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.cancelled'
    });
};

export const validateWorkflowCompleted = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.completed'
    });
};

export const validateWorkflowFailed = (params: {
    workflowId: string;
    validatorName: string;
    duration?: number;
}): IValidationResult => {
    const errors: ValidationErrorType[] = [];
    if (!params.workflowId) {
        errors.push(createValidationError({
            code: 'INVALID_WORKFLOW_ID',
            message: 'Workflow ID is required'
        }));
    }

    return createWorkflowValidationResult({
        isValid: errors.length === 0,
        errors,
        validatorName: params.validatorName,
        duration: params.duration,
        component: 'workflow.failed'
    });
};
