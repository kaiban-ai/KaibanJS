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
import { useTeamStore } from './stores';
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
        this.name = name;
        this.verbose = verbose;
        useTeamStore.getState().clearAll();
        useTeamStore.getState().addAgents(agents);
        useTeamStore.getState().addTasks(tasks);
        useTeamStore.getState().setInputs(inputs);
        useTeamStore.getState().setName(name);
    }

    async start(inputs = {}) {
        await useTeamStore.getState().start(inputs);
    }
}

export { Agent, Task, Team };
