/**
 * @file errorManager.ts
 * @path src/managers/core/errorManager.ts
 * @description Core error management and handling implementation
 * 
 * @module @core
 */

import CoreManager from './coreManager';
import { LogManager } from './logManager';
import { v4 as uuidv4 } from 'uuid';
import { MetadataFactory } from '../../utils/factories/metadataFactory';
import { createError, toErrorType } from '../../types/common/commonErrorTypes';

// Import types from canonical locations
import type { 
    IErrorType,
    IErrorHandlerParams,
    ITeamErrorHandlerParams,
    IErrorKind,
    IBaseError,
    IErrorOptions
} from '../../types/common/commonErrorTypes';

import type { IErrorMetadata } from '../../types/common/commonMetadataTypes';
import type { IHandlerResult } from '../../types/common/commonHandlerTypes';
import type { IAgentType } from '../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../types/task/taskBaseTypes';
import type { ITeamState } from '../../types/team/teamBaseTypes';
import type { ILog } from '../../types/team/teamLogsTypes';

/**
 * Centralized error management implementation
 */
export class ErrorManager extends CoreManager {
    private static instance: ErrorManager;
    readonly logManager: LogManager;

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
    public async handleAgentError(params: ITeamErrorHandlerParams): Promise<IHandlerResult> {
        const { error, context, task, agent, store } = params;

        try {
            const processedError: IErrorType = toErrorType(error);
            const prettyError = createError({
                message: processedError.message,
                type: 'SystemError',
                context: {
                    agentId: agent && typeof agent === 'object' && 'id' in agent ? agent.id : undefined,
                    taskId: task && typeof task === 'object' && 'id' in task ? task.id : undefined,
                    ...context,
                    originalError: processedError
                },
                recommendedAction: 'Review agent configuration and retry'
            });

            const timestamp = Date.now();
            const errorLog: ILog = {
                id: uuidv4(),
                level: 'error',
                message: processedError.message,
                timestamp,
                agentName: agent && typeof agent === 'object' && 'name' in agent ? String(agent.name) : 'unknown',
                taskId: task && typeof task === 'object' && 'id' in task ? String(task.id) : 'unknown',
                meta: {
                    error: prettyError,
                    context,
                    output: {
                        llmUsageStats: this.createDefaultLLMStats()
                    },
                    logType: task ? 'TaskStatusUpdate' : 'WorkflowStatusUpdate',
                    agentStatus: agent ? 'THINKING_ERROR' : undefined
                }
            };

            store.setState((state: ITeamState) => ({
                ...state,
                workflowLogs: [...(state.workflowLogs || []), errorLog]
            }));

            return MetadataFactory.createErrorResult(prettyError);

        } catch (handlingError) {
            const processedHandlingError = toErrorType(handlingError);
            this.logManager.error('Error handling agent error: ' + processedHandlingError.message);
            
            return MetadataFactory.createErrorResult(processedHandlingError);
        }
    }

    // ─── LLM Error Handling ─────────────────────────────────────────────────────

    /**
     * Handle LLM-specific errors
     */
    public handleLLMError(params: IErrorHandlerParams): IHandlerResult {
        const { error, context, task, agent } = params;

        const processedError: IErrorType = toErrorType(error);
        const prettyError = createError({
            message: 'LLM Processing Error',
            type: 'LLMError',
            context: {
                agentId: agent && typeof agent === 'object' && 'id' in agent ? agent.id : undefined,
                taskId: task && typeof task === 'object' && 'id' in task ? task.id : undefined,
                ...context,
                originalError: processedError
            },
            recommendedAction: 'Check LLM configuration and retry'
        });

        this.logManager.error('LLM error: ' + prettyError.message);

        return MetadataFactory.createErrorResult(prettyError);
    }

    // ─── Protected Helper Methods ───────────────────────────────────────────────

    /**
     * Create default LLM stats
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
