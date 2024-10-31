// src/stores/agentStore/agentState.ts

import { AGENT_STATUS_enum, TASK_STATUS_enum } from '@/utils/core/enums';
import type { 
    AgentStoreState,
    BaseStoreState 
} from '@/utils/types/store/base';
import type { 
    AgentType, 
    TaskType, 
    FeedbackObject 
} from '@/utils/types';
import { logger } from '@/utils/core/logger';

export const useAgentState = (
    set: (fn: (state: AgentStoreState) => Partial<AgentStoreState>) => void,
    get: () => AgentStoreState
) => {
    const initialState: BaseStoreState = {
        name: '',
        agents: [],
        tasks: [],
        workflowLogs: [],
        tasksInitialized: false
    };

    const methods = {
        provideFeedback: async (taskId: string, feedbackContent: string): Promise<void> => {
            const task = get().tasks.find(t => t.id === taskId);
            if (!task) {
                logger.error("Task not found for feedback");
                return;
            }

            const newFeedback: FeedbackObject = {
                id: `feedback-${Date.now()}`,
                content: feedbackContent,
                status: 'PENDING',
                timestamp: new Date(),
                userId: 'system'
            };

            set(state => ({
                tasks: state.tasks.map(t => t.id === taskId ? {
                    ...t,
                    feedbackHistory: [...(t.feedbackHistory || []), newFeedback],
                    status: 'REVISE' as keyof typeof TASK_STATUS_enum
                } : t)
            }));
        },

        updateAgentStatus: (agentId: string, status: keyof typeof AGENT_STATUS_enum): void => {
            set(state => ({
                agents: state.agents.map(agent => 
                    agent.id === agentId ? { ...agent, status } : agent
                )
            }));
        },

        updateTaskStatus: (taskId: string, status: keyof typeof TASK_STATUS_enum): void => {
            set(state => ({
                tasks: state.tasks.map(task => 
                    task.id === taskId ? { ...task, status } : task
                )
            }));
        },

        initializeTasks: (tasks: TaskType[]): void => {
            if (!get().tasksInitialized) {
                set(state => ({
                    tasks,
                    tasksInitialized: true
                }));
            }
        },

        addAgent: (agent: AgentType): void => {
            set(state => ({
                agents: [...state.agents, agent]
            }));
        },

        removeAgent: (agentId: string): void => {
            set(state => ({
                agents: state.agents.filter(agent => agent.id !== agentId)
            }));
        }
    };

    return {
        ...initialState,
        ...methods
    };
};