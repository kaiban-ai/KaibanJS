/**
 * @file teamStore.ts
 * @path src/stores/teamStore/teamStore.ts
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { TeamManager } from '../../managers/domain/team/teamManager';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum } from '../../types/common/commonEnums';

import type { ITeamState, ITeamStoreMethods, ITeamInputs } from '../../types/team/teamBaseTypes';
import type { IHandlerResult } from '../../types/common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../../types/common/commonMetadataTypes';
import type { IAgentType } from '../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../types/task/taskBaseTypes';

interface ITeamStoreConfig {
    name: string;
}

type TeamStoreState = ITeamState & {
    getState: () => ITeamState;
    setState: (partial: Partial<ITeamState> | ((state: ITeamState) => Partial<ITeamState>), replace?: boolean) => void;
    subscribe: () => () => void;
    destroy: () => void;
};

const createInitialState = (config: ITeamStoreConfig): ITeamState => ({
    name: config.name,
    agents: [],
    tasks: [],
    workflowLogs: [],
    teamWorkflowStatus: WORKFLOW_STATUS_enum.INITIAL,
    workflowContext: '',
    inputs: {},
    env: {},
    tasksInitialized: false
});

export const createTeamStore = (config: ITeamStoreConfig) => {
    const teamManager = TeamManager.getInstance();

    return create<TeamStoreState>()(
        subscribeWithSelector((set, get) => ({
            ...createInitialState(config),

            // Base Store Methods
            getState: () => get(),
            setState: (partial, replace) => set(partial, replace),
            subscribe: () => () => {},
            destroy: () => {},

            // Workflow Methods
            startWorkflow: async (inputs?: ITeamInputs): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                const state = get();
                const result = await teamManager.startWorkflow(state, inputs);
                
                if (result.success) {
                    set(state => ({
                        ...state,
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                        inputs: inputs || {}
                    }));
                }

                return result;
            },

            stopWorkflow: async (reason?: string): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                const result = await teamManager.stopWorkflow(reason);
                
                if (result.success) {
                    set(state => ({
                        ...state,
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED
                    }));
                }

                return result;
            },

            handleWorkflowError: async (params: { task?: ITaskType; error: Error; context?: Record<string, unknown> }): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                const result = await teamManager.handleWorkflowError(params.error, { task: params.task, context: params.context });
                
                if (!result.success) {
                    set(state => ({
                        ...state,
                        teamWorkflowStatus: WORKFLOW_STATUS_enum.ERRORED
                    }));
                }

                return result;
            },

            // Task Methods  
            handleTaskStatusChange: async (taskId: string, status: keyof typeof TASK_STATUS_enum, metadata?: Record<string, unknown>): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                const result = await teamManager.handleTaskStatusChange(taskId, status, metadata);
                
                if (result.success) {
                    const state = get();
                    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
                    if (taskIndex !== -1) {
                        const updatedTasks = [...state.tasks];
                        updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status };
                        set({ tasks: updatedTasks });
                    }
                }

                return result;
            },

            handleTaskError: async (task: ITaskType, error: Error, context?: Record<string, unknown>): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                return await teamManager.handleTaskError(task, error, context);
            },

            handleTaskBlocked: async (taskId: string, reason: string): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                return await teamManager.handleTaskBlocked(taskId, reason);
            },

            // Agent Methods
            handleAgentStatusChange: async (agent: IAgentType, status: keyof typeof AGENT_STATUS_enum, task?: ITaskType): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                const result = await teamManager.handleAgentStatusChange(agent, status, task);
                
                if (result.success) {
                    const state = get();
                    const agentIndex = state.agents.findIndex(a => a.id === agent.id);
                    if (agentIndex !== -1) {
                        const updatedAgents = [...state.agents];
                        updatedAgents[agentIndex] = { ...updatedAgents[agentIndex], status };
                        set({ agents: updatedAgents });
                    }
                }

                return result;
            },

            handleAgentError: async (params: { agent: IAgentType; task?: ITaskType; error: Error; context?: Record<string, unknown> }): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                return await teamManager.handleAgentError(params);
            },

            // Required by ITeamStoreMethods
            provideFeedback: async (taskId: string, feedback: string, metadata?: Record<string, unknown>): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> => {
                return await teamManager.provideFeedback(taskId, feedback, metadata);
            }
        }))
    );
};

export type TeamStore = ReturnType<typeof createTeamStore>;
