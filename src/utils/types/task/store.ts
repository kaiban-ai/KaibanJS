/**
 * @file store.ts
 * @path src/utils/types/task/store.ts
 * @description Task store types and interfaces
 *
 * @packageDocumentation
 * @module @types/task/store
 */

import { BaseStoreState } from '../store';
import { TaskType, TaskStats } from './base';
import { AgentType } from '../agent/base';
import { ErrorType } from '../common/errors';
import { Log } from '../team/logs';
import { PrepareNewLogParams } from '../team/logs';
import { WorkflowStats } from '../workflow/stats';
import { TaskStoreState, TaskStoreTypeGuards } from '@/utils/types/store/task';

export type { TaskStoreState, TaskStoreTypeGuards } from '@/utils/types/store/task';


/**
 * Task store mutations interface
 */
export interface TaskStoreMutations {
    setState: (fn: (state: TaskStoreState) => Partial<TaskStoreState>) => void;
    getState: () => TaskStoreState;
    subscribe: (listener: (state: TaskStoreState, prevState: TaskStoreState) => void) => () => void;
}

/**
 * Task store API interface
 */
export interface TaskStoreAPI extends TaskStoreState, TaskStoreMutations {
    /**
     * Reset store to initial state
     */
    reset: () => void;

    /**
     * Clean up store resources
     */
    destroy: () => void;
}

/**
 * Task store creator type
 */
export type TaskStoreCreator = (initialState?: Partial<TaskStoreState>) => TaskStoreAPI;

/**
 * Task store selector type
 */
export type TaskStoreSelector<T> = (state: TaskStoreState) => T;

/**
 * Task store subscriber type
 */
export type TaskStoreSubscriber = <T>(
    selector: TaskStoreSelector<T>,
    listener: (selectedValue: T, previousValue: T) => void,
    options?: {
        equalityFn?: (a: T, b: T) => boolean;
        fireImmediately?: boolean;
    }
) => () => void;