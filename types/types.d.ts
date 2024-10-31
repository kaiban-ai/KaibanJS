/**
 * Path: C:/Users/pwalc/Documents/GroqEmailAssistant/KaibanJS/types/types.d.ts
 * 
 * Central Type Definitions
 * This file serves as the single source of truth for all TypeScript type definitions
 * used throughout the KaibanJS library.
 */

import { AGENT_STATUS_enum, TASK_STATUS_enum, WORKFLOW_STATUS_enum, FEEDBACK_STATUS_enum } from "./enums";
import { Tool } from "langchain/tools";
import { StateCreator, StoreApi, UseBoundStore } from 'zustand';
import { BaseMessage } from "@langchain/core/messages";
import CustomMessageHistory from "../utils/CustomMessageHistory";
import { ChatGroqInput } from "@langchain/groq";
import { GoogleGenerativeAIChatInput } from "@langchain/google-genai";

// ─── LLM Configuration Types ──────────────────────────────────────────────────

export type LLMProvider = 'groq' | 'openai' | 'anthropic' | 'google' | 'mistral';

export interface BaseLLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey?: string;
    temperature?: number;
    streaming?: boolean;
    apiBaseUrl?: string;
    [key: string]: any;
}

// Provider-Specific Input Types
export { ChatGroqInput } from "@langchain/groq";
export { GoogleGenerativeAIChatInput } from "@langchain/google-genai";

export interface ChatOpenAIInput {
    apiKey: string;
    model: string;
    modelName: string;
    temperature: number;
    maxTokens?: number;
    streaming: boolean;
    frequencyPenalty: number;
    presencePenalty: number;
    topP: number;
    n: number;
    stop?: string[];
    stopSequences?: string[];
    streamUsage?: boolean;
    modelKwargs?: Record<string, any>;
}

export interface ChatAnthropicInput {
    apiKey: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
    maxTokensToSample?: number;
    stopSequences?: string[];
    streaming?: boolean;
    anthropicApiUrl?: string;
    topK?: number;
    topP?: number;
}

export interface ChatMistralInput {
    apiKey: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    safeMode?: boolean;
    randomSeed?: number;
    streaming?: boolean;
    endpoint?: string;
    streamUsage?: boolean;
}

// Provider-Specific Configurations
export interface GroqConfig extends BaseLLMConfig {
    provider: 'groq';
    model: string;
    stop?: string | null | Array<string>;
    streaming?: boolean;
    temperature?: number;
}

export interface OpenAIConfig extends BaseLLMConfig {
    provider: 'openai';
    model: string;
    frequencyPenalty?: number;
    presencePenalty?: number;
    topP?: number;
    n?: number;
    stop?: string[];
    modelKwargs?: Record<string, any>;
}

export interface AnthropicConfig extends BaseLLMConfig {
    provider: 'anthropic';
    model: string;
    maxTokensToSample?: number;
    stopSequences?: string[];
    anthropicApiUrl?: string;
    topK?: number;
    topP?: number;
}

export interface GoogleConfig extends BaseLLMConfig {
    provider: 'google';
    model: string;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
    stopSequences?: string[];
    safetySettings?: any;
    apiVersion?: string;
}

export interface MistralConfig extends BaseLLMConfig {
    provider: 'mistral';
    model: string;
    topP?: number;
    safeMode?: boolean;
    randomSeed?: number;
    endpoint?: string;
}

export type LLMConfig = GroqConfig | OpenAIConfig | AnthropicConfig | GoogleConfig | MistralConfig;
export type LLMInstance = any;

export function isGroqConfig(config: LLMConfig): config is GroqConfig {
    return config.provider === 'groq' && !!config.model;
}

export function isOpenAIConfig(config: LLMConfig): config is OpenAIConfig {
    return config.provider === 'openai' && !!config.model;
}

export function isAnthropicConfig(config: LLMConfig): config is AnthropicConfig {
    return config.provider === 'anthropic' && !!config.model;
}

export function isGoogleConfig(config: LLMConfig): config is GoogleConfig {
    return config.provider === 'google' && !!config.model;
}

export function isMistralConfig(config: LLMConfig): config is MistralConfig {
    return config.provider === 'mistral' && !!config.model;
}

// ─── Agent Types ───────────────────────────────────────────────────────────

export interface BaseAgentConfig {
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    llmConfig?: LLMConfig;
    maxIterations?: number;
    forceFinalAnswer?: boolean;
    promptTemplates?: Record<string, any>;
    llmInstance?: any;
}

export interface IBaseAgent {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    maxIterations: number;
    store: TeamStore | null;
    status: keyof typeof AGENT_STATUS_enum;
    env: Record<string, any> | null;
    llmInstance: LLMInstance | null;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: Record<string, any>;

    initialize(store: TeamStore, env: Record<string, any>): void;
    setStore(store: TeamStore): void;
    setStatus(status: keyof typeof AGENT_STATUS_enum): void;
    setEnv(env: Record<string, any>): void;
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void>;
    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig;
    createLLMInstance(): void;
}

export interface IReactChampionAgent extends IBaseAgent {
    messageHistory: CustomMessageHistory;
    executableAgent: any;
}

export type AgentType = IBaseAgent | IReactChampionAgent;

// ─── Task Types ────────────────────────────────────────────────────────────

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

export type TaskResult = string | Record<string, any> | null;

export interface TaskStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
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

export interface LLMUsageStats {
    inputTokens: number;
    outputTokens: number;
    callsCount: number;
    callsErrorCount: number;
    parsingErrors: number;
}

export interface AgenticLoopResult {
    error?: string;
    result?: any;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
    };
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

export interface ThinkingResult {
    parsedLLMOutput: any;
    llmOutput: string;
    llmUsageStats: {
        inputTokens: number;
        outputTokens: number;
    };
}

// ─── Handler Types ──────────────────────────────────────────────────────────

export interface HandlerBaseParams {
    agent: IBaseAgent;
    task: TaskType;
}

export interface ThinkingHandlerParams extends HandlerBaseParams {
    messages?: BaseMessage[];
    output?: any;
}

export interface ToolHandlerParams extends HandlerBaseParams {
    parsedLLMOutput: any;
    tool?: any;
    toolName?: string;
    error?: Error;
}

export interface StatusHandlerParams extends HandlerBaseParams {
    parsedLLMOutput: any;
    output?: any;
}

export interface IterationHandlerParams {
    task: TaskType;
    iterations: number;
    maxAgentIterations: number;
}

export interface TaskCompletionParams {
    task: TaskType;
    parsedResultWithFinalAnswer: any;
    iterations: number;
    maxAgentIterations: number;
}

export interface MessageBuildParams extends HandlerBaseParams {
    interpolatedTaskDescription: string;
    context?: string;
}

export interface PrepareNewLogParams {
    agent: IBaseAgent;
    task: TaskType;
    logDescription: string;
    metadata: Record<string, any>;
    logType: string;
    agentStatus: keyof typeof AGENT_STATUS_enum;
}

// ─── Store Types ───────────────────────────────────────────────────────────

export interface StoreSubscribe<T> {
    (listener: (state: T, previousState: T) => void): () => void;
    <U>(
        selector: (state: T) => U,
        listener: (selectedState: U, previousSelectedState: U) => void,
        options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }
    ): () => void;
}

export interface BaseStoreState {
    name: string;
    agents: AgentType[];
    tasks: TaskType[];
    workflowLogs: Log[];
    [key: string]: any;
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
    handleAgentThought(params: { agent: AgentType; task: TaskType; output: Output }): void;
    handleAgentSelfQuestion(params: { agent: AgentType; task: TaskType; output: Output }): void;
    handleAgentObservation(params: { agent: AgentType; task: TaskType; output: Output }): void;
    handleWeirdOutput(params: { agent: AgentType; task: TaskType; output: Output }): void;
    handleAgentLoopError(params: { agent: AgentType; task: TaskType; error: ErrorType; iterations: number; maxAgentIterations: number }): void;
    handleAgentMaxIterationsError(params: { agent: AgentType; task: TaskType; error: ErrorType; iterations?: number; maxAgentIterations?: number }): void;
    handleAgentTaskCompleted(params: { agent: AgentType; task: TaskType; result: any }): void;
}

export interface TeamState extends AgentStoreState {
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    workflowResult: any;
    inputs: Record<string, any>;
    workflowContext: string;
    env: Record<string, any>;
    logLevel: string | undefined;
    [key: string]: any;
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
    [key: string]: any;
}

export interface BaseStore<T> {
    getState: () => T;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
    subscribe: StoreSubscribe<T>;
    destroy: () => void;
}

export interface TeamStore extends TeamState, TeamStateActions, BaseStore<TeamStore> {
}

export interface ProxiedTeamStore extends TeamStore {
    state: TeamState;
}

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

export type StoreConverter<T> = T extends UseBoundStore<infer R> 
    ? R extends StoreApi<infer S> 
        ? S 
        : never 
    : never;

export interface StoreSubscribeWithSelector<T> extends StoreSubscribe<T> {
    <U>(
        selector: (state: T) => U,
        listener: (selectedState: U, previousSelectedState: U) => void,
        options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }
    ): () => void;
}

export type ExtendedStoreApi = UseBoundTeamStore & {
    use: {
        <U>(selector: (state: TeamStore) => U): U;
        <U>(selector: (state: TeamStore) => U, equalityFn: (a: U, b: U) => boolean): U;
    };
};

export type TeamStoreWithSubscribe = TeamStore & {
    subscribe: StoreSubscribeWithSelector<TeamStore>;
};

export function isTeamStore(store: any): store is TeamStore {
    return (
        typeof store === 'object' &&
        store !== null &&
        'getState' in store &&
        'setState' in store &&
        'subscribe' in store
    );
}

// ─── Logging and Display Types ───────────────────────────────────────────────

export interface TaskCompletionProps {
    iterationCount: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    agentName: string;
    agentModel: string;
    taskTitle: string;
    currentTaskNumber: number;
    totalTasks: number;
    costDetails: CostDetails;
}

export interface TaskStatusProps {
    currentTaskNumber: number;
    totalTasks: number;
    taskTitle: string;
    taskStatus: string;
    agentName: string;
}

export interface WorkflowStatusProps {
    status: string;
    message: string;
}

export interface WorkflowResultProps {
    metadata: {
        result: string;
        duration: number;
        llmUsageStats: LLMUsageStats;
        iterationCount: number;
        costDetails: CostDetails;
        teamName: string;
        taskCount: number;
        agentCount: number;
    };
}

export interface Log {
    timestamp: number;
    task: TaskType | null;
    agent: IBaseAgent | null;
    agentName: string;
    taskTitle: string;
    logDescription: string;
    taskStatus: keyof typeof TASK_STATUS_enum;
    agentStatus: keyof typeof AGENT_STATUS_enum;
    metadata: Record<string, any>;
    logType: string;
    workflowStatus?: keyof typeof WORKFLOW_STATUS_enum;
}

// ─── Error Types ────────────────────────────────────────────────────────────

export interface ErrorType extends Error {
    name: string;
    message: string;
    stack?: string;
    context?: any;
    originalError?: Error;
    recommendedAction?: string | null;
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

// ─── Response Types ────────────────────────────────────────────────────────

export interface StreamingHandlerConfig {
    content?: string;
    chunk?: any;
    metadata?: Record<string, any>;
}

export interface CompletionResponse {
    content?: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
    };
    message?: {
        content: string;
    };
}

// ─── Chain Configuration Types ──────────────────────────────────────────────

export interface ChainAgentConfig {
    runnable: any;
    getMessageHistory: () => CustomMessageHistory;
    inputMessagesKey: string;
    historyMessagesKey: string;
}

// ─── Cost Calculation Types ──────────────────────────────────────────────────

export interface CostDetails {
    costInputTokens: number;
    costOutputTokens: number;
    totalCost: number;
}

export interface ModelPricing {
    modelCode: string;
    provider: string;
    inputPricePerMillionTokens: number;
    outputPricePerMillionTokens: number;
    features: string;
}

// ─── Parser Types ──────────────────────────────────────────────────────────

export interface ParsedJSON {
    thought?: string;
    action?: string;
    actionInput?: object | null;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
    [key: string]: any;
}

// ─── Factory Pattern Interfaces ──────────────────────────────────────────────

export interface LLMFactory {
    createInstance(config: LLMConfig): LLMInstance;
}

export interface LLMFactoryCreator {
    getFactory(provider: LLMProvider): LLMFactory;
}
