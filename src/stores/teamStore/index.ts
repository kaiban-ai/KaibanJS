/**
 * @file index.ts
 * @path KaibanJS/src/stores/teamStore/index.ts
 * @description Main team store implementation and exports
 */

import { create } from 'zustand';
import { logger } from '@/utils/core/logger';
import { errorHandler } from '@/utils/handlers/errorHandler';
import { teamHandler } from '@/utils/handlers/teamHandler';
import { StatusManager } from '@/utils/managers/statusManager';
import { setupWorkflowController } from '../workflowController';
import { MessageHistoryManager } from '@/utils/managers/messageHistoryManager';

// Store configuration and utils
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
    const messageHistory = new MessageHistoryManager();
    const statusManager = StatusManager.getInstance();

    /**
     * Store creator function
     */
    const storeCreator = (set: any, get: any) => {
        // Create type-safe getters and setters
        const typeSafeGet = StoreUtils.createStateGetter(get);
        const typeSafeSet = StoreUtils.createStateSetter(set);

        // Create all actions with dependencies injected
        const coreActions = createCoreActions(typeSafeGet, typeSafeSet);
        const workflowActions = createWorkflowActions(typeSafeGet, typeSafeSet);
        const taskActions = createTaskActions(typeSafeGet, typeSafeSet);
        const agentActions = createAgentActions(typeSafeGet, typeSafeSet);
        const errorActions = createErrorActions(typeSafeGet, typeSafeSet);
        const messageActions = createMessageActions(typeSafeGet, typeSafeSet, messageHistory);
        const toolActions = createToolActions(typeSafeGet, typeSafeSet);

        // Combine all actions with initial state
        return {
            // Initial state
            ...createInitialState(),
            ...initialState,

            // Core team functionality
            ...coreActions,
            ...workflowActions,
            ...taskActions,
            ...agentActions,
            ...errorActions,
            ...messageActions,
            ...toolActions,

            // Error handling integration
            handleError: async (error: Error, context?: Record<string, unknown>) => {
                logger.error('Team store error:', error);
                await errorHandler.handleError({
                    error,
                    context,
                    store: {
                        getState: typeSafeGet,
                        setState: typeSafeSet,
                        prepareNewLog: coreActions.prepareNewLog
                    }
                });
            },

            // Team handler integration
            handleTeamOperation: async (operationType: string, params: Record<string, unknown>) => {
                try {
                    const state = typeSafeGet();
                    const result = await teamHandler.handleWorkflowStart(state as any, params);
                    logger.info(`Team operation ${operationType} completed:`, result);
                    return result;
                } catch (error) {
                    await errorActions.handleWorkflowError({ 
                        task: null,
                        error: error instanceof Error ? error : new Error(String(error))
                    });
                    throw error;
                }
            },

            // Resource cleanup
            cleanup: async () => {
                logger.info('Cleaning up team store resources');
                await messageHistory.clear();
                const state = typeSafeGet();
                for (const agent of state.agents) {
                    await agent.cleanup().catch(error => {
                        logger.error(`Error cleaning up agent ${agent.id}:`, error);
                    });
                }
            }
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
        proxiedStore.destroy = async () => {
            controllerCleanup();
            unsubscribe();
            await messageHistory.clear();
            await proxiedStore.cleanup();
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