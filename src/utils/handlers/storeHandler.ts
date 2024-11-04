/**
 * @file storeHandler.ts
 * @path src/utils/handlers/storeHandler.ts
 * @description Store state management handler implementation
 */

import { logger } from "../core/logger";
import { 
    HandlerResult,
    TeamStore,
    TaskType,
    AgentType,
    Output,
    CostDetails,
    LLMUsageStats
} from '@/utils/types';
import { calculateTaskCost } from "../helpers/costs/llmCostCalculator";

/**
 * Store handler implementation
 */
export class StoreHandler {
    /**
     * Handle state update
     */
    async handleStateUpdate(
        store: TeamStore,
        update: Partial<TeamStore>
    ): Promise<HandlerResult> {
        try {
            store.setState(update);
            logger.debug('Updated store state:', update);
            
            return {
                success: true,
                data: store.getState()
            };
        } catch (error) {
            logger.error('Error updating store state:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle task addition
     */
    async handleTaskAddition(
        store: TeamStore,
        task: TaskType
    ): Promise<HandlerResult> {
        try {
            store.setState(state => ({
                tasks: [...state.tasks, task]
            }));

            const additionLog = store.prepareNewLog({
                task,
                agent: task.agent,
                logDescription: `Task added: ${task.title}`,
                logType: 'TaskStatusUpdate',
                metadata: {
                    taskId: task.id,
                    status: task.status
                }
            });

            store.setState(state => ({
                workflowLogs: [...state.workflowLogs, additionLog]
            }));

            logger.info(`Added task: ${task.title}`);
            return {
                success: true,
                data: task
            };
        } catch (error) {
            logger.error('Error adding task:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle agent addition
     */
    async handleAgentAddition(
        store: TeamStore,
        agent: AgentType
    ): Promise<HandlerResult> {
        try {
            store.setState(state => ({
                agents: [...state.agents, agent]
            }));

            const additionLog = store.prepareNewLog({
                agent,
                task: null,
                logDescription: `Agent added: ${agent.name}`,
                logType: 'AgentStatusUpdate',
                metadata: {
                    agentId: agent.id,
                    status: agent.status
                }
            });

            store.setState(state => ({
                workflowLogs: [...state.workflowLogs, additionLog]
            }));

            logger.info(`Added agent: ${agent.name}`);
            return {
                success: true,
                data: agent
            };
        } catch (error) {
            logger.error('Error adding agent:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle task state update
     */
    async handleTaskStateUpdate(
        store: TeamStore,
        taskId: string,
        update: Partial<TaskType>
    ): Promise<HandlerResult> {
        try {
            store.setState(state => ({
                tasks: state.tasks.map(task =>
                    task.id === taskId ? { ...task, ...update } : task
                )
            }));

            const updatedTask = store.getState().tasks.find(t => t.id === taskId);
            if (!updatedTask) {
                throw new Error(`Task ${taskId} not found`);
            }

            const updateLog = store.prepareNewLog({
                task: updatedTask,
                agent: updatedTask.agent,
                logDescription: `Task updated: ${updatedTask.title}`,
                logType: 'TaskStatusUpdate',
                metadata: {
                    update,
                    previousState: store.getState().tasks.find(t => t.id === taskId)
                }
            });

            store.setState(state => ({
                workflowLogs: [...state.workflowLogs, updateLog]
            }));

            logger.debug(`Updated task ${taskId}:`, update);
            return {
                success: true,
                data: updatedTask
            };
        } catch (error) {
            logger.error('Error updating task state:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * Handle agent output
     */
    async handleAgentOutput(
        store: TeamStore,
        agent: AgentType,
        task: TaskType,
        output: Output
    ): Promise<HandlerResult> {
        try {
            const modelCode = agent.llmConfig.model;
            const costDetails = calculateTaskCost(modelCode, output.llmUsageStats || {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
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
            });

            const outputLog = store.prepareNewLog({
                agent,
                task,
                logDescription: `Agent output received`,
                logType: 'AgentStatusUpdate',
                metadata: {
                    output,
                    costDetails
                }
            });

            store.setState(state => ({
                workflowLogs: [...state.workflowLogs, outputLog]
            }));

            logger.debug(`Processed agent output for task ${task.id}`);
            return {
                success: true,
                data: output,
                metadata: {
                    costDetails
                }
            };
        } catch (error) {
            logger.error('Error handling agent output:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }
}

// Export singleton instance
export const storeHandler = new StoreHandler();