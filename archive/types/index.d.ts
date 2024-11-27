// Path: C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\types\index.d.ts
// Type definitions for "kaibanjs" 0.1.0
// Project: kaibanjs
// Author: @darielnoel <github.com/darielnoel>
// Definitions by: @alienkarma <github.com/alienkarma>

import { Tool } from "langchain/tools";
import type { AGENT_STATUS_enum, TASK_STATUS_enum } from "./enums";
import type {
    BaseAgent,
    BaseAgentConfig,
    LLMConfig,
    TaskStats,
    AgentType,
    TaskType,
    TaskResult,
    Output,
    Log,
    ErrorType,
    TeamState,
    TeamStateActions,
    TeamStore
} from "./types";

/**
 * ### Agent parameters
 * @interface IAgentParams
 * @extends BaseAgentConfig
 */
export interface IAgentParams extends BaseAgentConfig {
    type?: string;
}

/**
 * ### Agent
 * A class representing an agent.
 * @class
 * @extends BaseAgent
 * @property {BaseAgent} agentInstance - The agent instance.
 * @property {string} type - The type of agent.
 */
export class Agent implements AgentType {
    agentInstance: BaseAgent;
    type: string;

    /**
     * Creates an instance of an Agent.
     * @param {IAgentParams} config - The configuration parameters for the agent.
     */
    constructor(config: IAgentParams);

    /**
     * Creates an agent.
     * @param {string} type - The type of agent.
     * @param {BaseAgentConfig} config - The configuration parameters for the agent.
     * @returns {BaseAgent} The created agent instance.
     */
    createAgent(type: string, config: BaseAgentConfig): BaseAgent;

    /**
     * Executes a task.
     * @param {TaskType} task - The task to be executed.
     * @returns {Promise<string>} A promise resolving with the task result.
     */
    executeTask(task: TaskType): Promise<string>;

    /**
     * Sets the store.
     * @param {any} store - The store to be set.
     */
    setStore(store: any): void;

    /**
     * Sets the environment variables.
     * @param {Record<string, any>} env - The environment variables to be set.
     */
    setEnv(env: Record<string, any>): void;

    /**
     * Sets the status of the agent.
     * @param {keyof typeof AGENT_STATUS_enum} status - The status to be set.
     */
    setStatus(status: keyof typeof AGENT_STATUS_enum): void;
}

/**
 * ### Task parameters
 * @interface ITaskParams
 */
export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: string;
    agent: AgentType;
    isDeliverable?: boolean;
}

/**
 * ### Task
 * A class representing a task.
 * @class
 */
export class Task implements TaskType {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: AgentType;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, any>;
    feedbackHistory: any[];
    status: keyof typeof TASK_STATUS_enum;
    result: TaskResult;
    stats: TaskStats | null;
    duration: number | null;
    interpolatedTaskDescription: string | null;
    store: any;

    /**
     * Creates an instance of a Task.
     * @param {ITaskParams} params - The parameters for the task.
     */
    constructor(params: ITaskParams);

    /**
     * Sets the store for the task.
     * @param {any} store - The store.
     */
    setStore(store: any): void;

    /**
     * Executes the task.
     * @param {any} data - The data for task execution.
     */
    execute(data: any): Promise<any>;
}

/**
 * ### Team parameters
 * @interface ITeamParams
 */
export interface ITeamParams {
    name: string;
    agents?: AgentType[];
    tasks?: TaskType[];
    logLevel?: string;
    inputs?: Record<string, string>;
    env?: Record<string, any> | null;
}

/**
 * ### Team
 * A class representing a team.
 * @class
 */
export class Team implements TeamStore {
    store: any;

    /**
     * Creates an instance of a Team.
     * @param {ITeamParams} params - The parameters for the team.
     */
    constructor(params: ITeamParams);

    /**
     * Starts the team operations.
     * @returns {Promise<{ status: string; result: any; stats: Record<string, any> }>} A promise resolving with the team's status and results.
     */
    start(inputs?: Record<string, any>): Promise<{ status: string; result: any; stats: Record<string, any> }>;

    /**
     * Returns the store.
     * @returns {any} The store instance.
     */
    getStore(): any;

    /**
     * Returns the store instance in use.
     * @returns {any} The store instance.
     */
    useStore(): any;

    /**
     * Subscribes to changes in the team.
     * @param {(newValues: any) => void} listener - The listener function that will be called on changes.
     * @param {string[]} [properties] - The specific properties to listen to.
     * @returns {() => void} A function to unsubscribe from the changes.
     */
    subscribeToChanges(
        listener: (newValues: any) => void,
        properties?: string[]
    ): () => void;
}