/**
 * @file ErrorManager.ts
 * @path KaibanJS/src/managers/core/ErrorManager.ts
 * @description Core error management implementation with centralized error handling
 */

import { Tool } from 'langchain/tools';
import CoreManager from './CoreManager';
import LogManager from './LogManager';
import { logger } from '@/utils/core/logger';
//import { LogCreator } from '@/utils/factories/logCreator';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

// Import types from canonical locations
import type { 
    ErrorType,
    ErrorConfig,
    ConfigurationError,
    LLMError
} from '@/utils/types/common/errors';

import type {
    HandlerResult,
    ErrorHandlerParams,
    ToolHandlerParams
} from '@/utils/types/agent/handlers';

import type {
    AgentType,
    TaskType,
    Output,
    ParsedOutput,
    ThinkingResult,
    FeedbackObject
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core error management class
 */
export class ErrorManager extends CoreManager {
    private static instance: ErrorManager;

    private constructor() {
        super();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ErrorManager {
        if (!ErrorManager.instance) {
            ErrorManager.instance = new ErrorManager();
        }
        return ErrorManager.instance;
    }

    /**
     * Handle general error with agent context
     */
    public async handleAgentError(params: ErrorHandlerParams & { 
        store: Required<ErrorHandlerParams>['store'] 
    }): Promise<HandlerResult> {
        const { error, context, task, agent, store } = params;

        try {
            // Create error log with agent info
            const errorLog = store.prepareNewLog({
                task,
                agent,
                logDescription: `Error: ${error.message}`,
                metadata: {
                    error,
                    context,
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                logType: task ? 'TaskStatusUpdate' : 'WorkflowStatusUpdate',
                agentStatus: agent ? AGENT_STATUS_enum.THINKING_ERROR : undefined
            });

            // Update store state
            store.setState((state: any) => ({
                workflowLogs: [...state.workflowLogs, errorLog]
            }));

            logger.error(`Error occurred:`, error);
            return {
                success: false,
                error
            };

        } catch (handlingError) {
            logger.error(`Error handling error:`, handlingError);
            return {
                success: false,
                error: handlingError instanceof Error ? handlingError : new Error(String(handlingError))
            };
        }
    }

    /**
     * Handle LLM-specific error with agent context
     */
    public async handleLLMError(params: ErrorHandlerParams & {
        store: Required<ErrorHandlerParams>['store']
    }): Promise<HandlerResult> {
        const { error, context, task, agent, store } = params;

        try {
            // Create LLM error log with agent context
            const errorLog = store.prepareNewLog({
                task,
                agent,
                logDescription: `LLM Error: ${error.message}`,
                metadata: {
                    error,
                    context,
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                logType: 'AgentStatusUpdate',
                agentStatus: AGENT_STATUS_enum.THINKING_ERROR
            });

            // Update store state
            store.setState((state: any) => ({
                workflowLogs: [...state.workflowLogs, errorLog]
            }));

            logger.error(`LLM error:`, error);
            return {
                success: false,
                error
            };

        } catch (handlingError) {
            logger.error(`Error handling LLM error:`, handlingError);
            return {
                success: false,
                error: handlingError instanceof Error ? handlingError : new Error(String(handlingError))
            };
        }
    }

    /**
     * Handle tool error with agent context
     */
    public async handleToolError(params: ToolHandlerParams & {
        store: Required<ErrorHandlerParams>['store'];
        tool: Required<ToolHandlerParams>['tool'];
    }): Promise<HandlerResult> {
        const { agent, task, tool, error, store } = params;

        try {
            if (!error) {
                throw new Error('Error is required for tool error handling');
            }

            // Create tool error log with agent context
            const errorLog = store.prepareNewLog({
                task,
                agent,
                logDescription: `Tool error: ${error.message}`,
                metadata: {
                    error,
                    tool: tool.name,
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                logType: 'AgentStatusUpdate',
                agentStatus: AGENT_STATUS_enum.USING_TOOL_ERROR
            });

            // Update store state
            store.setState((state: any) => ({
                workflowLogs: [...state.workflowLogs, errorLog]
            }));

            logger.error(`Tool error:`, error);
            return {
                success: false,
                error
            };

        } catch (handlingError) {
            logger.error(`Error handling tool error:`, handlingError);
            return {
                success: false,
                error: handlingError instanceof Error ? handlingError : new Error(String(handlingError))
            };
        }
    }

    /**
     * Handle thinking error with agent context
     */
    public handleThinkingError(params: {
        agent: AgentType;
        task: TaskType;
        error: Error;
    }): HandlerResult {
        const { agent, task, error } = params;

        logger.error(`Thinking error for agent ${agent.name}:`, error);

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Thinking error: ${error.message}`,
            metadata: {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                },
                timestamp: Date.now()
            },
            agentStatus: AGENT_STATUS_enum.THINKING_ERROR
        });

        return {
            success: false,
            error,
            data: log
        };
    }

    /**
     * Handle parsing error with agent context
     */
    public handleParsingError(params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        llmOutput: string;
    }): HandlerResult {
        const { agent, task, output, llmOutput } = params;

        logger.error(`Parsing error for agent ${agent.name}`);

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: 'Failed to parse LLM output',
            metadata: {
                output: {
                    llmUsageStats: output.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                    llmOutput
                },
                timestamp: Date.now()
            },
            agentStatus: AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT
        });

        return {
            success: false,
            error: new Error('Failed to parse LLM output'),
            data: log
        };
    }

    /**
     * Handle maximum iterations error
     */
    public handleMaxIterationsError(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): HandlerResult {
        const { agent, task, iterations, maxAgentIterations } = params;

        const error = new Error(
            `Maximum iterations (${maxAgentIterations}) reached without final answer`
        );

        logger.error(`Max iterations error for agent ${agent.name}:`, error);

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: error.message,
            metadata: {
                error,
                iterations,
                maxAgentIterations,
                timestamp: Date.now()
            },
            agentStatus: AGENT_STATUS_enum.MAX_ITERATIONS_ERROR
        });

        return {
            success: false,
            error,
            data: log
        };
    }

    /**
     * Handle tool feedback error
     */
    public handleToolFeedbackError(params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        error: Error;
        output?: Output;
        parsedOutput?: ParsedOutput;
    }): string {
        const { agent, task, tool, error, parsedOutput } = params;

        logger.error(`Tool feedback error for ${tool.name}:`, error);

        return agent.promptTemplates.TOOL_ERROR_FEEDBACK({
            agent,
            task,
            toolName: tool.name,
            error,
            parsedLLMOutput: parsedOutput || null
        });
    }
}

export default ErrorManager.getInstance();