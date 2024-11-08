/**
 * @file errorActions.ts
 * @path src/stores/teamStore/actions/errorActions.ts
 */

import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';
import { StatusManager } from '@/utils/managers/statusManager';
import { LogCreator } from '@/utils/factories/logCreator';
import { MetadataFactory } from '@/utils/factories/metadataFactory';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { calculateTotalWorkflowCost } from '@/utils/helpers/costs/llmCostCalculator';
import { TeamState } from '../state';
import type { 
    TaskType,
    AgentType,
    ErrorType,
    WorkflowStats,
    ModelStats
} from '@/utils/types';

export const createErrorActions = (
    get: () => TeamState,
    set: (fn: (state: TeamState) => Partial<TeamState>) => void
) => {
    const statusManager = StatusManager.getInstance();

    const createErrorMetadata = (
        task: TaskType,
        error: ErrorType,
        context?: Record<string, unknown>
    ): Record<string, unknown> => {
        const stats = calculateTaskStats(task, get().workflowLogs);
        const modelUsage: Record<string, ModelStats> = {};

        Object.entries(stats.modelUsage || {}).forEach(([model, llmStats]) => {
            modelUsage[model] = {
                tokens: {
                    input: llmStats.inputTokens,
                    output: llmStats.outputTokens
                },
                requests: {
                    successful: llmStats.callsCount - llmStats.callsErrorCount,
                    failed: llmStats.callsErrorCount
                },
                latency: {
                    average: llmStats.averageLatency,
                    p95: llmStats.averageLatency * 1.5,
                    max: llmStats.totalLatency
                },
                cost: llmStats.costBreakdown.total
            };
        });

        const state = get();
        return {
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack,
                context: error.context || context
            },
            stats: {
                ...stats,
                modelUsage
            },
            teamName: state.name,
            taskCount: state.tasks.length,
            agentCount: state.agents.length,
            timestamp: Date.now()
        };
    };

    return {
        handleWorkflowError: async (params: { 
            task: TaskType; 
            error: ErrorType;
            context?: Record<string, unknown>;
        }): Promise<void> => {
            const { task, error, context } = params;
            logger.error(`Workflow Error:`, error.message);

            const metadata = createErrorMetadata(task, error, context);

            await statusManager.transition({
                currentStatus: get().teamWorkflowStatus,
                targetStatus: 'ERRORED',
                entity: 'workflow',
                entityId: get().name,
                metadata
            });

            const errorLog = LogCreator.createWorkflowLog(
                `Workflow error encountered: ${error.message}`,
                'ERRORED',
                metadata as any
            );

            set(state => ({
                teamWorkflowStatus: 'ERRORED',
                workflowResult: {
                    status: 'ERRORED',
                    error: {
                        message: error.message,
                        type: error.name || 'WorkflowError',
                        context: error.context || context,
                        timestamp: Date.now(),
                        taskId: task.id
                    },
                    metadata: metadata as any,
                    erroredAt: Date.now()
                },
                workflowLogs: [...state.workflowLogs, errorLog]
            }));
        },

        handleAgentError: async (params: {
            agent: AgentType;
            task: TaskType;
            error: ErrorType;
            context?: Record<string, unknown>;
        }): Promise<void> => {
            const { agent, task, error, context } = params;
            logger.error(`Agent ${agent.name} error:`, error);

            await statusManager.transition({
                currentStatus: agent.status,
                targetStatus: 'THINKING_ERROR',
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    error,
                    context,
                    taskId: task.id
                }
            });

            const errorLog = LogCreator.createAgentLog({
                agent,
                task,
                description: `Agent error: ${error.message}`,
                metadata: {
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    },
                    timestamp: Date.now()
                },
                agentStatus: 'THINKING_ERROR'
            });

            set(state => ({
                workflowLogs: [...state.workflowLogs, errorLog]
            }));
        },

        handleTaskError: async (params: {
            task: TaskType;
            error: ErrorType;
            context?: Record<string, unknown>;
        }): Promise<void> => {
            const { task, error, context } = params;
            logger.error(`Task ${task.title} error:`, error.message);

            await statusManager.transition({
                currentStatus: task.status,
                targetStatus: 'ERROR',
                entity: 'task',
                entityId: task.id,
                metadata: {
                    error,
                    context,
                    timestamp: Date.now()
                }
            });

            const errorLog = LogCreator.createTaskLog({
                task,
                description: `Task error: ${error.message}`,
                status: 'ERROR',
                metadata: {
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    },
                    timestamp: Date.now()
                }
            });

            set(state => ({
                tasks: state.tasks.map((t: TaskType) =>
                    t.id === task.id ? { 
                        ...t, 
                        status: 'ERROR',
                        error: error.message,
                        lastError: error.message,
                        errorContext: context
                    } : t
                ),
                workflowLogs: [...state.workflowLogs, errorLog]
            }));
        }
    };
};

export type ErrorActions = ReturnType<typeof createErrorActions>;
