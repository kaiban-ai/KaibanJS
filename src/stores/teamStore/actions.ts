/**
 * @file actions.ts
 * @path src/stores/teamStore/actions.ts
 * @description Team store actions
 */

import type { ITeamState, ITeamMember } from '@/utils/types/team/store';
import type { AgentType } from '@/utils/types/agent/base';
import type { TaskType } from '@/utils/types/task/base';
import type { Log } from '@/utils/types/team/logs';
import type { WorkflowResult } from '@/utils/types/workflow/base';
import { PrettyError } from '@/utils/core/errors';

// Member management
export const addTeamMember = (state: ITeamState, agent: AgentType, role: string) => {
    const member: ITeamMember = {
        agent,
        role,
        capabilities: agent.capabilities || [],
        assignedTasks: []
    };

    return {
        members: [...state.members, member]
    };
};

export const removeTeamMember = (state: ITeamState, agentId: string) => ({
    members: state.members.filter(m => m.agent.id !== agentId),
    activeMembers: state.activeMembers.filter(m => m.agent.id !== agentId)
});

export const updateMemberRole = (state: ITeamState, agentId: string, role: string) => ({
    members: state.members.map(m =>
        m.agent.id === agentId ? { ...m, role } : m
    )
});

// Task management
export const assignTask = (state: ITeamState, taskId: string, agentId: string) => {
    const member = state.members.find(m => m.agent.id === agentId);
    const task = state.pendingTasks.find(t => t.id === taskId);

    if (!member || !task) {
        throw new PrettyError('Member or task not found');
    }

    return {
        pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
        activeTasks: [...state.activeTasks, task],
        members: state.members.map(m =>
            m.agent.id === agentId
                ? { ...m, assignedTasks: [...m.assignedTasks, task] }
                : m
        )
    };
};

export const completeTask = (state: ITeamState, taskId: string) => {
    const task = state.activeTasks.find(t => t.id === taskId);
    if (!task) throw new PrettyError('Task not found');

    return {
        activeTasks: state.activeTasks.filter(t => t.id !== taskId),
        completedTasks: [...state.completedTasks, task],
        members: state.members.map(m => ({
            ...m,
            assignedTasks: m.assignedTasks.filter(t => t.id !== taskId)
        }))
    };
};

export const failTask = (state: ITeamState, taskId: string, error: Error) => ({
    errors: [...state.errors, error],
    activeTasks: state.activeTasks.filter(t => t.id !== taskId),
    pendingTasks: [...state.pendingTasks,
        state.activeTasks.find(t => t.id === taskId)!
    ],
    members: state.members.map(m => ({
        ...m,
        assignedTasks: m.assignedTasks.filter(t => t.id !== taskId)
    }))
});

// Workflow management
export const startWorkflow = (state: ITeamState) => ({
    status: 'running',
    metadata: {
        ...state.metadata,
        lastActive: new Date()
    }
});

export const stopWorkflow = (state: ITeamState) => ({
    status: 'stopped'
});

export const updateWorkflowResult = (state: ITeamState, result: WorkflowResult) => ({
    workflowResult: result
});

// Log management
export const addLog = (state: ITeamState, log: Log) => ({
    logs: [...state.logs, log]
});

export const clearLogs = () => ({
    logs: []
});