import { IValidationResult } from '../common/commonValidationTypes';
import { 
    IWorkflowStepEvent, 
    IWorkflowControlEvent, 
    IWorkflowAgentEvent, 
    IWorkflowTaskEvent,
    WorkflowEventType
} from './workflowEventTypes';
import { TASK_STATUS_enum } from '../common/commonEnums';
import { MetadataTypeGuards } from '../common/commonMetadataTypes';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { TypeGuardCheck, createTypeGuard, metadataChecks } from '../common/commonTypeGuards';

/**
 * Type guard for agent type
 */
const isAgentType: TypeGuardCheck<IAgentType> = createTypeGuard<IAgentType>([
    metadataChecks.isObject,
    (value: unknown): boolean => {
        const agent = value as IAgentType;
        return (
            typeof agent.id === 'string' &&
            typeof agent.name === 'string' &&
            typeof agent.role === 'string'
        );
    }
]);

/**
 * Type guard for task type
 */
const isTaskType: TypeGuardCheck<ITaskType> = createTypeGuard<ITaskType>([
    metadataChecks.isObject,
    (value: unknown): boolean => {
        const task = value as ITaskType;
        return (
            typeof task.id === 'string' &&
            typeof task.title === 'string' &&
            typeof task.status === 'string'
        );
    }
]);

/**
 * Validates workflow step events
 */
export function validateStepEvent(event: IWorkflowStepEvent): IValidationResult {
    if (!event.stepId || typeof event.stepId !== 'string') {
        return { 
            isValid: false, 
            errors: ['Invalid stepId in workflow step event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowStepValidator'
            }
        };
    }

    if (!['start', 'complete', 'fail', 'skip'].includes(event.type)) {
        return { 
            isValid: false, 
            errors: ['Invalid step event type'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowStepValidator'
            }
        };
    }

    if (event.agent && !isAgentType(event.agent)) {
        return { 
            isValid: false, 
            errors: ['Invalid agent in workflow step event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowStepValidator'
            }
        };
    }

    if (!MetadataTypeGuards.isBaseHandlerMetadata(event.metadata)) {
        return {
            isValid: false,
            errors: ['Invalid metadata in workflow step event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowStepValidator'
            }
        };
    }

    return { 
        isValid: true, 
        errors: [], 
        warnings: [],
        metadata: {
            timestamp: Date.now(),
            duration: 0,
            validatorName: 'WorkflowStepValidator'
        }
    };
}

/**
 * Validates workflow control events
 */
export function validateControlEvent(event: IWorkflowControlEvent): IValidationResult {
    if (!['start', 'pause', 'resume', 'stop', 'reset'].includes(event.type)) {
        return { 
            isValid: false, 
            errors: ['Invalid control event type'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowControlValidator'
            }
        };
    }

    if (!MetadataTypeGuards.isBaseHandlerMetadata(event.metadata)) {
        return {
            isValid: false,
            errors: ['Invalid metadata in workflow control event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowControlValidator'
            }
        };
    }

    return { 
        isValid: true, 
        errors: [], 
        warnings: [],
        metadata: {
            timestamp: Date.now(),
            duration: 0,
            validatorName: 'WorkflowControlValidator'
        }
    };
}

/**
 * Validates workflow agent events
 */
export function validateAgentEvent(event: IWorkflowAgentEvent): IValidationResult {
    if (!event.stepId || typeof event.stepId !== 'string') {
        return { 
            isValid: false, 
            errors: ['Invalid stepId in workflow agent event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowAgentValidator'
            }
        };
    }

    if (!['assign', 'unassign'].includes(event.type)) {
        return { 
            isValid: false, 
            errors: ['Invalid agent event type'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowAgentValidator'
            }
        };
    }

    if (event.type === 'assign' && !event.agent) {
        return {
            isValid: false,
            errors: ['Agent must be provided for assign event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowAgentValidator'
            }
        };
    }

    if (event.agent && !isAgentType(event.agent)) {
        return {
            isValid: false,
            errors: ['Invalid agent in workflow agent event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowAgentValidator'
            }
        };
    }

    if (!MetadataTypeGuards.isBaseHandlerMetadata(event.metadata)) {
        return {
            isValid: false,
            errors: ['Invalid metadata in workflow agent event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowAgentValidator'
            }
        };
    }

    return { 
        isValid: true, 
        errors: [], 
        warnings: [],
        metadata: {
            timestamp: Date.now(),
            duration: 0,
            validatorName: 'WorkflowAgentValidator'
        }
    };
}

/**
 * Validates workflow task events
 */
export function validateTaskEvent(event: IWorkflowTaskEvent): IValidationResult {
    if (!['add', 'remove', 'update'].includes(event.type)) {
        return { 
            isValid: false, 
            errors: ['Invalid task event type'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowTaskValidator'
            }
        };
    }

    if (!isTaskType(event.task)) {
        return {
            isValid: false,
            errors: ['Invalid task in workflow task event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowTaskValidator'
            }
        };
    }

    if (event.status && !(event.status in TASK_STATUS_enum)) {
        return {
            isValid: false,
            errors: ['Invalid task status'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowTaskValidator'
            }
        };
    }

    if (!MetadataTypeGuards.isBaseHandlerMetadata(event.metadata)) {
        return {
            isValid: false,
            errors: ['Invalid metadata in workflow task event'],
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                duration: 0,
                validatorName: 'WorkflowTaskValidator'
            }
        };
    }

    return { 
        isValid: true, 
        errors: [], 
        warnings: [],
        metadata: {
            timestamp: Date.now(),
            duration: 0,
            validatorName: 'WorkflowTaskValidator'
        }
    };
}

/**
 * Type guard for workflow event types
 */
export function isWorkflowEvent(event: unknown): event is WorkflowEventType {
    if (!event || typeof event !== 'object') {
        return false;
    }

    const { type } = event as { type?: string };

    if (!type) {
        return false;
    }

    // Check for step events
    if (['start', 'complete', 'fail', 'skip'].includes(type)) {
        return validateStepEvent(event as IWorkflowStepEvent).isValid;
    }

    // Check for control events
    if (['start', 'pause', 'resume', 'stop', 'reset'].includes(type)) {
        return validateControlEvent(event as IWorkflowControlEvent).isValid;
    }

    // Check for agent events
    if (['assign', 'unassign'].includes(type)) {
        return validateAgentEvent(event as IWorkflowAgentEvent).isValid;
    }

    // Check for task events
    if (['add', 'remove', 'update'].includes(type)) {
        return validateTaskEvent(event as IWorkflowTaskEvent).isValid;
    }

    return false;
}

/**
 * Validates any workflow event
 */
export function validateWorkflowEvent(event: WorkflowEventType): IValidationResult {
    switch (true) {
        case ['start', 'complete', 'fail', 'skip'].includes(event.type):
            return validateStepEvent(event as IWorkflowStepEvent);
        
        case ['start', 'pause', 'resume', 'stop', 'reset'].includes(event.type):
            return validateControlEvent(event as IWorkflowControlEvent);
        
        case ['assign', 'unassign'].includes(event.type):
            return validateAgentEvent(event as IWorkflowAgentEvent);
        
        case ['add', 'remove', 'update'].includes(event.type):
            return validateTaskEvent(event as IWorkflowTaskEvent);
        
        default:
            return {
                isValid: false,
                errors: ['Unknown workflow event type'],
                warnings: [],
                metadata: {
                    timestamp: Date.now(),
                    duration: 0,
                    validatorName: 'WorkflowEventValidator'
                }
            };
    }
}
