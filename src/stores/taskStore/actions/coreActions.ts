/**
 * @file coreActions.ts
 * @path src/stores/taskStore/actions/coreActions.ts
 * @description Core task store actions for CRUD operations and status management
 */

import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';
import { getTaskTitleForLogs } from '@/utils/helpers/tasks';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { StatusManager } from '@/utils/managers/statusManager';

import { 
    TASK_STATUS_enum, 
    AGENT_STATUS_enum, 
    FEEDBACK_STATUS_enum 
} from "@/utils/types/common/enums";

import { ErrorType } from '@/utils/types/common/errors';

import { 
    TaskType,
    FeedbackObject,
    AgentType,
    CostDetails,
    TaskResult,
    LLMUsageStats
} from '@/utils/types';

import { TaskStoreState } from '../state';

export type CoreActions = ReturnType<typeof createCoreActions>;

/**
 * Create core action creators for task store
 */
export const createCoreActions = (
    get: () => TaskStoreState,
    set: (partial: TaskStoreState | ((state: TaskStoreState) => TaskStoreState)) => void
) => {
    const statusManager = StatusManager.getInstance();

    return {
        /**
         * Handle task completion
         */
        handleTaskCompletion: async ({ 
            agent, 
            task, 
            result,
            metadata = {} 
        }: { 
            agent: AgentType; 
            task: TaskType; 
            result: TaskResult;
            metadata?: Record<string, unknown>;
        }): Promise<void> => {
            // Get task stats
            const stats = calculateTaskStats(task, get().workflowLogs);
            const modelCode = agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);
            
            // Update feedback history
            const updatedFeedbackHistory = task.feedbackHistory.map((feedback: FeedbackObject) =>
                feedback.status === FEEDBACK_STATUS_enum.PENDING
                    ? { ...feedback, status: FEEDBACK_STATUS_enum.PROCESSED }
                    : feedback
            );

            // Determine new status
            const newStatus = task.externalValidationRequired && 
                              task.status !== TASK_STATUS_enum.VALIDATED 
                              ? TASK_STATUS_enum.AWAITING_VALIDATION 
                              : TASK_STATUS_enum.DONE;

            // Use StatusManager for transition
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: newStatus,
                entity: 'task',
                entityId: task.id,
                metadata: {
                    agentId: agent.id,
                    stats,
                    costDetails,
                    result,
                    ...metadata
                }
            });

            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Task ${newStatus === TASK_STATUS_enum.DONE ? 'completed' : 'awaiting validation'}: ${getTaskTitleForLogs(task)}`,
                status: newStatus,
                metadata: {
                    ...stats,
                    costDetails,
                    result,
                    ...metadata
                }
            });

            // Update state
            set(state => ({
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    ...stats,
                    status: newStatus,
                    result,
                    feedbackHistory: updatedFeedbackHistory
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));

            if (newStatus === TASK_STATUS_enum.DONE) {
                logger.debug(`Task completed with ID ${task.id}, Duration: ${stats.duration} seconds`);
            } else {
                logger.info(`Task ${task.id} is awaiting validation.`);
            }
        },

        /**
         * Handle task error
         */
        handleTaskError: ({ 
            task, 
            error, 
            context = {} 
        }: { 
            task: TaskType; 
            error: ErrorType;
            context?: Record<string, unknown>;
        }): void => {
            const stats = calculateTaskStats(task, get().workflowLogs);
            const modelCode = task.agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Task error: ${getTaskTitleForLogs(task)}, Error: ${error.message}`,
                status: TASK_STATUS_enum.ERROR,
                metadata: {
                    ...stats,
                    costDetails,
                    error: {
                        message: error.message,
                        name: error.name || 'Error',
                        stack: error.stack,
                        context: { ...error.context, ...context }
                    }
                }
            });

            set(state => ({
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    ...stats,
                    status: TASK_STATUS_enum.ERROR,
                    error: error.message
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, taskLog],
                lastError: error instanceof Error ? error : new Error(String(error))
            }));

            logger.error(`Task error: ${error.message}`, { taskId: task.id, context });
        },

        /**
         * Handle task blocking
         */
        handleTaskBlocked: ({ 
            task, 
            error,
            blockingReason 
        }: { 
            task: TaskType; 
            error: ErrorType;
            blockingReason?: string;
        }): void => {
            const stats = calculateTaskStats(task, get().workflowLogs);
            const modelCode = task.agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Task blocked: ${getTaskTitleForLogs(task)}, Reason: ${blockingReason || error.message}`,
                status: TASK_STATUS_enum.BLOCKED,
                metadata: {
                    ...stats,
                    costDetails,
                    error: {
                        message: error.message,
                        name: error.name || 'Error',
                        stack: error.stack,
                        context: error.context
                    },
                    blockingReason
                }
            });

            set(state => ({
                tasks: state.tasks.map(t => t.id === task.id ? {
                    ...t,
                    ...stats,
                    status: TASK_STATUS_enum.BLOCKED
                } as TaskType : t),
                workflowLogs: [...state.workflowLogs, taskLog],
                lastError: error instanceof Error ? error : new Error(String(error))
            }));

            logger.warn(`Task blocked: ${blockingReason || error.message}`, { taskId: task.id });
        },

        /**
         * Handle task status update
         */
        handleTaskStatusChange: async (
            taskId: string,
            status: keyof typeof TASK_STATUS_enum,
            metadata: Record<string, unknown> = {}
        ): Promise<void> => {
            const task = get().tasks.find(t => t.id === taskId);
            if (!task) {
                logger.warn(`Task not found: ${taskId}`);
                return;
            }

            // Use StatusManager for transition
            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: status,
                entity: 'task',
                entityId: taskId,
                metadata: {
                    ...metadata,
                    previousStatus: task.status
                }
            });

            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Task status changed to ${status}${metadata.reason ? `: ${metadata.reason}` : ''}`,
                status,
                metadata: {
                    ...metadata,
                    timestamp: Date.now()
                }
            });

            set(state => ({
                tasks: state.tasks.map(t => 
                    t.id === taskId ? { ...t, status } : t
                ),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));

            logger.info(
                `Task ${task.title} (${taskId}) status changed: ${task.status} -> ${status}`,
                metadata
            );
        },

        /**
         * Add feedback to task
         */
        addTaskFeedback: (
            taskId: string, 
            content: string,
            metadata: {
                userId?: string;
                category?: string;
                priority?: 'low' | 'medium' | 'high';
            } = {}
        ): void => {
            const task = get().tasks.find(t => t.id === taskId);
            if (!task) {
                logger.warn(`Task not found: ${taskId}`);
                return;
            }

            const feedback: FeedbackObject = {
                id: `feedback-${Date.now()}`,
                content,
                status: FEEDBACK_STATUS_enum.PENDING,
                timestamp: new Date(),
                userId: metadata.userId || 'system',
                category: metadata.category,
                priority: metadata.priority
            };

            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Feedback added to task: ${getTaskTitleForLogs(task)}`,
                status: TASK_STATUS_enum.REVISE,
                metadata: {
                    feedback,
                    timestamp: Date.now()
                }
            });

            set(state => ({
                tasks: state.tasks.map(t => t.id === taskId ? {
                    ...t,
                    status: TASK_STATUS_enum.REVISE,
                    feedbackHistory: [...t.feedbackHistory, feedback]
                } : t),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));

            logger.info(`Feedback added to task ${taskId}`, { feedback });
        }
    };
};
