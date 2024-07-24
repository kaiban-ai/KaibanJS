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
import PQueue from 'p-queue';
import {create} from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { TASK_STATUS_enum} from '../utils/enums';
import { getTaskTitleForLogs, interpolateTaskDescription} from '../utils/tasks';
import {logger} from '../utils/logger';

// ──── Store Factory for Multiple Teams ───────────────────────────────
// 
// Implements a store factory instead of a standard Zustand store to manage state for multiple teams.
// This design supports isolated state management for each team's agents and workflows, 
// allowing multiple teams to operate concurrently with their own tasks and statuses.
// ─────────────────────────────────────────────────────────────────────

const createTeamStore = (initialState = {}) => {   
    // console.log("Initial state:", initialState); // Log the initial state
    // Define the store with centralized state management and actions
    const useTeamStore =  create(
        devtools(
            subscribeWithSelector((set, get) => ({ 
                ...useAgentStore(set, get),
                ...useTaskStore(set, get),
            
    /**
     * State definitions for teamWorkflow management
     * 
     * 'first_workflow': Indicates the very beginning of the workflow process, before any action has been initiated.
     * 'creating_workflow': Refers to the phase where the system is actively setting up the team, configuring parameters and initializing required resources.
     * 'starting_workflow': Marks the transition from the initial setup to the actual beginning of task processing.
     * 'running_workflow': The workflow is actively processing tasks, indicating that the workflow is in full operation.
     * 'stopping_workflow': The workflow is in the process of being stopped, which could be due to task completion, a manual stop command, or other reasons.
     * 'stopped_workflow': The workflow has been completely stopped and is in a stable state, ready for review or restart.
     * 'errored_workflow': Indicates that the workflow has encountered a critical issue and has halted unexpectedly, requiring error handling or intervention.
     * 'finished_workflow': The workflow has successfully completed all its tasks and no further operational actions are required.
     */

    teamWorkflowStatus: initialState.teamWorkflowStatus || 'first_workflow',
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

    addAgents: (agents) => {
        agents.forEach(agent => agent.setStore(useTeamStore));
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
        logger.info(`Team ${get().name} is starting the task sequence...`);
        if(inputs){
            get().setInputs(inputs);
        }
        get().resetWorkflowStateAction();
        get().setTeamWorkflowStatus('running_workflow');      
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
                teamWorkflowStatus: 'first_workflow'
            };
        });
        logger.info("Workflow state has been reset.");
    },    

    // New function to handle finishing workflow
    finishWorkflowAction: () => {
        const tasks = get().tasks;
        const deliverableTask = tasks.slice().reverse().find(task => task.isDeliverable);
        const lastTaskResult = tasks[tasks.length - 1].result;

        // Update state with the final results and set workflow status
        set({
            workflowContext: '',
            workflowResult: deliverableTask ? deliverableTask.result : lastTaskResult,
            teamWorkflowStatus: 'finished_workflow',
        });
    }, 
    // Add a new action to update teamWorkflowStatus
    setTeamWorkflowStatus: (status) => set({ teamWorkflowStatus: status }),   
    // Function to handle errors during workflow execution
    // Adjusted method to handle workflow errors
    handleWorkflowError: (task, error) => {
        // Detailed console error logging
        logger.error(`[${new Date().toISOString()}] Workflow Error:`, error.message);

        // Prepare the error log with specific workflow context
        const newLog = {
            task,
            agent: task.agent,
            timestamp: Date.now(),
            logDescription: `Workflow error encountered: ${error.message}`,
            workflowStatus: 'errored_workflow',
            metadata: {
                errorMessage: error.message
            },
            logType: 'WorkflowStatusUpdate'
        };

        // Update state with error details and add new log entry
        set(state => ({
            ...state,
            workflowContext: '',  // Reset the workflow context
            teamWorkflowStatus: 'errored_workflow',  // Set status to indicate an error
            workflowLogs: [...state.workflowLogs, newLog]  // Append new log to the logs array
        }));
    },
    performTask: async (agent, task) => {
        if (task && agent) {
            // Log the start of the task
            logger.info(`Task: ${getTaskTitleForLogs(task)} starting...`);
    
            // Add a log entry for the task starting
            set(state => {
                const newLog = get().prepareNewLog({
                    agent,
                    task,
                    logDescription: `Task: ${getTaskTitleForLogs(task)} started.`,
                    taskStatus: TASK_STATUS_enum.DOING,
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
     * @param {string} params.taskStatus - Current status of the task or action at the time of logging.
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
    clearAll: () => set({ agents: [], tasks: [], inputs: {}, workflowLogs: [], workflowContext: '', workflowResult: null, teamWorkflowStatus: 'first_workflow'})   

}), "teamStore"))
    );

    // After defining the store, set up the subscription inside the store definition
    // useTeamStore.subscribe(state => state.workflowLogs, (newLogs, previousLogs) => {
    //     if (newLogs.length > previousLogs.length) { // Check if a new log has been added
    //         const newLog = newLogs[newLogs.length - 1]; // Get the latest log
    //         if (newLog.logType === 'AgentStatusUpdate') {
    //             console.log(`Agent ${newLog.agent.name} status changed to ${newLog.agentStatus}: ${newLog.logDescription}`);
    //             console.log(newLog.metadata);
    //         }
    //     }
    // });

    const taskQueue = new PQueue({ concurrency: 1 });

    // Subscribe to changes in the tasks array where the status is TASK_STATUS_enum.DOING
    useTeamStore.subscribe(
        state => state.tasks.filter(t => t.status === TASK_STATUS_enum.DOING),
        (doingTasks, previousDoingTasks) => {
            // Ensure we only act on new TASK_STATUS_enum.DOING tasks, not previously doing tasks
            doingTasks.forEach(task => {
                if (!previousDoingTasks.find(t => t.id === task.id)) {
                    taskQueue.add(() => useTeamStore.getState().performTask(task.agent, task))
                        .then(() => {
                            useTeamStore.getState().updateTaskStatus(task.id, TASK_STATUS_enum.DONE);
                        })
                        .catch(error => {
                            // Call the centralized task error handler from the store
                            useTeamStore.getState().handleTaskError({task, error});

                            // // Call the centralized error handler from the store
                            useTeamStore.getState().handleWorkflowError(task, error);
                        });
                }
            });
        }
    );

    // Subscribe to changes in the tasks array where the status is 'DONE'
    useTeamStore.subscribe(
        state => state.tasks.filter(t => t.status === 'DONE'),
        (doneTasks, previousDoneTasks) => {
            // Check if new tasks have been completed
            if (doneTasks.length > previousDoneTasks.length) {
                const tasks = useTeamStore.getState().tasks;
                const nextTask = tasks.find(t => t.status === TASK_STATUS_enum.TODO);

                // Check for the next 'TODO' task and set it to TASK_STATUS_enum.DOING
                if (nextTask) {
                    useTeamStore.getState().updateTaskStatus(nextTask.id, TASK_STATUS_enum.DOING);
                } else {
                    // Call the function to finish the workflow
                    useTeamStore.getState().finishWorkflowAction();
                }
            }
        }
    );


// Subscribe to changes in task status, focusing on task status updates
useTeamStore.subscribe(state => state.workflowLogs, (newLogs, previousLogs) => {
    if (newLogs.length > previousLogs.length) { // Check if a new log has been added
        const newLog = newLogs[newLogs.length - 1]; // Get the latest log

        if (newLog.logType === 'TaskStatusUpdate') {
            // Calculate task position and total number of tasks for contextual logging
            const totalTasks = useTeamStore.getState().tasks.length;
            const taskIndex = useTeamStore.getState().tasks.findIndex(t => t.id === newLog.task.id);
            const currentTaskNumber = taskIndex + 1; // Adding 1 because index is 0-based

            // Attempt to find the previous log for this task to calculate the duration of the previous status
            const previousLog = previousLogs.slice().reverse().find(log =>
                log.task.id === newLog.task.id && log.taskStatus !== newLog.taskStatus
            );

            let durationMessage = "";
            if (previousLog) {
                const duration = ((newLog.timestamp - previousLog.timestamp) / 1000); // Duration in seconds
                durationMessage = ` Duration from ${previousLog.taskStatus} to ${newLog.taskStatus}: ${duration} seconds.`;
            }

            // Consolidated log of task status change with the duration of the previous status
            logger.info(`//---------------------------------------------------------------
// Task (${currentTaskNumber}/${totalTasks}): *${getTaskTitleForLogs(newLog.task)}* status changed to ${newLog.taskStatus}.${durationMessage}
//---------------------------------------------------------------`);
        }
    }
});


    return useTeamStore;

};

export { createTeamStore };