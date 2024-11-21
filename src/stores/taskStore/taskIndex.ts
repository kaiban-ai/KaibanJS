/**
 * @file taskIndex.ts
 * @path src/stores/taskStore/taskIndex.ts
 */

export * from './taskStore';
export * from './taskActions';
export * from './taskSelectors';

import { createTaskStore } from './taskStore';
import { createTaskActions } from './taskActions';
import { createTaskSelectors } from './taskSelectors';
import type { ITaskStoreConfig } from '../../types/task/taskStore';

export const configureTaskStore = (config: ITaskStoreConfig) => {
    const store = createTaskStore(config);
    const actions = createTaskActions(store);
    const selectors = createTaskSelectors();

    return {
        store,
        actions,
        selectors
    };
};

export type ConfiguredTaskStore = ReturnType<typeof configureTaskStore>;