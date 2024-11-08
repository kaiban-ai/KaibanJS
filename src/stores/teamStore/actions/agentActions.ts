/**
 * @file agentActions.ts
 * @path src/stores/teamStore/actions/agentActions.ts
 * @description Agent management actions for the team store
 */

import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { defaultValues } from '../state';

import { ErrorType } from '@/utils/types/common/errors';
import { Tool } from 'langchain/tools';

import type { 
    TeamState,
    AgentType,
    TaskType,
    Output,
    AGENT_STATUS_enum,
    BaseMessage
} from '@/utils/types';

/**
 * Creates agent management actions
 */
export const createAgentActions = (
    get: () => TeamState,
    set: (fn: (state: TeamState) => Partial<TeamState>) => void
) => ({
    // Handles agent status changes
    handleAgentStatusChange: (
        agent: AgentType,
        status: keyof typeof AGENT_STATUS_enum,
        task: TaskType
    ): void => {
        const agentLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Agent ${agent.name} status changed to ${status}`,
            metadata: {
                output: {
                    llmUsageStats: defaultValues.llmUsageStats,
                    previousStatus: agent.status,
                    timestamp: Date.now()
                }
            },
            agentStatus: status
        });

        agent.setStatus(status);
        
        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, agentLog]
        }));
    },

    // Handles agent errors
    handleAgentError: (params: {
        agent: AgentType;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
    }): void => {
        const { agent, task, error, context } = params;
        logger.error(`Agent ${agent.name} error:`, error);

        const errorForLog: Error & {
            name: string;
            message: string;
            stack?: string;
            context?: Record<string, unknown>;
        } = {
            name: error.name || 'AgentError',
            message: error.message,
            stack: error.stack,
            context: error.context || context
        };

        const errorLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Agent error: ${error.message}`,
            metadata: {
                error: errorForLog,
                output: {
                    llmUsageStats: defaultValues.llmUsageStats
                },
                timestamp: Date.now()
            },
            agentStatus: 'THINKING_ERROR'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, errorLog]
        }));
    },

    // Handles agent iteration tracking
    handleIterationStart: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void => {
        const { agent, task, iterations, maxAgentIterations } = params;
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Starting iteration ${iterations}/${maxAgentIterations}`,
            metadata: {
                iterations,
                maxAgentIterations,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: defaultValues.llmUsageStats
                }
            },
            agentStatus: 'ITERATION_START'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    // Handles agent iteration completion
    handleIterationEnd: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void => {
        const { agent, task, iterations, maxAgentIterations } = params;
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Completed iteration ${iterations}/${maxAgentIterations}`,
            metadata: {
                iterations,
                maxAgentIterations,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: defaultValues.llmUsageStats
                }
            },
            agentStatus: 'ITERATION_END'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    // Handles maximum iterations exceeded
    handleMaxIterationsExceeded: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
        error: ErrorType;
    }): void => {
        const { agent, task, iterations, maxAgentIterations, error } = params;
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Max iterations (${maxAgentIterations}) exceeded`,
            metadata: {
                iterations,
                maxAgentIterations,
                error,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: defaultValues.llmUsageStats
                }
            },
            agentStatus: 'MAX_ITERATIONS_ERROR'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    // Handles agent thinking states
    handleAgentThinking: (params: {
        agent: AgentType;
        task: TaskType;
        messages: BaseMessage[];
        output?: Output;
    }): void => {
        const { agent, task, messages, output } = params;
        const thinkingLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Agent thinking process`,
            metadata: {
                output: output ? {
                    llmUsageStats: output.llmUsageStats || defaultValues.llmUsageStats,
                    thought: output.thought,
                    action: output.action,
                    observation: output.observation,
                    finalAnswer: output.finalAnswer
                } : undefined,
                messages,
                timestamp: Date.now()
            },
            agentStatus: 'THINKING'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, thinkingLog]
        }));
    },

    // Handles agent output processing
    handleAgentOutput: (params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }): void => {
        const { agent, task, output, type } = params;
        
        const metadata = {
            output: {
                llmUsageStats: output.llmUsageStats || defaultValues.llmUsageStats,
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
            agentStatus
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    // Handles streaming output from the agent
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
                    llmUsageStats: defaultValues.llmUsageStats,
                    content: chunk
                },
                timestamp: Date.now(),
                isDone
            },
            agentStatus: isDone ? 'THINKING_END' : 'THINKING'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    }
});

export type AgentActions = ReturnType<typeof createAgentActions>;
export default createAgentActions;
