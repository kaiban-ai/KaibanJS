/**
 * @file store.ts
 * @path src/stores/agentStore/store.ts
 * @description Agent store implementation integrated with manager architecture
 *
 * @module @stores/agent
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import CoreManager from '../../utils/managers/core/coreManager';

// Import types from canonical locations
import type { 
    IAgentState, 
    IAgentStoreMethods,
    IAgentStoreConfig,
    IAgentStoreActions
} from '../../utils/types/agent/store';

import type { AgentType } from '../../utils/types/agent/base';
import type { TaskType } from '../../utils/types/task/base';
import type { Output, ParsedOutput } from '../../utils/types/llm/responses';
import type { HandlerResult } from '../../utils/types/agent/handlers';
import { AGENT_STATUS_enum } from '../../utils/types/common/enums';

/**
 * Initialize store state
 */
const createInitialState = (config: IAgentStoreConfig): IAgentState => ({
    name: config.name || 'agent-store',
    agents: [],
    activeAgents: [],
    metadata: {},
    executionState: {},
    performanceStats: {},
    errors: [],
    loading: false,
    tasks: [], // From BaseStoreState
    workflowLogs: [] // From BaseStoreState
});

/**
 * Create agent store with CoreManager integration
 */
const createAgentStore = (config: IAgentStoreConfig) => {
    // Get manager instances through CoreManager
    const logManager = CoreManager.getInstance().logManager;
    const errorManager = CoreManager.getInstance().errorManager;
    const statusManager = CoreManager.getInstance().statusManager;

    return create<IAgentState & IAgentStoreMethods>()(
        subscribeWithSelector(
            devtools(
                (set, get) => ({
                    ...createInitialState(config),

                    // Base methods
                    getState: () => get(),
                    setState: set,
                    subscribe: () => () => {},
                    destroy: () => {},

                    // Error handling methods
                    handleAgentError: async ({ agent, task, error, context }) => {
                        return await errorManager.handleAgentError({
                            error,
                            context: { 
                                component: 'AgentStore', 
                                details: context 
                            },
                            task,
                            agent,
                            store: {
                                prepareNewLog: () => ({}),
                                setState: set,
                                getState: get
                            }
                        });
                    },

                    // Thinking handling methods
                    handleAgentThinking: async ({ agent, task, messages, output }) => {
                        set(state => ({
                            executionState: {
                                ...state.executionState,
                                [agent.id]: {
                                    ...state.executionState[agent.id],
                                    thinking: true,
                                    lastOutput: output?.llmOutput
                                }
                            }
                        }));
                        return { success: true };
                    },

                    handleAgentOutput: async ({ agent, task, output, type }) => {
                        set(state => ({
                            executionState: {
                                ...state.executionState,
                                [agent.id]: {
                                    ...state.executionState[agent.id],
                                    lastOutput: output.llmOutput
                                }
                            }
                        }));
                        return { success: true };
                    },

                    // Tool handling methods
                    handleStreamingOutput: async ({ agent, task, chunk, isDone }) => {
                        set(state => ({
                            executionState: {
                                ...state.executionState,
                                [agent.id]: {
                                    ...state.executionState[agent.id],
                                    lastOutput: chunk
                                }
                            }
                        }));
                        return { success: true };
                    },

                    handleFinalAnswer: ({ agent, task, parsedLLMOutput }) => {
                        set(state => ({
                            executionState: {
                                ...state.executionState,
                                [agent.id]: {
                                    ...state.executionState[agent.id],
                                    thinking: false
                                }
                            }
                        }));
                        return parsedLLMOutput;
                    },

                    // Status handling methods
                    handleAgentStatusChange: async (agent, status, task) => {
                        await statusManager.transition({
                            currentStatus: agent.status,
                            targetStatus: status,
                            entity: 'agent',
                            entityId: agent.id,
                            metadata: {
                                taskId: task?.id,
                                timestamp: Date.now()
                            }
                        });

                        logManager.info(
                            `Agent ${agent.name} status changed to ${status}`,
                            agent.name,
                            task?.id
                        );
                    },

                    handleIterationStart: async ({ agent, task, iterations, maxAgentIterations }) => {
                        set(state => ({
                            executionState: {
                                ...state.executionState,
                                [agent.id]: {
                                    ...state.executionState[agent.id],
                                    iterations,
                                    maxIterations: maxAgentIterations
                                }
                            }
                        }));

                        logManager.info(
                            `Starting iteration ${iterations + 1}/${maxAgentIterations}`,
                            agent.name,
                            task.id
                        );
                    },

                    handleIterationEnd: async ({ agent, task, iterations, maxAgentIterations }) => {
                        set(state => ({
                            executionState: {
                                ...state.executionState,
                                [agent.id]: {
                                    ...state.executionState[agent.id],
                                    iterations,
                                    maxIterations: maxAgentIterations
                                }
                            }
                        }));

                        logManager.info(
                            `Completed iteration ${iterations + 1}/${maxAgentIterations}`,
                            agent.name,
                            task.id
                        );
                    }
                }),
                {
                    name: config.name || 'agent-store',
                    enabled: config.middleware?.devtools
                }
            )
        )
    );
};

export default createAgentStore;
