/**
 * @file teamSelectors.ts
 * @path src/stores/teamStore/teamSelectors.ts
 */

import type { TeamState } from '../../types/team/teamBaseTypes';
import type { AgentType } from '../../types/agent/agentBaseTypes';
import type { TaskType } from '../../types/task/taskBase';

export const createTeamSelectors = () => ({
    getTeamStatus: (state: TeamState) =>
        state.teamWorkflowStatus,

    getTeamAgents: (state: TeamState) =>
        state.agents,

    getTeamTasks: (state: TeamState) =>
        state.tasks,

    getTeamWorkflowLogs: (state: TeamState) =>
        state.workflowLogs,

    getTeamEnvironment: (state: TeamState) =>
        state.env,

    getTeamInputs: (state: TeamState) =>
        state.inputs,

    isTeamInitialized: (state: TeamState) =>
        state.tasksInitialized,
        
    getTeamMetrics: (state: TeamState) => ({
        agentCount: state.agents.length,
        taskCount: state.tasks.length,
        completedTaskCount: state.tasks.filter(t => t.status === 'DONE').length,
        failedTaskCount: state.tasks.filter(t => t.status === 'ERROR').length
    })
});

export type TeamSelectors = ReturnType<typeof createTeamSelectors>;