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
import { ReActAgent, BasicChatAgent } from './agents';


class Agent {
    constructor({ type, ...config }) {
        this.agentInstance = this.createAgent(type, config);
    }
 
    createAgent(type, config) {
        switch (type) {
            case 'ReAct':
                return new ReActAgent(config);
            default:
                return new BasicChatAgent(config); // Using BasicChatAgent as the default agent
        }
    }

    executeTask(task, inputs, context) {
        return this.agentInstance.executeTask(task, inputs, context);
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
}

class Task {
    constructor({ description, expectedOutput, agent, isDeliverable = false }) {
        this.id = uuidv4();
        this.description = description;
        this.expectedOutput = expectedOutput;
        this.isDeliverable = isDeliverable;
        this.agentId = agent.id;
        this.status = 'todo';
        this.result = null;
        this.duration = null;
    }
}

class Team {
    constructor({ name, agents, tasks, verbose = 1, inputs = {}, env = null }) {
        this.store = createTeamStore({ name, agents, tasks, inputs, env, verbose});
    }

    async start(inputs = {}) {
        await this.store.getState().start(inputs);
        return this.store.getState().workflowResult;
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
