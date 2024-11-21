/**
 * @file actions.ts
 * @path src/stores/workflowStore/actions.ts
 * @description Workflow store actions
 */

import type { IWorkflowState } from '@/types/workflow/workflowStore';
import type { AgentType } from '@/utils/types/agent/base';
import type { TaskType } from '@/types/task/taskBase';
import type { StepResult } from '@/types/workflow/workflowSteps';
import { PrettyError } from '@/utils/core/errors';

// Step management
export const startStep = (state: IWorkflowState, stepId: string, agent: AgentType) => {
    const stepIndex = state.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) throw new PrettyError('Step not found');

    return {
        currentStepIndex: stepIndex,
        assignedAgents: {
            ...state.assignedAgents,
            [stepId]: agent
        }
    };
};

export const completeStep = (state: IWorkflowState, stepId: string, result: StepResult) => ({
    stepResults: {
        ...state.stepResults,
        [stepId]: result
    }
});

export const failStep = (state: IWorkflowState, stepId: string, error: Error) => ({
    errors: [...state.errors, error],
    status: 'error'
});

export const skipStep = (state: IWorkflowState) => {
    const nextIndex = state.currentStepIndex + 1;
    return nextIndex < state.steps.length ? { currentStepIndex: nextIndex } : {};
};

// Workflow control
export const startWorkflow = (state: IWorkflowState) => ({
    status: 'running',
    metadata: {
        ...state.metadata,
        started: new Date()
    }
});

export const pauseWorkflow = () => ({
    status: 'paused'
});

export const resumeWorkflow = () => ({
    status: 'running'
});

export const stopWorkflow = (state: IWorkflowState) => ({
    status: 'stopped',
    metadata: {
        ...state.metadata,
        completed: new Date()
    }
});

// Agent management
export const assignAgent = (state: IWorkflowState, stepId: string, agent: AgentType) => ({
    assignedAgents: {
        ...state.assignedAgents,
        [stepId]: agent
    }
});

export const unassignAgent = (state: IWorkflowState, stepId: string) => {
    const { [stepId]: _, ...remainingAgents } = state.assignedAgents;
    return { assignedAgents: remainingAgents };
};

// Task management
export const addTask = (state: IWorkflowState, task: TaskType) => ({
    pendingTasks: [...state.pendingTasks, task]
});

export const removeTask = (state: IWorkflowState, taskId: string) => ({
    pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
    activeTasks: state.activeTasks.filter(t => t.id !== taskId),
    completedTasks: state.completedTasks.filter(t => t.id !== taskId)
});

export const updateTaskStatus = (state: IWorkflowState, taskId: string, status: string) => {
    const task = [...state.pendingTasks, ...state.activeTasks, ...state.completedTasks]
        .find(t => t.id === taskId);
    
    if (!task) throw new PrettyError('Task not found');

    switch (status) {
        case 'pending':
            return {
                pendingTasks: [...state.pendingTasks, task],
                activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                completedTasks: state.completedTasks.filter(t => t.id !== taskId)
            };
        case 'active':
            return {
                pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
                activeTasks: [...state.activeTasks, task],
                completedTasks: state.completedTasks.filter(t => t.id !== taskId)
            };
        case 'completed':
            return {
                pendingTasks: state.pendingTasks.filter(t => t.id !== taskId),
                activeTasks: state.activeTasks.filter(t => t.id !== taskId),
                completedTasks: [...state.completedTasks, task]
            };
        default:
            throw new PrettyError('Invalid task status');
    }
};