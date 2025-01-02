/**
 * @file Task.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\tasks\Tasks.ts
 * @description Core Task entity implementation with pure entity focus
 *
 * @module @entities
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseError } from '../types/common/errorTypes';
import { TASK_STATUS_enum, BATCH_PRIORITY_enum } from '../types/common/enumTypes';
import { ERROR_KINDS, createErrorContext } from '../types/common/errorTypes';

// Import types from canonical locations
import type { 
    ITaskType,
    ITaskParams,
    ITaskProgress,
    ITaskHistoryEntry
} from '../types/task/taskBaseTypes';
import { 
    ITaskMetrics, 
    ITaskHandlerResult,
    ITaskHandlerMetadata,
    createEmptyTaskMetrics 
} from '../types/task/taskHandlerTypes';
import type { ITaskFeedback } from '../types/task/taskFeedbackTypes';
import type { IAgentType } from '../types/agent/agentBaseTypes';

/**
 * Core Task entity implementation
 */
export class Task implements ITaskType {
    // Core properties
    public readonly id: string;
    public title: string;
    public description: string;
    public expectedOutput: string;
    public agent: IAgentType;
    public metadata?: ITaskHandlerMetadata;
    public status: TASK_STATUS_enum;
    public priority: BATCH_PRIORITY_enum;
    public stepId: string;

    // Configuration
    public isDeliverable: boolean;
    public externalValidationRequired: boolean;
    public inputs: Record<string, unknown>;

    // Results and state
    public result?: ITaskHandlerResult;
    public error?: Error;
    public interpolatedTaskDescription?: string;

    // Tracking and metrics
    public metrics: ITaskMetrics;
    public progress: ITaskProgress;
    public history: ITaskHistoryEntry[];
    public feedback: ITaskFeedback[];

    constructor(params: ITaskParams) {
        // Initialize core properties
        this.id = uuidv4();
        this.title = params.title || params.description.substring(0, 50);
        this.description = params.description;
        this.expectedOutput = params.expectedOutput;
        this.agent = params.agent;
        this.status = TASK_STATUS_enum.TODO;
        this.priority = params.priority ?? BATCH_PRIORITY_enum.MEDIUM;
        this.stepId = uuidv4();

        // Initialize configuration
        this.isDeliverable = params.isDeliverable ?? false;
        this.externalValidationRequired = params.externalValidationRequired ?? false;
        this.inputs = {};

        // Initialize tracking and metrics
        this.metrics = createEmptyTaskMetrics();
        this.progress = {
            status: TASK_STATUS_enum.TODO,
            progress: 0,
            timeElapsed: 0
        };
        this.history = [];
        this.feedback = [];

        // Validate parameters and agent
        this.validateParams(params);
        this.validateAgent();
    }

    /**
     * Execute task with provided data
     */
    public async execute(data: unknown): Promise<ITaskHandlerResult> {
        try {
            this.metrics.startTime = Date.now();
            this.status = TASK_STATUS_enum.DOING;
            this.progress.status = TASK_STATUS_enum.DOING;

            // Add history entry
            this.history.push({
                timestamp: Date.now(),
                eventType: 'EXECUTION_STARTED',
                statusChange: {
                    from: TASK_STATUS_enum.TODO,
                    to: TASK_STATUS_enum.DOING
                },
                agent: this.agent.id
            });

            // Execute task
            if (!('workOnTask' in this.agent)) {
                throw new Error('Agent does not support task execution');
            }
            const taskResult = await (this.agent as any).workOnTask(this);
            
            this.metrics.endTime = Date.now();
            this.metrics.duration = this.metrics.endTime - this.metrics.startTime;
            
            // Merge task result metadata with our metadata
            const metadata: ITaskHandlerMetadata = {
                ...taskResult.metadata,
                timestamp: Date.now(),
                component: 'Task',
                operation: 'execute',
                performance: this.metrics.performance,
                context: {
                    ...taskResult.metadata?.context,
                    taskId: this.id,
                    agentId: this.agent.id
                },
                validation: {
                    isValid: true,
                    errors: [],
                    warnings: []
                },
                taskId: this.id,
                taskName: this.title,
                status: this.status,
                priority: this.priority,
                assignedAgent: this.agent.id,
                progress: this.progress.progress,
                metrics: {
                    resources: this.metrics.resources,
                    usage: this.metrics.usage,
                    performance: this.metrics.performance
                },
                dependencies: {
                    completed: [],
                    pending: [],
                    blocked: []
                }
            };

            const result: ITaskHandlerResult = {
                success: taskResult.success ?? true,
                data: taskResult.data ?? data,
                metadata
            };

            // Update task metadata and state
            this.metadata = metadata;
            this.result = result;
            this.status = TASK_STATUS_enum.DONE;
            this.progress.status = TASK_STATUS_enum.DONE;
            this.progress.progress = 100;

            // Add history entry
            this.history.push({
                timestamp: Date.now(),
                eventType: 'EXECUTION_COMPLETED',
                statusChange: {
                    from: TASK_STATUS_enum.DOING,
                    to: TASK_STATUS_enum.DONE
                },
                agent: this.agent.id,
                details: { result }
            });

            return result;
        } catch (error) {
            this.setError(error as Error);
            throw error;
        }
    }

    /**
     * Validate constructor parameters
     */
    private validateParams(params: ITaskParams): void {
        const errors: string[] = [];
        
        if (!params.description) errors.push('Task description is required');
        if (!params.expectedOutput) errors.push('Expected output is required');
        if (!params.agent) errors.push('Agent is required');

        if (errors.length > 0) {
            const context = createErrorContext({
                component: 'Task',
                operation: 'validateParams',
                error: new Error('Invalid task parameters'),
                details: { params, errors },
                failureReason: 'Missing required parameters',
                recoverable: false
            });

            throw new BaseError({
                message: 'Invalid task parameters',
                type: ERROR_KINDS.ValidationError,
                context
            });
        }
    }

    /**
     * Validate assigned agent
     */
    private validateAgent(): void {
        if (!this.agent) {
            const context = createErrorContext({
                component: 'Task',
                operation: 'validateAgent',
                error: new Error('Task must have an assigned agent'),
                details: { taskId: this.id },
                failureReason: 'Missing agent assignment',
                recoverable: false
            });

            throw new BaseError({
                message: 'Task must have an assigned agent',
                type: ERROR_KINDS.ValidationError,
                context
            });
        }
    }

    /**
     * Set error state
     */
    private setError(error: Error): void {
        this.error = error;
        this.status = TASK_STATUS_enum.ERROR;
        this.progress.status = TASK_STATUS_enum.ERROR;
        
        // Add history entry
        this.history.push({
            timestamp: Date.now(),
            eventType: 'ERROR',
            statusChange: {
                from: this.status,
                to: TASK_STATUS_enum.ERROR
            },
            agent: this.agent.id,
            details: { error: this.error }
        });
    }
}

export default Task;
