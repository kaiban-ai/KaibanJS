/**
 * @file index.ts
 * @path src/stores/agentStore/index.ts
 * @description Central exports for agent store
 */

export * from './agentStore';
export * from './agentActions';
export * from './agentSelectors';

import { createAgentStore } from './agentStore';
import { createAgentActions } from './agentActions';
import { createAgentSelectors } from './agentSelectors';
import type { IAgentStoreConfig } from '../../types/agent/agentStoreTypes';

/**
 * Configure and create a complete agent store instance
 */
export const configureAgentStore = (config: IAgentStoreConfig) => {
    // Create store instance
    const store = createAgentStore(config);
    
    // Create actions and selectors
    const actions = createAgentActions(store);
    const selectors = createAgentSelectors();

    return {
        store,
        actions,
        selectors
    };
};

export type ConfiguredAgentStore = ReturnType<typeof configureAgentStore>;

/**
 * Example usage:
 * 
 * ```typescript
 * const agentStore = configureAgentStore({
 *   name: 'MainAgentStore',
 *   middleware: {
 *     devtools: true,
 *     subscribeWithSelector: true
 *   }
 * });
 * 
 * // Access store methods
 * agentStore.store.setState(...);
 * 
 * // Use actions
 * await agentStore.actions.addAgent(...);
 * 
 * // Use selectors
 * const agent = agentStore.selectors.getAgentById(state)(agentId);
 * ```
 */