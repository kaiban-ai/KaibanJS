/**
 * @file selectors.ts
 * @path src/stores/teamStore/selectors.ts
 * @description Team store selectors
 */

import type { ITeamState, ITeamMember } from '@/utils/types/team/store';
import type { TaskType } from '@/utils/types/task/base';

// Member selectors
export const selectTeamMembers = (state: ITeamState): ITeamMember[] =>
    state.members;

export const selectMemberById = (state: ITeamState, agentId: string): ITeamMember | undefined =>
    state.members.find(m => m.agent.id === agentId);

export const selectMembersByRole = (state: ITeamState, role: string): ITeamMember[] =>
    state.members.filter(m => m.role === role);

export const selectActiveMembers = (state: ITeamState): ITeamMember[] =>
    state.activeMembers;

// Task selectors
export const selectPendingTasks = (state: ITeamState): TaskType[] =>
    state.pendingTasks;

export const selectActiveTasks = (state: ITeamState): TaskType[] =>
    state.activeTasks;

export const selectCompletedTasks = (state: ITeamState): TaskType[] =>
    state.completedTasks;

export const selectMemberTasks = (state: ITeamState, agentId: string): TaskType[] =>
    state.members.find(m => m.agent.id === agentId)?.assignedTasks ?? [];

// Status selectors
export const selectTeamStatus = (state: ITeamState) =>
    state.status;

export const selectTeamErrors = (state: ITeamState): Error[] =>
    state.errors;

export const selectTeamLogs = (state: ITeamState) =>
    state.logs;

// Performance selectors
export const selectTeamCompletion = (state: ITeamState): number => {
    const total = state.pendingTasks.length + state.activeTasks.length + state.completedTasks.length;
    return total === 0 ? 0 : (state.completedTasks.length / total) * 100;
};

export const selectMemberWorkload = (state: ITeamState, agentId: string): number =>
    state.members.find(m => m.agent.id === agentId)?.assignedTasks.length ?? 0;

// Composite selectors
export const selectAvailableMembers = (state: ITeamState): ITeamMember[] =>
    state.members.filter(m => m.assignedTasks.length === 0);

export const selectMembersByCapability = (state: ITeamState, capability: string): ITeamMember[] =>
    state.members.filter(m => m.capabilities.includes(capability));

export const selectTeamWorkload = (state: ITeamState): { [key: string]: number } =>
    state.members.reduce((acc, member) => ({
        ...acc,
        [member.agent.id]: member.assignedTasks.length
    }), {});