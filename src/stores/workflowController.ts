/**
 * @file workflowController.ts
 * @path src/stores/workflowController.ts
 * @description Workflow lifecycle and execution controller managing task queues and error handling
 */

import PQueue from 'p-queue';
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';
import { LogCreator } from '@/utils/factories/logCreator';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from "@/utils/types/common/enums";

import { ErrorType } from '@/utils/types/common/errors';


import type {
    TaskType, 
    TeamStore, 
    WorkflowControllerConfig,
    QueueOptions,
    TaskExecutionParams,
    WorkflowMonitorConfig,
    ExecutionContext
} from '@/utils/types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<WorkflowControllerConfig> = {
    concurrency: 1,
    taskTimeout: 300000, // 5 minutes
    progressCheckInterval: 60000, // 1 minute
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    maxQueueSize: 100
};

/**
 * Default queue options
 */
const DEFAULT_QUEUE_OPTIONS: Required<QueueOptions> = {
    concurrency: 1,
    autoStart: true,
    intervalCap: 1,
    interval: 0,
    carryoverConcurrencyCount: true
};

/**
 * Workflow Controller Implementation
 */
export class WorkflowController {
    private store: TeamStore;
    private config: Required<WorkflowControllerConfig>;
    private taskQueue: PQueue;
    private isActive: boolean = true;
    private lastTaskUpdateTime: number;
    private timeoutTimer?: NodeJS.Timeout;
    private progressCheckTimer?: NodeJS.Timeout;
    private executionContext: ExecutionContext = new Map();

    constructor(
        store: TeamStore,
        userConfig: Partial<WorkflowControllerConfig> = {}
    ) {
        this.store = store;
        this.config = { ...DEFAULT_CONFIG, ...userConfig };
        this.lastTaskUpdateTime = Date.now();

        // Initialize task queue
        this.taskQueue = new PQueue({
            ...DEFAULT_QUEUE_OPTIONS,
            concurrency: this.config.concurrency
        });

        // Setup event handlers
        this.setupEventHandlers();
    }

    /**
     * Setup workflow event handlers
     */
    private setupEventHandlers(): void {
        // Handle task status changes
        this.store.subscribe(
            state => state.tasks,
            (tasks) => {
                if (!this.isActive) return;

                const doingTasks = tasks.filter(
                    task => task.status === TASK_STATUS_enum.DOING
                );

                doingTasks.forEach(task => {
                    this.taskQueue.add(() => this.processTask(task))
                        .catch(error => {
                            logger.error('Task queue processing error:', error);
                            this.handleTaskError(task, error);
                        });
                });
            }
        );

        // Handle workflow status changes
        this.store.subscribe(
            state => state.teamWorkflowStatus,
            (status) => {
                if (status === WORKFLOW_STATUS_enum.FINISHED ||
                    status === WORKFLOW_STATUS_enum.ERRORED) {
                    this.cleanup();
                }
            }
        );

        // Monitor queue events
        this.taskQueue.on('active', () => {
            logger.debug('Task queue active:', {
                pending: this.taskQueue.pending,
                size: this.taskQueue.size
            });
        });

        this.taskQueue.on('idle', () => {
            logger.debug('Task queue idle');
            this.checkWorkflowCompletion();
        });

        this.taskQueue.on('error', error => {
            logger.error('Task queue error:', error);
        });
    }

    /**
     * Process a single task
     */
    private async processTask(task: TaskType): Promise<void> {
        if (!this.isActive) return;

        const startTime = Date.now();
        const context = this.getExecutionContext(task);

        try {
            logger.debug(`Processing task: ${task.title}`);

            if (!task.agent) {
                throw new PrettyError({
                    message: 'Cannot process task without an assigned agent',
                    context: { taskId: task.id, taskTitle: task.title }
                });
            }

            // Execute task with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Task timeout after ${this.config.taskTimeout}ms`));
                }, this.config.taskTimeout);
            });

            const executionPromise = this.store.workOnTask(task.agent, task);
            await Promise.race([executionPromise, timeoutPromise]);

            // Update context and timing
            this.lastTaskUpdateTime = Date.now();
            context.lastSuccessTime = Date.now();
            context.consecutiveFailures = 0;

        } catch (error) {
            context.consecutiveFailures = (context.consecutiveFailures || 0) + 1;
            context.lastErrorTime = Date.now();
            context.lastError = error instanceof Error ? error : new Error(String(error));

            if (context.consecutiveFailures <= this.config.maxRetries) {
                logger.warn(`Retrying task ${task.id}, attempt ${context.consecutiveFailures}`);
                await this.handleRetry(task, context);
            } else {
                this.handleTaskError(task, context.lastError);
            }
        } finally {
            // Update stats
            context.totalExecutions = (context.totalExecutions || 0) + 1;
            context.totalDuration = (context.totalDuration || 0) + (Date.now() - startTime);
        }
    }

    /**
     * Handle task retry logic
     */
    private async handleRetry(
        task: TaskType, 
        context: ExecutionContext
    ): Promise<void> {
        const delay = this.config.retryDelay * Math.pow(2, context.consecutiveFailures - 1);
        
        const retryLog = LogCreator.createTaskLog({
            task,
            description: `Retrying task: ${task.title}`,
            status: TASK_STATUS_enum.DOING,
            metadata: {
                attempt: context.consecutiveFailures,
                maxRetries: this.config.maxRetries,
                delay,
                lastError: context.lastError
            }
        });

        this.store.setState(state => ({
            workflowLogs: [...state.workflowLogs, retryLog]
        }));

        await new Promise(resolve => setTimeout(resolve, delay));
        await this.processTask(task);
    }

    /**
     * Handle task execution error
     */
    private handleTaskError(task: TaskType, error: Error | unknown): void {
        const prettyError = error instanceof PrettyError ? error : new PrettyError({
            message: error instanceof Error ? error.message : String(error),
            context: { taskId: task.id, taskTitle: task.title },
            rootError: error instanceof Error ? error : undefined
        });

        this.store.handleTaskError({
            task,
            error: prettyError as ErrorType,
            context: {
                executionStats: this.getExecutionContext(task)
            }
        });
    }

    /**
     * Check if workflow is complete
     */
    private checkWorkflowCompletion(): void {
        if (this.taskQueue.size === 0 && this.taskQueue.pending === 0) {
            const allTasks = this.store.getState().tasks;
            const isComplete = allTasks.every(task => 
                task.status === TASK_STATUS_enum.DONE ||
                task.status === TASK_STATUS_enum.VALIDATED
            );

            if (isComplete) {
                this.store.handleWorkflowStatusChange(WORKFLOW_STATUS_enum.FINISHED);
            }
        }
    }

    /**
     * Get execution context for a task
     */
    private getExecutionContext(task: TaskType): ExecutionContext {
        if (!this.executionContext.has(task.id)) {
            this.executionContext.set(task.id, {
                totalExecutions: 0,
                consecutiveFailures: 0,
                totalDuration: 0,
                startTime: Date.now()
            });
        }
        return this.executionContext.get(task.id)!;
    }

    /**
     * Start monitoring task timeouts
     */
    private startTimeoutMonitor(): void {
        this.timeoutTimer = setInterval(() => {
            const currentTime = Date.now();
            const timeSinceUpdate = currentTime - this.lastTaskUpdateTime;

            if (timeSinceUpdate > this.config.taskTimeout) {
                const runningTasks = this.store.getState().tasks
                    .filter(task => task.status === TASK_STATUS_enum.DOING);

                runningTasks.forEach(task => {
                    const error = new PrettyError({
                        message: 'Task exceeded timeout duration',
                        context: {
                            taskId: task.id,
                            timeout: this.config.taskTimeout,
                            timeSinceUpdate
                        }
                    });

                    this.handleTaskError(task, error);
                });
            }
        }, this.config.progressCheckInterval);
    }

    /**
     * Start the workflow controller
     */
    public start(): void {
        this.isActive = true;
        this.lastTaskUpdateTime = Date.now();
        this.startTimeoutMonitor();
        this.taskQueue.start();
        logger.info('Workflow controller started');
    }

    /**
     * Pause the workflow controller
     */
    public pause(): void {
        this.isActive = false;
        this.taskQueue.pause();
        logger.info('Workflow controller paused');
    }

    /**
     * Resume the workflow controller
     */
    public resume(): void {
        this.isActive = true;
        this.taskQueue.start();
        logger.info('Workflow controller resumed');
    }

    /**
     * Clean up resources
     */
    public cleanup(): void {
        if (!this.isActive) return;

        logger.debug('Cleaning up workflow controller');
        
        this.isActive = false;
        this.taskQueue.clear();
        this.executionContext.clear();

        if (this.timeoutTimer) {
            clearInterval(this.timeoutTimer);
            this.timeoutTimer = undefined;
        }

        if (this.progressCheckTimer) {
            clearInterval(this.progressCheckTimer);
            this.progressCheckTimer = undefined;
        }

        logger.debug('Workflow controller cleanup completed');
    }
}

/**
 * Create and setup the workflow controller
 */
export const setupWorkflowController = (
    store: TeamStore,
    config?: WorkflowControllerConfig
): (() => void) => {
    const controller = new WorkflowController(store, config);
    controller.start();

    // Handle process termination
    process.on('SIGTERM', () => controller.cleanup());
    process.on('SIGINT', () => controller.cleanup());

    return () => controller.cleanup();
};