/**
 * @file index.ts
 * @path src/stores/taskStore/actions/index.ts
 * @description Exports all task store actions
 */

import { createCoreActions } from './coreActions';
import { createErrorActions } from './errorActions';
import { createStatsActions } from './statsActions';
import type { TaskStoreState } from '../state';

/**
 * Creates all task store actions
 */
export const createActions = (
    get: () => TaskStoreState,
    set: (partial: TaskStoreState | ((state: TaskStoreState) => TaskStoreState)) => void
) => ({
    ...createCoreActions(get, set),
    ...createErrorActions(get, set),
    ...createStatsActions(get, set)
});

// Export action creators
export { 
    createCoreActions,
    createErrorActions,
    createStatsActions
};

// Export action types
export type { 
    CoreActions 
} from './coreActions';

export type { 
    ErrorActions 
} from './errorActions';

export type { 
    StatsActions 
} from './statsActions';

// Export combined actions type
export type TaskStoreActions = ReturnType<typeof createActions>;

// Default export
export default createActions;