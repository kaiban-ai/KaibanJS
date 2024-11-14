/**
 * @file taskActions.ts
 * @path KaibanJS/src/stores/teamStore/actions/taskActions.ts
 * @description Task management actions for the team store
 */

import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { MetadataFactory } from '@/utils/factories/metadataFactory';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';
import { logPrettyTaskCompletion, logPrettyTaskStatus } from '@/utils/helpers/formatting/prettyLogs';
import { getTaskTitleForLogs } from '@/utils/helpers/tasks/taskUtils';
import { ErrorType } from '@/utils/types/common/errors';
import { LLMUsageStats } from '@/utils/types/llm/responses';
import { CostDetails } from '@/utils/types/workflow';

import type { 
    TeamState,
    TaskType,
    AgentType,
    TaskResult,
    TASK_STATUS_enum
} from '@/utils/types';

const defaultLLMUsageStats: LLMUsageStats = {
    inputTokens: 0,
    outputTokens: 0,
    callsCount: 0,
    callsErrorCount: 0,
    parsingErrors: 0,
    totalLatency: 0,
    averageLatency: 0,
    lastUsed: Date.now(),
    memoryUtilization: {
        peakMemoryUsage: 0,
        averageMemoryUsage: 0,
        cleanupEvents: 0
    },
    costBreakdown: {
        input: 0,
        output: 0,
        total: 0,
        currency: 'USD'
    }
};

// Creates task management actions
export const createTaskActions = (
    get: () => TeamState,
    set: (fn: (state: TeamState) => Partial<TeamState>) => void
) => ({
    handleTaskStatusChange: (
        taskId: string,
        status: keyof typeof TASK_STATUS_enum,
        metadata?: {
            changedBy?: string;
            reason?: string;
            timestamp?: number;
            previousStatus?: keyof typeof TASK_STATUS_enum;
            statusDuration?: number;
        }
    ): void => {
        const state = get();
        const task = state.tasks.find((t: TaskType) => t.id === taskId);
        
        if (!task) {
            logger.error(`Task not found: ${taskId}`);
            return;
        }

        const taskNumber = state.tasks.findIndex((t: TaskType) => t.id === taskId) + 1;
        
        logPrettyTaskStatus({
            currentTaskNumber: taskNumber,
            totalTasks: state.tasks.length,
            taskTitle: task.title,
            taskStatus: status,
            agentName: task.agent?.name
        });

        const taskLog = LogCreator.createTaskLog({
            task,
            description: `Task status changed to ${status}: ${getTaskTitleForLogs(task)}`,
            status,
            metadata: {
                ...metadata,
                previousStatus: task.status,
                timestamp: Date.now()
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map((t: TaskType) =>
                t.id === taskId ? { ...t, status } : t
            ),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
    },

    handleTaskCompletion: (params: { 
        agent: AgentType; 
        task: TaskType; 
        result: TaskResult;
        metadata?: {
            duration?: number;
            iterationCount?: number;
            llmUsageStats?: LLMUsageStats;
            costDetails?: CostDetails;
        };
    }): void => {
        const { agent, task, result, metadata } = params;
        const state = get();
        const stats = calculateTaskStats(task, state.workflowLogs);
        
        const taskLog = LogCreator.createTaskLog({
            task,
            description: `Task completed: ${task.title}`,
            status: 'DONE',
            metadata: {
                llmUsageStats: metadata?.llmUsageStats || stats.llmUsageStats,
                costDetails: metadata?.costDetails || calculateTaskCost(
                    agent.llmConfig.model,
                    stats.llmUsageStats || defaultLLMUsageStats
                ),
                iterationCount: metadata?.iterationCount || stats.iterationCount,
                duration: metadata?.duration || stats.duration,
                result
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map((t: TaskType) => 
                t.id === task.id ? { ...t, status: 'DONE', result } : t
            ),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));

        logPrettyTaskCompletion({
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            duration: stats.duration,
            agentName: agent.name,
            agentModel: agent.llmConfig.model,
            taskTitle: task.title,
            currentTaskNumber: state.tasks.findIndex((t: TaskType) => t.id === task.id) + 1,
            totalTasks: state.tasks.length,
            costDetails: calculateTaskCost(
                agent.llmConfig.model,
                stats.llmUsageStats || defaultLLMUsageStats
            )
        });
    },

    handleTaskIncomplete: (params: { 
        agent: AgentType; 
        task: TaskType; 
        error: Error;
        metadata?: {
            iterationCount?: number;
            lastAttemptTime?: number;
            retryCount?: number;
        };
    }): void => {
        const { agent, task, error, metadata } = params;
        logger.warn(`Task ${task.title} incomplete: ${error.message}`);

        const taskLog = LogCreator.createTaskLog({
            task,
            description: `Task incomplete: ${error.message}`,
            status: 'TODO',
            metadata: {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    timestamp: Date.now()
                },
                iterationCount: metadata?.iterationCount,
                lastAttemptTime: metadata?.lastAttemptTime,
                retryCount: metadata?.retryCount,
                llmUsageStats: defaultLLMUsageStats,
                costDetails: calculateTaskCost(
                    task.agent?.llmConfig.model || 'unknown',
                    defaultLLMUsageStats
                ),
                result: null
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map((t: TaskType) => 
                t.id === task.id ? { 
                    ...t, 
                    status: 'TODO',
                    lastError: error.message,
                    iterationCount: metadata?.iterationCount || 0,
                    lastAttemptTime: metadata?.lastAttemptTime || Date.now(),
                    retryCount: metadata?.retryCount || 0
                } : t
            ),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
    },

    handleTaskError: (params: { 
        task: TaskType; 
        error: ErrorType;
        context?: {
            phase?: string;
            attemptNumber?: number;
            lastSuccessfulOperation?: string;
            recoveryPossible?: boolean;
        };
        metadata?: Record<string, unknown>;
    }): void => {
        const { task, error, context, metadata } = params;
        const taskLog = LogCreator.createTaskLog({
            task,
            description: `Task error: ${error.message}`,
            status: 'ERROR',
            metadata: {
                error,
                context,
                ...metadata,
                timestamp: Date.now()
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map((t: TaskType) =>
                t.id === task.id ? { ...t, status: 'ERROR', error: error.message } : t
            ),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
    },

    handleTaskBlocked: (params: { 
        task: TaskType; 
        error: ErrorType;
        blockingReason?: string;
        dependencies?: {
            taskId: string;
            status: keyof typeof TASK_STATUS_enum;
            requiredFor: string;
        }[];
    }): void => {
        const { task, error, blockingReason, dependencies } = params;
        const taskLog = LogCreator.createTaskLog({
            task,
            description: `Task blocked: ${blockingReason || error.message}`,
            status: 'BLOCKED',
            metadata: {
                error,
                blockingReason,
                dependencies,
                timestamp: Date.now()
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map((t: TaskType) =>
                t.id === task.id ? { ...t, status: 'BLOCKED' } : t
            ),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
    },

    workOnTask: async (agent: AgentType, task: TaskType): Promise<void> => {
        logger.debug(`Agent ${agent.name} working on task ${task.title}`);
        
        try {
            const result = await agent.workOnTask(task);
            if (result.error) {
                throw new Error(result.error);
            }
        } catch (error) {
            get().handleTaskError({
                task,
                error: error as ErrorType,
                context: {
                    phase: 'task_execution',
                    taskId: task.id,
                    agentId: agent.id
                }
            });
            throw error;
        }
    }
});

export type TaskActions = ReturnType<typeof createTaskActions>;
export default createTaskActions;
