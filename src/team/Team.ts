/**
 * @file Team.ts
 * @description Core Team implementation with updated type system
 */

import { v4 as uuidv4 } from 'uuid';
import { createTeamStore, useTeamStore } from '@/stores/teamStore';
import { PrettyError } from '@/utils/core/errors';
import { logger } from '@/utils/core/logger';
import { DefaultFactory } from '@/utils/factories';
import { LogCreator } from '@/utils/factories/logCreator';
import { MetadataFactory } from '@/utils/factories/metadataFactory';
import { MessageManager } from '@/managers/domain/llm/MessageManager';
import { teamHandler } from '@/utils/handlers/teamHandler';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { logPrettyWorkflowResult } from '@/utils/helpers/formatting/prettyLogs';
import { calculateTotalWorkflowCost } from '@/utils/helpers/costs/llmCostCalculator';
import { subscribeTaskStatusUpdates } from '@/subscribers/taskSubscriber';
import { subscribeWorkflowStatusUpdates } from '@/subscribers/teamSubscriber';

import type {
    ITeam,
    ITeamParams,
    TeamState,
    TeamEnvironment,
    TeamInputs,
    TeamStoreConfig
} from '@/utils/types/team';

import type {
    WorkflowStartResult,
    WorkflowResult,
    WorkflowStats,
    WorkflowError
} from '@/utils/types/workflow';

import type {
    AgentType,
    TaskType,
} from '@/utils/types';

import type { 
    LLMUsageStats,
} from '@/utils/types/llm/responses';
 
import type { 
    ModelStats 
} from '@/utils/types/workflow';

import { 
    TASK_STATUS_enum, 
    WORKFLOW_STATUS_enum,
    AGENT_STATUS_enum,
} from '@/utils/types/common';

export class Team implements ITeam {
    public store: ReturnType<typeof createTeamStore>;
    private messageHistory: MessageHistoryManager;
    private unsubscribers: Array<() => void>;

    constructor(params: ITeamParams) {
        this.validateParams(params);
        this.store = createTeamStore({
            name: params.name,
            agents: params.agents || [],
            tasks: params.tasks || [],
            logLevel: params.logLevel,
            inputs: params.inputs || {},
            env: params.env || {}
        });
        this.messageHistory = new MessageHistoryManager();
        this.unsubscribers = [];
        this.initializeAgentsAndTasks(params);
        this.setupSubscribers();
        logger.info(`Team "${params.name}" initialized with ${params.agents?.length || 0} agents and ${params.tasks?.length || 0} tasks`);
    }

    private validateParams(params: ITeamParams): void {
        if (!params.name) {
            throw new PrettyError({
                message: 'Team name is required',
                context: { params },
                type: 'TeamValidationError'
            });
        }
    }

    private initializeAgentsAndTasks(params: ITeamParams): void {
        params.agents?.forEach((agent: AgentType) => {
            agent.initialize(this.store, params.env || {});
        });
        params.tasks?.forEach((task: TaskType) => {
            task.setStore(this.store);
        });
        this.store.setState((state) => ({
            ...state,
            agents: params.agents || [],
            tasks: params.tasks || []
        }));
    }

    private setupSubscribers(): void {
        const taskUnsubscribe = subscribeTaskStatusUpdates(this.store);
        const workflowUnsubscribe = subscribeWorkflowStatusUpdates(this.store);
        this.unsubscribers.push(taskUnsubscribe);
        this.unsubscribers.push(workflowUnsubscribe);
    }

    public getStore() {
        return this.store;
    }

    public useStore() {
        return this.store;
    }

    public subscribeToChanges(
        listener: (newValues: Partial<TeamState>) => void,
        properties?: Array<keyof TeamState>
    ): () => void {
        if (!properties) {
            return this.store.subscribe(listener);
        }
        return this.store.subscribe((state: TeamState) => {
            const relevantChanges = properties.reduce((acc, prop) => {
                acc[prop] = state[prop];
                return acc;
            }, {} as Partial<TeamState>);
            listener(relevantChanges);
        });
    }

    public async start(inputs: TeamInputs = {}): Promise<WorkflowStartResult> {
        try {
            logger.info(`Starting workflow for team "${this.store.getState().name}"`);
            const result = await teamHandler.handleWorkflowStart(this.store, inputs);
            if (!result) {
                throw new Error('Failed to start workflow');
            }
            return {
                status: this.store.getState().teamWorkflowStatus,
                result: this.store.getState().workflowResult,
                stats: this.getWorkflowStats()
            };
        } catch (error) {
            const prettyError = new PrettyError({
                message: 'Failed to start workflow',
                context: { inputs },
                rootError: error instanceof Error ? error : undefined,
                type: 'WorkflowStartError'
            });
            logger.error('Workflow start error:', prettyError);
            throw prettyError;
        }
    }

    public provideFeedback(taskId: string, feedbackContent: string): void {
        const task = this.store.getState().tasks.find((t: TaskType) => t.id === taskId);
        if (!task) {
            throw new PrettyError({
                message: `Task not found: ${taskId}`,
                type: 'TaskNotFoundError'
            });
        }
        const feedback = DefaultFactory.createFeedbackObject({
            content: feedbackContent,
            taskId: taskId
        });
        const feedbackLog = LogCreator.createTaskLog({
            task,
            description: `Feedback provided: ${feedbackContent}`,
            status: TASK_STATUS_enum.REVISE,
            metadata: {
                feedback,
                timestamp: Date.now()
            }
        });
        this.store.setState((state) => ({
            tasks: state.tasks.map((t: TaskType) => t.id === taskId ? {
                ...t,
                status: TASK_STATUS_enum.REVISE,
                feedbackHistory: [...t.feedbackHistory, feedback]
            } : t),
            workflowLogs: [...state.workflowLogs, feedbackLog]
        }));
        logger.info(`Feedback added to task ${taskId}:`, feedbackContent);
    }

    public validateTask(taskId: string): void {
        const task = this.store.getState().tasks.find((t: TaskType) => t.id === taskId);
        if (!task) {
            throw new PrettyError({
                message: `Task not found: ${taskId}`,
                type: 'TaskNotFoundError'
            });
        }
        if (task.status !== TASK_STATUS_enum.AWAITING_VALIDATION) {
            throw new PrettyError({
                message: `Task ${taskId} is not awaiting validation`,
                context: { currentStatus: task.status },
                type: 'TaskValidationError'
            });
        }
        const validationLog = LogCreator.createTaskLog({
            task,
            description: 'Task validated',
            status: TASK_STATUS_enum.VALIDATED,
            metadata: {
                timestamp: Date.now()
            }
        });
        this.store.setState((state) => ({
            tasks: state.tasks.map((t: TaskType) => t.id === taskId ? {
                ...t,
                status: TASK_STATUS_enum.VALIDATED
            } : t),
            workflowLogs: [...state.workflowLogs, validationLog]
        }));
        logger.info(`Task ${taskId} validated`);
    }

    public getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum {
        return this.store.getState().teamWorkflowStatus;
    }

    public getWorkflowResult(): WorkflowResult {
        return this.store.getState().workflowResult;
    }

    public getWorkflowStats(): WorkflowStats {
        const state = this.store.getState();
        const lastRunningLog = state.workflowLogs
            .slice()
            .reverse()
            .find((log) => 
                log.logType === "WorkflowStatusUpdate" && 
                log.workflowStatus === WORKFLOW_STATUS_enum.RUNNING
            );
        const startTime = lastRunningLog?.timestamp || Date.now();
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        const llmUsageStats = DefaultFactory.createLLMUsageStats();
        const modelUsage: Record<string, ModelStats> = {};
        state.workflowLogs.forEach((log) => {
            if (log.metadata?.output?.llmUsageStats) {
                const stats = log.metadata.output.llmUsageStats;
                llmUsageStats.inputTokens += stats.inputTokens;
                llmUsageStats.outputTokens += stats.outputTokens;
                llmUsageStats.callsCount += stats.callsCount;
                llmUsageStats.callsErrorCount += stats.callsErrorCount;
                const modelName = log.agent?.llmConfig?.model;
                if (modelName) {
                    if (!modelUsage[modelName]) {
                        modelUsage[modelName] = {
                            tokens: { input: 0, output: 0 },
                            requests: { successful: 0, failed: 0 },
                            latency: { average: 0, p95: 0, max: 0 },
                            cost: 0
                        };
                    }
                    const modelStats = modelUsage[modelName];
                    modelStats.tokens.input += stats.inputTokens;
                    modelStats.tokens.output += stats.outputTokens;
                    modelStats.requests.successful += stats.callsCount - stats.callsErrorCount;
                    modelStats.requests.failed += stats.callsErrorCount;
                    modelStats.latency.average = (modelStats.latency.average + stats.averageLatency) / 2;
                    modelStats.latency.max = Math.max(modelStats.latency.max, stats.totalLatency);
                    modelStats.latency.p95 = modelStats.latency.average * 1.5;
                    modelStats.cost += stats.costBreakdown.total;
                }
            }
        });
        const stats: WorkflowStats = {
            startTime,
            endTime,
            duration,
            llmUsageStats,
            iterationCount: state.workflowLogs.filter((log) => 
                log.agentStatus === AGENT_STATUS_enum.ITERATION_END
            ).length,
            costDetails: calculateTotalWorkflowCost(modelUsage),
            taskCount: state.tasks.length,
            agentCount: state.agents.length,
            teamName: state.name,
            messageCount: state.workflowLogs.length,
            modelUsage
        };
        if (state.teamWorkflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
            logPrettyWorkflowResult({
                metadata: {
                    result: String(state.workflowResult),
                    duration: stats.duration,
                    llmUsageStats: stats.llmUsageStats,
                    iterationCount: stats.iterationCount,
                    costDetails: stats.costDetails,
                    teamName: stats.teamName,
                    taskCount: stats.taskCount,
                    agentCount: stats.agentCount
                }
            });
        }
        return stats;
    }

    public async cleanup(): Promise<void> {
        this.unsubscribers.forEach((unsubscribe) => unsubscribe());
        this.unsubscribers = [];
        await this.messageHistory.clear();
        if (this.store.destroy) {
            this.store.destroy();
        }
        logger.debug('Team resources cleaned up');
    }
}

export default Team;
