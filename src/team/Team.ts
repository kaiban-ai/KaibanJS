/**
 * @file Team.ts
 * @path src/team/Team.ts
 * @description Team implementation for managing agents and tasks
 */

import { v4 as uuidv4 } from 'uuid';
import { createTeamStore } from '@/stores/teamStore';
import { PrettyError } from '../utils/core/errors';
import { logger } from '../utils/core/logger';
import { MessageHistoryManager } from '../utils/managers/messageHistoryManager';
import { teamHandler } from '../utils/handlers/teamHandler';
import { calculateTaskStats } from '../utils/helpers/stats';
import { logPrettyWorkflowResult } from '../utils/helpers/formatting/prettyLogs';
import { 
    TeamStore,
    TeamState,
    ITeam,
    ITeamParams,
    AgentType,
    TaskType,
    WorkflowStats,
    TeamInputs,
    LLMUsageStats
} from '@/utils/types';

import { WorkflowMetadata } from '@/utils/types/workflow/metadata';
import { WorkflowStartResult } from '@/utils/types/team';
import { ModelStats } from '@/utils/types/workflow/stats';

import {
    TASK_STATUS_enum, 
    WORKFLOW_STATUS_enum 
} from "@/utils/types/common/enums";

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
            p95: stats.averageLatency * 1.5, // Approximation
            max: stats.totalLatency
        },
        cost: stats.costBreakdown.total
    };
}

/**
 * Team implementation
 */
export class Team implements ITeam {
    public store: TeamStore;
    private messageHistory: MessageHistoryManager;

    constructor(params: ITeamParams) {
        // Initialize store
        const store = createTeamStore({
            name: params.name,
            agents: params.agents || [],
            tasks: params.tasks || [],
            logLevel: params.logLevel,
            inputs: params.inputs || {},
            env: params.env || {}
        });

        this.store = store;
        this.messageHistory = new MessageHistoryManager();

        // Initialize agents and tasks with proper type annotations
        params.agents?.forEach((agent: AgentType) => agent.initialize(this.store, params.env || {}));
        params.tasks?.forEach((task: TaskType) => task.setStore(this.store));

        // Set initial state
        this.store.setState({
            agents: params.agents || [],
            tasks: params.tasks || []
        } as Partial<TeamState>);

        logger.info(`Team "${params.name}" initialized with ${params.agents?.length || 0} agents and ${params.tasks?.length || 0} tasks`);
    }

    getStore(): TeamStore {
        return this.store;
    }

    useStore() {
        return this.store;
    }

    subscribeToChanges(
        listener: (newValues: Partial<TeamState>) => void,
        properties?: Array<keyof TeamState>
    ): () => void {
        if (!properties) {
            return this.store.subscribe(listener);
        }

        return this.store.subscribe((state: TeamState) => {
            const relevantChanges = properties.reduce((acc, prop) => {
                // Use type assertion to tell TypeScript this is safe
                acc[prop] = (state as any)[prop];
                return acc;
            }, {} as Partial<TeamState>);
            listener(relevantChanges);
        });
    }

    async start(inputs: TeamInputs = {}): Promise<WorkflowStartResult> {
        try {
            const result = await teamHandler.handleWorkflowStart(this.store, inputs);
            if (!result.success) {
                throw result.error || new Error('Failed to start workflow');
            }

            return {
                status: this.store.getState().teamWorkflowStatus,
                result: this.store.getState().workflowResult,
                stats: this.getWorkflowStats()
            };
        } catch (error) {
            const prettyError = new PrettyError({
                message: 'Failed to start workflow',
                rootError: error instanceof Error ? error : new Error(String(error)),
                context: { inputs },
                recommendedAction: 'Check input parameters and team configuration'
            });
            throw prettyError;
        }
    }

    provideFeedback(taskId: string, feedbackContent: string): void {
        this.store.getState().provideFeedback(taskId, feedbackContent);
    }

    validateTask(taskId: string): void {
        this.store.getState().validateTask(taskId);
    }

    getTasksByStatus(status: keyof typeof TASK_STATUS_enum): TaskType[] {
        return this.store.getState().tasks.filter(task => task.status === status);
    }

    getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum {
        return this.store.getState().teamWorkflowStatus;
    }

    getWorkflowResult(): unknown {
        return this.store.getState().workflowResult;
    }

    getWorkflowStats(): WorkflowStats {
        const state = this.store.getState();
        const tasks = state.tasks;
        const combinedStats = tasks.reduce((acc, task) => {
            const taskStats = calculateTaskStats(task, state.workflowLogs);
            acc.llmUsageStats.inputTokens += taskStats.llmUsageStats.inputTokens;
            acc.llmUsageStats.outputTokens += taskStats.llmUsageStats.outputTokens;
            acc.llmUsageStats.callsCount += taskStats.llmUsageStats.callsCount;
            acc.iterationCount += taskStats.iterationCount;
            return acc;
        }, {
            llmUsageStats: {
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
            },
            iterationCount: 0
        });

        const workflowStats: WorkflowStats = {
            startTime: state.workflowLogs[0]?.timestamp || Date.now(),
            endTime: Date.now(),
            duration: (Date.now() - (state.workflowLogs[0]?.timestamp || Date.now())) / 1000,
            llmUsageStats: combinedStats.llmUsageStats,
            iterationCount: combinedStats.iterationCount,
            costDetails: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: combinedStats.llmUsageStats.inputTokens, cost: 0 },
                    completionTokens: { count: combinedStats.llmUsageStats.outputTokens, cost: 0 }
                }
            },
            taskCount: tasks.length,
            agentCount: state.agents.length,
            teamName: state.name,
            messageCount: state.workflowLogs.length,
            modelUsage: tasks.reduce((usage, task) => {
                const stats = calculateTaskStats(task, state.workflowLogs);
                if (task.agent?.llmConfig?.model) {
                    const modelName = task.agent.llmConfig.model;
                    if (!usage[modelName]) {
                        usage[modelName] = convertToModelStats(stats.llmUsageStats);
                    } else {
                        const existing = usage[modelName];
                        existing.tokens.input += stats.llmUsageStats.inputTokens;
                        existing.tokens.output += stats.llmUsageStats.outputTokens;
                        existing.requests.successful += stats.llmUsageStats.callsCount - stats.llmUsageStats.callsErrorCount;
                        existing.requests.failed += stats.llmUsageStats.callsErrorCount;
                        // Update latency metrics
                        existing.latency.average = (existing.latency.average + stats.llmUsageStats.averageLatency) / 2;
                        existing.latency.max = Math.max(existing.latency.max, stats.llmUsageStats.totalLatency);
                        existing.latency.p95 = existing.latency.average * 1.5; // Approximation
                        existing.cost += stats.llmUsageStats.costBreakdown.total;
                    }
                }
                return usage;
            }, {} as Record<string, ModelStats>)
        };

        if (state.teamWorkflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
            const workflowResultMetadata = {
                result: String(state.workflowResult),
                duration: workflowStats.duration,
                llmUsageStats: workflowStats.llmUsageStats,
                iterationCount: workflowStats.iterationCount,
                costDetails: workflowStats.costDetails,
                teamName: state.name,
                taskCount: workflowStats.taskCount,
                agentCount: workflowStats.agentCount
            };

            logPrettyWorkflowResult({ metadata: workflowResultMetadata });
        }

        return workflowStats;
    }
}

export default Team;