/**
 * API module for the Library.
 *    
 * This module defines the primary classes used throughout the library, encapsulating
 * the core functionalities of agents, tasks, and team coordination. It serves as the
 * public interface for the library, allowing external applications to interact with
 * and utilize the main features provided.
 * 
 * Classes:
 * - Agent: Represents an entity capable of performing tasks using specific AI models.
 *   Agents have properties such as name, role, and the tools they use, and are capable
 *   of executing tasks based on these properties.
 * - Task: Defines a specific activity or job that an agent can perform. Tasks are 
 *   characterized by descriptions, expected outcomes, and their deliverability status.
 * - Team: Manages a group of agents and orchestrates the execution of tasks. It is 
 *   responsible for coordinating the agents to achieve collective goals effectively.
 */

import { v4 as uuidv4 } from 'uuid';
import { createTeamStore } from './stores';
import { ReActAgent, BasicChatAgent, ReactChampionAgent } from './agents';
import { TASK_STATUS_enum } from './utils/enums';


class Agent {
    constructor({ type, ...config }) {
        this.agentInstance = this.createAgent(type, config);
    }
 
    createAgent(type, config) {
        switch (type) {
            case 'ReAct':
                return new ReActAgent(config);
            case 'BasicChatAgent':
                return new BasicChatAgent(config);
            case 'ReactChampionAgent':
                return new ReactChampionAgent(config);
            default:
                return new ReactChampionAgent(config);
        }
    }

    executeTask(task, inputs, context) {
        return this.agentInstance.executeTask(task, inputs, context);
    }

    setStore(store) {
        this.agentInstance.setStore(store);
    }

    setEnv(env) {
        this.agentInstance.setEnv(env);
    }

    setStatus(status) {
        this.agentInstance.setStatus(status);
    }    

    // Proxy property access to the underlying agent instance
    get id() {
        return this.agentInstance.id;
    }

    get name() {
        return this.agentInstance.name;
    }

    get role() {
        return this.agentInstance.role;
    }

    get goal() {
        return this.agentInstance.goal;
    }

    get background() {
        return this.agentInstance.background;
    }

    get tools() {
        return this.agentInstance.tools;
    }    
    get status() {
        return this.agentInstance.status;
    }

    get llmConfig() {
        return this.agentInstance.llmConfig;
    }    
}
class Task {
    constructor({ title = '', description, expectedOutput, agent, isDeliverable = false }) {
        this.id = uuidv4();
        this.title = title; // Title is now optional with a default empty string
        this.description = description;
        this.expectedOutput = expectedOutput;
        this.isDeliverable = isDeliverable;
        this.agent = agent;
        this.status = TASK_STATUS_enum.TODO;
        this.result = null;
        this.stats = null;
        this.duration = null;
        this.dependencies = [];
        this.interpolatedTaskDescription = null;
    }

    setStore(store) {
        this.store = store;
    }
}

class Team {
    constructor({ name, agents, tasks, verbose = 1, inputs = {}, env = null }) {
        this.store = createTeamStore({ name, agents:[], tasks:[], inputs, env, verbose});
             
        // Add agents and tasks to the store, they will be set with the store automatically
        this.store.getState().addAgents(agents);
        this.store.getState().addTasks(tasks);
    }

    async start(inputs = null) {
        return new Promise((resolve, reject) => {
            // Subscribe to the store and save the unsubscribe function for cleanup
            const unsubscribe = this.store.subscribe(state => state.teamWorkflowStatus, (status) => {
                if (status === 'finished_workflow') {
                    // When the condition is met, resolve the promise with the workflowResult
                    resolve(this.store.getState().workflowResult);
                    // Unsubscribe to prevent memory leaks
                    unsubscribe();
                } else if (status === 'errored_workflow') {
                    // When the errored_workflow condition is met, reject the promise
                    reject(new Error('Workflow encountered an error'));
                    // Unsubscribe to prevent memory leaks
                    unsubscribe();
                }
            });
    
            try {
                // Trigger the workflow
                this.store.getState().startWorkflow(inputs);
            } catch (error) {
                // If an error occurs during the workflow execution, reject the promise
                reject(error);
                // Unsubscribe to prevent memory leaks in case of an error
                unsubscribe();
            }
        });
    }

    // More DX friendly for NodeJS Developers
    getStore() {
        return this.store;
    }

    // More DX friendly for React Developers
    useStore() {
        return this.store;
    }

    // Enhanced subscribeToChanges to listen for specific properties
    subscribeToChanges(listener, properties = []) {
        if (properties.length === 0) {
            // No specific properties, return global subscription
            return this.store.subscribe(listener);
        }

        let currentValues = properties.reduce((acc, prop) => ({
            ...acc,
            [prop]: this.store.getState()[prop]
        }), {});

        return this.store.subscribe(() => {
            const state = this.store.getState();
            let hasChanged = false;
            const newValues = {};

            properties.forEach(prop => {
                const newValue = state[prop];
                if (newValue !== currentValues[prop]) {
                    hasChanged = true;
                    newValues[prop] = newValue;
                }
            });

            if (hasChanged) {
                currentValues = { ...currentValues, ...newValues };
                listener(newValues);
            }
        });
    }
}

export { Agent, Task, Team };
