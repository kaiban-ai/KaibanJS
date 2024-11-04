/**
 * @file index.ts
 * @path src/stores/agentStore/index.ts
 * @description Main entry point for agent store, combining all modules
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '@/utils/core/logger';
import { AgentState, initialAgentState, validateAgentState } from './state';
import { createCoreActions } from './actions/coreActions';
import { createErrorActions } from './actions/errorActions';
import { createToolActions } from './actions/toolActions';
import { createThinkingActions } from './actions/thinkingActions';
import { selectors } from './selectors';

/**
 * Combined store type with all actions and selectors
 */
export interface AgentStore extends AgentState {
    // Core actions
    handleAgentStatusChange: ReturnType<typeof createCoreActions>['handleAgentStatusChange'];
    addWorkflowLog: ReturnType<typeof createCoreActions>['addWorkflowLog'];
    setCurrentAgentAndTask: ReturnType<typeof createCoreActions>['setCurrentAgentAndTask'];
    handleIterationStart: ReturnType<typeof createCoreActions>['handleIterationStart'];
    handleIterationEnd: ReturnType<typeof createCoreActions>['handleIterationEnd'];
    handleAgentOutput: ReturnType<typeof createCoreActions>['handleAgentOutput'];

    // Error actions
    handleAgentError: ReturnType<typeof createErrorActions>['handleAgentError'];
    handleThinkingError: ReturnType<typeof createErrorActions>['handleThinkingError'];
    handleToolError: ReturnType<typeof createErrorActions>['handleToolError'];
    handleParsingError: ReturnType<typeof createErrorActions>['handleParsingError'];
    handleMaxIterationsError: ReturnType<typeof createErrorActions>['handleMaxIterationsError'];

    // Tool actions
    handleToolStart: ReturnType<typeof createToolActions>['handleToolStart'];
    handleToolEnd: ReturnType<typeof createToolActions>['handleToolEnd'];
    handleToolDoesNotExist: ReturnType<typeof createToolActions>['handleToolDoesNotExist'];
    processToolResult: ReturnType<typeof createToolActions>['processToolResult'];
    generateToolErrorFeedback: ReturnType<typeof createToolActions>['generateToolErrorFeedback'];
    generateToolNotExistFeedback: ReturnType<typeof createToolActions>['generateToolNotExistFeedback'];

    // Thinking actions
    handleThinkingStart: ReturnType<typeof createThinkingActions>['handleThinkingStart'];
    handleThinkingEnd: ReturnType<typeof createThinkingActions>['handleThinkingEnd'];
    handleThought: ReturnType<typeof createThinkingActions>['handleThought'];
    handleSelfQuestion: ReturnType<typeof createThinkingActions>['handleSelfQuestion'];
    handleFinalAnswer: ReturnType<typeof createThinkingActions>['handleFinalAnswer'];

    // Selectors
    selectors: typeof selectors;
}

/**
 * Create the agent store with middleware
 */
export const createAgentStore = () => create<AgentStore>()(
    devtools(
        subscribeWithSelector((set, get) => ({
            // Include initial state
            ...initialAgentState,

            // Include core actions
            ...createCoreActions(get, set),

            // Include error actions
            ...createErrorActions(get, set),

            // Include tool actions
            ...createToolActions(get, set),

            // Include thinking actions
            ...createThinkingActions(get, set),

            // Include selectors
            selectors
        })),
        {
            name: 'AgentStore',
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
                // Sanitize sensitive data in dev tools
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
export const useAgentStore = createAgentStore();

// Export state getter
export const getAgentState = () => useAgentStore.getState();

// Export state subscriber with selector support
export const subscribeToAgentStore = useAgentStore.subscribe;

/**
 * Setup store monitoring and validation
 */
if (process.env.NODE_ENV !== 'production') {
    // Monitor state changes in development
    subscribeToAgentStore(
        state => state,
        (state) => {
            if (!validateAgentState(state)) {
                logger.warn('Invalid agent state detected:', state);
            }
        }
    );
}

/**
 * Re-export types
 */
export type {
    AgentState,
    CoreActions,
    ErrorActions,
    ToolActions,
    ThinkingActions,
} from './actions';

export { selectors };

export default useAgentStore;