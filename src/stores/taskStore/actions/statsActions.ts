/**
 * @file statsActions.ts
 * @path src/stores/taskStore/actions/statsActions.ts
 * @description Statistics and metrics tracking actions for task store
 */

import { logger } from '@/utils/core/logger';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { calculateTaskCost, calculateTotalWorkflowCost } from '@/utils/helpers/costs/llmCostCalculator';
import { LogCreator } from '@/utils/factories/logCreator';

import { ModelStats } from '@/utils/types/workflow';
import { TaskStats } from '@/utils/types';

import { 
    TaskType,
    LLMUsageStats,
    WorkflowStats,
    AgentLogMetadata,
    Output
} from '@/utils/types';

import { AGENT_STATUS_enum, TASK_STATUS_enum } from '@/utils/types/common/enums';
import { TaskStoreState } from '../state';

/**
 * Convert LLM usage stats to model stats
 */
function convertToModelStats(stats: LLMUsageStats): ModelStats {
    return {
        tokens: {
            input: stats.inputTokens,
            output: stats.outputTokens
        },
        requests: {
            successful: stats.callsCount - stats.callsErrorCount,
            failed: stats.callsErrorCount
        },
        latency: {
            average: stats.averageLatency,
            p95: stats.averageLatency * 1.5,
            max: stats.totalLatency
        },
        cost: stats.costBreakdown.total
    };
}

/**
 * Create statistics tracking actions for task store
 */
export const createStatsActions = (
    get: () => TaskStoreState,
    set: (partial: TaskStoreState | ((state: TaskStoreState) => TaskStoreState)) => void
) => ({
    /**
     * Update task statistics
     */
    updateTaskStats: ({
        taskId,
        stats,
        output
    }: {
        taskId: string;
        stats: {
            duration?: number;
            iterationCount?: number;
            llmUsageStats?: LLMUsageStats;
        };
        output?: Output;
    }): void => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
            logger.warn(`Task not found for stats update: ${taskId}`);
            return;
        }

        const currentStats = calculateTaskStats(task, get().workflowLogs);
        const modelCode = task.agent.llmConfig.model;
        const costDetails = calculateTaskCost(modelCode, currentStats.llmUsageStats);

        const statsLog = LogCreator.createTaskLog({
            task,
            description: `Task stats updated`,
            status: task.status,
            metadata: {
                previousStats: currentStats,
                newStats: stats,
                costDetails,
                output
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map(t => t.id === taskId ? {
                ...t,
                duration: stats.duration || t.duration,
                iterationCount: stats.iterationCount || t.iterationCount,
                llmUsageStats: stats.llmUsageStats ? {
                    ...t.llmUsageStats,
                    ...stats.llmUsageStats,
                    costBreakdown: costDetails
                } : t.llmUsageStats
            } as TaskType : t),
            workflowLogs: [...state.workflowLogs, statsLog]
        }));

        logger.debug(`Updated stats for task ${taskId}`, stats);
    },

    /**
     * Calculate cumulative workflow statistics
     */
    calculateWorkflowStats: (): WorkflowStats => {
        const state = get();
        const logs = state.workflowLogs;
        const endTime = Date.now();

        // Find the last running log
        const lastRunningLog = logs
            .slice()
            .reverse()
            .find(log =>
                log.logType === "WorkflowStatusUpdate" && 
                log.workflowStatus === "RUNNING"
            );

        const startTime = lastRunningLog?.timestamp || endTime;
        const duration = (endTime - startTime) / 1000;

        let llmUsageStats: LLMUsageStats = {
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

        const modelUsage: Record<string, LLMUsageStats> = {};
        let iterationCount = 0;

        logs.forEach(log => {
            if (log.timestamp >= startTime && log.logType === 'AgentStatusUpdate') {
                const agentLog = log.metadata as AgentLogMetadata;
                if (agentLog.output?.llmUsageStats) {
                    const stats = agentLog.output.llmUsageStats;
                    llmUsageStats.inputTokens += stats.inputTokens;
                    llmUsageStats.outputTokens += stats.outputTokens;
                    llmUsageStats.callsCount += 1;

                    const modelName = log.agent?.llmConfig?.model;
                    if (modelName) {
                        if (!modelUsage[modelName]) {
                            modelUsage[modelName] = { ...llmUsageStats };
                        }
                        modelUsage[modelName].inputTokens += stats.inputTokens;
                        modelUsage[modelName].outputTokens += stats.outputTokens;
                        modelUsage[modelName].callsCount += 1;
                        modelUsage[modelName].costBreakdown = {
                            ...modelUsage[modelName].costBreakdown,
                            total: modelUsage[modelName].costBreakdown.total + stats.costBreakdown.total
                        };
                    }
                }
                if (log.agentStatus === AGENT_STATUS_enum.THINKING_ERROR) {
                    llmUsageStats.callsErrorCount += 1;
                    const modelName = log.agent?.llmConfig?.model;
                    if (modelName && modelUsage[modelName]) {
                        modelUsage[modelName].callsErrorCount += 1;
                    }
                }
                if (log.agentStatus === AGENT_STATUS_enum.ITERATION_END) {
                    iterationCount += 1;
                }
            }
        });

        const modelStats = Object.entries(modelUsage).reduce(
            (acc, [model, stats]) => ({
                ...acc,
                [model]: convertToModelStats(stats)
            }), 
            {} as Record<string, ModelStats>
        );

        const costDetails = calculateTotalWorkflowCost(modelUsage);

        return {
            startTime,
            endTime,
            duration,
            llmUsageStats,
            iterationCount,
            costDetails,
            taskCount: state.tasks.length,
            agentCount: state.agents.length,
            teamName: state.name,
            messageCount: state.workflowLogs.length,
            modelUsage: modelStats
        };
    },

    /**
     * Log statistics update
     */
    logStatsUpdate: ({
        taskId,
        stats,
        reason
    }: {
        taskId: string;
        stats: Partial<TaskStats>;
        reason?: string;
    }): void => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        const statsLog = LogCreator.createTaskLog({
            task,
            description: `Stats update: ${reason || 'Periodic update'}`,
            status: task.status,
            metadata: {
                stats,
                reason,
                timestamp: Date.now()
            }
        });

        logger.debug(`Stats update for task ${taskId}`, {
            stats,
            reason,
            taskStatus: task.status
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, statsLog]
        }));
    },

    /**
     * Track resource usage
     */
    trackResourceUsage: ({
        taskId,
        resourceStats
    }: {
        taskId: string;
        resourceStats: {
            memory: number;
            tokens: number;
            cpuTime?: number;
        };
    }): void => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        const usageLog = LogCreator.createTaskLog({
            task,
            description: 'Resource usage tracking',
            status: task.status,
            metadata: {
                resourceStats,
                timestamp: Date.now()
            }
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, usageLog]
        }));

        logger.debug(`Resource usage for task ${taskId}`, resourceStats);
    }
});

export type StatsActions = ReturnType<typeof createStatsActions>;