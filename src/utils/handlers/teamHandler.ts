/**
 * @file teamHandler.ts
 * @path src/utils/handlers/teamHandler.ts
 * @description Team operations handler implementation
 */

import { logger } from "@/utils/core/logger";
import { PrettyError } from "@/utils/core/errors";
import { calculateTotalWorkflowCost } from "@/utils/helpers/costs/llmCostCalculator";
import { MessageHistoryManager } from "@/utils/managers/messageHistoryManager";
import { MessageHandler } from "./messageHandler";

import {
    TeamStore,
    TeamState,
    TeamEnvironment,
    TeamInputs,
    WorkflowStartResult,
    AgentType,
    TaskType,
    Log,
    ErrorType,
    WorkflowStats,
    LLMUsageStats,
    AgentLogMetadata,
    WorkflowMetadata,
    SystemAgent
} from '@/utils/types';

import { WORKFLOW_STATUS_enum } from "@/utils/types/common/enums";

// Create a system agent for logs that need an agent reference
const SYSTEM_AGENT: SystemAgent = {
    id: 'system',
    name: 'System',
    role: 'System Message Handler',
    goal: 'Handle system-wide messages',
    background: 'Internal system component',
    tools: [],
    status: 'INITIAL',
    maxIterations: 1,
    store: null as any,
    setStore: () => {},
    initialize: () => {},
    setStatus: () => {},
    setEnv: () => {},
    workOnTask: async () => ({ error: '', metadata: { iterations: 0, maxAgentIterations: 0 }}),
    workOnFeedback: async () => {},
    normalizeLlmConfig: (config) => config,
    createLLMInstance: () => {},
    llmConfig: { provider: 'groq', model: 'system' },
    llmInstance: null,
    llmSystemMessage: null,
    forceFinalAnswer: false,
    promptTemplates: {},
    env: null
};

/**
 * Team handler implementation
 */
export class TeamHandler {
    private messageHistory: MessageHistoryManager;
    private messageHandler: MessageHandler;

    constructor() {
        this.messageHistory = new MessageHistoryManager();
        this.messageHandler = new MessageHandler();
    }

    /**
     * Handle workflow start
     */
    async handleWorkflowStart(
        store: TeamStore,
        inputs: Record<string, string | number | boolean | null | undefined> = {}
    ): Promise<WorkflowStartResult> {
        try {
            await this.messageHandler.handleSystemMessage(
                `Workflow started for team ${store.getState().name}`,
                { timestamp: Date.now() }
            );

            const stats = this.calculateWorkflowStats(store);
            const workflowMetadata = this.createWorkflowMetadata(store.getState(), stats, {
                message: 'Workflow initialized with input settings',
                inputs,
                timestamp: Date.now()
            });

            const initialLog = store.prepareNewLog({
                agent: SYSTEM_AGENT,
                task: null,
                logDescription: `Workflow initiated for team ${store.getState().name}`,
                metadata: workflowMetadata,
                logType: 'WorkflowStatusUpdate',
                workflowStatus: 'RUNNING'
            });

            const currentInputs = store.getState().inputs;
            const typedInputs: TeamInputs = {};
            
            // Ensure inputs are properly typed
            Object.entries(inputs).forEach(([key, value]) => {
                if (value === null || value === undefined || 
                    typeof value === 'string' || 
                    typeof value === 'number' || 
                    typeof value === 'boolean') {
                    typedInputs[key] = value;
                }
            });

            store.setState({
                workflowLogs: [...store.getState().workflowLogs, initialLog],
                teamWorkflowStatus: 'RUNNING',
                inputs: { ...currentInputs, ...typedInputs }
            });

            logger.info(`Started workflow for team ${store.getState().name}`);
            
            return {
                status: 'RUNNING',
                result: null,
                stats
            };
        } catch (error) {
            logger.error('Error starting workflow:', error);
            return {
                status: 'ERRORED',
                result: {
                    status: 'ERRORED',
                    error: {
                        message: error instanceof Error ? error.message : String(error),
                        type: 'WorkflowStartError',
                        timestamp: Date.now()
                    },
                    metadata: this.calculateWorkflowStats(store),
                    erroredAt: Date.now()
                },
                stats: this.calculateWorkflowStats(store)
            };
        }
    }

    /**
     * Handle workflow completion
     */
    async handleWorkflowCompletion(
        store: TeamStore,
        result: unknown
    ): Promise<WorkflowStartResult> {
        try {
            const stats = this.calculateWorkflowStats(store);
            
            const completionLog = store.prepareNewLog({
                agent: SYSTEM_AGENT,
                task: null,
                logDescription: 'Workflow completed successfully',
                metadata: {
                    result,
                    ...stats
                },
                logType: 'WorkflowStatusUpdate',
                workflowStatus: 'FINISHED'
            });

            store.setState({
                teamWorkflowStatus: 'FINISHED' as const,
                workflowResult: {
                    status: 'FINISHED',
                    result,
                    metadata: stats,
                    completionTime: Date.now()
                },
                workflowLogs: [...store.getState().workflowLogs, completionLog]
            });

            logger.info('Workflow completed successfully');
            return {
                status: 'FINISHED',
                result: {
                    status: 'FINISHED',
                    result,
                    metadata: stats,
                    completionTime: Date.now()
                },
                stats
            };
        } catch (error) {
            logger.error('Error completing workflow:', error);
            return {
                status: 'ERRORED',
                result: {
                    status: 'ERRORED',
                    error: {
                        message: error instanceof Error ? error.message : String(error),
                        type: 'WorkflowCompletionError',
                        timestamp: Date.now()
                    },
                    metadata: this.calculateWorkflowStats(store),
                    erroredAt: Date.now()
                },
                stats: this.calculateWorkflowStats(store)
            };
        }
    }

    /**
     * Handle workflow error
     */
    async handleWorkflowError(
        store: TeamStore,
        error: Error,
        task?: TaskType
    ): Promise<void> {
        try {
            const prettyError = new PrettyError({
                message: error.message,
                context: {
                    taskId: task?.id,
                    taskTitle: task?.title,
                    teamName: store.getState().name
                },
                recommendedAction: 'Check workflow configuration and task states'
            });

            const stats = this.calculateWorkflowStats(store);
            
            const errorLog = store.prepareNewLog({
                agent: task?.agent || SYSTEM_AGENT,
                task: task || null,
                logDescription: `Workflow error: ${prettyError.message}`,
                metadata: {
                    error: prettyError,
                    ...stats
                },
                logType: 'WorkflowStatusUpdate',
                workflowStatus: 'ERRORED'
            });

            store.setState({
                teamWorkflowStatus: 'ERRORED' as const,
                workflowResult: {
                    status: 'ERRORED',
                    error: {
                        message: prettyError.message,
                        type: prettyError.type,
                        context: prettyError.context,
                        timestamp: Date.now(),
                        taskId: task?.id
                    },
                    metadata: stats,
                    erroredAt: Date.now()
                },
                workflowLogs: [...store.getState().workflowLogs, errorLog]
            });

            logger.error('Workflow error:', prettyError.prettyMessage);
        } catch (handlingError) {
            logger.error('Error handling workflow error:', handlingError);
        }
    }

    /**
     * Handle agent initialization
     */
    async handleAgentInitialization(
        store: TeamStore,
        agent: AgentType,
        env: Record<string, unknown>
    ): Promise<void> {
        try {
            agent.initialize(store, env);
            
            const initLog = store.prepareNewLog({
                agent,
                task: null,
                logDescription: `Agent initialized: ${agent.name}`,
                metadata: {
                    env: Object.keys(env)
                },
                logType: 'AgentStatusUpdate'
            });

            store.setState({
                workflowLogs: [...store.getState().workflowLogs, initLog]
            });

            logger.info(`Initialized agent: ${agent.name}`);
        } catch (error) {
            logger.error('Error initializing agent:', error);
            throw error;
        }
    }

    /**
     * Calculate workflow statistics
     */
    private calculateWorkflowStats(store: TeamStore): WorkflowStats {
        const state = store.getState();
        const endTime = Date.now();
        
        const lastRunningLog = state.workflowLogs
            .slice()
            .reverse()
            .find(log => 
                log.logType === 'WorkflowStatusUpdate' && 
                log.workflowStatus === WORKFLOW_STATUS_enum.RUNNING
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

        const modelUsage: Record<string, typeof llmUsageStats> = {};
        let iterationCount = 0;

        state.workflowLogs.forEach(log => {
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
                        const modelStats = modelUsage[modelName];
                        modelStats.inputTokens += stats.inputTokens;
                        modelStats.outputTokens += stats.outputTokens;
                        modelStats.callsCount += 1;
                    }
                }
                if (log.agentStatus === 'ITERATION_END') {
                    iterationCount += 1;
                }
            }
        });

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
            modelUsage
        };
    }

    /**
     * Create workflow metadata
     */
    private createWorkflowMetadata(
        state: TeamState,
        stats: WorkflowStats,
        additionalData?: Record<string, unknown>
    ): WorkflowMetadata {
        return {
            result: state.workflowResult?.status || '',
            duration: stats.duration,
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            costDetails: stats.costDetails,
            teamName: stats.teamName,
            taskCount: stats.taskCount,
            agentCount: stats.agentCount,
            ...additionalData
        };
    }

    /**
     * Clean up resources
     */
    async cleanup(): Promise<void> {
        await this.messageHistory.clear();
    }
}

// Export singleton instance
export const teamHandler = new TeamHandler();