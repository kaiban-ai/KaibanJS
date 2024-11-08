/**
 * @file taskHandler.ts
 * @path src/utils/handlers/taskHandler.ts
 * @description Task event handler implementation
 */

import { logger } from "../core/logger";
import { calculateTaskCost } from "../helpers/costs/llmCostCalculator";
import { PrettyError } from "../core/errors";
import DefaultFactory from "../factories/defaultFactory"; // Use DefaultFactory for creating default objects
import LogCreator from "../factories/logCreator"; // Import LogCreator

import type { 
    HandlerResult,
    TaskType,
    AgentType,
    TeamState,
    TeamStore,
    TaskValidationResult,
    ErrorType,
    LLMUsageStats,
    CostDetails
} from '@/utils/types';

// Interface for task handler methods
export interface ITaskHandler {
    handleCompletion(params: TaskCompletionParams): Promise<HandlerResult<TaskType>>;
    handleError(params: TaskErrorParams): Promise<HandlerResult<void>>;
    handleValidation(task: TaskType): Promise<TaskValidationResult>;
}

// Task completion parameters
interface TaskCompletionParams {
    store: TeamStore;
    agent: AgentType;
    task: TaskType;
    result: unknown;
    metadata?: {
        llmUsageStats?: LLMUsageStats;
        costDetails?: CostDetails;
    };
}

// Task error parameters
interface TaskErrorParams {
    store: TeamStore;
    task: TaskType;
    error: ErrorType;
    context?: Record<string, unknown>;
}

/**
 * Task handler implementation
 */
export class TaskHandler implements ITaskHandler {
    /**
     * Handle task completion
     */
    async handleCompletion(params: TaskCompletionParams): Promise<HandlerResult<TaskType>> {
        const { store, agent, task, result, metadata = {} } = params;

        try {
            if (!store) {
                throw new Error('Store is required for task completion');
            }

            // Use DefaultFactory to create default task statistics
            const stats = DefaultFactory.createTaskStats();
            const modelCode = agent.llmConfig.model;
            const llmUsageStats = metadata.llmUsageStats || DefaultFactory.createLLMUsageStats();
            const costDetails = calculateTaskCost(modelCode, llmUsageStats);

            // Update task status and result
            store.setState((state: TeamState) => ({
                tasks: state.tasks.map((t: TaskType) => 
                    t.id === task.id ? ({
                        ...t,
                        status: 'DONE',
                        result,
                        ...stats
                    } as TaskType) : t
                )
            }));

            // Create completion log using LogCreator
            const completionLog = LogCreator.createTaskLog({
                task,
                description: `Task completed: ${task.title}`,
                status: 'DONE',
                metadata: {
                    result,
                    ...metadata,
                    ...stats,
                    costDetails
                }
            });

            // Add log to store
            store.setState((state: TeamState) => ({
                workflowLogs: [...state.workflowLogs, completionLog]
            }));

            logger.info(`Task ${task.id} completed successfully`);
            return {
                success: true,
                data: task,
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
    async handleError(params: TaskErrorParams): Promise<HandlerResult<void>> {
        const { error, context, task, store } = params;

        try {
            if (!store) {
                throw new Error('Store is required for error handling');
            }

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
                rootError: error
            });

            // Update task status
            store.setState((state: TeamState) => ({
                tasks: state.tasks.map((t: TaskType) => 
                    t.id === task.id ? ({
                        ...t,
                        status: 'ERROR',
                        error: prettyError.message
                    } as TaskType) : t
                )
            }));

            // Create error log using LogCreator
            const errorLog = LogCreator.createTaskLog({
                task,
                description: `Task error: ${prettyError.message}`,
                status: 'ERROR',
                metadata: {
                    error: prettyError,
                    context
                }
            });

            // Add log to store
            store.setState((state: TeamState) => ({
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
    async handleValidation(task: TaskType): Promise<TaskValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate required fields
        if (!task.id) errors.push('Task ID is required');
        if (!task.title) errors.push('Task title is required');
        if (!task.description) errors.push('Task description is required');
        if (!task.agent) errors.push('Task must have an assigned agent');

        // Validate agent configuration
        if (task.agent) {
            if (!task.agent.tools || task.agent.tools.length === 0) {
                warnings.push('Agent has no tools configured');
            }
            if (!task.agent.llmConfig) {
                warnings.push('Agent has no LLM configuration');
            }
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
