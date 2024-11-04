/**
 * @file index.ts
 * @path src/stores/teamStore/index.ts
 * @description Main team store implementation and exports
 */

import { create } from 'zustand';
import { MessageHistoryManager } from '@/utils/managers/messageHistoryManager';
import { setupWorkflowController } from '../workflowController';
import { createInitialState } from './state';
import { createMiddlewareChain } from './middleware/middleware';
import { StoreUtils } from './utils/storeUtils';
import { TypeGuards } from './utils/typeGuards';

// Action creators
import createCoreActions from './actions/coreActions';
import createWorkflowActions from './actions/workflowActions';
import createTaskActions from './actions/taskActions';
import createAgentActions from './actions/agentActions';
import createErrorActions from './actions/errorActions';
import createMessageActions from './actions/messageActions';
import createToolActions from './actions/toolActions';

// Types
import type { 
    TeamState, 
    TeamStore, 
    TeamStoreApi 
} from '@/utils/types';

/**
 * Creates the team store with all actions and middleware
 */
export const createTeamStore = (initialState: Partial<TeamState> = {}) => {
    // Create message history manager
    const messageHistoryManager = new MessageHistoryManager();

    /**
     * Store creator function
     */
    const storeCreator = (set: any, get: any) => {
        // Create type-safe getters and setters
        const typeSafeGet = StoreUtils.createStateGetter(get);
        const typeSafeSet = StoreUtils.createStateSetter(set);

        // Create all actions
        const coreActions = createCoreActions(typeSafeGet, typeSafeSet);
        const workflowActions = createWorkflowActions(typeSafeGet, typeSafeSet);
        const taskActions = createTaskActions(typeSafeGet, typeSafeSet);
        const agentActions = createAgentActions(typeSafeGet, typeSafeSet);
        const errorActions = createErrorActions(typeSafeGet, typeSafeSet);
        const messageActions = createMessageActions(typeSafeGet, typeSafeSet, messageHistoryManager);
        const toolActions = createToolActions(typeSafeGet, typeSafeSet);

        // Combine all actions with initial state
        return {
            // Initial state
            ...createInitialState(),
            ...initialState,

            // Actions
            ...coreActions,
            ...workflowActions,
            ...taskActions,
            ...agentActions,
            ...errorActions,
            ...messageActions,
            ...toolActions
        };
    };

    // Create store with middleware
    const boundStore = create<TeamStore>()(
        createMiddlewareChain('Team')(storeCreator)
    );

    // Create store proxy and setup resources
    const proxiedStore = StoreUtils.createStoreProxy(boundStore);

    // Setup controller and subscribers if store is valid
    if (TypeGuards.isTeamStore(proxiedStore)) {
        const controllerCleanup = setupWorkflowController(proxiedStore);
        const unsubscribe = StoreUtils.setupSubscribers(proxiedStore);
        
        // Extend destroy method to cleanup resources
        const originalDestroy = proxiedStore.destroy;
        proxiedStore.destroy = () => {
            controllerCleanup();
            unsubscribe();
            messageHistoryManager.clear();
            originalDestroy();
        };
    }

    return boundStore;
};

// Create default store instance
export const teamStore = createTeamStore({
    name: '',
    teamWorkflowStatus: 'INITIAL',
    workflowResult: null,
    agents: [],
    tasks: [],
    workflowLogs: [],
    inputs: {},
    workflowContext: '',
    env: {},
    logLevel: 'info',
    tasksInitialized: false
});

// Export store hooks and utilities
export const useTeamStore = teamStore;
export const getTeamStore = () => teamStore.getState();
export const subscribeToTeamStore = teamStore.subscribe;

// Export types
export type { 
    TeamState, 
    TeamStore, 
    TeamStoreApi 
};

export default teamStore;