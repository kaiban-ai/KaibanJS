import { CoreManager } from '../../core/coreManager';
import { 
    IWorkflowStepEvent, 
    IWorkflowControlEvent, 
    IWorkflowAgentEvent, 
    IWorkflowTaskEvent,
    WorkflowEventType
} from '../../../types/workflow/workflowEventTypes';
import { validateWorkflowEvent } from '../../../types/workflow/workflowEventValidation';
import { IValidationResult } from '../../../types/common/validationTypes';
import { TASK_STATUS_enum, MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { IHandlerResult, createBaseMetadata, TypeGuardCheck, createTypeGuard } from '../../../types/common/baseTypes';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ITaskType } from '../../../types/task/taskBaseTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import { ERROR_KINDS } from '../../../types/common/errorTypes';

/**
 * Workflow Event Handler
 * Handles workflow events using CoreManager services
 */
export class WorkflowEventHandler extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.STATE;
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
        (value: unknown): boolean => {
            if (typeof value !== 'object' || value === null) return false;
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
        (value: unknown): boolean => {
            if (typeof value !== 'object' || value === null) return false;
            const task = value as ITaskType;
            return (
                typeof task.id === 'string' &&
                typeof task.title === 'string' &&
                typeof task.status === 'string'
            );
        }
    ]);

    protected async safeExecute<T>(
        fn: () => Promise<T>,
        errorContext: string
    ): Promise<IHandlerResult<T>> {
        try {
            const result = await fn();
            return {
                success: true,
                data: result,
                metadata: createBaseMetadata(this.constructor.name, errorContext)
            };
        } catch (error) {
            const baseError = new Error(error instanceof Error ? error.message : String(error));
            baseError.name = ERROR_KINDS.ExecutionError;
            this.logError(`Operation failed: ${errorContext}`, baseError);
            return {
                success: false,
                metadata: createBaseMetadata(this.constructor.name, errorContext),
                error: baseError
            };
        }
    }

    protected logInfo(message: string, context?: string): void {
        console.info(`[${this.constructor.name}] ${message}${context ? ` (${context})` : ''}`);
    }

    protected logError(message: string, error: Error): void {
        console.error(`[${this.constructor.name}] ${message}:`, error);
    }

    /**
     * Handle workflow step events
     */
    async handleStepEvent(event: IWorkflowStepEvent): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            // Validate event
            const validationResult = validateWorkflowEvent(event);
            if (!validationResult.isValid) {
                const error = new Error(validationResult.errors.join(', '));
                error.name = ERROR_KINDS.ValidationError;
                throw error;
            }

            // Log event
            this.logInfo('Workflow step event', event.stepId);

            // Track metrics
            await this.metricsManager.trackMetric({
                domain: METRIC_DOMAIN_enum.WORKFLOW,
                type: METRIC_TYPE_enum.PERFORMANCE,
                value: event.metadata?.performance?.executionTime?.total || 0,
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
                const error = new Error(validationResult.errors.join(', '));
                error.name = ERROR_KINDS.ValidationError;
                throw error;
            }

            // Log event
            this.logInfo('Workflow control event', event.metadata?.component);

            // Track state transition
            await this.metricsManager.trackMetric({
                domain: METRIC_DOMAIN_enum.WORKFLOW,
                type: METRIC_TYPE_enum.STATE_TRANSITION,
                value: 1,
                timestamp: Date.now(),
                metadata: {
                    type: event.type,
                    component: event.metadata?.component
                }
            });

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
                const error = new Error(validationResult.errors.join(', '));
                error.name = ERROR_KINDS.ValidationError;
                throw error;
            }

            // Log event
            this.logInfo('Workflow agent event', `${event.agent?.id || 'unknown'} - ${event.stepId}`);

            // Validate agent assignment
            if (event.type === 'assign' && event.agent) {
                if (!this.isAgentType(event.agent)) {
                    const error = new Error('Invalid agent type');
                    error.name = ERROR_KINDS.ValidationError;
                    throw error;
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
                const error = new Error(validationResult.errors.join(', '));
                error.name = ERROR_KINDS.ValidationError;
                throw error;
            }

            // Log event
            this.logInfo('Workflow task event', event.task.id);

            // Track task metrics
            await this.metricsManager.trackMetric({
                domain: METRIC_DOMAIN_enum.TASK,
                type: METRIC_TYPE_enum.PERFORMANCE,
                value: event.metadata?.performance?.executionTime?.total || 0,
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
                        const error = new Error(`Unknown workflow event type: ${event.type}`);
                        error.name = ERROR_KINDS.ValidationError;
                        throw error;
                }
            })();

            if (!result) {
                const error = new Error('Event handler returned no result');
                error.name = ERROR_KINDS.ValidationError;
                throw error;
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

export default WorkflowEventHandler.getInstance();
