/**
 * @file storeUtils.ts
 * @path KaibanJS/src/stores/teamStore/utils/storeUtils.ts
 * @description Store utilities for managing store state and operations
 */

import { StoreApi } from 'zustand';
import { 
    TeamStore, 
    TeamState, 
    TeamStoreApi,
    UseBoundTeamStore,
    TeamStoreWithSubscribe,
    AgentType,
    TaskType,
    FeedbackObject 
} from '@/utils/types';
import { subscribeTaskStatusUpdates } from '@/subscribers/taskSubscriber';
import { subscribeWorkflowStatusUpdates } from '@/subscribers/teamSubscriber';
import { logger } from '@/utils/core/logger';
import { TypeGuards } from './typeGuards';

/* Store utilities for managing store state and operations */
export const StoreUtils = {
    createSafeStateUpdate<T extends Partial<TeamState>>(
        updates: T
    ): Partial<TeamStore> {
        return updates as unknown as Partial<TeamStore>;
    },

    createStoreProxy(
        store: TeamStoreApi
    ): UseBoundTeamStore {
        return store as unknown as UseBoundTeamStore;
    },

    setupSubscribers(
        store: TeamStoreApi
    ): (() => void) {
        const taskUnsubscribe = subscribeTaskStatusUpdates(store as unknown as UseBoundTeamStore);
        const workflowUnsubscribe = subscribeWorkflowStatusUpdates(store as unknown as UseBoundTeamStore);
        
        return () => {
            if (TypeGuards.isFunction(taskUnsubscribe)) taskUnsubscribe();
            if (TypeGuards.isFunction(workflowUnsubscribe)) workflowUnsubscribe();
        };
    },

    createSelector<T>(
        selector: (state: TeamState) => T
    ): (state: TeamState) => T {
        return selector;
    },

    createStateGetter(
        get: () => TeamState
    ): () => TeamState {
        return () => {
            const state = get();
            if (!state) {
                logger.error('Store state is undefined');
                throw new Error('Store state is undefined');
            }
            return state;
        };
    },

    createStateSetter(
        set: (fn: (state: TeamState) => Partial<TeamState>) => void
    ): (fn: (state: TeamState) => Partial<TeamState>) => void {
        return (fn: (state: TeamState) => Partial<TeamState>) => {
            try {
                set(fn);
            } catch (error) {
                logger.error('Error setting state:', error);
                throw error;
            }
        };
    },

    createCleanedState(state: TeamState): unknown {
        return {
            teamWorkflowStatus: state.teamWorkflowStatus,
            workflowResult: state.workflowResult,
            name: state.name,
            agents: state.agents.map((agent: AgentType) => ({
                ...agent,
                id: '[REDACTED]',
                env: '[REDACTED]',
                llmConfig: {
                    ...agent.llmConfig,
                    apiKey: '[REDACTED]',
                }
            })),
            tasks: state.tasks.map((task: TaskType) => ({
                ...task,
                id: '[REDACTED]',
                agent: task.agent ? {
                    ...task.agent,
                    id: '[REDACTED]',
                    env: '[REDACTED]',
                    llmConfig: {
                        ...task.agent.llmConfig,
                        apiKey: '[REDACTED]',
                    },
                } : null,
                duration: '[REDACTED]',
                endTime: '[REDACTED]',
                startTime: '[REDACTED]',
                feedbackHistory: task.feedbackHistory?.map((feedback: FeedbackObject) => ({
                    ...feedback,
                    timestamp: '[REDACTED]',
                }))
            })),
            workflowLogs: state.workflowLogs,
            inputs: state.inputs,
            workflowContext: state.workflowContext,
            logLevel: state.logLevel,
        };
    },

    createMiddlewareConfig(name: string) {
        return {
            name: `${name}Store`,
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
            },
            stateSanitizer: (state: TeamState) => ({
                ...state,
                env: Object.keys(state.env || {}).reduce((acc, key) => ({
                    ...acc,
                    [key]: '[REDACTED]'
                }), {}),
                agents: (state.agents || []).map((agent: AgentType) => ({
                    ...agent,
                    llmConfig: {
                        ...agent.llmConfig,
                        apiKey: '[REDACTED]'
                    }
                }))
            })
        };
    }
};

export default StoreUtils;
