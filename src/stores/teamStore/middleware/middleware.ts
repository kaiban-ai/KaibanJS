/**
 * @file middleware.ts
 * @path KaibanJS/src/stores/teamStore/middleware/middleware.ts
 * @description Middleware configuration and setup for the team store
 */

import { StateCreator, StoreApi, StoreMutatorIdentifier } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '@/utils/core/logger';
import type { TeamState, TeamStore } from '@/utils/types';
import { StoreUtils } from '../utils/storeUtils';

type PartialState<T> = Partial<T> | ((state: T) => Partial<T>);

type StoreSetState<T> = (
    partial: T | Partial<T> | ((state: T) => T | Partial<T>),
    replace?: boolean
) => void;

type LogMiddleware = <
    T extends TeamState,
    Mps extends [StoreMutatorIdentifier, unknown][] = [],
    Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
    f: StateCreator<T, Mps, Mcs>,
    name: string
) => StateCreator<T, Mps, Mcs>;

// Logging middleware for store operations
export const logMiddleware: LogMiddleware = (f, name) => (set, get, store) => {
    const loggedSet: StoreSetState<TeamState> = (partial, replace) => {
        const nextState = typeof partial === 'function' 
            ? (partial as (state: TeamState) => Partial<TeamState>)(get())
            : partial;
                
        logger.debug(`${name} store updating`, nextState);
        set(nextState as Partial<TeamState>, replace);
        logger.debug(`${name} store updated`, get());
    };

    return f(loggedSet as typeof set, get, store);
};

// Middleware chain creation
export const createMiddlewareChain = (name: string) => {
    return (config: StateCreator<TeamStore>) => 
        devtools(
            subscribeWithSelector(
                logMiddleware(config, name)
            ),
            {
                name: StoreUtils.createMiddlewareConfig(name).name,
                ...StoreUtils.createMiddlewareConfig(name)
            }
        ) as StateCreator<TeamStore>;
};

// Apply middleware to store
export const applyMiddleware = <T extends TeamStore>(
    store: StoreApi<T>,
    middlewares: ((store: StoreApi<T>) => void)[]
): void => {
    middlewares.forEach(middleware => middleware(store));
};

// Subscriber middleware creation
export const createSubscriberMiddleware = (store: StoreApi<TeamStore>) => {
    return (next: Function) => (action: unknown, state: TeamState) => {
        const result = next(action, state);
        logger.debug('State updated:', {
            action,
            newState: StoreUtils.createCleanedState(state)
        });
        return result;
    };
};

// Persistence middleware creation
export const createPersistenceMiddleware = (
    store: StoreApi<TeamStore>,
    options: {
        key: string;
        storage?: Storage;
        serialize?: (state: TeamState) => string;
        deserialize?: (stored: string) => Partial<TeamState>;
    }
) => {
    const {
        key,
        storage = localStorage,
        serialize = JSON.stringify,
        deserialize = JSON.parse
    } = options;

    return {
        // Persists current state
        persist: () => {
            try {
                const state = store.getState();
                const serialized = serialize(state);
                storage.setItem(key, serialized);
            } catch (error) {
                logger.error('Error persisting state:', error);
            }
        },

        // Hydrates state from storage
        hydrate: () => {
            try {
                const stored = storage.getItem(key);
                if (stored) {
                    const state = deserialize(stored);
                    store.setState(state);
                }
            } catch (error) {
                logger.error('Error hydrating state:', error);
            }
        },

        // Clears persisted state
        clear: () => {
            try {
                storage.removeItem(key);
            } catch (error) {
                logger.error('Error clearing persisted state:', error);
            }
        }
    };
};

// Validation middleware creation
export const createValidationMiddleware = (
    store: StoreApi<TeamStore>,
    validators: Record<string, (value: unknown) => boolean>
) => {
    return (next: Function) => (action: unknown, state: TeamState) => {
        const validationErrors: string[] = [];
        
        Object.entries(validators).forEach(([key, validator]) => {
            if (key in state && !validator(state[key as keyof TeamState])) {
                validationErrors.push(`Invalid value for ${key}`);
            }
        });

        if (validationErrors.length > 0) {
            logger.error('State validation failed:', validationErrors);
            throw new Error(`State validation failed: ${validationErrors.join(', ')}`);
        }

        return next(action, state);
    };
};

export const defaultMiddlewares = [
    createSubscriberMiddleware,
    createValidationMiddleware
];

export default {
    logMiddleware,
    createMiddlewareChain,
    applyMiddleware,
    createSubscriberMiddleware,
    createPersistenceMiddleware,
    createValidationMiddleware,
    defaultMiddlewares
};
