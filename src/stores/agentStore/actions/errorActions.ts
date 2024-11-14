/**
 * @file errorActions.ts
 * @path KaibanJS/src/stores/agentStore/actions/errorActions.ts
 * @description Error handling action creators for agent store, integrated with ErrorManager
 *
 * @module @stores/agentStore/actions
 */

import { Tool } from "langchain/tools";

// Core managers
import { ErrorManager } from "@/utils/managers/core/ErrorManager";
import { CoreManager } from "@/utils/managers/core/CoreManager";
import { LogManager } from "@/utils/managers/core/LogManager";



// Types from canonical locations
import type { 
    ErrorHandlerParams, 
    ParsingHandlerParams 
} from '../../../utils/types/';
import type { 
    AgentType,
    TaskType,
    Output
} from '../../../utils/types';
import type { ErrorType } from '../../../utils/types/common/errors';
import { AGENT_STATUS_enum } from "../../../utils/types/";
import type { AgentState } from '../state';

// ─── Error Action Creators ───────────────────────────────────────────────────────

export const createErrorActions = (
    get: () => AgentState,
    set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void
) => {
    // Initialize managers
    const errorManager = ErrorManager.getInstance();
    const logManager = LogManager.getInstance();
    const coreManager = CoreManager.getInstance();

    return {
        /**
         * Handle general agent error through ErrorManager
         */
        handleAgentError: async (params: ErrorHandlerParams): Promise<void> => {
            const { agent, task, error, context } = params;
            
            const errorResult = await errorManager.handleAgentError({
                agent,
                task,
                error,
                context,
                store: {
                    getState: get,
                    setState: set
                }
            });

            set(state => ({
                lastError: errorResult.error,
                status: AgentStatus.Error,
                workflowLogs: [...state.workflowLogs, errorResult.log],
                stats: {
                    ...state.stats,
                    errors: (state.stats.errors || 0) + 1
                }
            }));
        },

        /**
         * Handle agent thinking error through ErrorManager
         */
        handleThinkingError: (params: { 
            task: TaskType; 
            error: ErrorType 
        }): void => {
            const { task, error } = params;
            const currentAgent = get().currentAgent;

            if (!currentAgent) {
                logManager.error('No current agent found for thinking error');
                return;
            }

            const errorResult = errorManager.handleThinkingError({
                agent: currentAgent,
                task,
                error
            });

            set(state => ({
                status: AgentStatus.Error,
                lastError: errorResult.error,
                workflowLogs: [...state.workflowLogs, errorResult.log],
                stats: {
                    ...state.stats,
                    errors: (state.stats.errors || 0) + 1
                }
            }));
        },

        /**
         * Handle tool execution error through ErrorManager
         */
        handleToolError: (params: {
            agent: AgentType;
            task: TaskType;
            tool: Tool;
            error: Error;
            toolName: string;
        }): void => {
            const { agent, task, tool, error, toolName } = params;

            const errorResult = errorManager.handleToolError({
                agent,
                task,
                tool,
                error,
                toolName
            });

            set(state => ({
                status: AgentStatus.Error,
                lastError: errorResult.error,
                workflowLogs: [...state.workflowLogs, errorResult.log],
                stats: {
                    ...state.stats,
                    errors: (state.stats.errors || 0) + 1
                }
            }));
        },

        /**
         * Handle LLM output parsing errors through ErrorManager
         */
        handleParsingError: (params: ParsingHandlerParams): void => {
            const { agent, task, output, llmOutput } = params;

            const errorResult = errorManager.handleParsingError({
                agent,
                task,
                output,
                llmOutput
            });

            set(state => ({
                status: AgentStatus.WeirdLLMOutput,
                workflowLogs: [...state.workflowLogs, errorResult.log],
                stats: {
                    ...state.stats,
                    llmUsageStats: {
                        ...state.stats.llmUsageStats,
                        parsingErrors: (state.stats.llmUsageStats?.parsingErrors || 0) + 1
                    }
                }
            }));
        },

        /**
         * Handle maximum iterations error through ErrorManager
         */
        handleMaxIterationsError: (params: {
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
        }): void => {
            const { task, iterations, maxAgentIterations } = params;
            const currentAgent = get().currentAgent;

            if (!currentAgent) {
                logManager.error('No current agent found for max iterations error');
                return;
            }

            const errorResult = errorManager.handleMaxIterationsError({
                agent: currentAgent,
                task,
                iterations,
                maxAgentIterations
            });

            set(state => ({
                status: AgentStatus.Error,
                lastError: errorResult.error,
                workflowLogs: [...state.workflowLogs, errorResult.log]
            }));
        }
    };
};

/**
 * Type for error actions when instantiated
 */
export type ErrorActions = ReturnType<typeof createErrorActions>;