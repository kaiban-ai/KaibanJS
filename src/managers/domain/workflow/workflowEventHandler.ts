import { CoreManager } from '../../core/coreManager';
import { 
    IWorkflowStepEvent, 
    IWorkflowControlEvent, 
    IWorkflowAgentEvent, 
    IWorkflowTaskEvent,
    WorkflowEventType
} from '../../../types/workflow/workflowEventTypes';
import { validateWorkflowEvent } from '../../../types/workflow/workflowEventValidation';
import { IValidationResult } from '../../../types/common/commonValidationTypes';
import { TASK_STATUS_enum } from '../../../types/common/commonEnums';
import { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { TypeGuardCheck, createTypeGuard, metadataChecks } from '../../../types/common/commonTypeGuards';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ITaskType } from '../../../types/task/taskBaseTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

/**
 * Workflow Event Handler
 * Handles workflow events using CoreManager services
 */
export class WorkflowEventHandler extends CoreManager {
    private static instance: WorkflowEventHandler;

    private constructor() {
        super();
    }

    public static getInstance(): WorkflowEventHandler {
        if (!WorkflowEventHandler.instance) {
            WorkflowEventHandler.instance = new WorkflowEventHandler();
        }
        return WorkflowEventHandler.instance;
    }

    /**
     * Type guard for agent type
     */
    private isAgentType: TypeGuardCheck<IAgentType> = createTypeGuard<IAgentType>([
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
    private isTaskType: TypeGuardCheck<ITaskType> = createTypeGuard<ITaskType>([
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
     * Handle workflow step events
     */
    async handleStepEvent(event: IWorkflowStepEvent): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            // Validate event
            const validationResult = validateWorkflowEvent(event);
            if (!validationResult.isValid) {
                this.handleError(
                    new Error(validationResult.errors.join(', ')),
                    'Step event validation failed',
                    'ValidationError'
                );
                return validationResult;
            }

            // Log event
            this.logInfo('Workflow step event', null, event.stepId);

            // Handle status transition
            await this.handleStatusTransition({
                entity: 'workflow',
                entityId: event.stepId,
                currentStatus: event.type === 'start' ? 'PENDING' : 'DOING',
                targetStatus: this.mapStepTypeToStatus(event.type),
                context: event.metadata
            });

            // Track metrics
            const metricsManager = this.getMetricsManager();
            await metricsManager.trackMetric({
                domain: MetricDomain.WORKFLOW,
                type: MetricType.PERFORMANCE,
                value: event.metadata.performance.executionTime.total,
                timestamp: Date.now(),
                metadata: {
                    stepId: event.stepId,
                    type: event.type,
                    status: event.type === 'complete' ? 'success' : event.type === 'fail' ? 'failure' : 'pending'
                }
            });

            return validationResult;
        }, 'Handle workflow step event');
    }

    /**
     * Handle workflow control events
     */
    async handleControlEvent(event: IWorkflowControlEvent): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            // Validate event
            const validationResult = validateWorkflowEvent(event);
            if (!validationResult.isValid) {
                this.handleError(
                    new Error(validationResult.errors.join(', ')),
                    'Control event validation failed',
                    'ValidationError'
                );
                return validationResult;
            }

            // Log event
            this.logInfo('Workflow control event', null, event.metadata.component);

            // Handle workflow state
            switch (event.type) {
                case 'start':
                case 'resume':
                    await this.handleStatusTransition({
                        entity: 'workflow',
                        entityId: event.metadata.component,
                        currentStatus: 'PENDING',
                        targetStatus: 'DOING',
                        context: event.metadata
                    });
                    break;
                case 'pause':
                    await this.handleStatusTransition({
                        entity: 'workflow',
                        entityId: event.metadata.component,
                        currentStatus: 'DOING',
                        targetStatus: 'BLOCKED',
                        context: event.metadata
                    });
                    break;
                case 'stop':
                    await this.handleStatusTransition({
                        entity: 'workflow',
                        entityId: event.metadata.component,
                        currentStatus: 'DOING',
                        targetStatus: 'DONE',
                        context: event.metadata
                    });
                    break;
            }

            return validationResult;
        }, 'Handle workflow control event');
    }

    /**
     * Handle workflow agent events
     */
    async handleAgentEvent(event: IWorkflowAgentEvent): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            // Validate event
            const validationResult = validateWorkflowEvent(event);
            if (!validationResult.isValid) {
                this.handleError(
                    new Error(validationResult.errors.join(', ')),
                    'Agent event validation failed',
                    'ValidationError'
                );
                return validationResult;
            }

            // Log event
            this.logInfo('Workflow agent event', event.agent?.id || null, event.stepId);

            // Validate agent assignment
            if (event.type === 'assign' && event.agent) {
                if (!this.isAgentType(event.agent)) {
                    const error = {
                        isValid: false,
                        errors: ['Invalid agent type'],
                        warnings: [],
                        metadata: {
                            timestamp: Date.now(),
                            duration: 0,
                            validatorName: 'WorkflowAgentValidator'
                        }
                    };
                    this.handleError(
                        new Error('Invalid agent type'),
                        'Agent validation failed',
                        'ValidationError'
                    );
                    return error;
                }
            }

            return validationResult;
        }, 'Handle workflow agent event');
    }

    /**
     * Handle workflow task events
     */
    async handleTaskEvent(event: IWorkflowTaskEvent): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            // Validate event
            const validationResult = validateWorkflowEvent(event);
            if (!validationResult.isValid) {
                this.handleError(
                    new Error(validationResult.errors.join(', ')),
                    'Task event validation failed',
                    'ValidationError'
                );
                return validationResult;
            }

            // Log event
            this.logInfo('Workflow task event', null, event.task.id);

            // Handle task status if provided
            if (event.status) {
                await this.handleStatusTransition({
                    entity: 'task',
                    entityId: event.task.id,
                    currentStatus: event.task.status as keyof typeof TASK_STATUS_enum,
                    targetStatus: event.status,
                    context: event.metadata
                });
            }

            // Track task metrics
            const metricsManager = this.getMetricsManager();
            await metricsManager.trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.PERFORMANCE,
                value: event.metadata.performance.executionTime.total,
                timestamp: Date.now(),
                metadata: {
                    taskId: event.task.id,
                    type: event.type,
                    status: event.status || event.task.status
                }
            });

            return validationResult;
        }, 'Handle workflow task event');
    }

    /**
     * Handle any workflow event
     */
    async handleEvent(event: WorkflowEventType): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            const result = await (async () => {
                switch (true) {
                    case ['start', 'complete', 'fail', 'skip'].includes(event.type):
                        return (await this.handleStepEvent(event as IWorkflowStepEvent)).data;
                    
                    case ['start', 'pause', 'resume', 'stop', 'reset'].includes(event.type):
                        return (await this.handleControlEvent(event as IWorkflowControlEvent)).data;
                    
                    case ['assign', 'unassign'].includes(event.type):
                        return (await this.handleAgentEvent(event as IWorkflowAgentEvent)).data;
                    
                    case ['add', 'remove', 'update'].includes(event.type):
                        return (await this.handleTaskEvent(event as IWorkflowTaskEvent)).data;
                    
                    default:
                        return {
                            isValid: false,
                            errors: [`Unknown workflow event type: ${event.type}`],
                            warnings: [],
                            metadata: {
                                timestamp: Date.now(),
                                duration: 0,
                                validatorName: 'WorkflowEventValidator'
                            }
                        };
                }
            })();

            if (!result) {
                return {
                    isValid: false,
                    errors: ['Event handler returned no result'],
                    warnings: [],
                    metadata: {
                        timestamp: Date.now(),
                        duration: 0,
                        validatorName: 'WorkflowEventValidator'
                    }
                };
            }

            return result;
        }, 'Handle workflow event');
    }

    /**
     * Map step type to status
     */
    private mapStepTypeToStatus(type: IWorkflowStepEvent['type']): keyof typeof TASK_STATUS_enum {
        switch (type) {
            case 'start':
                return 'DOING';
            case 'complete':
                return 'DONE';
            case 'fail':
                return 'ERROR';
            case 'skip':
                return 'BLOCKED';
            default:
                return 'PENDING';
        }
    }
}
