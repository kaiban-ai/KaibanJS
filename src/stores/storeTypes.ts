import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { AGENT_STATUS_enum, TASK_STATUS_enum, WORKFLOW_STATUS_enum, FEEDBACK_STATUS_enum } from "../utils/enums";
import { Tool } from "langchain/tools";

export interface TeamState extends AgentStoreState {
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    workflowResult: any;
    inputs: Record<string, any>;
    workflowContext: string;
    env: Record<string, any>;
    logLevel: string | undefined;
}

export interface TeamStateActions {
    setInputs(inputs: Record<string, any>): void;
    setName(name: string): void;
    setEnv(env: Record<string, any>): void;
    addAgents(agents: AgentType[]): void;
    addTasks(tasks: TaskType[]): void;
    updateTaskStatus(taskId: string, status: keyof typeof TASK_STATUS_enum): void;
    startWorkflow(inputs?: Record<string, any>): Promise<void>;
    resetWorkflowStateAction(): void;
    setTeamWorkflowStatus(status: keyof typeof WORKFLOW_STATUS_enum): void;
    handleWorkflowError(task: TaskType, error: ErrorType): void;
    workOnTask(agent: AgentType, task: TaskType): Promise<void>;
    deriveContextFromLogs(logs: Log[], currentTaskId: string): string;
    validateTask(taskId: string): Promise<void>;
    clearAll(): void;
    getCleanedState(): any;
    getWorkflowStats(): Record<string, any>;
    finishWorkflowAction(): void;
    handleWorkflowBlocked(params: { task: TaskType; error: ErrorType }): void;
    provideFeedback(taskId: string, feedbackContent: string): Promise<void>;
}

export type TeamStore = TeamState & TeamStateActions;

export type TeamStoreApi = StoreApi<TeamStore>;

export type UseBoundTeamStore = UseBoundStore<TeamStoreApi>;

export type CreateTeamStore = (initialState?: Partial<TeamState>) => UseBoundTeamStore;

export type TeamStoreMiddlewares = [
    ['zustand/devtools', never],
    ['zustand/subscribeWithSelector', never]
];

export type TeamStoreCreator = StateCreator<
    TeamStore,
    TeamStoreMiddlewares,
    [],
    TeamStore
>;

export type ExtendedStoreApi = UseBoundTeamStore;

export interface AgentType {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    status: keyof typeof AGENT_STATUS_enum;
    llmConfig: {
        model: string;
        provider: string;
        [key: string]: any;
    };
    tools: Tool[];
    initialize: (store: any, env: Record<string, any>) => void;
    setStore: (store: any) => void;
    setStatus: (status: keyof typeof AGENT_STATUS_enum) => void;
    setEnv: (env: Record<string, any>) => void;
    workOnTask: (task: TaskType) => Promise<{ error?: string; result?: any; metadata: { iterations: number; maxAgentIterations: number } }>;
    workOnFeedback: (task: TaskType, feedbackList: FeedbackObject[], context: string) => Promise<void>;
    normalizeLlmConfig: () => void;
}

export interface TaskType {
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
    result?: TaskResult;
    interpolatedTaskDescription?: string;
    duration?: number;
    startTime?: number;
    endTime?: number;
    llmUsageStats?: LLMUsageStats;
    iterationCount?: number;
    error?: string;
    setStore: (store: any) => void;
    execute: (data: any) => Promise<any>;
}

export interface FeedbackObject {
    id: string;
    content: string;
    status: keyof typeof FEEDBACK_STATUS_enum;
    timestamp: Date;
    userId: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    assignedTo?: string;
}

export type TaskResult = string | Record<string, any> | null;

export interface TaskStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
}

export interface LLMUsageStats {
    inputTokens: number;
    outputTokens: number;
    callsCount: number;
    callsErrorCount: number;
    parsingErrors: number;
}

export interface BaseStoreState {
    name: string;
    agents: AgentType[];
    tasks: TaskType[];
    workflowLogs: Log[];
}

export interface TaskStoreState extends BaseStoreState {
    tasksInitialized: boolean;
    getTaskStats(task: TaskType): TaskStats;
    handleTaskCompleted(params: { agent: AgentType; task: TaskType; result: any }): void;
    provideFeedback(taskId: string, feedbackContent: string): Promise<void>;
    handleTaskError(params: { task: TaskType; error: ErrorType }): void;
    handleTaskBlocked(params: { task: TaskType; error: ErrorType }): void;
    prepareNewLog(params: PrepareNewLogParams): Log;
    handleWorkflowBlocked(params: { task: TaskType; error: ErrorType }): void;
    finishWorkflowAction(): void;
    getWorkflowStats(): Record<string, any>;
}

export interface AgentStoreState extends TaskStoreState {
    handleAgentIterationStart(params: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleAgentIterationEnd(params: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleAgentThinkingStart(params: { agent: AgentType; task: TaskType; messages: any[] }): void;
    handleAgentThinkingEnd(params: { agent: AgentType; task: TaskType; output: Output }): void;
    handleAgentThinkingError(params: { agent: AgentType; task: TaskType; error: ErrorType }): void;
    handleAgentIssuesParsingLLMOutput(params: { agent: AgentType; task: TaskType; output: Output; error: ErrorType }): void;
    handleAgentActionStart(params: { agent: AgentType; task: TaskType; action: any; runId: string }): void;
    handleAgentToolStart(params: { agent: AgentType; task: TaskType; tool: any; input: any }): void;
    handleAgentToolEnd(params: { agent: AgentType; task: TaskType; output: any; tool: any }): void;
    handleAgentToolError(params: { agent: AgentType; task: TaskType; tool: any; error: ErrorType }): void;
    handleAgentToolDoesNotExist(params: { agent: AgentType; task: TaskType; toolName: string }): void;
    handleAgentFinalAnswer(params: { agent: AgentType; task: TaskType; output: Output }): void;
}

export interface Log {
    timestamp: number;
    task: TaskType | null;
    agent: AgentType | null;
    agentName: string;
    taskTitle: string;
    logDescription: string;
    taskStatus: keyof typeof TASK_STATUS_enum;
    agentStatus: keyof typeof AGENT_STATUS_enum;
    metadata: Record<string, any>;
    logType: string;
    workflowStatus?: keyof typeof WORKFLOW_STATUS_enum;
}

export interface PrepareNewLogParams {
    agent: AgentType;
    task: TaskType;
    logDescription: string;
    metadata: Record<string, any>;
    logType: string;
    agentStatus: keyof typeof AGENT_STATUS_enum;
}

export interface ErrorType extends Error {
    name: string;
    message: string;
    stack?: string;
    context?: any;
    originalError?: Error;
}

export interface PrettyErrorType {
    name: string;
    message: string;
    recommendedAction?: string;
    rootError: Error;
    context?: any;
    location?: string;
    type?: string;
}

export interface Output {
    parsedLLMOutput?: any;
    llmUsageStats?: LLMUsageStats;
    thought?: string;
    action?: string;
    actionInput?: Record<string, any>;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
}