/**
 * State Management Store.
 *
 * This file defines the Zustand store used across the library to manage and maintain state. The store
 * facilitates reactive and efficient updates to the state of agents, tasks, and team workflows, ensuring
 * that the application remains responsive and data-driven. It provides a centralized location for state.
 *
 * Usage:
 * The store is designed to be imported and used directly in components or services where state management
 * is required, offering straightforward access to state properties and actions to modify them.
 */
import {create} from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum} from '../utils/enums';
import { getTaskTitleForLogs, interpolateTaskDescription} from '../utils/tasks';
import {logger, setLogLevel} from '../utils/logger';
import { subscribeWorkflowStatusUpdates } from '../subscribers/teamSubscriber';
import { subscribeTaskStatusUpdates } from '../subscribers/taskSubscriber';
import { setupWorkflowController } from './workflowController';

// ──── Store Factory for Multiple Teams ───────────────────────────────
// 
// Implements a store factory instead of a standard Zustand store to manage state for multiple teams.
// This design supports isolated state management for each team's agents and workflows, 
// allowing multiple teams to operate concurrently with their own tasks and statuses.
// ─────────────────────────────────────────────────────────────────────

const createTeamStore = (initialState = {}) => {   
    // console.log("Initial state:", initialState); // Log the initial state
    // Define the store with centralized state management and actions
    if(initialState.logLevel){
        setLogLevel(initialState.logLevel); // Update logger level if provided
    }
    const useTeamStore =  create(
        devtools(
            subscribeWithSelector((set, get) => ({ 
                ...useAgentStore(set, get),
                ...useTaskStore(set, get),

    teamWorkflowStatus: initialState.teamWorkflowStatus || WORKFLOW_STATUS_enum.INITIAL,
    workflowResult: initialState.workflowResult || null,
    name: initialState.name || '',
    agents: initialState.agents || [],
    tasks: initialState.tasks || [],
    workflowLogs: initialState.workflowLogs || [],
    inputs: initialState.inputs || {},
    workflowContext: initialState.workflowContext || '',
    env: initialState.env || {},
    setInputs: (inputs) => set({ inputs }),  // Add a new action to update inputs
    setName: (name) => set({ name }),  // Add a new action to update inputs
    setEnv: (env) => set({ env }),  // Add a new action to update inputs
    logLevel: initialState.logLevel,

    addAgents: (agents) => {
        const { env } = get();
        agents.forEach(agent => {
            agent.setStore(useTeamStore);
            agent.setEnv(env);
        });
        set(state => ({ agents: [...state.agents, ...agents] }));
    },

    addTasks: (tasks) => {
        tasks.forEach(task => task.setStore(useTeamStore));
        set(state => ({ tasks: [...state.tasks, ...tasks.map(task => ({ ...task, agent: task.agent }))] }));
    },

    updateTaskStatus: (taskId, status) => set(state => ({
        tasks: state.tasks.map(task => task.id === taskId ? { ...task, status } : task)
    })),

    startWorkflow: async (inputs) => {
        // Start the first task or set all to 'TODO' initially
        logger.info(`🚀 Team *${get().name}* is starting to work.`);
        if(inputs){
            get().setInputs(inputs);
        }
        get().resetWorkflowStateAction();
        get().setTeamWorkflowStatus(WORKFLOW_STATUS_enum.RUNNING);      
        const tasks = get().tasks;
        if (tasks.length > 0 && tasks[0].status === TASK_STATUS_enum.TODO) {
            get().updateTaskStatus(tasks[0].id, TASK_STATUS_enum.DOING);
        }
    },

    resetWorkflowStateAction: () => {
        set(state => {
            // Cloning tasks and agents to ensure there are no direct mutations
            const resetTasks = state.tasks.map(task => ({
                ...task,
                status: 'TODO',
                // Ensure to reset or clear any other task-specific states if needed
            }));

            get().agents.forEach(agent => {
                agent.setStatus('INITIAL'); // Update status using agent's method
            });

            const resetAgents = [...state.agents];

            return {
                ...state,
                tasks: resetTasks,
                agents: resetAgents,
                workflowLogs: [],
                workflowContext: '',
                workflowResult: null,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.INITIAL
            };
        });
        logger.debug("Workflow state has been reset.");
    },    

    // New function to handle finishing workflow
    finishWorkflowAction: () => {
        const tasks = get().tasks;
        const deliverableTask = tasks.slice().reverse().find(task => task.isDeliverable);
        const lastTaskResult = tasks[tasks.length - 1].result;

        // Detailed console logging
        logger.info(`Finishing Workflow:`, deliverableTask ? deliverableTask.result : lastTaskResult);

        // Prepare the log entry for finishing the workflow
        const newLog = {
            task: null,
            agent: null,
            timestamp: Date.now(),
            logDescription: `Workflow finished with result: ${deliverableTask ? deliverableTask.result : lastTaskResult}`,
            workflowStatus: WORKFLOW_STATUS_enum.FINISHED,
            metadata: {
                result: deliverableTask ? deliverableTask.result : lastTaskResult
            },
            logType: 'WorkflowStatusUpdate'
        };

        // Update state with the final results and set workflow status
        set(state => ({
            ...state,
            workflowContext: '',  // Reset the workflow context
            workflowResult: deliverableTask ? deliverableTask.result : lastTaskResult,  // Set the final result
            teamWorkflowStatus: WORKFLOW_STATUS_enum.FINISHED,  // Set status to indicate a finished workflow
            workflowLogs: [...state.workflowLogs, newLog]  // Append new log to the logs array
        }));
    },
    // Add a new action to update teamWorkflowStatus
    setTeamWorkflowStatus: (status) => set({ teamWorkflowStatus: status }),   
    // Function to handle errors during workflow execution
    // Adjusted method to handle workflow errors
    handleWorkflowError: (task, error) => {
        // Detailed console error logging
        logger.error(`Workflow Error:`, error.message);
        // Prepare the error log with specific workflow context
        const newLog = {
            task,
            agent: task.agent,
            timestamp: Date.now(),
            logDescription: `Workflow error encountered: ${error.message}`,
            workflowStatus: WORKFLOW_STATUS_enum.ERRORED,
            metadata: {
                error
            },
            logType: 'WorkflowStatusUpdate'
        };

        // Update state with error details and add new log entry
        set(state => ({
            ...state,
            workflowContext: '',  // Reset the workflow context
            teamWorkflowStatus: WORKFLOW_STATUS_enum.ERRORED,  // Set status to indicate an error
            workflowLogs: [...state.workflowLogs, newLog]  // Append new log to the logs array
        }));
    },

    handleWorkflowBlocked: ({ task, error }) => {
        // Detailed console error logging
        logger.warn(`WORKFLOW BLOCKED:`, error.message);
        // Prepare the error log with specific workflow context
        const newLog = {
            task,
            agent: task.agent,
            timestamp: Date.now(),
            logDescription: `Workflow blocked encountered: ${error.message}`,
            workflowStatus: WORKFLOW_STATUS_enum.BLOCKED,
            metadata: {
                error
            },
            logType: 'WorkflowStatusUpdate'
        };

        // Update state with error details and add new log entry
        set(state => ({
            ...state,
            teamWorkflowStatus: WORKFLOW_STATUS_enum.BLOCKED,  // Set status to indicate a blocked workflow
            workflowLogs: [...state.workflowLogs, newLog]  // Append new log to the logs array
        }));
    },

    performTask: async (agent, task) => {
        if (task && agent) {
            // Log the start of the task
            logger.debug(`Task: ${getTaskTitleForLogs(task)} starting...`);
            task.status = TASK_STATUS_enum.DOING;
            // Add a log entry for the task starting
            set(state => {
                const newLog = get().prepareNewLog({
                    agent,
                    task,
                    logDescription: `Task: ${getTaskTitleForLogs(task)} started.`,
                    metadata: {}, // Initial metadata can be empty or include the start time
                    logType: 'TaskStatusUpdate'
                });
                return { ...state, workflowLogs: [...state.workflowLogs, newLog] };
            });
    
            try {
                // Execute the task and let the agent report completion
                task.inputs = get().inputs; // Pass the inputs to the task
                const interpolatedTaskDescription = interpolateTaskDescription(task.description, get().inputs);
                task.interpolatedTaskDescription = interpolatedTaskDescription;
                await agent.executeTask(task, get().inputs, get().workflowContext);
                // Once the task is completed, the handleAgentTaskCompleted will be triggered automatically
            } catch (error) {
                // We are let it propagate to the task execution and captured later on
                throw error; // Re-throw the error to be caught by the task execution
            }
        }
    },
    
    /**
     * Prepares a new log entry to the centralized activity logs.
     * 
     * @param {Object} params - The parameters for the log entry.
     * @param {string} params.agentId - Identifier for the agent performing the action.
     * @param {string} params.taskId - Identifier of the task associated with this log entry.
     * @param {string} params.logDescription - Descriptive text detailing what the log entry is about.
     * @param {Object} params.metadata - Additional structured data providing more context about the action.
     * @param {string} params.logType - Categorization of the log entry to facilitate filtering and analysis.
     * 
     */
    prepareNewLog: ({
        agent,
        task,
        logDescription,
        metadata,
        logType
    }) => {
        const timestamp = Date.now(); // Current time in milliseconds since Unix Epoch

        // Construct the new log entry
        const newLog = {
            timestamp,
            task,
            agent,
            agentName: agent ? agent.name : 'Unknown Agent',
            taskTitle: task ? getTaskTitleForLogs(task) : 'Untitled Task',
            logDescription,
            taskStatus: task ? task.status : 'Unknown',
            agentStatus: agent ? agent.status : 'Unknown',
            metadata,
            logType
        };

        return newLog;
    },    
    clearAll: () => set({ agents: [], tasks: [], inputs: {}, workflowLogs: [], workflowContext: '', workflowResult: null, teamWorkflowStatus: WORKFLOW_STATUS_enum.INITIAL})   

}), "teamStore"))
    );

    // ──── Workflow Controller Initialization ────────────────────────────
    // 
    // Activates the workflow controller to monitor and manage task transitions and overall workflow states:
    // - Monitors changes in task statuses, handling transitions from TODO to DONE.
    // - Ensures tasks proceed seamlessly through their lifecycle stages within the application.
    // ─────────────────────────────────────────────────────────────────────
    setupWorkflowController(useTeamStore);

    // Subscribe to task updates: Used mainly for logging purposes
    subscribeTaskStatusUpdates(useTeamStore);

    // Subscribe to WorkflowStatus updates: Used mainly for loggin purposes
    subscribeWorkflowStatusUpdates(useTeamStore);


    return useTeamStore;

};

export { createTeamStore };