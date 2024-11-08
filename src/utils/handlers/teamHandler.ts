/**
 * @file teamHandler.ts
 * @path src/utils/handlers/teamHandler.ts
 * @description Team handler implementation
 */

import { logger } from "@/utils/core/logger";
import { PrettyError } from "@/utils/core/errors";
import { calculateTotalWorkflowCost } from "@/utils/helpers/costs/llmCostCalculator";
import { MessageHistoryManager } from "@/utils/managers/messageHistoryManager";
import { MessageHandler } from "./messageHandler";
import DefaultFactory from "../factories/defaultFactory";
import MetadataFactory from "../factories/metadataFactory";
import LogCreator from "../factories/logCreator";

import type {
    TeamStore,
    TeamState,
    TeamInputs,
    TaskType,
    WorkflowStats,
    LLMUsageStats,
    SystemAgent
} from '@/utils/types';

import { WorkflowStartResult } from "@/utils/types/workflow/base";
import { WORKFLOW_STATUS_enum, AGENT_STATUS_enum } from "@/utils/types/common/enums";
import { ModelUsageStats } from "@/utils/types/workflow/stats"; 

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
    env: null,
    messageHistory: new MessageHistoryManager()
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
            const workflowMetadata = MetadataFactory.forWorkflow(store.getState(), stats, {
                message: 'Workflow initialized with input settings',
                inputs,
                timestamp: Date.now()
            });

            const initialLog = LogCreator.createWorkflowLog(
                `Workflow initiated for team ${store.getState().name}`,
                'RUNNING',
                workflowMetadata
            );

            const currentInputs = store.getState().inputs;
            const typedInputs: TeamInputs = {};

            Object.entries(inputs).forEach(([key, value]) => {
                if (value === null || value === undefined || 
                    typeof value === 'string' || 
                    typeof value === 'number' || 
                    typeof value === 'boolean') {
                    typedInputs[key] = value;
                }
            });

            store.setState((state: TeamState) => ({
                workflowLogs: [...state.workflowLogs, initialLog],
                teamWorkflowStatus: 'RUNNING',
                inputs: { ...currentInputs, ...typedInputs }
            }));

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

    async handleWorkflowCompletion(
        store: TeamStore,
        result: string
    ): Promise<WorkflowStartResult> {
        try {
            const stats = this.calculateWorkflowStats(store);
            
            const completionLog = LogCreator.createWorkflowLog(
                'Workflow completed successfully',
                'FINISHED',
                { result, ...stats }
            );

            store.setState((state: TeamState) => ({
                teamWorkflowStatus: 'FINISHED',
                workflowResult: {
                    status: 'FINISHED',
                    result,
                    metadata: stats,
                    completionTime: Date.now()
                },
                workflowLogs: [...state.workflowLogs, completionLog]
            }));

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
            
            const errorLog = LogCreator.createWorkflowLog(
                `Workflow error: ${prettyError.message}`,
                'ERRORED',
                { result: '', error: prettyError, ...stats }
            );

            store.setState((state: TeamState) => ({
                teamWorkflowStatus: 'ERRORED',
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
                workflowLogs: [...state.workflowLogs, errorLog]
            }));

            logger.error('Workflow error:', prettyError.prettyMessage);
        } catch (handlingError) {
            logger.error('Error handling workflow error:', handlingError);
        }
    }

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
    
        const llmUsageStats = DefaultFactory.createLLMUsageStats();
    
        const modelUsage: ModelUsageStats = {};
        let iterationCount = 0;
    
        state.workflowLogs.forEach(log => {
            const modelName = log.agent?.llmConfig?.model;
            if (modelName && log.metadata.llmUsageStats) {
                if (!modelUsage[modelName]) {
                    modelUsage[modelName] = {
                        tokens: { input: 0, output: 0 },
                        requests: { successful: 0, failed: 0 },
                        latency: { average: 0, p95: 0, max: 0 },
                        cost: 0
                    };
                }
                const modelStats = modelUsage[modelName];
                const llmStats = log.metadata.llmUsageStats;
    
                modelStats.tokens.input += llmStats.inputTokens;
                modelStats.tokens.output += llmStats.outputTokens;
                modelStats.requests.successful += 1;
                modelStats.cost += llmStats.costBreakdown.total || 0;
            }
            if (log.agentStatus === AGENT_STATUS_enum.ITERATION_END) {
                iterationCount += 1;
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
    

    async cleanup(): Promise<void> {
        await this.messageHistory.clear();
    }
}

// Export singleton instance
export const teamHandler = new TeamHandler();
