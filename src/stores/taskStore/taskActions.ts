/**
 * @file taskActions.ts
 * @path src/stores/taskStore/taskActions.ts
 */

import type { TaskType } from '../../types/task/taskBase';
import type { AgentType } from '../../types/agent/agentBaseTypes';
import type { HandlerResult } from '../../types/common/commonHandlerTypes';
import type { TaskStore } from './taskStore';
import type { ITaskMetadata } from '../../types/task/taskStore';

export const createTaskActions = (store: TaskStore) => ({
    addTask: async (task: TaskType): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();

        setState({
            tasks: [...state.tasks, task]
        });

        return { success: true };
    },

    removeTask: async (taskId: string): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();

        setState({
            tasks: state.tasks.filter(t => t.id !== taskId),
            activeTasks: state.activeTasks.filter(t => t.id !== taskId)
        });

        return { success: true };
    },

    updateTaskPriority: async (taskId: string, priority: number): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();

        setState({
            metadata: {
                ...state.metadata,
                [taskId]: {
                    ...state.metadata[taskId],
                    priority
                }
            }
        });

        return { success: true };
    },

    updateTaskMetadata: async (taskId: string, metadata: Partial<ITaskMetadata>): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();

        setState({
            metadata: {
                ...state.metadata,
                [taskId]: {
                    ...state.metadata[taskId],
                    ...metadata
                }
            }
        });

        return { success: true };
    },

    updateTaskResources: async (taskId: string, resources: {
        memory: number;
        tokens: number;
        cost: number;
    }): Promise<HandlerResult> => {
        const { getState, setState } = store;
        const state = getState();

        setState({
            performanceStats: {
                ...state.performanceStats,
                [taskId]: {
                    ...state.performanceStats[taskId],
                    memory: resources.memory,
                    tokenCount: resources.tokens,
                    cost: resources.cost
                }
            }
        });

        return { success: true };
    }
});

export type TaskActions = ReturnType<typeof createTaskActions>;