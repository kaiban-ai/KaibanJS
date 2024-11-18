/**
 * @file store.ts
 * @path src/stores/taskStore/store.ts
 * @description Task store implementation
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { 
    ITaskState,
    ITaskStoreConfig,
    ITaskStoreMethods
} from '@/utils/types/task/store';
import type { AgentType } from '@/utils/types/agent/base';
import { TASK_STATUS_enum } from '@/utils/types/common/enums';

const createInitialState = (): ITaskState => ({
    name: 'task-store',
    tasks: [],
    activeTasks: [],
    metadata: {},
    executionState: {},
    performanceStats: {},
    errors: [],
    loading: false,
    agents: [], // From BaseStoreState
    workflowLogs: [] // From BaseStoreState
});

const createTaskStore = (config: ITaskStoreConfig) => {
    return create<ITaskState & ITaskStoreMethods>()(
        subscribeWithSelector(
            devtools(
                (set, get) => ({
                    ...createInitialState(),

                    // Base methods
                    getState: () => get(),
                    setState: set,
                    subscribe: () => () => {},
                    destroy: () => {},

                    // Error handling
                    handleTaskError: (taskId, error) => {
                        set(state => ({
                            errors: [...state.errors, error],
                            executionState: {
                                ...state.executionState,
                                [taskId]: {
                                    ...state.executionState[taskId],
                                    lastError: error,
                                    status: 'error'
                                }
                            }
                        }));
                    },

                    clearTaskErrors: () => {
                        set({ errors: [] });
                    },

                    // Task execution
                    startTask: (taskId, agent) => {
                        set(state => ({
                            activeTasks: [...state.activeTasks, state.tasks.find(t => t.id === taskId)!],
                            executionState: {
                                ...state.executionState,
                                [taskId]: {
                                    ...state.executionState[taskId],
                                    status: 'running',
                                    assignedAgent: agent,
                                    startTime: new Date(),
                                    progress: 0
                                }
                            }
                        }));
                    },

                    completeTask: (taskId) => {
                        const endTime = new Date();
                        set(state => {
                            const startTime = state.executionState[taskId]?.startTime;
                            return {
                                activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                                executionState: {
                                    ...state.executionState,
                                    [taskId]: {
                                        ...state.executionState[taskId],
                                        status: 'completed',
                                        endTime,
                                        progress: 100
                                    }
                                },
                                performanceStats: {
                                    ...state.performanceStats,
                                    [taskId]: {
                                        ...state.performanceStats[taskId],
                                        duration: startTime ? endTime.getTime() - startTime.getTime() : undefined
                                    }
                                }
                            };
                        });
                    },

                    failTask: (taskId, error) => {
                        set(state => ({
                            activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                            executionState: {
                                ...state.executionState,
                                [taskId]: {
                                    ...state.executionState[taskId],
                                    status: 'failed',
                                    lastError: error,
                                    retryCount: (state.executionState[taskId]?.retryCount ?? 0) + 1
                                }
                            }
                        }));
                    },

                    updateTaskProgress: (taskId, progress) => {
                        set(state => ({
                            executionState: {
                                ...state.executionState,
                                [taskId]: {
                                    ...state.executionState[taskId],
                                    progress
                                }
                            }
                        }));
                    },

                    // Task management
                    addTask: (task) => {
                        set(state => ({
                            tasks: [...state.tasks, task],
                            metadata: {
                                ...state.metadata,
                                [task.id]: {
                                    id: task.id,
                                    name: task.name,
                                    priority: 1,
                                    created: new Date()
                                }
                            },
                            executionState: {
                                ...state.executionState,
                                [task.id]: {
                                    status: 'pending',
                                    retryCount: 0,
                                    progress: 0
                                }
                            },
                            performanceStats: {
                                ...state.performanceStats,
                                [task.id]: {
                                    retryCount: 0,
                                    tokenCount: 0,
                                    cost: 0
                                }
                            }
                        }));
                    },

                    removeTask: (taskId) => {
                        set(state => {
                            const { [taskId]: _, ...remainingMetadata } = state.metadata;
                            const { [taskId]: __, ...remainingExecutionState } = state.executionState;
                            const { [taskId]: ___, ...remainingPerformanceStats } = state.performanceStats;
                            
                            return {
                                tasks: state.tasks.filter(t => t.id !== taskId),
                                activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                                metadata: remainingMetadata,
                                executionState: remainingExecutionState,
                                performanceStats: remainingPerformanceStats
                            };
                        });
                    },

                    updateTaskPriority: (taskId, priority) => {
                        set(state => ({
                            metadata: {
                                ...state.metadata,
                                [taskId]: {
                                    ...state.metadata[taskId],
                                    priority
                                }
                            }
                        }));
                    },

                    updateTaskMetadata: (taskId, metadata) => {
                        set(state => ({
                            metadata: {
                                ...state.metadata,
                                [taskId]: {
                                    ...state.metadata[taskId],
                                    ...metadata
                                }
                            }
                        }));
                    }
                }),
                {
                    name: config.name,
                    enabled: config.middleware?.devtools
                }
            )
        )
    );
};

export default createTaskStore;