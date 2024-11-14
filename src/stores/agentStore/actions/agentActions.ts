/**
 * @file agentActions.ts
 * @path KaibanJS/src/stores/agentStore/actions/agentActions.ts
 * @description Agent management actions for agent store
 */

// Core utilities
import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

// Managers
import { StatusManager } from '@/utils/managers/core/StatusManager';
import { ThinkingManager } from '@/utils/managers/domain/agent/ThinkingManager';
import { ToolManager } from '@/utils/managers/domain/agent/ToolManager';

// Import types from canonical locations
import type { 
    AgentType,
    TaskType,
    Output,
    BaseMessage,
    ParsedOutput,
    ThinkingResult,
    AgentState,
    AgentLogMetadata
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Creates agent management actions
 */
export const createAgentActions = (
    get: () => AgentState,
    set: (partial: AgentState | ((state: AgentState) => AgentState)) => void
) => {
    const statusManager = StatusManager.getInstance();
    const thinkingManager = ThinkingManager.getInstance();
    const toolManager = ToolManager.getInstance();

    return {
        // Handle agent status changes
        handleAgentStatusChange: async (
            agent: AgentType, 
            status: keyof typeof AGENT_STATUS_enum,
            task: TaskType
        ): Promise<void> => {
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
                ...state,
                status,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },

        // Handle agent thinking process
        handleAgentThinking: async (params: {
            agent: AgentType;
            task: TaskType;
            messages: BaseMessage[];
            output?: Output;
        }): Promise<ThinkingResult> => {
            const { agent, task, messages, output } = params;

            const result = await thinkingManager.executeThinking({
                agent,
                task,
                output,
                messages
            });

            const thinkingLog = LogCreator.createAgentLog({
                agent,
                task,
                description: 'Agent thinking process',
                metadata: {
                    output: result.output,
                    messages,
                    timestamp: Date.now()
                },
                agentStatus: 'THINKING',
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status: 'THINKING',
                workflowLogs: [...state.workflowLogs, thinkingLog]
            }));

            return result;
        },

        // Handle agent output
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
        },

        // Handle streaming output
        handleStreamingOutput: (params: {
            agent: AgentType;
            task: TaskType;
            chunk: string;
            isDone: boolean;
        }): void => {
            const { agent, task, chunk, isDone } = params;
            
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: isDone ? 'Streaming completed' : 'Streaming chunk received',
                metadata: {
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats(),
                        content: chunk
                    },
                    timestamp: Date.now(),
                    isDone
                },
                agentStatus: isDone ? 'THINKING_END' : 'THINKING',
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status: isDone ? 'THINKING_END' : 'THINKING',
                workflowLogs: [...state.workflowLogs, log]
            }));
        },

        // Handle iteration phases
        handleIterationStart: async (params: {
            agent: AgentType;
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
        }): Promise<void> => {
            const { agent, task, iterations, maxAgentIterations } = params;

            await statusManager.transition({
                currentStatus: agent.status,
                targetStatus: 'ITERATION_START',
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
                agentStatus: 'ITERATION_START',
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status: 'ITERATION_START',
                workflowLogs: [...state.workflowLogs, log],
                stats: {
                    ...state.stats,
                    iterationCount: state.stats.iterationCount + 1
                }
            }));
        },

        // Handle iteration completion
        handleIterationEnd: async (params: {
            agent: AgentType;
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
        }): Promise<void> => {
            const { agent, task, iterations, maxAgentIterations } = params;

            await statusManager.transition({
                currentStatus: agent.status,
                targetStatus: 'ITERATION_END',
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
                agentStatus: 'ITERATION_END',
                logType: 'AgentStatusUpdate'
            });

            set(state => ({
                status: 'ITERATION_END',
                workflowLogs: [...state.workflowLogs, log]
            }));
        }
    };
};

/**
 * Type for agent actions when instantiated
 */
export type AgentActions = ReturnType<typeof createAgentActions>;