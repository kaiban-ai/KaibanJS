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

import { v4 as uuidv4 } from "uuid";
import { createTeamStore } from "./stores";
import { BaseAgent, ReactChampionAgent } from "./agents";
import { ENUM_TASK_STATUS, ENUM_WORKFLOW_STATUS } from "./utils/enums";

/**
 * --- Agent ---
 *
 * Represents an entity capable of performing tasks using specific AI models.
 * Agents have properties such as name, role, and the tools they use, and are capable of executing tasks based on these properties.
 *
 * ------------------------------
 */
class Agent {
  agentInstance: BaseAgent;
  type: string;

  constructor({ type, ...config }) {
    this.agentInstance = this.createAgent(type, config);
    this.type = type || "ReactChampionAgent";
  }

  createAgent = (type: string, config) => {
    switch (type) {
      case "ReactChampionAgent":
        return new ReactChampionAgent(config);
      default:
        return new ReactChampionAgent(config);
    }
  };

  // ! Invalid method, executeTask is not a method of any of the Agent class
  // executeTask = (task, inputs, context) => {
  //   return this.agentInstance.executeTask(task, inputs, context);
  // };

  setStore = (store) => {
    this.agentInstance.setStore(store);
  };

  setEnv = (env) => {
    this.agentInstance.setEnv(env);
  };

  setStatus = (status) => {
    this.agentInstance.setStatus(status);
  };

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
  get llmSystemMessage() {
    return this.agentInstance.llmSystemMessage;
  }
  get forceFinalAnswer() {
    return this.agentInstance.forceFinalAnswer;
  }
}

/**
 * --- Task ---
 *
 * Defines a specific activity or job that an agent can perform. Tasks are
 * characterized by descriptions, expected outcomes, and their deliverability status.
 *
 * ------------------------------
 */
class Task {
  id: string;
  title: string;
  description: string;
  expectedOutput: any;
  isDeliverable: boolean;
  agent: Agent;
  status: ENUM_TASK_STATUS;
  result: any;
  stats: any;
  duration: number;
  dependencies: Task[];
  interpolatedTaskDescription: string;
  store: any;

  constructor({
    title = "",
    description,
    expectedOutput,
    agent,
    isDeliverable = false,
  }) {
    this.id = uuidv4();
    this.title = title; // Title is now optional with a default empty string
    this.description = description;
    this.expectedOutput = expectedOutput;
    this.isDeliverable = isDeliverable;
    this.agent = agent;
    this.status = ENUM_TASK_STATUS.TODO;
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

/**
 * --- Team ---
 *
 * Manages a group of agents and orchestrates the execution of tasks. It is
 * responsible for coordinating the agents to achieve collective goals effectively.
 *
 * ------------------------------
 */
class Team {
  store: any;

  constructor({ name, agents, tasks, logLevel, inputs = {}, env = null }) {
    this.store = createTeamStore({
      name,
      agents: [],
      tasks: [],
      inputs,
      env,
      logLevel,
    });

    // Add agents and tasks to the store, they will be set with the store automatically
    this.store.getState().addAgents(agents);
    this.store.getState().addTasks(tasks);
  }

  async start(inputs = null) {
    return new Promise((resolve, reject) => {
      // Subscribe to the store and save the unsubscribe function for cleanup
      const unsubscribe = this.store.subscribe(
        (state) => state.teamWorkflowStatus,
        (status) => {
          switch (status) {
            case ENUM_WORKFLOW_STATUS.FINISHED:
              resolve(this.store.getState().workflowResult);
              // Unsubscribe to prevent memory leaks
              unsubscribe();
              break;
            case ENUM_WORKFLOW_STATUS.ERRORED:
              reject(new Error("Workflow encountered an error"));
              unsubscribe();
              break;
            case ENUM_WORKFLOW_STATUS.BLOCKED:
              reject(new Error("Workflow blocked"));
              unsubscribe();
              break;
            default:
              break;
          }
        }
      );
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

    let currentValues = properties.reduce(
      (acc, prop) => ({
        ...acc,
        [prop]: this.store.getState()[prop],
      }),
      {}
    );

    return this.store.subscribe(() => {
      const state = this.store.getState();
      let hasChanged = false;
      const newValues = {};

      properties.forEach((prop) => {
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
