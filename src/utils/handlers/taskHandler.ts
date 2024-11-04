/**
 * @file taskHandler.ts
 * @path src/utils/handlers/taskHandler.ts
 * @description Task event handler implementation
 */

import { logger } from "../core/logger";
import { 
    TaskCompletionParams,
    ErrorHandlerParams,
    HandlerResult,
    ValidationResult,
    ITaskHandler,
    TaskType
} from '@/utils/types';
import { calculateTaskCost } from '../helpers/costs/llmCostCalculator';
import { PrettyError } from '../core/errors';

/**
 * Task handler implementation
 */
export class TaskHandler implements ITaskHandler {
    /**
     * Handle task completion
     */
    async handleCompletion(params: TaskCompletionParams): Promise<HandlerResult> {
        const { agent, task, result, metadata = {}, store } = params;

        try {
            // Get task stats if not provided
            const stats = store.getTaskStats(task);
            const modelCode = agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, stats.llmUsageStats);

            // Update task status and result
            store.setState(state => ({
                tasks: state.tasks.map(t => 
                    t.id === task.id ? {
                        ...t,
                        status: 'DONE',
                        result,
                        ...stats,
                    } : t
                )
            }));

            // Create completion log
            const completionLog = store.prepareNewLog({
                agent,
                task,
                logDescription: `Task completed: ${task.title}`,
                metadata: {
                    result,
                    ...metadata,
                    ...stats,
                    costDetails
                },
                logType: 'TaskStatusUpdate'
            });

            // Add log to store
            store.setState(state => ({
                workflowLogs: [...state.workflowLogs, completionLog]
            }));

            logger.info(`Task ${task.id} completed successfully`);
            return {
                success: true,
                data: result,
                metadata: {
                    stats,
                    costDetails
                }
            };

        } catch (error) {
            logger.error(`Error handling task completion:`, error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle task error
     */
    async handleError(params: ErrorHandlerParams): Promise<HandlerResult> {
        const { error, context, task, store } = params;

        try {
            if (!task) {
                throw new Error('Task is required for error handling');
            }

            // Create pretty error
            const prettyError = new PrettyError({
                message: error.message,
                context: {
                    taskId: task.id,
                    taskTitle: task.title,
                    ...context
                },
                recommendedAction: error.recommendedAction || 'Check task configuration and inputs'
            });

            // Update task status
            store.setState(state => ({
                tasks: state.tasks.map(t => 
                    t.id === task.id ? {
                        ...t,
                        status: 'ERROR',
                        error: prettyError.message
                    } : t
                )
            }));

            // Create error log
            const errorLog = store.prepareNewLog({
                task,
                agent: task.agent,
                logDescription: `Task error: ${prettyError.message}`,
                metadata: {
                    error: prettyError,
                    context
                },
                logType: 'TaskStatusUpdate'
            });

            // Add log to store
            store.setState(state => ({
                workflowLogs: [...state.workflowLogs, errorLog]
            }));

            logger.error(`Task ${task.id} error:`, prettyError.prettyMessage);
            return {
                success: false,
                error: prettyError
            };

        } catch (handlingError) {
            logger.error(`Error handling task error:`, handlingError);
            return {
                success: false,
                error: handlingError instanceof Error ? handlingError : new Error(String(handlingError))
            };
        }
    }

    /**
     * Handle task validation
     */
    async handleValidation(task: TaskType): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!task.id) errors.push('Task ID is required');
        if (!task.title) errors.push('Task title is required');
        if (!task.description) errors.push('Task description is required');
        if (!task.agent) errors.push('Task must have an assigned agent');

        // Validate agent configuration
        if (task.agent) {
            if (!task.agent.tools) warnings.push('Agent has no tools configured');
            if (!task.agent.llmConfig) warnings.push('Agent has no LLM configuration');
        }

        // Check task inputs
        if (!task.inputs || Object.keys(task.inputs).length === 0) {
            warnings.push('Task has no inputs defined');
        }

        // Validate feedback history
        if (!Array.isArray(task.feedbackHistory)) {
            errors.push('Task feedback history must be an array');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: warnings.length > 0 ? warnings : undefined
        };
    }
}

// Export singleton instance
export const taskHandler = new TaskHandler();