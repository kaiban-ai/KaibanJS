/**
 * @file storeHandler.ts
 * @path src/utils/handlers/storeHandler.ts
 * @description Store state management handler implementation
 */

import { logger } from "../core/logger";
import { DefaultFactory } from "../factories";
import { calculateTaskCost } from "../helpers/costs/llmCostCalculator";
import type { 
    HandlerResult,
    TeamStore,
    TeamState,
    TaskType,
    AgentType,
    Output,
    CostDetails,
    LLMUsageStats,
    Log
} from '@/utils/types';

/**
 * Store handler implementation
 */
export class StoreHandler {
    /**
     * Handle state update
     */
    async handleStateUpdate(
        store: TeamStore,
        update: Partial<TeamState>
    ): Promise<HandlerResult<TeamState>> {
        try {
            store.setState(state => ({
                ...state,
                ...update
            }));
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
    ): Promise<HandlerResult<TaskType>> {
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
    ): Promise<HandlerResult<AgentType>> {
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
    ): Promise<HandlerResult<TaskType>> {
        try {
            const previousTask = store.getState().tasks.find(t => t.id === taskId);
            if (!previousTask) {
                throw new Error(`Task ${taskId} not found`);
            }

            store.setState(state => ({
                tasks: state.tasks.map(task =>
                    task.id === taskId ? { ...task, ...update } : task
                )
            }));

            const updatedTask = store.getState().tasks.find(t => t.id === taskId);
            if (!updatedTask) {
                throw new Error(`Task ${taskId} not found after update`);
            }

            const updateLog = store.prepareNewLog({
                task: updatedTask,
                agent: updatedTask.agent,
                logDescription: `Task updated: ${updatedTask.title}`,
                logType: 'TaskStatusUpdate',
                metadata: {
                    update,
                    previousState: previousTask
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
    ): Promise<HandlerResult<Output>> {
        try {
            const modelCode = agent.llmConfig.model;
            const llmUsageStats: LLMUsageStats = output.llmUsageStats || DefaultFactory.createLLMUsageStats();
            const costDetails: CostDetails = calculateTaskCost(modelCode, llmUsageStats);

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