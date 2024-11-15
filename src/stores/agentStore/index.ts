/**
 * @file index.ts
 * @path KaibanJS/src/stores/agentStore/index.ts
 * @description Main agent store implementation combining all modules
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { logger } from '@/utils/core/logger';
import { errorHandler } from '@/utils/handlers/errorHandler';
import { messageHandler } from '@/utils/handlers/messageHandler';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';
import { getApiKey } from '@/utils/helpers/agent/agentUtils';
import { StatusManager } from '@/utils/managers/statusManager';
import { MessageManager } from '@/managers/domain/llm/MessageManager';
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
export const createAgentStore = () => {
    // Create managers
    const messageHistoryManager = new MessageHistoryManager();
    const statusManager = StatusManager.getInstance();

    return create<AgentStore>()(
        devtools(
            subscribeWithSelector((set, get) => {
                // Create actions with dependencies
                const coreActions = createCoreActions(get, set);
                const errorActions = createErrorActions(get, set);
                const toolActions = createToolActions(get, set);
                const thinkingActions = createThinkingActions(get, set);

                return {
                    // Include initial state
                    ...initialAgentState,

                    // Include core actions
                    ...coreActions,

                    // Include error actions
                    ...errorActions,

                    // Include tool actions
                    ...toolActions,

                    // Include thinking actions
                    ...thinkingActions,

                    // Include selectors
                    selectors,

                    // Message handling integration
                    handleMessage: async (content: string, metadata?: Record<string, unknown>) => {
                        const state = get();
                        const currentAgent = state.currentAgent;
                        
                        if (!currentAgent) {
                            logger.error('No current agent set for message handling');
                            return;
                        }

                        try {
                            const result = await messageHandler.handleSystemMessage(content, {
                                agentId: currentAgent.id,
                                agentName: currentAgent.name,
                                ...metadata
                            });

                            logger.debug('Message handled successfully:', result);
                            return result;
                        } catch (error) {
                            await errorHandler.handleError({
                                error: error instanceof Error ? error : new Error(String(error)),
                                context: {
                                    agentId: currentAgent.id,
                                    messageContent: content,
                                    metadata
                                },
                                store: {
                                    getState: get,
                                    setState: set,
                                    prepareNewLog: coreActions.addWorkflowLog
                                }
                            });
                            throw error;
                        }
                    },

                    // Cost calculation integration
                    calculateAgentCosts: (agentId: string) => {
                        const state = get();
                        const agent = state.agents.find(a => a.id === agentId);
                        
                        if (!agent || !agent.llmConfig) {
                            logger.error(`Unable to calculate costs for agent ${agentId}`);
                            return null;
                        }

                        const apiKey = getApiKey(agent.llmConfig, state.env || {});
                        if (!apiKey) {
                            logger.warn(`No API key found for agent ${agent.id}`);
                        }

                        const stats = state.stats.llmUsageStats;
                        return calculateTaskCost(agent.llmConfig.model, stats);
                    },

                    // Resource cleanup
                    cleanup: async () => {
                        logger.info('Cleaning up agent store resources');
                        await messageHistoryManager.clear();
                        const state = get();
                        
                        if (state.currentAgent) {
                            await state.currentAgent.cleanup().catch(error => {
                                logger.error('Error cleaning up current agent:', error);
                            });
                        }

                        state.agents.forEach(agent => {
                            agent.cleanup().catch(error => {
                                logger.error(`Error cleaning up agent ${agent.id}:`, error);
                            });
                        });
                    },

                    // Extended destroy method
                    destroy: async () => {
                        logger.info('Destroying agent store');
                        await get().cleanup();
                        messageHistoryManager.clear();
                    }
                };
            }),
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
                    // Sanitize sensitive data
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
};

// Create singleton instance
export const useAgentStore = createAgentStore();

// Export state getter
export const getAgentState = () => useAgentStore.getState();

// Export state subscriber with selector support
export const subscribeToAgentStore = useAgentStore.subscribe;

// Setup store monitoring and validation
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

// Re-export types
export type {
    AgentState,
    CoreActions,
    ErrorActions,
    ToolActions,
    ThinkingActions,
} from './actions';

export { selectors };

export default useAgentStore;