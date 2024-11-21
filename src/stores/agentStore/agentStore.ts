/**
 * @file agentStore.ts
 * @path src/stores/agentStore/store.ts
 * @description Agent store implementation
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { 
    IAgentState, 
    IAgentStoreMethods,
    IAgentStoreConfig 
} from '../../types/agent/agentStoreTypes';
import type { AgentType } from '../../types/agent/agentBaseTypes';
import type { TaskType } from '../../types/task/taskBase';
import type { HandlerResult } from '../../types/common/commonHandlerTypes';
import type { Output } from '../../types/llm/llmResponseTypes';
import { createErrorResult, createSuccessResult } from '../../types/common/commonHandlerTypes';
import { AGENT_STATUS_enum } from '../../types/common/commonEnums';
import { LogManager } from '../../managers/core/logManager';
import { toErrorType } from '../../types/common/commonErrorTypes';

const createInitialState = (config: IAgentStoreConfig): IAgentState => ({
    name: config.name,
    agents: [],
    activeAgents: [],
    tasks: [],
    workflowLogs: [],
    metadata: {},
    executionState: {},
    performanceStats: {},
    errors: [],
    loading: false
});

export type AgentStoreState = IAgentState & IAgentStoreMethods;
export type AgentStoreType = ReturnType<typeof createAgentStore>;

export const createAgentStore = (config: IAgentStoreConfig) => {
    const logManager = LogManager.getInstance();

    const store = create<AgentStoreState>()(
        subscribeWithSelector((set, get) => ({
            ...createInitialState(config),

            // Base Store Methods
            getState: () => get(),
            setState: (partial) => set(partial),
            subscribe: () => () => {},
            destroy: () => {},

            // Error Actions
            handleAgentError: async ({ agent, task, error, context }) => {
                try {
                    const state = get();
                    logManager.log('Agent Error', agent?.name, task?.id, 'error', error);
                    
                    set({
                        errors: [...state.errors, error],
                        executionState: {
                            ...state.executionState,
                            [agent.id]: {
                                ...state.executionState[agent.id],
                                lastError: error
                            }
                        }
                    });

                    return createSuccessResult();
                } catch (err) {
                    return createErrorResult(toErrorType( 'AgentError'));
                }
            },

            // Thinking Actions
            handleAgentThinking: async ({ agent, task, messages, output }) => {
                try {
                    const state = get();
                    
                    set({
                        executionState: {
                            ...state.executionState,
                            [agent.id]: {
                                ...state.executionState[agent.id],
                                thinking: true
                            }
                        }
                    });

                    return createSuccessResult({ messages, output });
                } catch (err) {
                    return createErrorResult(toErrorType('AgentError'));
                }
            },

            handleAgentOutput: async ({ agent, task, output, type }) => {
                try {
                    const state = get();
                    const outputContent = output.generations?.[0]?.message?.content || '';
                    
                    set({
                        executionState: {
                            ...state.executionState,
                            [agent.id]: {
                                ...state.executionState[agent.id],
                                lastOutput: outputContent
                            }
                        }
                    });

                    return createSuccessResult({ output });
                } catch (err) {
                    return createErrorResult(toErrorType('AgentError'));
                }
            },

            // Status Actions 
            handleAgentStatusChange: async (agent, status, task) => {
                try {
                    const state = get();
                    
                    set({
                        executionState: {
                            ...state.executionState,
                            [agent.id]: {
                                ...state.executionState[agent.id],
                                status
                            }
                        }
                    });
                } catch (err) {
                    logManager.log('Status Change Error', agent?.name, task?.id, 'error', err as Error);
                }
            },

            handleIterationStart: async ({ agent, task, iterations, maxAgentIterations }) => {
                try {
                    const state = get();
                    
                    set({
                        executionState: {
                            ...state.executionState,
                            [agent.id]: {
                                ...state.executionState[agent.id],
                                status: AGENT_STATUS_enum.ITERATION_START,
                                iterations
                            }
                        }
                    });
                } catch (err) {
                    logManager.log('Iteration Start Error', agent?.name, task?.id, 'error', err as Error);
                }
            },

            handleIterationEnd: async ({ agent, task, iterations, maxAgentIterations }) => {
                try {
                    const state = get();
                    
                    set({
                        executionState: {
                            ...state.executionState,
                            [agent.id]: {
                                ...state.executionState[agent.id],
                                status: AGENT_STATUS_enum.ITERATION_END,
                                iterations 
                            }
                        }
                    });
                } catch (err) {
                    logManager.log('Iteration End Error', agent?.name, task?.id, 'error', err as Error);
                }
            }
        }))
    );

    return store;
};

export type AgentStore = ReturnType<typeof createAgentStore>;