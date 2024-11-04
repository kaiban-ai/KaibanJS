/**
 * @file errorActions.ts
 * @path src/stores/agentStore/actions/errorActions.ts
 */

import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { errorHandler } from '@/utils/handlers/errorHandler';
import { PrettyError } from '@/utils/core/errors';
import { Tool } from "langchain/tools";
import { ErrorType } from '@/utils/types/common/errors';
import { ErrorHandlerParams, ParsingHandlerParams } from '@/utils/types/agent/handlers';
import { 
    AgentType,
    TaskType,
    Output,
    AgentLogMetadata,
    LogType,
    Log
} from '@/utils/types';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { AgentState } from '../state';

/**
 * Error handling action creators for agent store
 */
export const createErrorActions = (
    get: () => AgentState,
    set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void
) => ({
    /**
     * Handle general agent error
     */
    handleAgentError: async (params: ErrorHandlerParams): Promise<void> => {
        const { agent, task, error, context } = params;

        const prettyError = error instanceof PrettyError ? error : new PrettyError({
            message: error.message,
            context: {
                agentId: agent.id,
                agentName: agent.name,
                taskId: task.id,
                taskTitle: task.title,
                ...context
            },
            rootError: error
        });

        logger.error(`Agent error:`, prettyError.prettyMessage);

        const errorLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Agent error: ${prettyError.message}`,
            metadata: {
                error: prettyError,
                context,
                timestamp: Date.now()
            },
            logType: 'AgentStatusUpdate',
            agentStatus: 'THINKING_ERROR'
        });

        set(state => ({
            lastError: prettyError,
            status: 'THINKING_ERROR',
            workflowLogs: [...state.workflowLogs, errorLog],
            stats: {
                ...state.stats,
                errorCount: state.stats.errorCount + 1
            }
        }));

        await errorHandler.handleError({
            error: prettyError,
            context,
            task,
            agent,
            store: {
                getState: () => get(),
                setState: (fn: (state: unknown) => unknown) => {
                    set((currentState: AgentState) => fn(currentState) as Partial<AgentState>);
                },
                prepareNewLog: (params: unknown) => LogCreator.createAgentLog(params as any)
            }
        });
    },

    /**
     * Handle agent thinking error
     */
    handleThinkingError: (params: { 
        task: TaskType; 
        error: ErrorType 
    }): void => {
        const { task, error } = params;
        const currentAgent = get().currentAgent;

        if (!currentAgent) {
            logger.error('No current agent found for thinking error');
            return;
        }

        currentAgent.status = 'THINKING_ERROR';

        const errorLog = LogCreator.createAgentLog({
            agent: currentAgent,
            task,
            description: `Thinking error occurred: ${error.message}`,
            metadata: {
                error,
                timestamp: Date.now()
            },
            logType: 'AgentStatusUpdate',
            agentStatus: 'THINKING_ERROR'
        });

        set(state => ({
            status: 'THINKING_ERROR',
            lastError: error,
            workflowLogs: [...state.workflowLogs, errorLog],
            stats: {
                ...state.stats,
                errorCount: state.stats.errorCount + 1
            }
        }));
    },

    /**
     * Handle tool execution error
     */
    handleToolError: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        error: Error;
        toolName: string;
    }): void => {
        const { agent, task, tool, error, toolName } = params;

        const errorLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Tool error: ${toolName}`,
            metadata: {
                tool,
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                timestamp: Date.now()
            },
            logType: 'AgentStatusUpdate',
            agentStatus: 'USING_TOOL_ERROR'
        });

        logger.error(`Tool ${toolName} error:`, error);

        set(state => ({
            status: 'USING_TOOL_ERROR',
            lastError: error,
            workflowLogs: [...state.workflowLogs, errorLog],
            stats: {
                ...state.stats,
                errorCount: state.stats.errorCount + 1
            }
        }));
    },

    /**
     * Handle LLM output parsing errors
     */
    handleParsingError: (params: ParsingHandlerParams): void => {
        const { agent, task, output, llmOutput } = params;

        const llmUsageStats = output.llmUsageStats ?? {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 1,
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

        const errorLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Failed to parse LLM output`,
            metadata: {
                output: {
                    llmUsageStats,
                    thought: output.thought,
                    action: output.action,
                    observation: output.observation,
                    finalAnswer: output.finalAnswer
                },
                rawOutput: llmOutput,
                timestamp: Date.now()
            },
            logType: 'AgentStatusUpdate',
            agentStatus: 'ISSUES_PARSING_LLM_OUTPUT'
        });

        logger.error(`Failed to parse LLM output for agent ${agent.name}`);
        logger.debug('Raw output:', llmOutput);

        set(state => ({
            status: 'ISSUES_PARSING_LLM_OUTPUT',
            workflowLogs: [...state.workflowLogs, errorLog],
            stats: {
                ...state.stats,
                llmUsageStats: {
                    ...state.stats.llmUsageStats,
                    parsingErrors: state.stats.llmUsageStats.parsingErrors + 1
                }
            }
        }));
    },

    /**
     * Handle maximum iterations error
     */
    handleMaxIterationsError: (params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void => {
        const { task, iterations, maxAgentIterations } = params;
        const currentAgent = get().currentAgent;

        if (!currentAgent) {
            logger.error('No current agent found for max iterations error');
            return;
        }

        const error = new PrettyError({
            message: `Maximum iterations (${maxAgentIterations}) exceeded`,
            context: {
                taskId: task.id,
                iterations,
                maxIterations: maxAgentIterations
            }
        });

        const errorLog = LogCreator.createAgentLog({
            agent: currentAgent,
            task,
            description: error.message,
            metadata: {
                error,
                iterations,
                maxAgentIterations,
                timestamp: Date.now()
            },
            logType: 'AgentStatusUpdate',
            agentStatus: 'MAX_ITERATIONS_ERROR'
        });

        set(state => ({
            status: 'MAX_ITERATIONS_ERROR',
            lastError: error,
            workflowLogs: [...state.workflowLogs, errorLog]
        }));
    }
});

/**
 * Type for error actions when instantiated
 */
export type ErrorActions = ReturnType<typeof createErrorActions>;