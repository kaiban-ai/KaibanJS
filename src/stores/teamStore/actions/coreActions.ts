/**
 * @file coreActions.ts
 * @path src/stores/teamStore/actions/coreActions.ts
 * @description Core actions for team store state management
 */

import { logger } from '@/utils/core/logger';
import { setLogLevel } from '@/utils/core/logger';
import { validateTask } from '@/utils/helpers/tasks/taskUtils';
import { PrettyError } from "@/utils/core/errors";
import { defaultValues } from '../state';
import type { LogLevel } from '@/utils/types/common/logging';
import type { 
    TeamState, 
    TeamStore,
    AgentType,
    TaskType,
    TeamInputs,
    TeamEnvironment,
    Log,
    FeedbackObject
} from '@/utils/types';

/**
 * Creates core actions for the team store
 */
export const createCoreActions = (
    get: () => TeamState,
    set: (fn: (state: TeamState) => Partial<TeamState>) => void
) => ({
    /**
     * Sets the team name
     */
    setName: (name: string): void => {
        logger.debug('Setting team name:', name);
        set(state => ({ ...state, name }));
    },

    /**
     * Sets team inputs
     */
    setInputs: (inputs: TeamInputs): void => {
        logger.debug('Setting inputs:', inputs);
        set(state => ({ ...state, inputs }));
    },

    /**
     * Updates team inputs
     */
    updateInputs: (inputs: Partial<TeamInputs>): void => {
        set(state => ({
            ...state,
            inputs: {
                ...state.inputs,
                ...inputs
            }
        }));
    },

    /**
     * Sets environment variables
     */
    setEnv: (env: TeamEnvironment): void => {
        logger.debug('Setting environment variables');
        set(state => ({ ...state, env }));
    },

    /**
     * Updates environment variables
     */
    updateEnvironment: (env: Partial<TeamEnvironment>): void => {
        set(state => ({
            ...state,
            env: {
                ...state.env,
                ...env
            }
        }));
    },

    /**
     * Adds agents to the team
     */
    addAgents: (agents: AgentType[]): void => {
        const { env } = get();
        logger.info(`Adding ${agents.length} agents to team`);
        
        agents.forEach((agent: AgentType) => {
            logger.debug(`Initializing agent: ${agent.name}`);
            agent.initialize(get() as unknown as TeamStore, env);
        });
        
        set(state => ({
            ...state,
            agents: [...state.agents, ...agents]
        }));
    },

    /**
     * Adds tasks to the workflow
     */
    addTasks: (tasks: TaskType[]): void => {
        logger.info(`Adding ${tasks.length} tasks to workflow`);
        
        tasks.forEach((task: TaskType) => {
            if (!validateTask(task)) {
                throw new PrettyError({
                    message: 'Invalid task structure',
                    context: { taskId: task.id, taskTitle: task.title }
                });
            }
            logger.debug(`Setting store for task: ${task.title}`);
            task.setStore(get() as unknown as TeamStore);
        });
        
        set(state => ({
            ...state,
            tasks: [...state.tasks, ...tasks.map((task: TaskType) => ({
                ...task,
                agent: task.agent,
                status: task.status || 'TODO'
            }))],
        }));
    },

    /**
     * Initializes the team store
     */
    initialize: (config: {
        name: string;
        agents?: AgentType[];
        tasks?: TaskType[];
        inputs?: TeamInputs;
        env?: TeamEnvironment;
        logLevel?: LogLevel;
    }): void => {
        const { 
            name, 
            agents = [], 
            tasks = [], 
            inputs = {}, 
            env = {},
            logLevel = 'info' as LogLevel
        } = config;
        
        // Set log level if provided
        if (logLevel) {
            setLogLevel(logLevel);
        }

        // Initialize core state
        set(state => ({
            ...state,
            name,
            env,
            inputs,
            logLevel,
            tasksInitialized: false,
            teamWorkflowStatus: 'INITIAL'
        }));

        // Add agents and tasks
        if (agents.length > 0) {
            get().addAgents(agents);
        }
        
        if (tasks.length > 0) {
            get().addTasks(tasks);
        }
        
        logger.info(`Team "${name}" initialized with ${agents.length} agents and ${tasks.length} tasks`);
    },

    /**
     * Resets the workflow state
     */
    resetWorkflowState: async (): Promise<void> => {
        logger.debug('Resetting workflow state');
        
        set(state => ({
            ...state,
            tasks: state.tasks.map((task: TaskType) => ({
                ...task,
                status: 'TODO',
            })),
            agents: state.agents.map((agent: AgentType) => {
                agent.setStatus('INITIAL');
                return agent;
            }),
            workflowLogs: [],
            workflowContext: '',
            workflowResult: null,
            teamWorkflowStatus: 'INITIAL'
        }));
    },

    /**
     * Clears workflow logs
     */
    clearWorkflowLogs: (): void => {
        set(state => ({
            ...state,
            workflowLogs: []
        }));
    },

    /**
     * Adds a workflow log
     */
    addWorkflowLog: (log: Log): void => {
        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    /**
     * Cleans up resources
     */
    cleanup: async (): Promise<void> => {
        get().clearWorkflowLogs();
        logger.debug('Team store cleaned up');
    },

    /**
     * Gets a cleaned state object
     */
    getCleanedState: (): unknown => {
        const state = get();
        return {
            teamWorkflowStatus: state.teamWorkflowStatus,
            workflowResult: state.workflowResult,
            name: state.name,
            agents: state.agents.map((agent: AgentType) => ({
                ...agent,
                id: '[REDACTED]',
                env: '[REDACTED]',
                llmConfig: {
                    ...agent.llmConfig,
                    apiKey: '[REDACTED]',
                }
            })),
            tasks: state.tasks.map((task: TaskType) => ({
                ...task,
                id: '[REDACTED]',
                agent: task.agent ? {
                    ...task.agent,
                    id: '[REDACTED]',
                    env: '[REDACTED]',
                    llmConfig: {
                        ...task.agent.llmConfig,
                        apiKey: '[REDACTED]',
                    },
                } : null,
                duration: '[REDACTED]',
                endTime: '[REDACTED]',
                startTime: '[REDACTED]',
                feedbackHistory: task.feedbackHistory?.map((feedback: FeedbackObject) => ({
                    ...feedback,
                    timestamp: '[REDACTED]',
                }))
            })),
            workflowLogs: state.workflowLogs,
            inputs: state.inputs,
            workflowContext: state.workflowContext,
            logLevel: state.logLevel,
        };
    }
});

export type CoreActions = ReturnType<typeof createCoreActions>;
export default createCoreActions;