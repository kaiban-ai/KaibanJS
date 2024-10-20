/**
 * Path: C:\Users\pwalc\Documents\GroqEmailAssistant\node_modules\kaibanjs\src\index.ts
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
import { ReactChampionAgent } from './agents';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum, AGENT_STATUS_enum } from './utils/enums';
import CustomMessageHistory from './utils/CustomMessageHistory';
import { AgentType, TaskType, FeedbackObject, TaskResult } from './stores/storeTypes';

class Agent implements AgentType {
    private agentInstance: ReactChampionAgent;
    public type: string;
    public messageHistory: CustomMessageHistory;
    
    constructor({ type, ...config }: { type: string; [key: string]: any }) {
        this.agentInstance = this.createAgent(type, config);
        this.type = type || 'ReactChampionAgent';
        this.messageHistory = new CustomMessageHistory();
    }
 
    private createAgent(type: string, config: any): ReactChampionAgent {
        switch (type) {
            case 'ReactChampionAgent':
                return new ReactChampionAgent(config);
            default:
                return new ReactChampionAgent(config);
        }
    }

    async workOnTask(task: TaskType): Promise<{ error?: string; result?: any; metadata: { iterations: number; maxAgentIterations: number } }> {
        const message = {
            role: 'user',
            content: `Task: ${task.description}\nInputs: ${JSON.stringify(task.inputs)}\nContext: ${task.interpolatedTaskDescription || ''}`
        };
        this.messageHistory.addMessage(message);
        
        const result = await this.agentInstance.workOnTask(task);
        
        const responseMessage = {
            role: 'assistant',
            content: JSON.stringify(result)
        };
        this.messageHistory.addMessage(responseMessage);

        return result;
    }

    async workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void> {
        await this.agentInstance.workOnFeedback(task, feedbackList, context);
    }

    setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        this.agentInstance.setStatus(status);
    }

    initialize(store: any, env: Record<string, any>): void {
        this.agentInstance.initialize(store, env);
    }

    // Proxy properties to the underlying agent instance
    get id(): string { return this.agentInstance.id; }
    get name(): string { return this.agentInstance.name; }
    get role(): string { return this.agentInstance.role; }
    get goal(): string { return this.agentInstance.goal; }
    get background(): string { return this.agentInstance.background; }
    get tools(): any[] { return this.agentInstance.tools; }
    get status(): keyof typeof AGENT_STATUS_enum { return this.agentInstance.status; }
    get llmConfig(): any { return this.agentInstance.llmConfig; }
    get llmSystemMessage(): string | null { return this.agentInstance.llmSystemMessage; }
    get forceFinalAnswer(): boolean { return this.agentInstance.forceFinalAnswer; }
    get promptTemplates(): any { return this.agentInstance.promptTemplates; }

    // Implement other required methods from AgentType interface
    setStore(store: any): void {
        this.agentInstance.setStore(store);
    }

    setEnv(env: Record<string, any>): void {
        this.agentInstance.setEnv(env);
    }

    normalizeLlmConfig(): void {
        this.agentInstance.normalizeLlmConfig();
    }
}

class Task implements TaskType {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: AgentType;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, any>;
    feedbackHistory: FeedbackObject[];
    status: keyof typeof TASK_STATUS_enum;
    result: TaskResult | null;
    interpolatedTaskDescription?: string;
    duration?: number;
    startTime?: number;
    endTime?: number;
    llmUsageStats?: any;
    iterationCount?: number;
    error?: string;
    store: any;

    constructor({ 
        title = '', 
        description, 
        expectedOutput, 
        agent, 
        isDeliverable = false, 
        externalValidationRequired = false 
    }: {
        title?: string;
        description: string;
        expectedOutput: string;
        agent: AgentType;
        isDeliverable?: boolean;
        externalValidationRequired?: boolean;
    }) {
        this.id = uuidv4();
        this.title = title;
        this.description = description;
        this.expectedOutput = expectedOutput;
        this.isDeliverable = isDeliverable;
        this.agent = agent;
        this.status = 'TODO';
        this.result = null;
        this.inputs = {};
        this.feedbackHistory = [];
        this.externalValidationRequired = externalValidationRequired;
    }

    setStore(store: any): void {
        this.store = store;
    }

    async execute(data: any): Promise<any> {
        // Implement task execution logic here
        throw new Error("Method not implemented.");
    }
}

class Team {
    private store: ReturnType<typeof createTeamStore>;
    private messageHistory: CustomMessageHistory;

    constructor({ 
        name, 
        agents, 
        tasks, 
        logLevel, 
        inputs = {}, 
        env = undefined 
    }: {
        name: string;
        agents: AgentType[];
        tasks: TaskType[];
        logLevel?: string;
        inputs?: Record<string, any>;
        env?: Record<string, any> | undefined;
    }) {
        this.store = createTeamStore({ name, agents:[], tasks:[], inputs, env, logLevel});
        this.messageHistory = new CustomMessageHistory();
             
        // Add agents and tasks to the store, they will be set with the store automatically
        this.store.getState().addAgents(agents);
        this.store.getState().addTasks(tasks);
    }

    async start(inputs: Record<string, any> | undefined = undefined): Promise<{ status: string; result: any; stats: Record<string, any> }> {
        return new Promise((resolve, reject) => {
            const unsubscribe = this.store.subscribe(
                state => state.teamWorkflowStatus,
                (status) => {
                    const state = this.store.getState();
                    switch (status) {
                        case WORKFLOW_STATUS_enum.FINISHED:
                            unsubscribe();
                            resolve({
                                status,
                                result: state.workflowResult,
                                stats: this.getWorkflowStats()
                            });
                            break;
                        case WORKFLOW_STATUS_enum.ERRORED:
                            unsubscribe();
                            reject(new Error('Workflow encountered an error'));
                            break;
                        case WORKFLOW_STATUS_enum.BLOCKED:
                            unsubscribe();
                            resolve({
                                status,
                                result: null,
                                stats: this.getWorkflowStats()
                            });
                            break;
                    }
                }
            );

            try {
                // Add a message to the team's message history
                this.messageHistory.addMessage({
                    role: 'system',
                    content: JSON.stringify({ inputs })
                });
                
                // Trigger the workflow
                this.store.getState().startWorkflow(inputs || {});
            } catch (error) {
                // If an error occurs during the workflow execution, reject the promise
                reject(error);
                // Unsubscribe to prevent memory leaks in case of an error
                unsubscribe();
            }
        });
    }

    getStore(): ReturnType<typeof createTeamStore> {
        return this.store;
    }

    useStore(): ReturnType<typeof createTeamStore> {
        return this.store;
    }

    subscribeToChanges(
        listener: (newValues: Partial<ReturnType<typeof this.store.getState>>) => void, 
        properties: (keyof ReturnType<typeof this.store.getState>)[] = []
    ): () => void {
        if (properties.length === 0) {
            // No specific properties, return global subscription
            return this.store.subscribe(listener);
        }

        let currentValues = properties.reduce((acc, prop) => ({
            ...acc,
            [prop]: this.store.getState()[prop]
        }), {} as Partial<ReturnType<typeof this.store.getState>>);

        return this.store.subscribe(() => {
            const state = this.store.getState();
            let hasChanged = false;
            const newValues: Partial<ReturnType<typeof this.store.getState>> = {};

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

    provideFeedback(taskId: string, feedbackContent: string): void {
        this.store.getState().provideFeedback(taskId, feedbackContent);
    }

    validateTask(taskId: string): void {
        this.store.getState().validateTask(taskId);
    }

    onWorkflowStatusChange(callback: (status: keyof typeof WORKFLOW_STATUS_enum) => void): () => void {
        return this.store.subscribe(state => state.teamWorkflowStatus, callback);
    }

    getTasksByStatus(status: keyof typeof TASK_STATUS_enum): TaskType[] {
        return this.store.getState().tasks.filter(task => task.status === status);
    }

    getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum {
        return this.store.getState().teamWorkflowStatus;
    }

    getWorkflowResult(): any {
        const state = this.store.getState();
        if (state.teamWorkflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
            return state.workflowResult;
        }
        return null;
    }    

    getTasks(): TaskType[] {
        return this.store.getState().tasks;
    }

    getWorkflowStats(): Record<string, any> {
        const state = this.store.getState();
        const logs = state.workflowLogs;

        const completionLog = logs.find(log =>
            log.logType === "WorkflowStatusUpdate" && 
            (log.workflowStatus === "FINISHED" || log.workflowStatus === "BLOCKED")
        );

        if (completionLog) {
            const {
                startTime,
                endTime,
                duration,
                llmUsageStats,
                iterationCount,
                costDetails,
                teamName,
                taskCount,
                agentCount
            } = completionLog.metadata;

            return {
                startTime,
                endTime,
                duration,
                llmUsageStats,
                iterationCount,
                costDetails,
                teamName,
                taskCount,
                agentCount,
                messageCount: this.messageHistory.length
            };
        } else {
            return {}; // Return an empty object instead of null
        }
    }
}

export { Agent, Task, Team };