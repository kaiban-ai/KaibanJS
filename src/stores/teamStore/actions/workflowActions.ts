/**
 * @file workflowActions.ts
 * @path KaibanJS/src/stores/teamStore/actions/workflowActions.ts
 * @description Workflow management actions for the team store
 */

import { logger } from '@/utils/core/logger';
import { StatusManager } from '@/utils/managers/statusManager';
import { LogCreator } from '@/utils/factories/logCreator';
import { MetadataFactory } from '@/utils/factories/metadataFactory';
import { calculateTotalWorkflowCost } from '@/utils/helpers/costs/llmCostCalculator';
import { logPrettyWorkflowStatus, logPrettyWorkflowResult } from '@/utils/helpers/formatting/prettyLogs';
import { calculateTaskStats } from '@/utils/helpers/stats';

import { WORKFLOW_STATUS_enum } from "@/utils/types/common/enums";
import { ErrorType } from '@/utils/types/common/errors';
import { ModelStats, TaskStatsWithModelUsage } from '@/utils/types/workflow/stats';

import type { 
    TeamState, 
    TeamInputs, 
    TaskType,
    WorkflowStats,
    WorkflowResult
} from '@/utils/types';

function convertToModelStats(stats: TaskStatsWithModelUsage): Record<string, ModelStats> {
    const modelUsage: Record<string, ModelStats> = {};
    
    for (const [model, llmStats] of Object.entries(stats.modelUsage)) {
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
                p95: llmStats.totalLatency * 1.5,
                max: llmStats.totalLatency
            },
            cost: llmStats.costBreakdown?.total || 0
        };
    }

    return modelUsage;
}

export const createWorkflowActions = (
    get: () => TeamState,
    set: (fn: (state: TeamState) => Partial<TeamState>) => void
) => {
    const statusManager = StatusManager.getInstance();

    return {
        startWorkflow: async (inputs?: TeamInputs): Promise<void> => {
            const state = get();
            logger.info(`🚀 Team *${state.name}* starting workflow`);
            
            await get().resetWorkflowState();

            if (inputs) {
                get().setInputs(inputs);
            }

            await statusManager.transition({
                currentStatus: state.teamWorkflowStatus,
                targetStatus: 'RUNNING',
                entity: 'workflow',
                entityId: state.name,
                metadata: {
                    inputs,
                    timestamp: Date.now()
                }
            });

            const stats = get().getWorkflowStats();
            const workflowMetadata = MetadataFactory.forWorkflow(state, stats, {
                message: 'Workflow initialized with input settings',
                inputs,
                timestamp: Date.now()
            });

            const initialLog = LogCreator.createWorkflowLog(
                `Workflow initiated for team *${state.name}*`,
                'RUNNING',
                workflowMetadata
            );

            set(state => ({
                workflowLogs: [...state.workflowLogs, initialLog],
                teamWorkflowStatus: 'RUNNING',
            }));

            const tasks = state.tasks;
            if (tasks.length > 0 && tasks[0].status === 'TODO') {
                get().handleTaskStatusChange(tasks[0].id, 'DOING');
            }
        },

        handleWorkflowStatusChange: async (status: keyof typeof WORKFLOW_STATUS_enum): Promise<void> => {
            const state = get();
            logger.info(`Changing workflow status to: ${status}`);

            await statusManager.transition({
                currentStatus: state.teamWorkflowStatus,
                targetStatus: status,
                entity: 'workflow',
                entityId: state.name,
                metadata: {
                    previousStatus: state.teamWorkflowStatus,
                    timestamp: Date.now()
                }
            });

            const workflowStats = get().getWorkflowStats();
            const metadata = MetadataFactory.forWorkflow(state, workflowStats, {
                previousStatus: state.teamWorkflowStatus,
                timestamp: Date.now()
            });

            const statusLog = LogCreator.createWorkflowLog(
                `Workflow status changed to ${status}`,
                status,
                metadata
            );

            set(state => ({
                teamWorkflowStatus: status,
                workflowLogs: [...state.workflowLogs, statusLog]
            }));

            logPrettyWorkflowStatus({ 
                status, 
                message: `Workflow status changed to ${status}` 
            });

            switch (status) {
                case 'FINISHED':
                    get().finishWorkflowAction();
                    break;
                case 'BLOCKED':
                    logger.warn('Workflow blocked - waiting for resolution');
                    break;
                case 'STOPPING':
                    logger.info('Workflow is being stopped gracefully');
                    break;
                case 'ERRORED':
                    logger.error('Workflow encountered an error');
                    break;
            }
        },

        handleWorkflowError: (params: { 
            task: TaskType; 
            error: ErrorType 
        }): void => {
            const { task, error } = params;
            const state = get();
            logger.error(`Workflow Error:`, error.message);
            
            const stats = calculateTaskStats(task, state.workflowLogs);
            const workflowStats: WorkflowStats = {
                startTime: stats.startTime,
                endTime: stats.endTime,
                duration: stats.duration,
                llmUsageStats: stats.llmUsageStats,
                iterationCount: stats.iterationCount,
                costDetails: calculateTotalWorkflowCost(stats.modelUsage),
                taskCount: state.tasks.length,
                agentCount: state.agents.length,
                teamName: state.name,
                messageCount: state.workflowLogs.length,
                modelUsage: convertToModelStats(stats)
            };

            const workflowMetadata = MetadataFactory.forWorkflow(state, workflowStats, {
                error,
                errorTimestamp: Date.now()
            });

            const errorLog = LogCreator.createWorkflowLog(
                `Workflow error encountered: ${error.message}`,
                'ERRORED',
                workflowMetadata
            );

            set(state => ({
                teamWorkflowStatus: 'ERRORED',
                workflowResult: {
                    status: 'ERRORED',
                    error: {
                        message: error.message,
                        type: error.name || 'WorkflowError',
                        context: error.context,
                        timestamp: Date.now(),
                        taskId: task.id
                    },
                    metadata: workflowStats,
                    erroredAt: Date.now()
                },
                workflowLogs: [...state.workflowLogs, errorLog]
            }));

            statusManager.transition({
                currentStatus: state.teamWorkflowStatus,
                targetStatus: 'ERRORED',
                entity: 'workflow',
                entityId: state.name,
                metadata: {
                    error,
                    errorTimestamp: Date.now()
                }
            });
        },

        handleWorkflowBlocked: (params: { 
            task: TaskType; 
            error: ErrorType 
        }): void => {
            const { task, error } = params;
            const state = get();
            logger.warn(`Workflow blocked at task ${task.title}: ${error.message}`);
            
            const stats = calculateTaskStats(task, state.workflowLogs);
            const workflowStats: WorkflowStats = {
                startTime: stats.startTime,
                endTime: stats.endTime,
                duration: stats.duration,
                llmUsageStats: stats.llmUsageStats,
                iterationCount: stats.iterationCount,
                costDetails: calculateTotalWorkflowCost(stats.modelUsage),
                taskCount: state.tasks.length,
                agentCount: state.agents.length,
                teamName: state.name,
                messageCount: state.workflowLogs.length,
                modelUsage: convertToModelStats(stats)
            };
            
            set(state => ({
                teamWorkflowStatus: 'BLOCKED',
                workflowResult: {
                    status: 'BLOCKED',
                    blockedTasks: [{
                        taskId: task.id,
                        taskTitle: task.title,
                        reason: error.message
                    }],
                    metadata: workflowStats
                }
            }));

            statusManager.transition({
                currentStatus: state.teamWorkflowStatus,
                targetStatus: 'BLOCKED',
                entity: 'workflow',
                entityId: state.name,
                metadata: {
                    task,
                    error,
                    timestamp: Date.now()
                }
            });
        },

        finishWorkflowAction: (): void => {
            const state = get();
            const stats = get().getWorkflowStats();
            logger.info('Workflow completed successfully');
            
            set(state => ({
                teamWorkflowStatus: 'FINISHED',
                workflowResult: {
                    status: 'FINISHED',
                    result: 'Workflow completed successfully',
                    metadata: stats,
                    completionTime: Date.now()
                }
            }));

            logPrettyWorkflowResult({
                metadata: {
                    result: 'Workflow completed successfully',
                    duration: stats.duration,
                    llmUsageStats: stats.llmUsageStats,
                    iterationCount: stats.iterationCount,
                    costDetails: stats.costDetails,
                    teamName: state.name,
                    taskCount: state.tasks.length,
                    agentCount: state.agents.length
                }
            });

            statusManager.transition({
                currentStatus: state.teamWorkflowStatus,
                targetStatus: 'FINISHED',
                entity: 'workflow',
                entityId: state.name,
                metadata: {
                    result: 'Workflow completed successfully',
                    completionTime: Date.now()
                }
            });
        },

        setTeamWorkflowStatus: (status: keyof typeof WORKFLOW_STATUS_enum): void => {
            const state = get();
            logger.info(`Changing workflow status to: ${status}`);

            statusManager.transition({
                currentStatus: state.teamWorkflowStatus,
                targetStatus: status,
                entity: 'workflow',
                entityId: state.name,
                metadata: {
                    timestamp: Date.now()
                }
            });

            set(state => ({ 
                teamWorkflowStatus: status,
                workflowLogs: [
                    ...state.workflowLogs, 
                    LogCreator.createWorkflowLog(
                        `Workflow status set to ${status}`,
                        status,
                        MetadataFactory.forWorkflow(state, state.getWorkflowStats(), {
                            timestamp: Date.now()
                        })
                    )
                ]
            }));

            logPrettyWorkflowStatus({ 
                status, 
                message: `Workflow status changed to ${status}` 
            });
        }
    };
};

export type WorkflowActions = ReturnType<typeof createWorkflowActions>;
export default createWorkflowActions;
