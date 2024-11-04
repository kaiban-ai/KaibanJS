/**
 * @file errorActions.ts
 * @path src/stores/taskStore/actions/errorActions.ts
 * @description Error handling actions for task store
 */

import { logger } from '@/utils/core/logger';
import { StatusManager } from '@/utils/managers/statusManager';
import { LogCreator } from '@/utils/factories/logCreator';
import { PrettyError } from '@/utils/core/errors';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { getTaskTitleForLogs } from '@/utils/helpers/tasks/taskUtils';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';

import { 
    TASK_STATUS_enum, 
    WORKFLOW_STATUS_enum 
} from "@/utils/types/common/enums";

import { ErrorType } from '@/utils/types/common/errors';

import { 
    TaskType,
    AgentType,
    Tool,
    TaskStats,
    LLMUsageStats
} from '@/utils/types';

import { TaskStoreState } from '../state';

/**
 * Create error handling actions for task store
 */
export const createErrorActions = (
    get: () => TaskStoreState,
    set: (partial: TaskStoreState | ((state: TaskStoreState) => TaskStoreState)) => void
) => {
    const statusManager = StatusManager.getInstance();

    return {
        /**
         * Handle critical task error
         */
        handleCriticalError: async ({ 
            task, 
            error, 
            context 
        }: { 
            task: TaskType; 
            error: ErrorType;
            context?: Record<string, unknown>;
        }): Promise<void> => {
            const prettyError = new PrettyError({
                message: error.message,
                context: {
                    taskId: task.id,
                    taskTitle: task.title,
                    ...context
                },
                rootError: error,
                recommendedAction: 'Check task configuration and inputs'
            });

            const stats = calculateTaskStats(task, get().workflowLogs);
            const modelCode = task.agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

            // Transition task status
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.ERROR,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    error: prettyError,
                    context,
                    stats,
                    costDetails,
                    severity: 'critical'
                }
            });

            const errorLog = LogCreator.createTaskLog({
                task,
                description: `Critical error in task: ${getTaskTitleForLogs(task)}`,
                status: TASK_STATUS_enum.ERROR,
                metadata: {
                    error: prettyError,
                    stats,
                    costDetails,
                    context,
                    severity: 'critical'
                }
            });

            set(state => ({
                ...state,
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    status: TASK_STATUS_enum.ERROR,
                    error: prettyError.message,
                    ...stats,
                    costDetails
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, errorLog],
                lastError: prettyError,
                stats: {
                    ...state.stats,
                    errorCount: state.stats.errorCount + 1
                }
            }));

            logger.error(`Critical task error:`, prettyError);
        },

        /**
         * Handle task blocking
         */
        handleTaskBlocked: async ({ 
            task, 
            error,
            blockingReason 
        }: { 
            task: TaskType; 
            error: ErrorType;
            blockingReason?: string;
        }): Promise<void> => {
            const stats = calculateTaskStats(task, get().workflowLogs);

            // Transition task status
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.BLOCKED,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    error,
                    blockingReason,
                    stats
                }
            });

            const errorLog = LogCreator.createTaskLog({
                task,
                description: `Task blocked: ${blockingReason || error.message}`,
                status: TASK_STATUS_enum.BLOCKED,
                metadata: {
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack,
                        context: error.context
                    },
                    blockingReason,
                    stats,
                    severity: 'blocked'
                }
            });

            set(state => ({
                ...state,
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    status: TASK_STATUS_enum.BLOCKED,
                    error: error.message,
                    ...stats
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, errorLog],
                lastError: error,
                stats: {
                    ...state.stats,
                    errorCount: state.stats.errorCount + 1
                }
            }));

            logger.warn(`Task blocked: ${blockingReason || error.message}`, {
                taskId: task.id
            });
        },

        /**
         * Handle validation error
         */
        handleValidationError: async ({
            task,
            error,
            validationContext
        }: {
            task: TaskType;
            error: ErrorType;
            validationContext?: {
                validator?: string;
                validationPhase?: string;
                failedChecks?: string[];
            };
        }): Promise<void> => {
            const stats = calculateTaskStats(task, get().workflowLogs);

            // Transition task status
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.ERROR,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    error,
                    validationContext,
                    stats,
                    severity: 'validation'
                }
            });

            const errorLog = LogCreator.createTaskLog({
                task,
                description: `Validation error: ${getTaskTitleForLogs(task)}`,
                status: TASK_STATUS_enum.ERROR,
                metadata: {
                    error,
                    stats,
                    validationContext,
                    severity: 'validation'
                }
            });

            set(state => ({
                ...state,
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    status: TASK_STATUS_enum.ERROR,
                    error: error.message,
                    ...stats
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, errorLog],
                lastError: error instanceof Error ? error : new Error(String(error)),
                stats: {
                    ...state.stats,
                    errorCount: state.stats.errorCount + 1
                }
            }));

            logger.error(`Task validation error:`, {
                taskId: task.id,
                error,
                validationContext
            });
        },

        /**
         * Handle recovery attempt
         */
        handleRecoveryAttempt: async ({
            task,
            agent,
            error,
            recoveryStrategy
        }: {
            task: TaskType;
            agent: AgentType;
            error: ErrorType;
            recoveryStrategy: {
                type: 'retry' | 'fallback' | 'skip';
                maxAttempts?: number;
                currentAttempt?: number;
                fallbackAction?: string;
            };
        }): Promise<void> => {
            const stats = calculateTaskStats(task, get().workflowLogs);

            // Transition task status if necessary
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.DOING,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    error,
                    recoveryStrategy,
                    stats,
                    severity: 'recovery'
                }
            });

            const recoveryLog = LogCreator.createTaskLog({
                task,
                description: `Recovery attempt for task: ${getTaskTitleForLogs(task)}`,
                status: TASK_STATUS_enum.DOING,
                metadata: {
                    error,
                    stats,
                    recoveryStrategy,
                    severity: 'recovery'
                }
            });

            set(state => ({
                ...state,
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    status: TASK_STATUS_enum.DOING,
                    ...stats
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, recoveryLog]
            }));

            logger.info(`Attempting task recovery:`, {
                taskId: task.id,
                strategy: recoveryStrategy.type,
                attempt: recoveryStrategy.currentAttempt
            });
        },

        /**
         * Handle resource exhaustion
         */
        handleResourceExhaustion: async ({
            task,
            resourceStats,
            threshold
        }: {
            task: TaskType;
            resourceStats: {
                memory: number;
                tokens: number;
                cpuTime?: number;
            };
            threshold: {
                memory?: number;
                tokens?: number;
                cpuTime?: number;
            };
        }): Promise<void> => {
            const stats = calculateTaskStats(task, get().workflowLogs);

            // Transition task status
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.BLOCKED,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    stats,
                    resourceStats,
                    threshold,
                    severity: 'resource_exhaustion'
                }
            });

            const exhaustionLog = LogCreator.createTaskLog({
                task,
                description: `Resource exhaustion in task: ${getTaskTitleForLogs(task)}`,
                status: TASK_STATUS_enum.BLOCKED,
                metadata: {
                    stats,
                    resourceStats,
                    threshold,
                    severity: 'resource_exhaustion'
                }
            });

            set(state => ({
                ...state,
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    status: TASK_STATUS_enum.BLOCKED,
                    error: 'Resource limits exceeded',
                    ...stats
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, exhaustionLog],
                lastError: {
                    message: 'Resource limits exceeded',
                    name: 'ResourceExhaustionError',
                    stack: '',
                    context: {}
                } as ErrorType,
                stats: {
                    ...state.stats,
                    errorCount: state.stats.errorCount + 1
                }
            }));

            logger.warn(`Task resource exhaustion:`, {
                taskId: task.id,
                resourceStats,
                threshold
            });
        },

        /**
         * Handle timeout error
         */
        handleTimeoutError: async ({
            task,
            timeoutConfig,
            elapsedTime
        }: {
            task: TaskType;
            timeoutConfig: {
                limit: number;
                type: 'execution' | 'response' | 'total';
            };
            elapsedTime: number;
        }): Promise<void> => {
            const stats = calculateTaskStats(task, get().workflowLogs);

            // Transition task status
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.ERROR,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    timeoutConfig,
                    elapsedTime,
                    stats,
                    severity: 'timeout'
                }
            });

            const timeoutLog = LogCreator.createTaskLog({
                task,
                description: `Timeout in task: ${getTaskTitleForLogs(task)}`,
                status: TASK_STATUS_enum.ERROR,
                metadata: {
                    stats,
                    timeoutConfig,
                    elapsedTime,
                    severity: 'timeout'
                }
            });

            set(state => ({
                ...state,
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    status: TASK_STATUS_enum.ERROR,
                    error: `Task timeout after ${elapsedTime}ms`,
                    ...stats
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, timeoutLog],
                lastError: {
                    message: `Task timeout after ${elapsedTime}ms`,
                    name: 'TimeoutError',
                    stack: '',
                    context: {}
                } as ErrorType,
                stats: {
                    ...state.stats,
                    errorCount: state.stats.errorCount + 1
                }
            }));

            logger.error(`Task timeout:`, {
                taskId: task.id,
                timeoutConfig,
                elapsedTime
            });
        },

        /**
         * Handle dependency error
         */
        handleDependencyError: async ({
            task,
            dependencies,
            error
        }: {
            task: TaskType;
            dependencies: {
                taskId: string;
                status: keyof typeof TASK_STATUS_enum;
                error?: string;
            }[];
            error: ErrorType;
        }): Promise<void> => {
            const stats = calculateTaskStats(task, get().workflowLogs);

            // Transition task status
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.BLOCKED,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    error,
                    dependencies,
                    stats,
                    severity: 'dependency'
                }
            });

            const dependencyLog = LogCreator.createTaskLog({
                task,
                description: `Dependency error in task: ${getTaskTitleForLogs(task)}`,
                status: TASK_STATUS_enum.BLOCKED,
                metadata: {
                    error,
                    stats,
                    dependencies,
                    severity: 'dependency'
                }
            });

            set(state => ({
                ...state,
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    status: TASK_STATUS_enum.BLOCKED,
                    error: error.message,
                    ...stats
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, dependencyLog],
                lastError: error,
                stats: {
                    ...state.stats,
                    errorCount: state.stats.errorCount + 1
                }
            }));

            logger.error(`Task dependency error:`, {
                taskId: task.id,
                dependencies,
                error
            });
        }

        // Additional error handlers can be added here
    };
};

export type ErrorActions = ReturnType<typeof createErrorActions>;
