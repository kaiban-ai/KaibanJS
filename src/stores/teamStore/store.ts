/**
 * @file store.ts
 * @path src/stores/teamStore/store.ts
 * @description Team store implementation
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { 
    ITeamState, 
    ITeamStoreConfig, 
    ITeamStoreMethods,
    ITeamMember 
} from '@/utils/types/team/store';
import type { WorkflowResult } from '@/utils/types/workflow/base';
import { PrettyError } from '@/utils/core/errors';

const createInitialState = (config: ITeamStoreConfig): ITeamState => ({
    name: config.name,
    teamId: config.teamId,
    members: [],
    activeMembers: [],
    pendingTasks: [],
    activeTasks: [],
    completedTasks: [],
    logs: [],
    errors: [],
    status: 'idle',
    agents: [], // From BaseStoreState
    tasks: [], // From BaseStoreState
    workflowLogs: [], // From BaseStoreState
    metadata: {
        created: new Date()
    }
});

const createTeamStore = (config: ITeamStoreConfig) => {
    return create<ITeamState & ITeamStoreMethods>()(
        subscribeWithSelector(
            devtools(
                (set, get) => ({
                    ...createInitialState(config),

                    // Base methods
                    getState: () => get(),
                    setState: set,
                    subscribe: () => () => {},
                    destroy: () => {},

                    // Workflow actions
                    startWorkflow: async (workflowId) => {
                        set({ status: 'running' });
                    },

                    stopWorkflow: async (workflowId) => {
                        set({ status: 'stopped' });
                    },

                    handleWorkflowResult: (result) => {
                        set({ workflowResult: result });
                    },

                    // Member actions
                    addTeamMember: (agent, role) => {
                        const member: ITeamMember = {
                            agent,
                            role,
                            capabilities: agent.capabilities || [],
                            assignedTasks: []
                        };

                        set(state => ({
                            members: [...state.members, member]
                        }));
                    },

                    removeTeamMember: (agentId) => {
                        set(state => ({
                            members: state.members.filter(m => m.agent.id !== agentId),
                            activeMembers: state.activeMembers.filter(m => m.agent.id !== agentId)
                        }));
                    },

                    updateMemberRole: (agentId, role) => {
                        set(state => ({
                            members: state.members.map(m => 
                                m.agent.id === agentId ? { ...m, role } : m
                            )
                        }));
                    },

                    // Task actions
                    assignTask: (taskId, agentId) => {
                        const state = get();
                        const member = state.members.find(m => m.agent.id === agentId);
                        const task = state.pendingTasks.find(t => t.id === taskId);

                        if (!member || !task) {
                            throw new PrettyError('Member or task not found');
                        }

                        set(state => ({
                            pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
                            activeTasks: [...state.activeTasks, task],
                            members: state.members.map(m => 
                                m.agent.id === agentId
                                    ? { ...m, assignedTasks: [...m.assignedTasks, task] }
                                    : m
                            )
                        }));
                    },

                    completeTask: (taskId) => {
                        const state = get();
                        const task = state.activeTasks.find(t => t.id === taskId);

                        if (!task) {
                            throw new PrettyError('Task not found');
                        }

                        set(state => ({
                            activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                            completedTasks: [...state.completedTasks, task],
                            members: state.members.map(m => ({
                                ...m,
                                assignedTasks: m.assignedTasks.filter(t => t.id !== taskId)
                            }))
                        }));
                    },

                    failTask: (taskId, error) => {
                        set(state => ({
                            errors: [...state.errors, error],
                            activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                            pendingTasks: [...state.pendingTasks, 
                                state.activeTasks.find(t => t.id === taskId)!
                            ],
                            members: state.members.map(m => ({
                                ...m,
                                assignedTasks: m.assignedTasks.filter(t => t.id !== taskId)
                            }))
                        }));
                    },

                    // Log actions
                    addLog: (log) => {
                        set(state => ({
                            logs: [...state.logs, log]
                        }));
                    },

                    clearLogs: () => {
                        set({ logs: [] });
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

export default createTeamStore;