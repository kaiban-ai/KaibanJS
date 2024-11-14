/**
 * @file coreActions.ts
 * @path KaibanJS/src/stores/agentStore/actions/coreActions.ts
 * @description Core agent store actions for status management and logging
 * 
 * @module @stores/agentStore/actions
 */

// Core utilities
import { logger } from '../../../utils/core/logger';
import { LogCreator } from '../../../utils/factories/logCreator';
import { DefaultFactory } from '../../../utils/factories/defaultFactory';

// Managers
import { StatusManager } from '../../../utils/managers/core/StatusManager';

// Import types from canonical locations
import type { 
    AgentType,
    TaskType,
    Log,
    AgentLogMetadata,
    Output
} from '../../../utils/types';

import { AGENT_STATUS_enum } from '../../../utils/types/common/enums';

// Local imports
import { AgentState } from '../state';

/**
 * Creates core actions for agent status management and logging
 */
export const createCoreActions = (
    get: () => AgentState,
    set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void
) => {
    const statusManager = StatusManager.getInstance();

    return {
        /**
         * Updates agent status and creates status log
         */
        handleAgentStatusChange: async (
            agent: AgentType,
            status: keyof typeof AGENT_STATUS_enum,
            task: TaskType
        ): Promise<void> => {
            logger.debug('agent.status.update', {
                agentName: agent.name,
                newStatus: status,
                component: 'AgentStore'
            });

            await statusManager.transition({
                currentStatus: agent.status,
                targetStatus: status,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    previousStatus: agent.status,
                    timestamp: Date.now()
                }
            });

            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Agent ${agent.name} status changed to ${status}`,
                metadata: {
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats(),
                        previousStatus: agent.status,
                        timestamp: Date.now()
                    }
                },
                agentStatus: status,
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status,
                currentAgent: {
                    ...agent,
                    status
                },
                workflowLogs: [...state.workflowLogs, log]
            }));
        },

        /**
         * Adds a new workflow log with proper metadata
         */
        addWorkflowLog: (log: Log): void => {
            logger.debug('workflow.log.add', { 
                logType: log.logType,
                component: 'AgentStore'
            });
            set(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        },

        /**
         * Sets current agent and task with validation
         */
        setCurrentAgentAndTask: (
            agent: AgentType | null,
            task: TaskType | null
        ): void => {
            logger.debug('agent.task.set', {
                agentId: agent?.id,
                taskId: task?.id,
                component: 'AgentStore'
            });

            set({
                currentAgent: agent,
                currentTask: task
            });
        },

        /**
         * Handles agent iteration start with proper status transitions
         */
        handleIterationStart: async (params: { 
            agent: AgentType;
            task: TaskType; 
            iterations: number; 
            maxAgentIterations: number;
        }): Promise<void> => {
            const { agent, task, iterations, maxAgentIterations } = params;

            await statusManager.transition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_START,
                entity: 'agent',
                entityId: agent.id,
                metadata: { iterations, maxAgentIterations }
            });

            logger.debug(`Starting iteration ${iterations + 1}/${maxAgentIterations}`);

            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Starting iteration ${iterations + 1}/${maxAgentIterations}`,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: AGENT_STATUS_enum.ITERATION_START,
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status: AGENT_STATUS_enum.ITERATION_START,
                workflowLogs: [...state.workflowLogs, log],
                stats: {
                    ...state.stats,
                    iterationCount: state.stats.iterationCount + 1
                }
            }));
        },

        /**
         * Handles agent iteration end with proper status transitions
         */
        handleIterationEnd: async (params: { 
            agent: AgentType; 
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
        }): Promise<void> => {
            const { agent, task, iterations, maxAgentIterations } = params;

            await statusManager.transition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.ITERATION_END,
                entity: 'agent',
                entityId: agent.id,
                metadata: { iterations, maxAgentIterations }
            });

            logger.debug(`Completed iteration ${iterations + 1}/${maxAgentIterations}`);

            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Completed iteration ${iterations + 1}/${maxAgentIterations}`,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now()
                },
                agentStatus: AGENT_STATUS_enum.ITERATION_END,
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status: AGENT_STATUS_enum.ITERATION_END,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },

        /**
         * Handles agent output with proper logging and status transitions
         */
        handleAgentOutput: async (params: {
            agent: AgentType;
            task: TaskType;
            output: Output;
            type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
        }): Promise<void> => {
            const { agent, task, output, type } = params;
            
            const metadata: AgentLogMetadata = {
                output: {
                    llmUsageStats: output.llmUsageStats || get().stats.llmUsageStats,
                    thought: output.thought,
                    action: output.action,
                    observation: output.observation,
                    finalAnswer: output.finalAnswer
                },
                timestamp: Date.now()
            };

            let agentStatus: keyof typeof AGENT_STATUS_enum;
            let description: string;

            switch (type) {
                case 'thought':
                    agentStatus = AGENT_STATUS_enum.THOUGHT;
                    description = `Agent thought: ${output.thought}`;
                    break;
                case 'observation':
                    agentStatus = AGENT_STATUS_enum.OBSERVATION;
                    description = `Agent observation: ${output.observation}`;
                    break;
                case 'finalAnswer':
                    agentStatus = AGENT_STATUS_enum.FINAL_ANSWER;
                    description = `Agent final answer: ${output.finalAnswer}`;
                    break;
                case 'selfQuestion':
                    agentStatus = AGENT_STATUS_enum.SELF_QUESTION;
                    description = `Agent self question: ${output.thought}`;
                    break;
                case 'weird':
                    agentStatus = AGENT_STATUS_enum.WEIRD_LLM_OUTPUT;
                    description = 'Agent produced unexpected output format';
                    break;
                default:
                    agentStatus = AGENT_STATUS_enum.THINKING;
                    description = 'Agent processing';
            }

            await statusManager.transition({
                currentStatus: agent.status,
                targetStatus: agentStatus,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    type,
                    ...metadata
                }
            });

            const log = LogCreator.createAgentLog({
                agent,
                task,
                description,
                metadata,
                agentStatus,
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status: agentStatus,
                workflowLogs: [...state.workflowLogs, log],
                stats: {
                    ...state.stats,
                    llmUsageStats: {
                        ...state.stats.llmUsageStats,
                        inputTokens: state.stats.llmUsageStats.inputTokens + (output.llmUsageStats?.inputTokens || 0),
                        outputTokens: state.stats.llmUsageStats.outputTokens + (output.llmUsageStats?.outputTokens || 0),
                        callsCount: state.stats.llmUsageStats.callsCount + 1
                    }
                }
            }));
        }
    };
};

/**
 * Type for core actions when instantiated
 */
export type CoreActions = ReturnType<typeof createCoreActions>;
