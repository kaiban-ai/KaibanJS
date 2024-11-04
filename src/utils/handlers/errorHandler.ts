/**
 * @file errorHandler.ts
 * @path src/utils/handlers/errorHandler.ts
 * @description Error handler implementation
 */

import { logger } from "../core/logger";
import { 
    ErrorHandlerParams, 
    ToolHandlerParams,
    HandlerResult,
    IErrorHandler
} from "../types/agent/handlers";
import { PrettyError, LLMConfigurationError } from '../core/errors';
import { Log } from '../types/team/logs';

/**
 * Error handler implementation
 */
export class ErrorHandler implements IErrorHandler {
    /**
     * Handle general error
     */
    async handleError(params: ErrorHandlerParams & { store: Required<ErrorHandlerParams>['store'] }): Promise<HandlerResult> {
        const { error, context, task, agent, store } = params;

        try {
            // Create pretty error
            const prettyError = new PrettyError({
                message: error.message,
                context: {
                    taskId: task?.id,
                    agentId: agent?.id,
                    ...context
                },
                recommendedAction: error.recommendedAction
            });

            // Create error log
            const errorLog = store.prepareNewLog({
                task,
                agent,
                logDescription: `Error: ${prettyError.message}`,
                metadata: {
                    error: prettyError,
                    context
                },
                logType: task ? 'TaskStatusUpdate' : 'WorkflowStatusUpdate'
            }) as Log;

            // Add log to store
            store.setState((state: unknown) => ({
                workflowLogs: [...(state as { workflowLogs: Log[] }).workflowLogs, errorLog]
            }));

            logger.error(`Error occurred:`, prettyError.prettyMessage);
            return {
                success: false,
                error: prettyError
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
     * Handle LLM-specific error
     */
    async handleLLMError(params: ErrorHandlerParams & { store: Required<ErrorHandlerParams>['store'] }): Promise<HandlerResult> {
        const { error, context, task, agent, store } = params;

        try {
            // Create LLM configuration error
            const llmError = new LLMConfigurationError(
                error.message,
                agent?.llmConfig?.provider || 'unknown',
                context?.parameter as string,
                context?.invalidValue,
                context?.expectedFormat as string
            );

            // Create error log
            const errorLog = store.prepareNewLog({
                task,
                agent,
                logDescription: `LLM Error: ${llmError.message}`,
                metadata: {
                    error: llmError,
                    context
                },
                logType: 'AgentStatusUpdate'
            }) as Log;

            // Add log to store
            store.setState((state: unknown) => ({
                workflowLogs: [...(state as { workflowLogs: Log[] }).workflowLogs, errorLog]
            }));

            logger.error(`LLM error occurred:`, llmError.formattedMessage);
            return {
                success: false,
                error: llmError
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
     * Handle tool error
     */
    async handleToolError(params: ToolHandlerParams & { 
        store: Required<ErrorHandlerParams>['store'];
        tool: Required<ToolHandlerParams>['tool'];
    }): Promise<HandlerResult> {
        const { agent, task, tool, error, store } = params;

        try {
            if (!error) {
                throw new Error('Error is required for tool error handling');
            }

            // Create pretty error
            const prettyError = new PrettyError({
                message: error.message,
                context: {
                    taskId: task.id,
                    agentId: agent.id,
                    toolName: tool.name
                },
                recommendedAction: 'Check tool configuration and inputs'
            });

            // Create error log
            const errorLog = store.prepareNewLog({
                task,
                agent,
                logDescription: `Tool error: ${prettyError.message}`,
                metadata: {
                    error: prettyError,
                    tool: tool.name
                },
                logType: 'AgentStatusUpdate'
            }) as Log;

            // Add log to store
            store.setState((state: unknown) => ({
                workflowLogs: [...(state as { workflowLogs: Log[] }).workflowLogs, errorLog]
            }));

            logger.error(`Tool ${tool.name} error:`, prettyError.prettyMessage);
            return {
                success: false,
                error: prettyError
            };

        } catch (handlingError) {
            logger.error(`Error handling tool error:`, handlingError);
            return {
                success: false,
                error: handlingError instanceof Error ? handlingError : new Error(String(handlingError))
            };
        }
    }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();