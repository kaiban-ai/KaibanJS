/**
 * @file taskStore.ts
 * @path src/stores/taskStore/taskStore.ts
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
    ITaskState, 
    ITaskStoreMethods,
    ITaskStoreConfig 
} from '../../types/task/taskStore';
import type { AgentType } from '../../types/agent/agentBaseTypes';
import type { HandlerResult } from '../../types/common/commonHandlerTypes';
import { createErrorResult, createSuccessResult } from '../../types/common/commonHandlerTypes';
import { TASK_STATUS_enum } from '../../types/common/commonEnums';
import { CoreManager } from '../../managers/core/coreManager';

const createInitialState = (config: ITaskStoreConfig): ITaskState => ({
    name: config.name,
    agents: [],
    tasks: [],
    activeTasks: [],
    workflowLogs: [],
    metadata: {},
    executionState: {},
    performanceStats: {},
    errors: [],
    loading: false
});

export const createTaskStore = (config: ITaskStoreConfig) => {
    return create<ITaskStoreMethods>()(
        subscribeWithSelector((set, get) => ({
            ...createInitialState(config),

            // Base Store Methods
            getState: () => get(),
            setState: (partial) => set(partial),
            subscribe: () => () => {},
            destroy: () => {},

            // Error Actions
            handleTaskError: async (taskId: string, error: Error) => {
                const state = get();
                
                set({
                    errors: [...state.errors, error],
                    executionState: {
                        ...state.executionState,
                        [taskId]: {
                            ...state.executionState[taskId],
                            lastError: error,
                            status: TASK_STATUS_enum.ERROR
                        }
                    }
                });

                return createSuccessResult();
            },

            clearTaskErrors: () => {
                set({ errors: [] });
            },

            // Task Execution Actions
            startTask: async (taskId: string, agent: AgentType) => {
                const state = get();
                const task = state.tasks.find(t => t.id === taskId);
                
                if (!task) {
                    return createErrorResult(new Error(`Task ${taskId} not found`));
                }

                set({
                    activeTasks: [...state.activeTasks, task],
                    executionState: {
                        ...state.executionState,
                        [taskId]: {
                            ...state.executionState[taskId],
                            status: TASK_STATUS_enum.DOING,
                            assignedAgent: agent,
                            startTime: new Date()
                        }
                    }
                });

                return createSuccessResult();
            },

            completeTask: async (taskId: string) => {
                const state = get();
                
                set({
                    activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                    executionState: {
                        ...state.executionState,
                        [taskId]: {
                            ...state.executionState[taskId],
                            status: TASK_STATUS_enum.DONE,
                            endTime: new Date()
                        }
                    }
                });

                return createSuccessResult();
            },

            failTask: async (taskId: string, error: Error) => {
                const state = get();
                
                set({
                    executionState: {
                        ...state.executionState,
                        [taskId]: {
                            ...state.executionState[taskId],
                            status: TASK_STATUS_enum.ERROR,
                            lastError: error
                        }
                    }
                });

                return createSuccessResult();
            },

            updateTaskProgress: (taskId: string, progress: number) => {
                const state = get();
                
                set({
                    executionState: {
                        ...state.executionState,
                        [taskId]: {
                            ...state.executionState[taskId],
                            progress
                        }
                    }
                });
            },

            blockTask: async (taskId: string, reason: string) => {
                const state = get();
                
                set({
                    executionState: {
                        ...state.executionState,
                        [taskId]: {
                            ...state.executionState[taskId],
                            status: TASK_STATUS_enum.BLOCKED,
                            blockingReason: reason
                        }
                    }
                });

                return createSuccessResult();
            },

            unblockTask: async (taskId: string) => {
                const state = get();
                
                set({
                    executionState: {
                        ...state.executionState,
                        [taskId]: {
                            ...state.executionState[taskId],
                            status: TASK_STATUS_enum.TODO,
                            blockingReason: undefined
                        }
                    }
                });

                return createSuccessResult();
            }
        }))
    );
};

export type TaskStore = ReturnType<typeof createTaskStore>;