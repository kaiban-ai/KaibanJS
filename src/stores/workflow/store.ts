/**
 * @file store.ts
 * @path src/stores/workflowStore/store.ts
 * @description Workflow store implementation
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { 
    IWorkflowState,
    IWorkflowStoreConfig,
    IWorkflowStoreMethods
} from '@/utils/types/workflow/store';
import type { AgentType } from '@/utils/types/agent/base';
import type { TaskType } from '@/utils/types/task/base';
import type { StepResult } from '@/utils/types/workflow/steps';
import { PrettyError } from '@/utils/core/errors';

const createInitialState = (config: IWorkflowStoreConfig): IWorkflowState => ({
    name: config.name,
    workflowId: config.workflowId,
    status: 'idle',
    steps: config.steps,
    currentStepIndex: 0,
    stepResults: {},
    assignedAgents: {},
    pendingTasks: [],
    activeTasks: [],
    completedTasks: [],
    errors: [],
    agents: [], // From BaseStoreState
    tasks: [], // From BaseStoreState
    workflowLogs: [], // From BaseStoreState
    costDetails: {
        totalCost: 0,
        breakdown: {}
    },
    metadata: {
        created: new Date()
    }
});

const createWorkflowStore = (config: IWorkflowStoreConfig) => {
    return create<IWorkflowState & IWorkflowStoreMethods>()(
        subscribeWithSelector(
            devtools(
                (set, get) => ({
                    ...createInitialState(config),

                    // Base methods
                    getState: () => get(),
                    setState: set,
                    subscribe: () => () => {},
                    destroy: () => {},

                    // Step actions
                    startStep: async (stepId, agent) => {
                        const state = get();
                        const stepIndex = state.steps.findIndex(s => s.id === stepId);
                        if (stepIndex === -1) throw new PrettyError('Step not found');

                        set({
                            currentStepIndex: stepIndex,
                            assignedAgents: {
                                ...state.assignedAgents,
                                [stepId]: agent
                            }
                        });
                    },

                    completeStep: (stepId, result) => {
                        set(state => ({
                            stepResults: {
                                ...state.stepResults,
                                [stepId]: result
                            }
                        }));
                    },

                    failStep: (stepId, error) => {
                        set(state => ({
                            errors: [...state.errors, error],
                            status: 'error'
                        }));
                    },

                    skipStep: (stepId) => {
                        const state = get();
                        const nextIndex = state.currentStepIndex + 1;
                        if (nextIndex < state.steps.length) {
                            set({ currentStepIndex: nextIndex });
                        }
                    },

                    // Control actions
                    startWorkflow: async () => {
                        set({
                            status: 'running',
                            metadata: {
                                ...get().metadata,
                                started: new Date()
                            }
                        });
                    },

                    pauseWorkflow: () => {
                        set({ status: 'paused' });
                    },

                    resumeWorkflow: () => {
                        set({ status: 'running' });
                    },

                    stopWorkflow: () => {
                        set({ 
                            status: 'stopped',
                            metadata: {
                                ...get().metadata,
                                completed: new Date()
                            }
                        });
                    },

                    resetWorkflow: () => {
                        set({
                            ...createInitialState(config),
                            metadata: {
                                ...get().metadata,
                                started: undefined,
                                completed: undefined
                            }
                        });
                    },

                    // Agent actions
                    assignAgent: (stepId, agent) => {
                        set(state => ({
                            assignedAgents: {
                                ...state.assignedAgents,
                                [stepId]: agent
                            }
                        }));
                    },

                    unassignAgent: (stepId) => {
                        set(state => {
                            const { [stepId]: _, ...remainingAgents } = state.assignedAgents;
                            return { assignedAgents: remainingAgents };
                        });
                    },

                    // Task actions
                    addTask: (task) => {
                        set(state => ({
                            pendingTasks: [...state.pendingTasks, task]
                        }));
                    },

                    removeTask: (taskId) => {
                        set(state => ({
                            pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
                            activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                            completedTasks: state.completedTasks.filter(t => t.id !== taskId)
                        }));
                    },

                    updateTaskStatus: (taskId, status) => {
                        const state = get();
                        const task = [...state.pendingTasks, ...state.activeTasks, ...state.completedTasks]
                            .find(t => t.id === taskId);
                        
                        if (!task) throw new PrettyError('Task not found');

                        switch (status) {
                            case 'pending':
                                set({
                                    pendingTasks: [...state.pendingTasks, task],
                                    activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                                    completedTasks: state.completedTasks.filter(t => t.id !== taskId)
                                });
                                break;
                            case 'active':
                                set({
                                    pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
                                    activeTasks: [...state.activeTasks, task],
                                    completedTasks: state.completedTasks.filter(t => t.id !== taskId)
                                });
                                break;
                            case 'completed':
                                set({
                                    pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
                                    activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                                    completedTasks: [...state.completedTasks, task]
                                });
                                break;
                            default:
                                throw new PrettyError('Invalid task status');
                        }
                    }
                }),
                {
                    name: config.name,
                    enabled: config.middleware?.devtools
                }
            )
        )
    );
};

export default createWorkflowStore;