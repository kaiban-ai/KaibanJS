/**
 * Path: src/team/Team.ts
 */

import { v4 as uuidv4 } from 'uuid';
import { createTeamStore } from '../stores/teamStore';
import { setupWorkflowController } from '../stores/workflowController';
import { PrettyError } from '../utils/core/errors';
import { calculateTaskCost } from '../utils/helpers/llmCostCalculator';
import { logger } from '../utils/core/logger';
import CustomMessageHistory from '../utils/CustomMessageHistory';
import { SystemMessage } from "@langchain/core/messages";
import { logPrettyWorkflowResult } from '../utils/helpers/prettyLogs';

import {
    type TeamStore,
    type UseBoundTeamStore,
    type ITeam,
    type ITeamParams,
    type AgentType,
    type TaskType,
    type ErrorType,
    type TeamState,
    type TaskStats,
    type WorkflowResultProps,
    type WorkflowMetadata,
    type CostDetails,
    type LLMUsageStats
} from '../utils/types';

import { TASK_STATUS_enum, AGENT_STATUS_enum, WORKFLOW_STATUS_enum } from '@/utils/core/enums';

class TeamImplementation implements ITeam {
    public store: TeamStore;
    private messageHistory: CustomMessageHistory;

    constructor(params: ITeamParams) {
        const store = createTeamStore({
            name: params.name,
            agents: params.agents || [],
            tasks: params.tasks || [],
            logLevel: params.logLevel,
            inputs: params.inputs || {},
            env: params.env || {}
        });

        this.store = store;
        this.messageHistory = new CustomMessageHistory();

        params.agents?.forEach(agent => agent.initialize(this.store, params.env || {}));
        params.tasks?.forEach(task => task.setStore(this.store));

        this.store.setState({
            agents: params.agents || [],
            tasks: params.tasks || []
        } as Partial<TeamState>);

        logger.info(`Team "${params.name}" initialized with ${params.agents?.length || 0} agents and ${params.tasks?.length || 0} tasks`);
    }

    getStore(): UseBoundTeamStore {
        return this.store as UseBoundTeamStore;
    }

    useStore(): UseBoundTeamStore {
        return this.store as UseBoundTeamStore;
    }

    subscribeToChanges(listener: (newValues: ReturnType<typeof this.store.getState>) => void): () => void {
        return this.store.subscribe(listener);
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

    getTasks(): TaskType[] {
        return this.store.getState().tasks;
    }

    async start(inputs: Record<string, unknown> = {}): Promise<{ 
        status: string;
        result: unknown;
        stats: Record<string, unknown>;
    }> {
        return new Promise((resolve, reject) => {
            const unsubscribe = this.store.subscribe((state: TeamState) => {
                const status = state.teamWorkflowStatus;
                
                switch (status) {
                    case WORKFLOW_STATUS_enum.FINISHED:
                        unsubscribe();
                        resolve({
                            status,
                            result: state.workflowResult,
                            stats: this.getWorkflowStats()
                        });
                        break;

                    case WORKFLOW_STATUS_enum.ERRORED:
                        unsubscribe();
                        reject(new Error('Workflow encountered an error'));
                        break;

                    case WORKFLOW_STATUS_enum.BLOCKED:
                        unsubscribe();
                        resolve({
                            status,
                            result: null,
                            stats: this.getWorkflowStats()
                        });
                        break;
                }
            });

            try {
                const message = new SystemMessage(JSON.stringify({ inputs }));
                this.messageHistory.addMessage(message);
                
                this.store.setState({
                    teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                    inputs
                } as Partial<TeamState>);

                setupWorkflowController(this.store, {
                    concurrency: 1,
                    taskTimeout: 300000,
                    progressCheckInterval: 5000
                });

                logger.info(`Workflow started for team "${this.store.getState().name}"`);
            } catch (error) {
                const prettyError = new PrettyError({
                    message: 'Failed to start workflow',
                    rootError: error instanceof Error ? error : new Error(String(error)),
                    context: { inputs },
                    recommendedAction: 'Check input parameters and team configuration'
                });
                logger.error(prettyError.prettyMessage);
                reject(prettyError);
                unsubscribe();
            }
        });
    }

    private logPrettyTaskCompletion({
        task,
        agent,
        stats,
        costDetails
    }: {
        task: TaskType;
        agent: AgentType;
        stats: TaskStats;
        costDetails: CostDetails;
    }): void {
        const currentTaskIndex = this.store.getState().tasks.findIndex(t => t.id === task.id);
        const totalTasks = this.store.getState().tasks.length;

        const metadata: WorkflowMetadata = {
            result: String(task.result),
            duration: stats.duration,
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            costDetails,
            teamName: this.store.getState().name,
            taskCount: totalTasks,
            agentCount: this.store.getState().agents.length
        };

        logPrettyWorkflowResult({ metadata });
        logger.info(`Task ${currentTaskIndex + 1}/${totalTasks} completed: ${task.title}`);
    }

    getWorkflowStats(): Record<string, unknown> {
        const state = this.store.getState();
        const endTime = Date.now();
        
        const stats = {
            startTime: endTime,
            endTime,
            duration: 0,
            llmUsageStats: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0
            },
            iterationCount: 0,
            costDetails: {
                costInputTokens: 0,
                costOutputTokens: 0,
                totalCost: 0
            },
            teamName: state.name,
            taskCount: state.tasks.length,
            agentCount: state.agents.length,
            messageCount: this.messageHistory?.length || 0,
            modelUsage: {} as Record<string, LLMUsageStats>
        };

        // Calculate stats from logs and tasks
        this.calculateStats(stats, state);

        // Log workflow result if finished
        if (state.teamWorkflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
            const metadata: WorkflowMetadata = {
                result: String(state.workflowResult),
                duration: stats.duration,
                llmUsageStats: stats.llmUsageStats,
                iterationCount: stats.iterationCount,
                costDetails: stats.costDetails,
                teamName: stats.teamName,
                taskCount: stats.taskCount,
                agentCount: stats.agentCount
            };

            logPrettyWorkflowResult({ metadata });
        }

        return stats;
    }

    private calculateStats(stats: any, state: TeamState): void {
        const firstRunningLog = state.workflowLogs.find(
            log => log.workflowStatus === WORKFLOW_STATUS_enum.RUNNING
        );
        
        if (firstRunningLog) {
            stats.startTime = firstRunningLog.timestamp;
            stats.duration = (stats.endTime - firstRunningLog.timestamp) / 1000;
        }

        state.tasks.forEach(task => {
            if (task.llmUsageStats) {
                this.updateLLMStats(stats, task);
                this.updateModelUsage(stats, task);
            }

            if (task.iterationCount) {
                stats.iterationCount += task.iterationCount;
            }
        });

        this.calculateTotalCost(stats);
    }

private updateLLMStats(stats: any, task: TaskType): void {
    const { llmUsageStats } = task;
    if (!llmUsageStats) return;
    
    stats.llmUsageStats.inputTokens += llmUsageStats.inputTokens;
    stats.llmUsageStats.outputTokens += llmUsageStats.outputTokens;
    stats.llmUsageStats.callsCount += llmUsageStats.callsCount;
    stats.llmUsageStats.callsErrorCount += llmUsageStats.callsErrorCount;
    stats.llmUsageStats.parsingErrors += llmUsageStats.parsingErrors;
}    
    private updateModelUsage(stats: any, task: TaskType): void {
        const modelName = task.agent?.llmConfig?.model;
        if (!modelName || !task.llmUsageStats) return;
    
        if (!stats.modelUsage[modelName]) {
            stats.modelUsage[modelName] = {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0
            };
        }
    
        const modelStats = stats.modelUsage[modelName];
        const { llmUsageStats } = task;
        modelStats.inputTokens += llmUsageStats.inputTokens;
        modelStats.outputTokens += llmUsageStats.outputTokens;
        modelStats.callsCount += llmUsageStats.callsCount;
        modelStats.callsErrorCount += llmUsageStats.callsErrorCount;
        modelStats.parsingErrors += llmUsageStats.parsingErrors;
    }

    private calculateTotalCost(stats: any): void {
        let totalCost = 0;
        Object.entries(stats.modelUsage).forEach(([model, usage]) => {
            const cost = calculateTaskCost(model, usage as LLMUsageStats);
            totalCost += cost.totalCost;
            stats.costDetails.costInputTokens += cost.costInputTokens;
            stats.costDetails.costOutputTokens += cost.costOutputTokens;
        });
        stats.costDetails.totalCost = totalCost;
    }
}

export const Team = TeamImplementation;