/**
 * @file errorManager.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\managers\core\errorManager.ts
 * @description Core error management and handling implementation
 * 
 * @module @core
 */

import CoreManager from './coreManager';
import { LogManager } from './logManager';
import { 
    createPrettyError, 
    toErrorType, 
    isPrettyError, 
    ErrorKind, 
    ErrorConfig, 
    PrettyErrorType,
    ErrorType
} from '../../core/errors';
import { logger } from '../../core/logger';
import { MetadataFactory } from '../../factories/metadataFactory';

// Import types from canonical locations
import type { 
    AgentType,
    TaskType,
    TeamStore,
    HandlerResult,
    ErrorHandlerParams,
    ParsingHandlerParams,
    ToolHandlerParams
} from '../../types';

/**
 * Centralized error management implementation
 */
export class ErrorManager extends CoreManager {
    private static instance: ErrorManager;
    protected readonly logManager: LogManager;

    private constructor() {
        super();
        this.logManager = LogManager.getInstance();
    }

    public static getInstance(): ErrorManager {
        if (!ErrorManager.instance) {
            ErrorManager.instance = new ErrorManager();
        }
        return ErrorManager.instance;
    }

    // ─── Agent Error Handling ────────────────────────────────────────────────────

    /**
     * Handle agent-related errors
     */
    public async handleAgentError(params: ErrorHandlerParams & { 
        store: Required<ErrorHandlerParams>['store'] 
    }): Promise<HandlerResult> {
        const { error, context, task, agent, store } = params;

        try {
            const processedError: ErrorType = toErrorType(error);
            const prettyError = this.createPrettyError({
                message: processedError.message,
                type: 'SystemError',
                context: {
                    agentId: agent?.id,
                    taskId: task?.id,
                    ...context,
                    originalError: processedError
                },
                rootError: error instanceof Error ? error : undefined,
                recommendedAction: 'Review agent configuration and retry',
                prettyMessage: `[SystemError] Agent Error: ${processedError.message}`
            });

            const errorMetadata = MetadataFactory.forError(
                { 
                    ...prettyError, 
                    message: prettyError.prettyMessage 
                } as Record<string, unknown>, 
                {
                    agent: agent?.id,
                    task: task?.id
                }
            );

            const errorLog = store.prepareNewLog?.({
                task,
                agent,
                logDescription: `Error: ${processedError.message}`,
                metadata: {
                    error: errorMetadata,
                    context,
                    output: {
                        llmUsageStats: this.createDefaultLLMStats()
                    }
                },
                logType: task ? 'TaskStatusUpdate' : 'WorkflowStatusUpdate',
                agentStatus: agent ? 'THINKING_ERROR' : undefined
            });

            store.setState?.((state: unknown) => {
                const currentState = state as Record<string, any> || {};
                return {
                    ...currentState,
                    workflowLogs: [...(currentState.workflowLogs || []), errorLog].filter(Boolean)
                };
            });

            return {
                success: false,
                error: prettyError,
                data: errorLog
            };

        } catch (handlingError) {
            const processedHandlingError = toErrorType(handlingError);
            logger.error('Error handling agent error:', processedHandlingError);
            
            return {
                success: false,
                error: processedHandlingError,
                data: null
            };
        }
    }

    // ─── LLM Error Handling ─────────────────────────────────────────────────────

    /**
     * Handle LLM-specific errors
     */
    public handleLLMError(params: ErrorHandlerParams): HandlerResult {
        const { error, context, task, agent } = params;

        const processedError: ErrorType = toErrorType(error);
        const prettyError = this.createPrettyError({
            message: 'LLM Processing Error',
            type: 'LLMError',
            context: {
                agentId: agent?.id,
                taskId: task?.id,
                ...context,
                originalError: processedError
            },
            rootError: error instanceof Error ? error : undefined,
            recommendedAction: 'Check LLM configuration and retry',
            prettyMessage: `[LLMError] Processing Error: ${processedError.message}`
        });

        const errorMetadata = MetadataFactory.forError(
            { 
                ...prettyError, 
                message: prettyError.prettyMessage 
            } as Record<string, unknown>, 
            {
                agent: agent?.id,
                task: task?.id
            }
        );

        logger.error('LLM error:', prettyError);

        return {
            success: false,
            error: prettyError,
            data: {
                agent,
                task,
                error: errorMetadata
            }
        };
    }

    // ─── Tool Error Handling ────────────────────────────────────────────────────

    /**
     * Handle tool execution errors
     */
    public handleToolError(params: ToolHandlerParams): HandlerResult {
        const { agent, task, tool, error, toolName } = params;

        const processedError: ErrorType = toErrorType(error);
        const prettyError = this.createPrettyError({
            message: `Tool execution error: ${toolName || 'Unknown Tool'}`,
            type: 'SystemError',
            context: {
                toolName,
                agentId: agent?.id,
                taskId: task?.id,
                originalError: processedError
            },
            rootError: error instanceof Error ? error : undefined,
            recommendedAction: `Investigate tool ${toolName || 'Unknown'} configuration`,
            prettyMessage: `[SystemError] Tool Error: ${toolName || 'Unknown Tool'}`
        });

        const errorMetadata = MetadataFactory.forToolExecution({
            toolName: toolName || 'Unknown',
            input: tool,
            error: error instanceof Error ? error : undefined
        });

        logger.error('Tool error:', prettyError);

        return {
            success: false,
            error: prettyError,
            data: {
                agent,
                task,
                tool,
                error: errorMetadata
            }
        };
    }

    // ─── Parsing Error Handling ──────────────────────────────────────────────────

    /**
     * Handle parsing errors
     */
    public handleParsingError(params: ParsingHandlerParams): HandlerResult {
        const { agent, task, output, llmOutput } = params;

        const prettyError = this.createPrettyError({
            message: 'Failed to parse LLM output',
            type: 'ValidationError',
            context: {
                agentId: agent?.id,
                taskId: task?.id,
                llmOutput,
                originalOutput: output
            },
            recommendedAction: 'Review LLM output parsing logic',
            prettyMessage: `[ValidationError] Parsing Failed: Unable to parse LLM output`
        });

        const errorMetadata = MetadataFactory.forError(
            { 
                ...prettyError, 
                message: prettyError.prettyMessage 
            } as Record<string, unknown>, 
            {
                agent: agent?.id,
                task: task?.id,
                llmOutput,
                originalOutput: output
            }
        );

        logger.error('Parsing error:', prettyError);

        return {
            success: false,
            error: prettyError,
            data: {
                agent,
                task,
                output,
                error: errorMetadata
            }
        };
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Create pretty error with consistent formatting
     */
    private createPrettyError(config: ErrorConfig): PrettyErrorType {
        return createPrettyError({
            ...config,
            name: config.type || 'Error',
            location: 'errorManager'
        });
    }

    /**
     * Create default LLM stats for error contexts
     */
    private createDefaultLLMStats() {
        return {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 1,
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
    }
}

export default ErrorManager.getInstance();
