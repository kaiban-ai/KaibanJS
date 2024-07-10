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




// Define the store with centralized state management and actions
const useTeamStore = create((set, get) => ({
    
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

    teamWorkflowStatus: 'first_workflow',
    workflowResult: null,
    name: '',
    agents: [],
    tasks: [],
    workflowLogs: [], // New state for task logs
    inputs: {},  // Add a new state property for inputs
    workflowContext: '',  // Add a new state property for workflow context
    setInputs: (inputs) => set({ inputs }),  // Add a new action to update inputs
    env: {},
    setName: (name) => set({ name }),  // Add a new action to update inputs
    setEnv: (env) => set({ env }),  // Add a new action to update inputs
    addAgents: agents => {
        set(state => ({ agents: [...state.agents, ...agents] }));
    },
    addTasks: (tasks) => {
        set(state => ({ tasks: [...state.tasks, ...tasks.map(task => ({ ...task, agentId: task.agentId }))] }));
    },
    // Add a new action to update teamWorkflowStatus
    setTeamWorkflowStatus: (status) => set({ teamWorkflowStatus: status }),    
    start: async (inputs) => {
        console.log(`Team ${get().name} is starting the task sequence...`);
        try {
            if(inputs){
                get().setInputs(inputs);
            }
            get().setTeamWorkflowStatus('creating_workflow');
            const tasks = get().tasks;
            const agents = get().agents;
            get().setTeamWorkflowStatus('starting_workflow');

            for (const task of tasks) {
                const agent = agents.find(a => a.id === task.agentId);
                if (agent) {
                    get().setTeamWorkflowStatus('running_workflow');
                    await get().performTask(agent.id, task.id);
                }
            }

            const deliverableTask = get().tasks.slice().reverse().find(task => task.isDeliverable);
            set(state => ({ ...state, workflowContext: '', workflowResult: deliverableTask ? deliverableTask.result : get().tasks[tasks.length - 1].result }));
            get().setTeamWorkflowStatus('finished_workflow');

        } catch (error) {
            console.error(error);
            set(state => ({ ...state, workflowContext: ''}));
            get().setTeamWorkflowStatus('errored_workflow');
        }
    },
    performTask: async (agentId, taskId) => {
        const task = get().tasks.find(t => t.id === taskId);
        const agent = get().agents.find(a => a.id === agentId);

        if (task && agent) {
            const startTime = Date.now();
            set(state => {
                const taskIndex = state.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    const updatedTasks = [...state.tasks];
                    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status: 'doing' };
                    const newLog = {timestamp: startTime/1000, agent: agent, task: task, logDescription: `${updatedTasks[taskIndex].description} started`, status: 'doing' };
                    return { ...state, tasks: updatedTasks, workflowLogs: [...state.workflowLogs, newLog] };
                }
                return state;
            });

            const result = await get().executeAgentTask(agent, task, get().inputs, get().workflowContext);


            // console.log(result);
            // const result = await new Promise(resolve => setTimeout(resolve, 5000));
            const endTime = Date.now();
            const taskDuration = (endTime - startTime) / 1000;  // Convert to seconds
            console.log(`Task completed in ${taskDuration} seconds`);
        

            // const result = await new Promise(resolve => setTimeout(resolve, 5000));
            // const result = await get().executeAgentTask(agent, task);
            // console.log(result);         

            // Update the task with the result and duration
            set(state => {
                console.log('asdasdss');
                const taskIndex = state.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    const updatedTasks = [...state.tasks];
                    updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], status: 'done', result: result, duration: taskDuration };
                    const newLog = { timestamp: startTime/1000, agent: agent, task: task, logDescription: `Task ${updatedTasks[taskIndex].description} completed in ${taskDuration} seconds`};
                    return { ...state, tasks: updatedTasks, workflowLogs: [...state.workflowLogs, newLog], workflowContext: result };
                }
                return state;
            });
        }
    },
    clearAll: () => set({ agents: [], tasks: [], inputs: {}, workflowLogs: [], workflowContext: '', workflowResult: null, teamWorkflowStatus: 'first_workflow'}),
    

    // TODO: Let's move this code to the main function... it is so simple now thatit does not make sense 
    // to have it here.
    executeAgentTask: async (agent, task, inputs, context='') => {
        // Assuming all agent classes extend BaseAgent and implement their own executeTask method
            // TODO: Why inputs here?
            return agent.executeTask(task, inputs, context);
    }
}));

export { useTeamStore };