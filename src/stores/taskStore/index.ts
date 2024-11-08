/**
 * @file index.ts
 * @path src/stores/taskStore/index.ts
 * @description Main task store implementation integrating all task store modules
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '@/utils/core/logger';

import { TaskStoreState, initialTaskState, isTaskStoreState } from './state';
import { createActions, TaskStoreActions } from './actions/index';
import { selectors } from './selectors';

// Combined store type with all actions and selectors
export interface TaskStore extends TaskStoreState, TaskStoreActions {
    selectors: typeof selectors;
    reset: () => void;
    destroy: () => void;
}

// Create the task store with middleware
export const createTaskStore = () => create<TaskStore>()(
    devtools(
        subscribeWithSelector((set, get) => ({
            ...initialTaskState,
            ...createActions(get, set),
            selectors,

            reset: () => {
                logger.info('Resetting task store to initial state');
                set(initialTaskState);
            },

            destroy: () => {
                logger.info('Destroying task store');
                set(state => ({
                    ...state,
                    tasks: [],
                    agents: [],
                    workflowLogs: [],
                    currentTask: null,
                    lastError: null
                }));
            }
        })),
        {
            name: 'TaskStore',
            serialize: {
                options: {
                    undefined: true,
                    function: false,
                    symbol: false,
                    error: true,
                    date: true,
                    regexp: true,
                    infinity: true,
                    nan: true,
                    set: true,
                    map: true,
                },
                replacer: (key: string, value: unknown) => {
                    if (key === 'apiKey' || key.includes('secret')) {
                        return '[REDACTED]';
                    }
                    return value;
                }
            }
        }
    )
);

// Create singleton instance
export const useTaskStore = createTaskStore();

// Export state getter
export const getTaskState = () => useTaskStore.getState();

// Export state subscriber with selector support
export const subscribeToTaskStore = useTaskStore.subscribe;

// Setup store monitoring and validation
if (process.env.NODE_ENV !== 'production') {
    subscribeToTaskStore(
        state => state,
        (state) => {
            if (!isTaskStoreState(state)) {
                logger.warn('Invalid task state detected:', state);
            }
        }
    );
}

// Re-export types
export type { TaskStoreState } from './state';
export type { TaskStoreActions, CoreActions, ErrorActions, StatsActions } from './actions/index';
export { selectors };
export default useTaskStore;
