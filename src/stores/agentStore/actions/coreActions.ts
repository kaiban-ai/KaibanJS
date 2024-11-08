/**
 * @file coreActions.ts
 * @path src/stores/agentStore/actions/coreActions.ts
 * @description Core agent store actions for status management and logging
 */

import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { StatusManager } from '@/utils/managers/statusManager';

import { 
    AgentType, 
    TaskType,
    Log,
    AgentLogMetadata, 
    Output 
} from '@/utils/types';

import { AgentState } from '../state';

// Core action creators for agent status management and logging
export const createCoreActions = (
    get: () => AgentState,
    set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void
) => {
    const statusManager = StatusManager.getInstance();

    return {
        // Update agent status and create status log
        handleAgentStatusChange: async (
            agent: AgentType, 
            status: keyof typeof AGENT_STATUS_enum
        ): Promise<void> => {
            logger.debug(`Updating agent ${agent.name} status to: ${status}`);
            
            const currentTask = get().currentTask;
            if (!currentTask) {
                logger.warn('No current task found for status update');
                return;
            }

            try {
                await statusManager.transition({
                    currentStatus: agent.status,
                    targetStatus: status,
                    entity: 'agent',
                    entityId: agent.id,
                    metadata: {
                        agentName: agent.name,
                        taskId: currentTask.id,
                        taskTitle: currentTask.title
                    }
                });

                const log = LogCreator.createAgentLog({
                    agent,
                    task: currentTask,
                    description: `Agent ${agent.name} status changed to ${status}`,
                    metadata: {
                        previousStatus: agent.status,
                        newStatus: status,
                        timestamp: Date.now()
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
            } catch (error) {
                logger.error(`Failed to update agent status: ${error}`);
            }
        },

        // Add a new workflow log
        addWorkflowLog: (log: Log): void => {
            set(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        },

        // Set current agent and task
        setCurrentAgentAndTask: (
            agent: AgentType | null,
            task: TaskType | null
        ): void => {
            set({
                currentAgent: agent,
                currentTask: task
            });
        },

        // Handle agent iteration start
        handleIterationStart: async (params: { 
            agent: AgentType;
            task: TaskType; 
            iterations: number; 
            maxAgentIterations: number;
        }): Promise<void> => {
            const { agent, task, iterations, maxAgentIterations } = params;

            try {
                await statusManager.transition({
                    currentStatus: agent.status,
                    targetStatus: 'ITERATION_START',
                    entity: 'agent',
                    entityId: agent.id,
                    metadata: { iterations, maxAgentIterations }
                });

                logger.debug(`Starting iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`);
                
                const log = LogCreator.createAgentLog({
                    agent,
                    task,
                    description: `Starting iteration ${iterations + 1}/${maxAgentIterations}`,
                    metadata: {
                        iterations,
                        maxAgentIterations,
                        timestamp: Date.now()
                    },
                    agentStatus: 'ITERATION_START',
                    logType: 'AgentStatusUpdate'
                });

                set(state => ({
                    stats: {
                        ...state.stats,
                        iterationCount: state.stats.iterationCount + 1
                    },
                    workflowLogs: [...state.workflowLogs, log]
                }));
            } catch (error) {
                logger.error(`Failed to start iteration: ${error}`);
            }
        },

        // Handle agent iteration end
        handleIterationEnd: async (params: { 
            agent: AgentType; 
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
        }): Promise<void> => {
            const { agent, task, iterations, maxAgentIterations } = params;

            try {
                await statusManager.transition({
                    currentStatus: agent.status,
                    targetStatus: 'ITERATION_END',
                    entity: 'agent',
                    entityId: agent.id,
                    metadata: { iterations, maxAgentIterations }
                });

                logger.debug(`Completed iteration ${iterations + 1}/${maxAgentIterations} for agent ${agent.name}`);
                
                const log = LogCreator.createAgentLog({
                    agent,
                    task,
                    description: `Completed iteration ${iterations + 1}/${maxAgentIterations}`,
                    metadata: {
                        iterations,
                        maxAgentIterations,
                        timestamp: Date.now()
                    },
                    agentStatus: 'ITERATION_END',
                    logType: 'AgentStatusUpdate'
                });

                set(state => ({
                    workflowLogs: [...state.workflowLogs, log]
                }));
            } catch (error) {
                logger.error(`Failed to end iteration: ${error}`);
            }
        },

        // Handle agent output with proper logging
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
                    agentStatus = 'THOUGHT';
                    description = `Agent thought: ${output.thought}`;
                    break;
                case 'observation':
                    agentStatus = 'OBSERVATION';
                    description = `Agent observation: ${output.observation}`;
                    break;
                case 'finalAnswer':
                    agentStatus = 'FINAL_ANSWER';
                    description = `Agent final answer: ${output.finalAnswer}`;
                    break;
                case 'selfQuestion':
                    agentStatus = 'SELF_QUESTION';
                    description = `Agent self question: ${output.thought}`;
                    break;
                case 'weird':
                    agentStatus = 'WEIRD_LLM_OUTPUT';
                    description = 'Agent produced unexpected output format';
                    break;
                default:
                    agentStatus = 'THINKING';
                    description = 'Agent processing';
            }

            try {
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
            } catch (error) {
                logger.error(`Failed to handle agent output: ${error}`);
            }
        }
    };
};

/**
 * Type for core actions when instantiated
 */
export type CoreActions = ReturnType<typeof createCoreActions>;
