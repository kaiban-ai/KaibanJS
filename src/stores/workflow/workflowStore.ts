/**
 * @file workflowStore.ts
 * @path KaibanJS/src/stores/workflow/workflowStore.ts
 * @description Workflow store implementation using Zustand
 *
 * @module stores/workflow
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { TASK_STATUS_enum } from '../../types/common/commonEnums';
import { createError } from '../../types/common/commonErrorTypes';
import type { IAgentType } from '../../types/agent';
import type { ITaskType } from '../../types/task';
import { 
    type IStepConfig,
    createDefaultStepResult 
} from '../../types/workflow/workflowStepsTypes';
import type { 
    IWorkflowState,
    IWorkflowStore,
    IWorkflowStoreConfig 
} from '../../types/workflow/workflowStoreTypes';
import {
    createInitialCostDetails,
    createInitialResourceMetrics,
    createInitialUsageMetrics,
    createInitialPerformanceMetrics
} from '../../types/workflow/workflowStateHelpers';

// ─── Initial State Creation ──────────────────────────────────────────────────────
const createInitialState = (config: IWorkflowStoreConfig): IWorkflowState => ({
    id: config.workflowId,
    name: config.name,
    workflowId: config.workflowId,
    status: 'INITIAL',
    steps: config.steps,
    currentStepIndex: 0,
    stepResults: {},
    assignedAgents: {},
    pendingTasks: [],
    activeTasks: [],
    completedTasks: [],
    errors: [],
    agents: [],
    tasks: [],
    workflowLogs: [],
    costDetails: createInitialCostDetails(),
    metadata: {
        created: new Date()
    },
    metrics: {
        resources: createInitialResourceMetrics(),
        usage: createInitialUsageMetrics(),
        performance: createInitialPerformanceMetrics(),
        costDetails: createInitialCostDetails()
    }
});

// ─── Store Creation ─────────────────────────────────────────────────────────────
const createWorkflowStore = (config: IWorkflowStoreConfig) => {
    return create<IWorkflowStore>()(
        subscribeWithSelector(
            devtools(
                (set, get) => ({
                    ...createInitialState(config),

                    // ─── Base Methods ────────────────────────────────────────────
                    getState: () => get(),
                    setState: set,
                    subscribe: () => () => {},
                    destroy: () => {},

                    // ─── Step Actions ───────────────────────────────────────────
                    startStep: async (stepId: string, agent: IAgentType) => {
                        const state = get();
                        const stepIndex = state.steps.findIndex((s: IStepConfig) => s.id === stepId);
                        if (stepIndex === -1) {
                            throw createError({
                                message: 'Step not found',
                                type: 'WorkflowError',
                                context: { stepId }
                            });
                        }

                        set({
                            currentStepIndex: stepIndex,
                            assignedAgents: {
                                ...state.assignedAgents,
                                [stepId]: agent
                            }
                        });
                    },

                    completeStep: (stepId: string, result) => {
                        set((state: IWorkflowState) => ({
                            stepResults: {
                                ...state.stepResults,
                                [stepId]: result
                            }
                        }));
                    },

                    failStep: (stepId: string, error) => {
                        const taskId = get().steps[get().currentStepIndex]?.id;
                        if (!taskId) return;

                        set((state: IWorkflowState) => ({
                            errors: [...state.errors, error],
                            status: 'ERRORED',
                            stepResults: {
                                ...state.stepResults,
                                [stepId]: {
                                    ...createDefaultStepResult(taskId),
                                    success: false,
                                    error
                                }
                            }
                        }));
                    },

                    skipStep: (stepId: string) => {
                        const state = get();
                        const nextIndex = state.currentStepIndex + 1;
                        if (nextIndex < state.steps.length) {
                            set({ currentStepIndex: nextIndex });
                        }
                    },

                    // ─── Control Actions ────────────────────────────────────────
                    startWorkflow: async () => {
                        set({
                            status: 'RUNNING',
                            metadata: {
                                ...get().metadata,
                                started: new Date()
                            }
                        });
                    },

                    pauseWorkflow: () => {
                        set({ status: 'STOPPED' });
                    },

                    resumeWorkflow: () => {
                        set({ status: 'RUNNING' });
                    },

                    stopWorkflow: () => {
                        set({ 
                            status: 'STOPPED',
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

                    // ─── Agent Actions ──────────────────────────────────────────
                    assignAgent: (stepId: string, agent: IAgentType) => {
                        set((state: IWorkflowState) => ({
                            assignedAgents: {
                                ...state.assignedAgents,
                                [stepId]: agent
                            }
                        }));
                    },

                    unassignAgent: (stepId: string) => {
                        set((state: IWorkflowState) => {
                            const { [stepId]: _, ...remainingAgents } = state.assignedAgents;
                            return { assignedAgents: remainingAgents };
                        });
                    },

                    // ─── Task Actions ───────────────────────────────────────────
                    addTask: (task: ITaskType) => {
                        set((state: IWorkflowState) => ({
                            pendingTasks: [...state.pendingTasks, task]
                        }));
                    },

                    removeTask: (taskId: string) => {
                        set((state: IWorkflowState) => ({
                            pendingTasks: state.pendingTasks.filter((t: ITaskType) => t.id !== taskId),
                            activeTasks: state.activeTasks.filter((t: ITaskType) => t.id !== taskId),
                            completedTasks: state.completedTasks.filter((t: ITaskType) => t.id !== taskId)
                        }));
                    },

                    updateTaskStatus: (taskId: string, status: keyof typeof TASK_STATUS_enum) => {
                        const state = get();
                        const task = [...state.pendingTasks, ...state.activeTasks, ...state.completedTasks]
                            .find((t: ITaskType) => t.id === taskId);
                        
                        if (!task) {
                            throw createError({
                                message: 'Task not found',
                                type: 'TaskError',
                                context: { taskId }
                            });
                        }

                        switch (status) {
                            case 'PENDING':
                                set({
                                    pendingTasks: [...state.pendingTasks, task],
                                    activeTasks: state.activeTasks.filter((t: ITaskType) => t.id !== taskId),
                                    completedTasks: state.completedTasks.filter((t: ITaskType) => t.id !== taskId)
                                });
                                break;
                            case 'DOING':
                                set({
                                    pendingTasks: state.pendingTasks.filter((t: ITaskType) => t.id !== taskId),
                                    activeTasks: [...state.activeTasks, task],
                                    completedTasks: state.completedTasks.filter((t: ITaskType) => t.id !== taskId)
                                });
                                break;
                            case 'DONE':
                                set({
                                    pendingTasks: state.pendingTasks.filter((t: ITaskType) => t.id !== taskId),
                                    activeTasks: state.activeTasks.filter((t: ITaskType) => t.id !== taskId),
                                    completedTasks: [...state.completedTasks, task]
                                });
                                break;
                            default:
                                throw createError({
                                    message: 'Invalid task status',
                                    type: 'TaskError',
                                    context: { taskId, status }
                                });
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
