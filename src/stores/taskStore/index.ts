/**
 * @file index.ts
 * @path KaibanJS/src/stores/taskStore/index.ts
 * @description Main task store implementation and exports
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '@/utils/core/logger';
import { errorHandler } from '@/utils/handlers/errorHandler';
import { taskHandler } from '@/utils/handlers/taskHandler';
import { getTaskTitleForLogs } from '@/utils/helpers/tasks/taskUtils';
import { StatusManager } from '@/utils/managers/statusManager';

import { initialTaskState, isTaskStoreState } from './state';
import { createActions } from './actions';
import { selectors } from './selectors';

import type { TaskStore } from '@/utils/types/task/store';

/**
 * Creates the task store with all actions and middleware
 */
export const createTaskStore = () => create<TaskStore>()(
    devtools(
        subscribeWithSelector((set, get) => ({
            // Include initial state
            ...initialTaskState,

            // Include actions
            ...createActions(get, set),

            // Include selectors
            selectors,

            // Clean up resources
            destroy: () => {
                const state = get();
                logger.info(`Cleaning up task store with ${state.tasks.length} tasks`);
                state.tasks.forEach(task => {
                    if (task.status === 'DOING') {
                        errorHandler.handleTaskError({
                            task,
                            error: new Error('Task cleanup: Force stopping task'),
                            context: {
                                phase: 'cleanup',
                                taskId: task.id,
                                taskTitle: getTaskTitleForLogs(task)
                            }
                        });
                    }
                });
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
    // Monitor state changes in development
    subscribeToTaskStore(
        state => state,
        (state) => {
            if (!isTaskStoreState(state)) {
                logger.warn('Invalid task state detected:', state);
            }
        }
    );
}

// Re-export types and actions
export type { TaskStore } from '@/utils/types/task/store';
export type {
    TaskType,
    TaskResult,
    TaskValidationResult
} from '@/utils/types/task/base';
export { selectors };

export default useTaskStore;