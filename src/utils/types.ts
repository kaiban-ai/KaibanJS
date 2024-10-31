/**
 * Path: src/utils/types.ts
 * 
 * Core type definitions for the KaibanJS library.
 */
import { Tool } from "langchain/tools";

import {
    BaseMessage,
    SystemMessage,
    HumanMessage,
    AIMessage,
    FunctionMessage,
    AIMessageFields,
    BaseMessageFields
} from "@langchain/core/messages";
import type { MessageType, MessageContent } from "@langchain/core/messages";

export { 
    BaseMessage,
    SystemMessage,
    HumanMessage,
    AIMessage,
    FunctionMessage,
    BaseMessageFields,
    AIMessageFields
};
export type MessageRole = 'system' | 'user' | 'assistant' | 'function';

import { ChatGroqInput } from "@langchain/groq";
import { GoogleGenerativeAIChatInput } from "@langchain/google-genai";

import { SafetySetting } from "@google/generative-ai";
import CustomMessageHistory from '@/utils/CustomMessageHistory';
import { 
    AGENT_STATUS_enum, 
    TASK_STATUS_enum, 
    WORKFLOW_STATUS_enum ,
    FEEDBACK_STATUS_enum
} from '@/utils/core/enums';

export { Tool } from "langchain/tools";


export interface WorkflowMetadata {
    result: string;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostDetails;
    teamName: string;
    taskCount: number;
    agentCount: number;
}


export interface ErrorType extends Error {
    context?: Record<string, unknown>;
    originalError?: Error | null;
    recommendedAction?: string | null;
}

export interface PrettyErrorType extends ErrorType {
    type: string;
    rootError: Error | null;
    location?: string;
    prettyMessage: string;
}

export interface ParsedJSON {
    thought?: string;
    action?: string;
    actionInput?: Record<string, any> | null;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
    [key: string]: any;
}


export interface AgenticLoopResult {
    error?: string;
    result?: Output | null;
    metadata: {
        iterations: number;
        maxAgentIterations: number;
    };
}

// Logging types
export interface AgentLogMetadata {
    output?: {
        llmUsageStats: LLMUsageStats;
        thought?: string;
        action?: string;
        observation?: string | Record<string, unknown>;
        finalAnswer?: string | Record<string, unknown>;
        toolResult?: string | Record<string, unknown>;
        [key: string]: unknown;
    } | Output;
    iterations?: number;
    maxAgentIterations?: number;
    messages?: unknown[];
    error?: Error | ErrorType;
    action?: unknown;
    runId?: string;
    tool?: unknown;
    input?: unknown;
    toolName?: string;
    stats?: Record<string, unknown>;
    result?: unknown;
    [key: string]: unknown;
}

export interface TaskLogMetadata {
    llmUsageStats?: LLMUsageStats;
    iterationCount?: number;
    duration?: number;
    costDetails?: CostDetails;
    result?: unknown;
    error?: ErrorType | Error | {
        name: string;
        message: string;
        stack?: string;
        context?: Record<string, unknown>;
        timestamp?: number;
    };
    [key: string]: unknown;
}

export interface WorkflowLogMetadata {
    result: string;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostDetails;
    teamName: string;
    taskCount: number;
    agentCount: number;
}

export type LogMetadata = AgentLogMetadata | TaskLogMetadata | WorkflowLogMetadata | MessageLogMetadata;
export interface Log {
    timestamp: number;
    task: TaskType | null;
    agent: AgentType | null;
    agentName: string;
    taskTitle: string;
    logDescription: string;
    taskStatus: keyof typeof TASK_STATUS_enum;
    agentStatus: keyof typeof AGENT_STATUS_enum;
    workflowStatus?: keyof typeof WORKFLOW_STATUS_enum;
    metadata: LogMetadata;
    logType: LogType;
}

export interface PrepareNewLogParams {
    agent: AgentType;
    task: TaskType | null;
    logDescription: string;
    metadata: LogMetadata;
    logType: LogType;
    agentStatus?: keyof typeof AGENT_STATUS_enum;
    taskStatus?: keyof typeof TASK_STATUS_enum;
    workflowStatus?: keyof typeof WORKFLOW_STATUS_enum;
}

// Add type guards for log types
export const isStatusLog = (logType: LogType): logType is StatusLogType => {
    return ['AgentStatusUpdate', 'TaskStatusUpdate', 'WorkflowStatusUpdate'].includes(logType);
};

export const isMessageLog = (logType: LogType): logType is MessageLogType => {
    return ['SystemMessage', 'UserMessage', 'AIMessage', 'FunctionMessage'].includes(logType);
};

export const isMessageLogMetadata = (metadata: LogMetadata): metadata is MessageLogMetadata => {
    return 'role' in metadata && 'content' in metadata;
};

import { z } from 'zod';

// Update the Log interface's logType to include message types
export type StatusLogType = 'AgentStatusUpdate' | 'TaskStatusUpdate' | 'WorkflowStatusUpdate';
export type MessageLogType = 'SystemMessage' | 'UserMessage' | 'AIMessage' | 'FunctionMessage';
export type LogType = StatusLogType | MessageLogType;

// ─── Core Provider Types ────────────────────────────────────────────────────

export const LLMProviders = {
    GROQ: 'groq',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    GOOGLE: 'google',
    MISTRAL: 'mistral'
} as const;

export type LLMProvider = typeof LLMProviders[keyof typeof LLMProviders];

export const TOKEN_LIMITS = {
    GROQ_DEFAULT: 8192,
    OPENAI_GPT4: 8192,
    ANTHROPIC_CLAUDE: 100000,
    GOOGLE_GEMINI: 32768,
    MISTRAL_LARGE: 32768
} as const;

// ─── Base Configuration Types ────────────────────────────────────────────────

export interface BaseLLMConfig {
    provider: LLMProvider;
    model: string;
    apiKey?: string;
    temperature?: number;
    streaming?: boolean;
    apiBaseUrl?: string;
    maxRetries?: number;
    timeout?: number;
    maxConcurrency?: number;
    headers?: Record<string, string>;
    debug?: boolean;
    stopSequences?: string[];
}

export interface LLMRuntimeOptions {
    timeoutMs?: number;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    metadata?: Record<string, unknown>;
}

// ─── Callback Configurations ─────────────────────────────────────────────────

export interface ChatGroqCallbacks {
    handleLLMStart?: (llm: any, messages: BaseMessage[]) => void | Promise<void>;
    handleLLMEnd?: (output: Output) => void | Promise<void>;
    handleLLMError?: (error: Error) => void | Promise<void>;
    handleChainStart?: (chain: any, inputs: Record<string, any>) => void | Promise<void>;
    handleChainEnd?: (outputs: Record<string, any>) => void | Promise<void>;
    handleChainError?: (error: Error) => void | Promise<void>;
    handleToolStart?: (tool: string, input: string) => void | Promise<void>;
    handleToolEnd?: (output: string) => void | Promise<void>;
    handleToolError?: (error: Error) => void | Promise<void>;
}

// ─── Provider-Specific Configuration Types ─────────────────────────────────

export interface GroqConfig extends BaseLLMConfig {
    provider: 'groq';
    model: string;
    stop?: string | string[] | null;
    temperature?: number;
    max_tokens?: number;
    responseFormat?: 'json' | 'text';
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    callbacks?: ChatGroqCallbacks;
}

export interface OpenAIConfig extends BaseLLMConfig {
    provider: 'openai';
    model: string;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    top_p?: number;
    n?: number;
    stop?: string[];
    model_kwargs?: Record<string, unknown>;
    organization?: string;
    responseFormat?: { type: 'text' | 'json_object'; schema?: Record<string, unknown> };
    tools?: Array<{ type: string; function: Record<string, unknown> }>;
}

export interface AnthropicConfig extends BaseLLMConfig {
    provider: 'anthropic';
    model: string;
    max_tokens_to_sample?: number;
    stop_sequences?: string[];
    top_k?: number;
    top_p?: number;
    metadata?: { user_id?: string; conversation_id?: string };
    system?: string;
}

export interface GoogleConfig extends BaseLLMConfig {
    provider: 'google';
    model: string;
    modelName?: string;
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    safetySettings?: SafetySetting[];
    apiKey?: string;
    apiVersion?: string;
    baseUrl?: string;
    streaming?: boolean;
    streamUsage?: boolean;
    projectId?: string;
    location?: string;
}

export interface MistralConfig extends BaseLLMConfig {
    provider: 'mistral';
    model: string;
    top_p?: number;
    safe_mode?: boolean;
    random_seed?: number;
    endpoint?: string;
    max_tokens?: number;
    responseFormat?: 'text' | 'json';
    tools?: Array<{ type: string; function: Record<string, unknown> }>;
}

// ─── Response and Output Types ──────────────────────────────────────────────


export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface ResponseMetadata {
    model: string;
    provider: LLMProvider;
    timestamp: number;
    latency: number;
    finishReason?: string;
    requestId?: string;
}

// Structure for thinking process results
export interface ThinkingResult {
    parsedLLMOutput: ParsedOutput | null;
    llmOutput: string;
    llmUsageStats: LLMUsageStats;
}

// Parsed output from LLM responses
export interface ParsedOutput {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown>;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string | Record<string, unknown>;
}


// Detailed completion response structure
export interface CompletionResponse {
    content?: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
    message?: {
        content: string;
        role?: string;
        function_call?: Record<string, unknown>;
        usage_metadata?: {
            input_tokens?: number;
            output_tokens?: number;
        };
    };
    generations?: Array<{
        message: {
            content: string;
            role?: string;
            usage_metadata?: {
                input_tokens?: number;
                output_tokens?: number;
            };
        };
    }>;
    finishReason?: 'stop' | 'length' | 'content_filter' | 'function_call' | null;
}


// ─── Parsing and Output Types ─────────────────────────────────────────────────

export interface ParsedLLMOutput {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown>;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string | Record<string, unknown>;
    metadata?: {
        reasoning?: string;
        confidence?: number;
        alternativeActions?: string[];
    };
}

// ─── Enhanced Output Types ───────────────────────────────────────────────────

export interface Output extends ParsedLLMOutput {
    llmOutput?: string;
    llmUsageStats?: LLMUsageStats;
    generations?: Array<{
        message: {
            content: string;
            role?: string;
            usage_metadata?: TokenUsage;
            functionCall?: {
                name: string;
                arguments: Record<string, unknown>;
            };
        };
    }>;
    modelInfo?: {
        name: string;
        provider: LLMProvider;
        temperature: number;
        maxTokens?: number;
    };
}

export interface LLMResponse<T = unknown> {
    content: string;
    rawOutput: T;
    usage: TokenUsage;
    metadata: ResponseMetadata;
}

// ─── Chain Types ───────────────────────────────────────────────────────────

export interface ChainConfig {
    maxIterations?: number;
    earlyStoppingCondition?: (output: Output) => boolean;
    fallbackHandler?: (error: Error) => Promise<Output>;
    callbacks?: ChatGroqCallbacks;
}

export interface ChainMetadata {
    startTime: number;
    endTime: number;
    duration: number;
    iterationCount: number;
    tokenUsage: TokenUsage;
    modelCalls: number;
    errorCount: number;
}

// ─── Message Types ────────────────────────────────────────────────────────

// LangChain-compatible function call types
export interface FunctionCall {
    name: string;
    arguments: string; // Must be a string for LangChain compatibility
}

export interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string; // Must be a string for LangChain compatibility
    };
}

// Base additional kwargs type matching LangChain's requirements
export interface AdditionalKwargs {
    function_call?: FunctionCall;
    tool_calls?: ToolCall[];
    [key: string]: unknown;
}

// Base metadata fields that all message types share
export interface BaseMessageMetadataFields extends AdditionalKwargs {
    messageId?: string;
    parentMessageId?: string;
    conversationId?: string;
    timestamp?: number;
}

// Extended metadata fields for chat messages
export interface ChatMessageMetadataFields extends BaseMessageMetadataFields {
    id: string;
    parentId?: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    importance?: number;
}

// Metadata fields for logging
export interface LogMessageMetadataFields extends BaseMessageMetadataFields {
    llmUsageStats: LLMUsageStats;
    costDetails: CostDetails;
    tokenCount?: number;
}

// Combined metadata fields for all use cases
export interface MessageMetadataFields extends AdditionalKwargs {
    messageId?: string;
    parentMessageId?: string;
    conversationId?: string;
    timestamp?: number;
    id?: string;
    parentId?: string;
    createdAt?: number;
    updatedAt?: number;
    tags?: string[];
    importance?: number;
    llmUsageStats?: LLMUsageStats;
    costDetails?: CostDetails;
    tokenCount?: number;
    role?: MessageRole;
    content?: string;
    name?: string;
}

// Internal chat message type for handling null content
export interface InternalChatMessage {
    role: MessageRole;
    content: MessageContent | null;
    name?: string;
    functionCall?: FunctionCall;
    metadata?: MessageMetadataFields;
    additional_kwargs: AdditionalKwargs;
}

// LangChain-compatible chat message
export interface ChatMessage {
    role: MessageRole;
    content: MessageContent;
    name?: string;
    functionCall?: FunctionCall;
    metadata?: MessageMetadataFields;
    additional_kwargs: AdditionalKwargs;
}

export interface ChatSession {
    id: string;
    messages: BaseMessage[];
    metadata: {
        startTime: number;
        lastActivityTime: number;
        messageCount: number;
        tokenCount: number;
        completedFunctions: string[];
    };
    config?: {
        retainMessages?: number;
        maxTokens?: number;
        timeoutMs?: number;
    };
}

export interface MessageContext {
    role: MessageRole;
    content: string;
    timestamp: number;
    metadata?: MessageMetadataFields;
    tokenCount?: number;
}

export interface MessageLogMetadata extends Omit<MessageMetadataFields, 'content'> {
    role: MessageRole;
    content: string;
    name?: string;
    timestamp: number;
    llmUsageStats: LLMUsageStats;
    costDetails: CostDetails;
}

export interface MessageBuildParams {
    agent: AgentType;
    task: TaskType;
    interpolatedTaskDescription: string;
    context?: string;
}

export interface MessageHistory {
    messages: BaseMessage[];
    addMessage(message: BaseMessage): Promise<void>;
    clear(): Promise<void>;
    getMessages(): Promise<BaseMessage[]>;
    prune(maxTokens?: number): Promise<void>;
    serialize(): Promise<string>;
    deserialize(data: string): Promise<void>;
}

export interface MessageHandlerConfig {
    onToken?: (token: string) => void;
    onComplete?: (message: BaseMessage) => void;
    onError?: (error: Error) => void;
    metadata?: MessageMetadataFields;
}

export interface MessageStreamConfig extends MessageHandlerConfig {
    bufferSize?: number;
    flushInterval?: number;
    maxRetries?: number;
    timeoutMs?: number;
}

export interface MessageValidationConfig {
    maxLength?: number;
    allowedRoles?: MessageRole[];
    requiredMetadata?: (keyof MessageMetadataFields)[];
    customValidators?: ((message: BaseMessage) => boolean)[];
}

// Utility functions for handling function calls
export const FunctionCallUtils = {
    stringify(args: Record<string, unknown>): string {
        return JSON.stringify(args);
    },

    parse(argsString: string): Record<string, unknown> {
        try {
            return JSON.parse(argsString);
        } catch {
            return {};
        }
    },

    createFunctionCall(name: string, args: Record<string, unknown>): FunctionCall {
        return {
            name,
            arguments: this.stringify(args)
        };
    },

    convertToString(content: MessageContent | null): string | null {
        if (content === null) return null;
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content.map(item => 
                typeof item === 'string' ? item : JSON.stringify(item)
            ).join(' ');
        }
        return JSON.stringify(content);
    },

    convertToLangChainMessage(message: InternalChatMessage): ChatMessage {
        return {
            ...message,
            content: message.content || "" as MessageContent
        };
    },

    convertFromLangChainMessage(message: ChatMessage): InternalChatMessage {
        return {
            ...message,
            content: message.content
        };
    },

    convertToLogMetadata(message: ChatMessage): MessageLogMetadata {
        return {
            ...message.metadata,
            role: message.role,
            content: this.convertToString(message.content) || '',
            name: message.name,
            timestamp: Date.now(),
            llmUsageStats: message.metadata?.llmUsageStats || {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
                lastUsed: Date.now(),
                memoryUtilization: {
                    peakMemoryUsage: 0,
                    averageMemoryUsage: 0,
                    cleanupEvents: 0
                },
                costBreakdown: {
                    input: 0,
                    output: 0,
                    total: 0,
                    currency: 'USD'
                }
            },
            costDetails: message.metadata?.costDetails || {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            }
        };
    }
};

// Type guards
export const isLogMessageMetadata = (metadata: MessageMetadataFields): metadata is LogMessageMetadataFields => {
    return 'llmUsageStats' in metadata && 'costDetails' in metadata;
};

export const isChatMessageMetadata = (metadata: MessageMetadataFields): metadata is ChatMessageMetadataFields => {
    return 'id' in metadata && 'createdAt' in metadata && 'updatedAt' in metadata;
};

export const isLangChainMetadata = (metadata: MessageMetadataFields): metadata is AdditionalKwargs => {
    return 'function_call' in metadata || 'tool_calls' in metadata;
};

export const isFunctionCall = (value: unknown): value is FunctionCall => {
    return (
        typeof value === 'object' &&
        value !== null &&
        'name' in value &&
        'arguments' in value &&
        typeof (value as FunctionCall).name === 'string' &&
        typeof (value as FunctionCall).arguments === 'string'
    );
};

export const isBaseMessage = (message: unknown): message is BaseMessage => {
    return message instanceof BaseMessage;
};

export const isInternalChatMessage = (message: unknown): message is InternalChatMessage => {
    return (
        typeof message === 'object' &&
        message !== null &&
        'role' in message &&
        'content' in message &&
        'additional_kwargs' in message
    );
};

// Session-related type guards
export const isChatSession = (session: unknown): session is ChatSession => {
    if (!session || typeof session !== 'object') return false;
    const s = session as ChatSession;
    return (
        typeof s.id === 'string' &&
        Array.isArray(s.messages) &&
        s.messages.every(isBaseMessage) &&
        typeof s.metadata === 'object' &&
        typeof s.metadata.startTime === 'number' &&
        typeof s.metadata.lastActivityTime === 'number' &&
        typeof s.metadata.messageCount === 'number' &&
        typeof s.metadata.tokenCount === 'number' &&
        Array.isArray(s.metadata.completedFunctions)
    );
};
// ─── Handler Parameter Types ───────────────────────────────────────────────

/**
 * Base interface for all handler parameters
 */
export interface HandlerBaseParams {
    agent: AgentType;
    task: TaskType;
    parsedLLMOutput?: ParsedOutput | null;
}


/**
 * Thinking Process Handler Parameters
 */
export interface ThinkingHandlerParams extends HandlerBaseParams {
    messages?: BaseMessage[];
    output?: Output;
}

/**
 * Status and Result Handler Parameters
 */
export interface StatusHandlerParams extends HandlerBaseParams {
    output: Output;
    error?: Error;
}

/**
 * Tool Execution Handler Parameters
 */
export interface ToolHandlerParams extends HandlerBaseParams {
    tool?: Tool;
    toolName?: string | undefined;
    toolResult?: string | Record<string, unknown>;
    error?: Error;
    input?: unknown;
}

export interface ToolExecutionResult {
    success: boolean;
    result?: string | Record<string, unknown>;
    error?: Error;
    toolName?: string;
}

/**
 * Iteration Control Handler Parameters
 */
export interface IterationHandlerParams {
    task: TaskType;
    iterations: number;
    maxAgentIterations: number;
}

export interface TaskCompletionParams extends IterationHandlerParams {
    parsedResultWithFinalAnswer: ParsedOutput;
}

/**
 * Stream Processing Handler Parameters
 */
export interface StreamHandlerParams extends HandlerBaseParams {
    buffer: string[];
    bufferSize: number;
    onChunk?: (chunk: string) => void;
}

/**
 * Error and Retry Handler Parameters
 */
export interface RetryHandlerParams extends HandlerBaseParams {
    error: LLMError;
    attempt: number;
    maxAttempts: number;
    delay: number;
}

/**
 * Validation Handler Parameters
 */
export interface ValidationHandlerParams extends HandlerBaseParams {
    config: LLMConfig;
    validationResult: ConfigValidationResult;
}

/**
 * Completion Handler Parameters
 */
export interface CompletionHandlerParams extends HandlerBaseParams {
    input: string;
    options?: LLMRuntimeOptions;
    partial?: boolean;
    signal?: AbortSignal;
    requestConfig?: RequestConfig;
}

/**
 * LLM Output Handler Parameters
 */
export interface OutputHandlerParams extends HandlerBaseParams {
    output: Output;
    rawOutput?: unknown;
    metadata?: ResponseMetadata;
}

/**
 * Error Handler Parameters
 */
export interface ErrorHandlerParams extends HandlerBaseParams {
    error: Error | LLMError;
    context?: Record<string, unknown>;
}

// ─── Request Management Types ─────────────────────────────────────────────

export interface RequestConfig {
    priority?: 'low' | 'normal' | 'high';
    timeout?: number;
    retryOptions?: {
        maxAttempts: number;
        backoffMultiplier: number;
        initialDelay: number;
    };
    abortSignal?: AbortSignal;
    contextWindow?: {
        maxTokens: number;
        truncationStrategy: 'start' | 'end' | 'middle';
    };
}

export interface RequestQueue {
    add: (request: RequestConfig) => Promise<string>;
    remove: (requestId: string) => void;
    clear: () => void;
    pause: () => void;
    resume: () => void;
    getStatus: (requestId: string) => QueueItemStatus;
    getMetrics: () => QueueMetrics;
}

export interface QueueItemStatus {
    state: 'pending' | 'processing' | 'completed' | 'failed';
    position?: number;
    startTime?: number;
    completionTime?: number;
    retryCount?: number;
    error?: LLMError;
}

export interface QueueMetrics {
    totalRequests: number;
    activeRequests: number;
    pendingRequests: number;
    completedRequests: number;
    failedRequests: number;
    averageWaitTime: number;
    averageProcessingTime: number;
}

// ─── Event System Types ────────────────────────────────────────────────────

export type LLMEventType = 
    | 'request.start'
    | 'request.end'
    | 'request.error'
    | 'token.received'
    | 'rate.limited'
    | 'cache.hit'
    | 'cache.miss'
    | 'memory.pruned'
    | 'budget.exceeded';

export interface LLMEvent {
    type: LLMEventType;
    timestamp: number;
    data: Record<string, unknown>;
    metadata?: {
        provider: LLMProvider;
        model: string;
        requestId?: string;
    };
}

export interface EventHandlerConfig {
    handlers: Partial<Record<LLMEventType, (event: LLMEvent) => void>>;
    errorHandler?: (error: Error, event: LLMEvent) => void;
    batchEvents?: boolean;
    batchSize?: number;
    batchInterval?: number;
}

// ─── Memory Management Types ───────────────────────────────────────────────


export interface MemoryConfig {
    maxTokens?: number;
    relevanceThreshold?: number;
    pruningStrategy?: 'fifo' | 'lru' | 'relevance';
    persistenceKey?: string;
}

export interface TokenManagerConfig {
    countMethod: 'approximate' | 'precise';
    modelSpecificRules?: {
        [key: string]: {
            promptTokenMultiplier?: number;
            completionTokenMultiplier?: number;
            maxContextLength?: number;
        };
    };
    tokenSafetyBuffer?: number;
}

export interface MemoryManagerConfig extends MemoryConfig {
    tokenManager: TokenManagerConfig;
    persistenceStrategy?: {
        type: 'local' | 'remote' | 'distributed';
        options?: Record<string, unknown>;
    };
    cleanupStrategy?: {
        method: 'time' | 'size' | 'custom';
        threshold: number;
        customCleanup?: (messages: ChatMessage[]) => Promise<ChatMessage[]>;
    };
    monitoring?: {
        enabled: boolean;
        metrics?: {
            memoryUsage: boolean;
            tokenUsage: boolean;
            cleanupEvents: boolean;
        };
        alerts?: {
            memoryThreshold?: number;
            tokenThreshold?: number;
            onThresholdReached?: (metrics: MemoryMetrics) => void;
        };
    };
}


// ─── Performance Monitoring Types ─────────────────────────────────────────

export interface PerformanceMetrics {
    requestLatency: number;
    tokenProcessingSpeed: number;
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
    concurrentRequests: number;
    queueLength: number;
    resourceUtilization: {
        cpu: number;
        memory: number;
        network: {
            bytesIn: number;
            bytesOut: number;
        };
    };
}

export interface MonitoringConfig {
    enabled: boolean;
    metrics: {
        performance?: boolean;
        memory?: boolean;
        tokens?: boolean;
        network?: boolean;
    };
    sampling?: {
        enabled: boolean;
        rate: number;
        intervalMs: number;
    };
    alerting?: {
        thresholds: {
            latency?: number;
            memory?: number;
            errors?: number;
            tokenUsage?: number;
            costPerMinute?: number;
        };
        callbacks: {
            onThresholdExceeded?: (metric: string, value: number) => void;
            onSystemDegraded?: (metrics: PerformanceMetrics) => void;
            onResourceExhaustion?: (resource: string) => void;
        };
    };
    retention?: {
        metricsRetentionDays: number;
        aggregationInterval: number;
    };
}

// ─── Lifecycle Management Types ────────────────────────────────────────────

export interface LifecycleHooks {
    onInitialize?: () => Promise<void>;
    onBeforeRequest?: (config: LLMConfig) => Promise<void>;
    onAfterRequest?: (response: LLMResponse) => Promise<void>;
    onError?: (error: LLMError) => Promise<void>;
    onShutdown?: () => Promise<void>;
    onResourceExhaustion?: (resource: string) => Promise<void>;
    onConfigurationChange?: (newConfig: LLMConfig) => Promise<void>;
    onStateTransition?: (from: string, to: string) => Promise<void>;
}

export interface SessionLifecycle {
    initialize: () => Promise<void>;
    validate: () => Promise<boolean>;
    cleanup: () => Promise<void>;
    reset: () => Promise<void>;
    suspend: () => Promise<void>;
    resume: () => Promise<void>;
    getState: () => SessionState;
}

export interface SessionState {
    status: 'initializing' | 'active' | 'suspended' | 'error' | 'terminated';
    lastActivity: number;
    resourceUsage: {
        memory: number;
        tokens: number;
        requests: number;
    };
    error?: {
        message: string;
        code: string;
        timestamp: number;
    };
}

// ─── Health Check Types ────────────────────────────────────────────────────

export interface HealthCheckConfig {
    enabled: boolean;
    interval: number;
    timeout: number;
    checks: {
        memory?: boolean;
        performance?: boolean;
        connectivity?: boolean;
        dependencies?: boolean;
    };
    thresholds: {
        memoryUsage?: number;
        responseTime?: number;
        errorRate?: number;
    };
}

export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    checks: {
        [check: string]: {
            status: 'pass' | 'warn' | 'fail';
            latency: number;
            message?: string;
            lastCheck: number;
        };
    };
    metrics: {
        uptime: number;
        successRate: number;
        averageLatency: number;
        activeConnections: number;
    };
}

// ─── Additional Validation Schemas ────────────────────────────────────────

export const RequestValidationSchemas = {
    requestConfig: z.object({
        priority: z.enum(['low', 'normal', 'high']).optional(),
        timeout: z.number().positive().optional(),
        retryOptions: z.object({
            maxAttempts: z.number().positive(),
            backoffMultiplier: z.number().positive(),
            initialDelay: z.number().positive()
        }).optional(),
        contextWindow: z.object({
            maxTokens: z.number().positive(),
            truncationStrategy: z.enum(['start', 'end', 'middle'])
        }).optional()
    }),

    completionResult: z.object({
        success: z.boolean(),
        content: z.string().optional(),
        error: z.custom<LLMError>().optional(),
        usage: z.object({
            promptTokens: z.number(),
            completionTokens: z.number(),
            totalTokens: z.number()
        }),
        timing: z.object({
            queueTime: z.number(),
            processingTime: z.number(),
            totalTime: z.number()
        }),
        metadata: z.object({
            requestId: z.string(),
            model: z.string(),
            provider: z.custom<LLMProvider>(),
            retryCount: z.number()
        })
    })
};

export const MonitoringValidationSchemas = {
    ...RequestValidationSchemas,
    
    healthCheckConfig: z.object({
        enabled: z.boolean(),
        interval: z.number().positive(),
        timeout: z.number().positive(),
        checks: z.object({
            memory: z.boolean().optional(),
            performance: z.boolean().optional(),
            connectivity: z.boolean().optional(),
            dependencies: z.boolean().optional()
        }),
        thresholds: z.object({
            memoryUsage: z.number().min(0).max(100).optional(),
            responseTime: z.number().positive().optional(),
            errorRate: z.number().min(0).max(100).optional()
        })
    }),

    performanceMetrics: z.object({
        requestLatency: z.number().positive(),
        tokenProcessingSpeed: z.number().positive(),
        memoryUsage: z.object({
            heapUsed: z.number().nonnegative(),
            heapTotal: z.number().positive(),
            external: z.number().nonnegative()
        }),
        concurrentRequests: z.number().nonnegative(),
        queueLength: z.number().nonnegative(),
        resourceUtilization: z.object({
            cpu: z.number().min(0).max(100),
            memory: z.number().min(0).max(100),
            network: z.object({
                bytesIn: z.number().nonnegative(),
                bytesOut: z.number().nonnegative()
            })
        })
    })
};

// ─── Monitoring Types ─────────────────────────────────────────────────────

export interface MemoryMetrics {
    totalMessages: number;
    totalTokens: number;
    memoryUsage: number;
    lastCleanup?: {
        timestamp: number;
        messagesRemoved: number;
        tokensFreed: number;
    };
    modelSpecificStats?: {
        [model: string]: {
            messageCount: number;
            tokenCount: number;
            averageTokensPerMessage: number;
        };
    };
}


// ─── Cache Management Types ─────────────────────────────────────────────────

export interface CacheConfig {
    enabled: boolean;
    ttl: number;
    maxSize: number;
    strategy: 'lru' | 'fifo' | 'custom';
    namespace?: string;
    customStrategy?: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        delete: (key: string) => Promise<void>;
    };
}

export interface CacheEntry {
    key: string;
    value: any;
    metadata: {
        createdAt: number;
        expiresAt: number;
        hitCount: number;
        lastAccessed: number;
        size: number;
    };
}


// ─── Security and Authentication Types ─────────────────────────────────────

export interface SecurityConfig {
    inputValidation: {
        enabled: boolean;
        maxLength?: number;
        allowedPatterns?: RegExp[];
        sanitization?: {
            removeHtml: boolean;
            removeUrls: boolean;
            customRules?: Array<(input: string) => string>;
        };
    };
    authentication: {
        required: boolean;
        type?: 'apiKey' | 'oauth' | 'custom';
        validator?: (credentials: unknown) => Promise<boolean>;
    };
    encryption: {
        atRest: boolean;
        inTransit: boolean;
        algorithm?: string;
        keyRotation?: {
            enabled: boolean;
            intervalDays: number;
        };
    };
}

// ─── Rate Limiting Types ──────────────────────────────────────────────────

export interface RateLimitConfig {
    tokensPerMinute: number;
    maxConcurrentRequests: number;
    retryStrategy: {
        maxRetries: number;
        initialDelay: number;
        backoffMultiplier: number;
        maxDelay: number;
    };
    quotaResetInterval: number;
}

export interface RateLimitInfo {
    remainingTokens: number;
    resetTime: number;
    isRateLimited: boolean;
    nextRequestDelay?: number;
}

export interface RateLimitingStrategy {
    type: 'token' | 'sliding' | 'fixed' | 'adaptive';
    config: {
        window: number;
        limit: number;
        costFunction?: (request: RequestConfig) => number;
    };
    onLimit?: (info: RateLimitInfo) => Promise<void>;
    adaptiveConfig?: {
        minLimit: number;
        maxLimit: number;
        increaseThreshold: number;
        decreaseThreshold: number;
        adjustmentFactor: number;
    };
}

export interface RateLimitState {
    currentTokens: number;
    lastRefill: number;
    windowStart: number;
    requestHistory: Array<{
        timestamp: number;
        cost: number;
        success: boolean;
    }>;
}

// ─── Cost Management Types ─────────────────────────────────────────────────

export interface CostManagementConfig {
    budgets: {
        daily?: number;
        monthly?: number;
        perRequest?: number;
    };
    alerts: {
        usageThresholds: {
            warning: number;
            critical: number;
        };
        notifications: {
            email?: string[];
            webhook?: string;
            custom?: (alert: CostAlert) => Promise<void>;
        };
    };
    optimization: {
        enabled: boolean;
        strategies: {
            caching?: boolean;
            modelDowngrade?: boolean;
            batchProcessing?: boolean;
            contextPruning?: boolean;
        };
        rules?: Array<{
            condition: (metrics: CostMetrics) => boolean;
            action: (context: RequestContext) => Promise<void>;
        }>;
    };
}

export interface CostAlert {
    type: 'warning' | 'critical';
    threshold: number;
    currentUsage: number;
    projectedUsage: number;
    timestamp: number;
    details: {
        period: 'daily' | 'monthly';
        breakdown: Record<string, number>;
    };
}

export interface CostMetrics {
    current: {
        daily: number;
        monthly: number;
        perRequest: number;
    };
    historical: Array<{
        timestamp: number;
        cost: number;
        type: string;
    }>;
    projections: {
        endOfDay: number;
        endOfMonth: number;
    };
}

// ─── Request Context Types ─────────────────────────────────────────────────

export interface RequestContext {
    requestId: string;
    timestamp: number;
    provider: LLMProvider;
    model: string;
    priority: 'low' | 'normal' | 'high';
    costEstimate: {
        min: number;
        max: number;
    };
    metadata: Record<string, unknown>;
}

// ─── Usage Tracking Types ──────────────────────────────────────────────────

export interface LLMUsageStats {
    inputTokens: number;
    outputTokens: number;
    callsCount: number;
    callsErrorCount: number;
    parsingErrors: number;
    totalLatency: number;
    averageLatency: number;
    lastUsed: number;
    memoryUtilization: {
        peakMemoryUsage: number;
        averageMemoryUsage: number;
        cleanupEvents: number;
    };
    costBreakdown: {
        input: number;
        output: number;
        total: number;
        currency: string;
    };
}

export interface ProviderUsageStats {
    [provider: string]: {
        [model: string]: LLMUsageStats & {
            memoryMetrics?: MemoryMetrics;
        };
    };
}

export interface UsageTracking {
    current: {
        tokens: number;
        requests: number;
        cost: number;
    };
    limits: {
        tokens: number;
        requests: number;
        cost: number;
    };
    history: Array<{
        timestamp: number;
        tokens: number;
        requests: number;
        cost: number;
    }>;
}

export interface ModelUsageStats {
    [model: string]: {
        tokens: {
            input: number;
            output: number;
        };
        requests: {
            successful: number;
            failed: number;
        };
        latency: {
            average: number;
            p95: number;
            max: number;
        };
        cost: number;
    };
}
// ─── Security and Authentication Types ─────────────────────────────────────

export interface SecurityConfig {
    inputValidation: {
        enabled: boolean;
        maxLength?: number;
        allowedPatterns?: RegExp[];
        sanitization?: {
            removeHtml: boolean;
            removeUrls: boolean;
            customRules?: Array<(input: string) => string>;
        };
    };
    authentication: {
        required: boolean;
        type?: 'apiKey' | 'oauth' | 'custom';
        validator?: (credentials: unknown) => Promise<boolean>;
    };
    encryption: {
        atRest: boolean;
        inTransit: boolean;
        algorithm?: string;
        keyRotation?: {
            enabled: boolean;
            intervalDays: number;
        };
    };
}

// ─── Rate Limiting Types ──────────────────────────────────────────────────

export interface RateLimitingStrategy {
    type: 'token' | 'sliding' | 'fixed' | 'adaptive';
    config: {
        window: number;
        limit: number;
        costFunction?: (request: RequestConfig) => number;
    };
    onLimit?: (info: RateLimitInfo) => Promise<void>;
    adaptiveConfig?: {
        minLimit: number;
        maxLimit: number;
        increaseThreshold: number;
        decreaseThreshold: number;
        adjustmentFactor: number;
    };
}

export interface RateLimitState {
    currentTokens: number;
    lastRefill: number;
    windowStart: number;
    requestHistory: Array<{
        timestamp: number;
        cost: number;
        success: boolean;
    }>;
}

// ─── Cost Management Types ─────────────────────────────────────────────────

export interface CostManagementConfig {
    budgets: {
        daily?: number;
        monthly?: number;
        perRequest?: number;
    };
    alerts: {
        usageThresholds: {
            warning: number;
            critical: number;
        };
        notifications: {
            email?: string[];
            webhook?: string;
            custom?: (alert: CostAlert) => Promise<void>;
        };
    };
    optimization: {
        enabled: boolean;
        strategies: {
            caching?: boolean;
            modelDowngrade?: boolean;
            batchProcessing?: boolean;
            contextPruning?: boolean;
        };
        rules?: Array<{
            condition: (metrics: CostMetrics) => boolean;
            action: (context: RequestContext) => Promise<void>;
        }>;
    };
}

// ─── Streaming Types ────────────────────────────────────────────────────────

export interface StreamingChunk {
    content: string;
    metadata?: Record<string, unknown>;
    finishReason?: string;
    done: boolean;
}

export interface StreamingHandlerConfig {
    content?: string;
    chunk?: StreamingChunk;
    metadata?: Record<string, unknown>;
    onToken?: (token: string) => void;
    onComplete?: (fullContent: string) => void;
    onError?: (error: Error) => void;
}

// ─── Factory Types ─────────────────────────────────────────────────────────

export interface LLMFactoryConfig extends Partial<BaseLLMConfig> {
    maxRetries?: number;
    timeout?: number;
    maxConcurrency?: number;
    debug?: boolean;
}

export interface LLMFactory {
    createInstance(config: LLMConfig & LLMFactoryConfig): Promise<LLMInstance>;
}

// Add this interface definition in types.ts
export interface LLMFactoryCreator {
    createFactory(): LLMFactory;
    createInstance(config: LLMConfig): Promise<LLMInstance>;
    validateConfig(config: LLMConfig): Promise<ConfigValidationResult>;
}

// ─── Type Guards ───────────────────────────────────────────────────────────

/**
 * Type guard functions for configuration validation
 */
export const isGroqConfig = (config: LLMConfig): config is GroqConfig => 
    config.provider === 'groq';

export const isOpenAIConfig = (config: LLMConfig): config is OpenAIConfig => 
    config.provider === 'openai';

export const isAnthropicConfig = (config: LLMConfig): config is AnthropicConfig => 
    config.provider === 'anthropic';

export const isGoogleConfig = (config: LLMConfig): config is GoogleConfig => 
    config.provider === 'google';

export const isMistralConfig = (config: LLMConfig): config is MistralConfig => 
    config.provider === 'mistral';



// ─── Error Types ───────────────────────────────────────────────────────────

export interface LLMError extends Error {
    code: string;
    provider: LLMProvider;
    details?: Record<string, unknown>;
    retryable: boolean;
}

export class LLMConfigurationError extends Error implements LLMError {
    code: string;
    provider: LLMProvider;
    details?: Record<string, unknown>;
    retryable: boolean;

    constructor(message: string, provider: LLMProvider, details?: Record<string, unknown>) {
        super(message);
        this.name = 'LLMConfigurationError';
        this.code = 'INVALID_CONFIG';
        this.provider = provider;
        this.details = details;
        this.retryable = false;
    }
}

// ─── Validation Types ─────────────────────────────────────────────────────

export interface ConfigValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface ConfigValidator {
    validate(config: LLMConfig): ConfigValidationResult;
    normalize(config: LLMConfig): LLMConfig;
}


// ─── Validation Schemas ────────────────────────────────────────────────────

export const ValidationSchemas = {
    // Configuration validation for lifecycle hooks
    lifecycleHooks: z.object({
        onInitialize: z.function().returns(z.promise(z.void())).optional(),
        onBeforeRequest: z.function()
            .args(z.custom<LLMConfig>())
            .returns(z.promise(z.void()))
            .optional(),
        onAfterRequest: z.function()
            .args(z.custom<LLMResponse>())
            .returns(z.promise(z.void()))
            .optional(),
        onError: z.function()
            .args(z.custom<LLMError>())
            .returns(z.promise(z.void()))
            .optional(),
        onCleanup: z.function().returns(z.promise(z.void())).optional()
    }),

    performanceMonitoring: z.object({
        enabled: z.boolean(),
        metrics: z.object({
            performance: z.boolean().optional(),
            memory: z.boolean().optional(),
            tokens: z.boolean().optional()
        }),
        sampling: z.object({
            enabled: z.boolean(),
            rate: z.number().min(0).max(1)
        }).optional(),
        alerting: z.object({
            thresholds: z.object({
                latency: z.number().positive().optional(),
                memory: z.number().positive().optional(),
                errors: z.number().positive().optional()
            }),
            callbacks: z.object({
                onThresholdExceeded: z.function()
                    .args(z.string(), z.number())
                    .returns(z.void())
                    .optional()
            })
        }).optional()
    })
};

// ─── Enhanced Validation Types ───────────────────────────────────────────────

export const EnhancedValidationSchemas = {
    ...ValidationSchemas,
    messageContext: z.object({
        role: z.enum(['system', 'user', 'assistant', 'function']),
        content: z.string(),
        timestamp: z.number(),
        metadata: z.object({
            messageId: z.string().optional(),
            parentMessageId: z.string().optional(),
            conversationId: z.string().optional(),
            importance: z.number().min(0).max(1).optional()
        }).optional(),
        tokenCount: z.number().optional()
    }),

    rateLimitConfig: z.object({
        tokensPerMinute: z.number().positive(),
        maxConcurrentRequests: z.number().positive(),
        retryStrategy: z.object({
            maxRetries: z.number().nonnegative(),
            initialDelay: z.number().positive(),
            backoffMultiplier: z.number().positive(),
            maxDelay: z.number().positive()
        }),
        quotaResetInterval: z.number().positive()
    })
};

// ─── Final Validation Schemas ──────────────────────────────────────────────

export const ProductionValidationSchemas = {
    ...MonitoringValidationSchemas,

    securityConfig: z.object({
        inputValidation: z.object({
            enabled: z.boolean(),
            maxLength: z.number().positive().optional(),
            allowedPatterns: z.array(z.instanceof(RegExp)).optional(),
            sanitization: z.object({
                removeHtml: z.boolean(),
                removeUrls: z.boolean(),
                customRules: z.array(z.function().returns(z.string())).optional()
            }).optional()
        }),
        authentication: z.object({
            required: z.boolean(),
            type: z.enum(['apiKey', 'oauth', 'custom']).optional(),
            validator: z.function().returns(z.promise(z.boolean())).optional()
        }),
        encryption: z.object({
            atRest: z.boolean(),
            inTransit: z.boolean(),
            algorithm: z.string().optional(),
            keyRotation: z.object({
                enabled: z.boolean(),
                intervalDays: z.number().positive()
            }).optional()
        })
    }),

    rateLimitingStrategy: z.object({
        type: z.enum(['token', 'sliding', 'fixed', 'adaptive']),
        config: z.object({
            window: z.number().positive(),
            limit: z.number().positive(),
            costFunction: z.function()
                .args(z.custom<RequestConfig>())
                .returns(z.number())
                .optional()
        }),
        adaptiveConfig: z.object({
            minLimit: z.number().positive(),
            maxLimit: z.number().positive(),
            increaseThreshold: z.number().positive(),
            decreaseThreshold: z.number().positive(),
            adjustmentFactor: z.number().positive()
        }).optional()
    }),

    costManagementConfig: z.object({
        budgets: z.object({
            daily: z.number().positive().optional(),
            monthly: z.number().positive().optional(),
            perRequest: z.number().positive().optional()
        }),
        alerts: z.object({
            usageThresholds: z.object({
                warning: z.number().min(0).max(100),
                critical: z.number().min(0).max(100)
            }),
            notifications: z.object({
                email: z.array(z.string().email()).optional(),
                webhook: z.string().url().optional(),
                custom: z.function()
                    .args(z.custom<CostAlert>())
                    .returns(z.promise(z.void()))
                    .optional()
            })
        }),
        optimization: z.object({
            enabled: z.boolean(),
            strategies: z.object({
                caching: z.boolean().optional(),
                modelDowngrade: z.boolean().optional(),
                batchProcessing: z.boolean().optional(),
                contextPruning: z.boolean().optional()
            })
        })
    })
};

// Export final union type
export type LLMConfig = 
    | GroqConfig 
    | OpenAIConfig 
    | AnthropicConfig 
    | GoogleConfig 
    | MistralConfig;

// Export instance interface
export interface LLMInstance {
    generate(input: string, options?: LLMRuntimeOptions): Promise<LLMResponse>;
    generateStream(input: string, options?: LLMRuntimeOptions): AsyncIterator<StreamingChunk>;
    validateConfig(): Promise<void>;
    cleanup(): Promise<void>;
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
    promptTemplates?: Record<string, unknown>;
    llmInstance?: any;
    messageHistory?: CustomMessageHistory;
}

export interface IAgentParams {
    name: string;
    role: string;
    goal: string;
    background: string;
    tools?: Tool[];
    llmConfig?: LLMConfig;
    maxIterations?: number;
    forceFinalAnswer?: boolean;
    promptTemplates?: Record<string, unknown>;
    messageHistory?: CustomMessageHistory;
    env?: Record<string, unknown>;
    store?: TeamStore | null;
}

export interface IBaseAgent {
    id: string;
    name: string;
    role: string;
    goal: string;
    background: string;
    tools: Tool[];
    maxIterations: number;
    store: TeamStore; // Changed from TeamStore | null
    status: keyof typeof AGENT_STATUS_enum;
    env: Record<string, unknown> | null;
    llmInstance: LLMInstance | null;
    llmConfig: LLMConfig;
    llmSystemMessage: string | null;
    forceFinalAnswer: boolean;
    promptTemplates: Record<string, unknown>;

    initialize(store: TeamStore, env: Record<string, unknown>): void;
    setStore(store: TeamStore): void;
    setStatus(status: keyof typeof AGENT_STATUS_enum): void;
    setEnv(env: Record<string, unknown>): void;
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void>;
    normalizeLlmConfig(llmConfig: LLMConfig): LLMConfig;
    createLLMInstance(): void;
}

export interface IReactChampionAgent extends IBaseAgent {
    executableAgent: any;
    messageHistory: CustomMessageHistory;
    
    // Core methods
    workOnTask(task: TaskType): Promise<AgenticLoopResult>;
    createLLMInstance(): void;

    // Protected methods that need to be exposed
    handleIterationStart(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleIterationEnd(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleThinkingError(params: { task: TaskType; error: Error }): void;
    handleTaskCompleted(params: { task: TaskType; parsedResultWithFinalAnswer: ParsedOutput; iterations: number; maxAgentIterations: number }): void;
    handleMaxIterationsError(params: { task: TaskType; iterations: number; maxAgentIterations: number }): void;
    handleAgenticLoopError(params: { task: TaskType; error: Error; iterations: number; maxAgentIterations: number }): void;
    handleFinalAnswer(params: { agent: IBaseAgent; task: TaskType; parsedLLMOutput: ParsedOutput }): ParsedOutput;
    handleIssuesParsingLLMOutput(params: { agent: IBaseAgent; task: TaskType; output: Output; llmOutput: string }): string;
}

export interface SystemAgent extends IBaseAgent {
    readonly id: 'system';
    readonly name: 'System';
    readonly role: 'System Message Handler';
    readonly goal: 'Handle system-wide messages';
    readonly background: 'Internal system component';
    readonly tools: Tool[];
    readonly status: keyof typeof AGENT_STATUS_enum;
}

export type AgentType = IBaseAgent | IReactChampionAgent;

// ─── Task Types ────────────────────────────────────────────────────────────

export type TaskResult = string | Record<string, unknown> | null;

export interface TaskStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    modelUsage: Record<string, LLMUsageStats>;
}

export interface TaskMetadata {
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    duration: number;
    costDetails: CostDetails;
    result?: unknown;
    error?: string;
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

export interface TaskType {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, unknown>;
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
    setStore: (store: TeamStore) => void;
    execute: (data: unknown) => Promise<unknown>;
}

export interface ITaskParams {
    title?: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
    isDeliverable?: boolean;
    externalValidationRequired?: boolean;
}

export interface ITask {
    id: string;
    title: string;
    description: string;
    expectedOutput: string;
    agent: IBaseAgent;
    isDeliverable: boolean;
    externalValidationRequired: boolean;
    inputs: Record<string, unknown>;
    feedbackHistory: FeedbackObject[];
    status: keyof typeof TASK_STATUS_enum;
    result: TaskResult;
    interpolatedTaskDescription: string | null;
    store: TeamStore | null;

    setStore(store: TeamStore): void;
    execute(data: unknown): Promise<unknown>;
}

// ─── Store Types ───────────────────────────────────────────────────────────

// Zustand imports
import { StoreApi, UseBoundStore, StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import type { DevtoolsOptions } from 'zustand/middleware';

// Store API types
export type TeamStoreApi = StoreApi<TeamStore>;
export type BoundTeamStore = UseBoundStore<TeamStoreApi>;

// Store state and mutator types
export type TeamStoreState = TeamState & TeamStateActions;
export type TeamStoreWithDevtools = ReturnType<typeof devtools<TeamStoreState>>;
export type TeamStoreWithSubscription = ReturnType<typeof subscribeWithSelector<TeamStoreWithDevtools>>;

// Store middleware types
export type StoreWithMiddleware<T> = UseBoundStore<StoreApi<T>>;

// Core store methods type
export type TeamStoreMethods = {
    subscribe: StoreSubscribe<TeamStore>;
    getState: () => TeamState & TeamStateActions;
    setState: (partial: Partial<TeamState & TeamStateActions>) => void;
    destroy: () => void;
};

// Combined store type with methods
export type TeamStoreWithMethods = TeamStore & TeamStoreMethods;

// Store creation type
export type CreateTeamStore = (
    initialState?: Partial<TeamState>
) => StoreWithMiddleware<TeamStore>;

// Bound store type
export type UseBoundTeamStore = StoreWithMiddleware<TeamStore>;

// Store creator type
export type TeamStoreCreator = StateCreator<
    TeamStore,
    [['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
    [],
    TeamStore
>;

// Store mutators type
export type TeamStoreMutators = {
    setState: TeamStoreApi['setState'];
    getState: TeamStoreApi['getState'];
    subscribe: TeamStoreApi['subscribe'];
};

// Store subscriber types
export type TeamStoreSubscriber = BoundTeamStore['subscribe'];
export type TeamStoreSelector<T> = (state: TeamStore) => T;

// Store subscribe method type
export interface TeamStoreSubscribe {
    (listener: (state: TeamStore) => void): () => void;
    <U>(
        selector: (state: TeamStore) => U,
        listener: (selectedState: U, previousSelectedState: U) => void,
        options?: {
            equalityFn?: (a: U, b: U) => boolean;
            fireImmediately?: boolean;
        }
    ): () => void;
}

// Store subscribe interface
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

// ─── Core State Interfaces ────────────────────────────────────────────────

// Base store state interface
export interface BaseStoreState {
    name: string;
    agents: AgentType[];
    tasks: TaskType[];
    workflowLogs: Log[];
}

// Workflow Stats Types
export interface WorkflowStats {
    startTime: number;
    endTime: number;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostDetails;
    taskCount: number;
    agentCount: number;
    teamName: string;
    messageCount: number;
    modelUsage: Record<string, LLMUsageStats>;
}

// Workflow Result Types
export interface WorkflowError {
    message: string;
    type: string;
    context?: Record<string, unknown>;
    timestamp: number;
    taskId?: string;
    agentId?: string;
}

export interface WorkflowSuccess {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'FINISHED'>;
    result: unknown;
    metadata: WorkflowStats;
    completionTime: number;
}

export interface WorkflowBlocked {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'BLOCKED'>;
    blockedTasks: {
        taskId: string;
        taskTitle: string;
        reason: string;
    }[];
    metadata: WorkflowStats;
}

export interface WorkflowStopped {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'STOPPED' | 'STOPPING'>;
    reason: string;
    metadata: WorkflowStats;
    stoppedAt: number;
}

export interface WorkflowErrored {
    status: Extract<keyof typeof WORKFLOW_STATUS_enum, 'ERRORED'>;
    error: WorkflowError;
    metadata: WorkflowStats;
    erroredAt: number;
}

export type WorkflowResult = 
    | WorkflowSuccess 
    | WorkflowBlocked 
    | WorkflowStopped 
    | WorkflowErrored 
    | null;

// Environment and Input Types
export interface TeamEnvironment {
    [key: string]: string | number | boolean | null | undefined;
}

export interface TeamInputs {
    [key: string]: string | number | boolean | null | undefined;
}

// Task store state interface
export interface TaskStoreState extends BaseStoreState {
    tasksInitialized: boolean;
    getTaskStats(task: TaskType): TaskStats;
    handleTaskCompleted(params: { agent: AgentType; task: TaskType; result: unknown }): void;
    provideFeedback(taskId: string, feedbackContent: string): Promise<void>;
    handleTaskError(params: { task: TaskType; error: ErrorType }): void;
    handleTaskBlocked(params: { task: TaskType; error: ErrorType }): void;
    prepareNewLog(params: PrepareNewLogParams): Log;
    handleWorkflowBlocked(params: { task: TaskType; error: ErrorType }): void;
    finishWorkflowAction(): void;
    getWorkflowStats(): WorkflowStats;
}

// Agent store state interface
export interface AgentStoreState extends BaseStoreState {
    tasksInitialized: boolean;

    getTaskStats: (task: TaskType) => TaskStats;
    provideFeedback: (taskId: string, feedbackContent: string) => Promise<void>;
    handleTaskError: (params: { task: TaskType; error: ErrorType }) => void;
    handleTaskBlocked: (params: { task: TaskType; error: ErrorType }) => void;
    handleTaskCompleted: (params: { agent: AgentType; task: TaskType; result: unknown }) => void;

    getWorkflowStats: () => WorkflowStats;
    finishWorkflowAction: () => void;
    handleWorkflowBlocked: (params: { task: TaskType; error: ErrorType }) => void;

    handleAgentIterationStart: (params: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }) => void;
    handleAgentIterationEnd: (params: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }) => void;
    handleAgentThinkingStart: (params: { agent: AgentType; task: TaskType; messages: BaseMessage[] }) => void;
    handleAgentThinkingEnd: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentThinkingError: (params: { agent: AgentType; task: TaskType; error: ErrorType }) => void;
    handleAgentIssuesParsingLLMOutput: (params: { agent: AgentType; task: TaskType; output: Output; error: ErrorType }) => void;

    handleAgentActionStart: (params: { agent: AgentType; task: TaskType; action: unknown; runId: string }) => void;
    handleAgentToolStart: (params: { agent: AgentType; task: TaskType; tool: Tool; input: unknown }) => void;
    handleAgentToolEnd: (params: { agent: AgentType; task: TaskType; output: unknown; tool: Tool }) => void;
    handleAgentToolError: (params: { agent: AgentType; task: TaskType; tool: Tool; error: ErrorType }) => void;
    handleAgentToolDoesNotExist: (params: { agent: AgentType; task: TaskType; toolName: string }) => void;

    handleAgentFinalAnswer: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentThought: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentSelfQuestion: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentObservation: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleWeirdOutput: (params: { agent: AgentType; task: TaskType; output: Output }) => void;

    handleAgentLoopError: (params: { agent: AgentType; task: TaskType; error: ErrorType; iterations: number; maxAgentIterations: number }) => void;
    handleAgentMaxIterationsError: (params: { agent: AgentType; task: TaskType; error: ErrorType; iterations?: number; maxAgentIterations?: number }) => void;
    handleAgentTaskCompleted: (params: { agent: AgentType; task: TaskType; result: unknown }) => void;

    prepareNewLog: (params: PrepareNewLogParams) => Log;
}

// Team State Interface
export interface TeamState extends BaseStoreState {
    teamWorkflowStatus: keyof typeof WORKFLOW_STATUS_enum;
    workflowResult: WorkflowResult;
    inputs: TeamInputs;
    workflowContext: string;
    env: TeamEnvironment;
    prepareNewLog: (params: PrepareNewLogParams) => Log | undefined;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    tasksInitialized: boolean;

    // Core methods
    getTaskStats: (task: TaskType) => TaskStats;
    resetWorkflowStateAction: () => void;
    setInputs: (inputs: TeamInputs) => void;
    updateTaskStatus: (taskId: string, status: keyof typeof TASK_STATUS_enum) => void;
    deriveContextFromLogs: (logs: Log[], currentTaskId: string) => string;

    // Task handling
    handleTaskCompleted: (params: { agent: AgentType; task: TaskType; result: unknown }) => void;
    handleTaskError: (params: { task: TaskType; error: ErrorType }) => void;
    handleTaskBlocked: (params: { task: TaskType; error: ErrorType }) => void;

    // Workflow handling
    handleWorkflowBlocked: (params: { task: TaskType; error: ErrorType }) => void;
    finishWorkflowAction: () => void;

    // Agent handling methods
    handleAgentIterationStart: (params: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }) => void;
    handleAgentIterationEnd: (params: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }) => void;
    handleAgentThinkingStart: (params: { agent: AgentType; task: TaskType; messages: BaseMessage[] }) => void;
    handleAgentThinkingEnd: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentThinkingError: (params: { agent: AgentType; task: TaskType; error: ErrorType }) => void;
    handleAgentIssuesParsingLLMOutput: (params: { agent: AgentType; task: TaskType; output: Output; error: ErrorType }) => void;
    handleAgentActionStart: (params: { agent: AgentType; task: TaskType; action: unknown; runId: string }) => void;
    handleAgentToolStart: (params: { agent: AgentType; task: TaskType; tool: Tool; input: unknown }) => void;
    handleAgentToolEnd: (params: { agent: AgentType; task: TaskType; output: unknown; tool: Tool }) => void;
    handleAgentToolError: (params: { agent: AgentType; task: TaskType; tool: Tool; error: ErrorType }) => void;
    handleAgentToolDoesNotExist: (params: { agent: AgentType; task: TaskType; toolName: string }) => void;
    handleAgentFinalAnswer: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentThought: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentSelfQuestion: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentObservation: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleWeirdOutput: (params: { agent: AgentType; task: TaskType; output: Output }) => void;
    handleAgentLoopError: (params: { agent: AgentType; task: TaskType; error: ErrorType; iterations: number; maxAgentIterations: number }) => void;
    handleAgentMaxIterationsError: (params: { agent: AgentType; task: TaskType; error: ErrorType; iterations?: number; maxAgentIterations?: number }) => void;
    handleAgentTaskCompleted: (params: { agent: AgentType; task: TaskType; result: unknown }) => void;

    // Utility methods
    provideFeedback: (taskId: string, feedbackContent: string) => Promise<void>;
    validateTask: (taskId: string) => Promise<void>;
    getWorkflowStats: () => WorkflowStats;
}

// ─── Team State Actions Interface ────────────────────────────────────────

export interface TeamStateActions {
    setInputs(inputs: TeamInputs): void;
    setName(name: string): void;
    setEnv(env: TeamEnvironment): void;
    setTeamWorkflowStatus(status: keyof typeof WORKFLOW_STATUS_enum): void;

    addAgents(agents: AgentType[]): void;
    addTasks(tasks: TaskType[]): void;
    updateTaskStatus(taskId: string, status: keyof typeof TASK_STATUS_enum): void;

    startWorkflow(inputs?: TeamInputs): Promise<void>;
    resetWorkflowStateAction(): void;
    workOnTask(agent: AgentType, task: TaskType): Promise<void>;
    validateTask(taskId: string): Promise<void>;
    clearAll(): void;

    // Update this method signature to match TeamStore
    handleWorkflowError(params: { task: TaskType; error: ErrorType }): void;
    handleWorkflowBlocked(params: { task: TaskType; error: ErrorType }): void;

    getCleanedState(): unknown;
    getWorkflowStats(): WorkflowStats;
    finishWorkflowAction(): void;
    deriveContextFromLogs(logs: Log[], currentTaskId: string): string;
    provideFeedback(taskId: string, feedbackContent: string): Promise<void>;
}

// ─── Complete Team Store Interface ────────────────────────────────────────

export interface TeamStore extends TeamState, TeamStateActions {
    // Core store methods
    getState: () => TeamStore;
    setState: (partial: Partial<TeamStore>) => void;
    subscribe: StoreSubscribe<TeamStore>;
    destroy: () => void;

    // Add the handleSystemMessage method
    handleSystemMessage: (message: string) => void;

    // Message history methods
    addSystemMessage: (message: string) => Promise<void>;
    addUserMessage: (message: string) => Promise<void>;
    addAIMessage: (message: string) => Promise<void>;
    getMessageHistory: () => Promise<BaseMessage[]>;
    clearMessageHistory: () => Promise<void>;

    // Task handling methods
    handleTaskCompletion: (params: { 
        agent: AgentType; 
        task: TaskType; 
        result: TaskResult;
        metadata?: {
            duration?: number;
            iterationCount?: number;
            llmUsageStats?: LLMUsageStats;
            costDetails?: CostDetails;
        };
    }) => void;

    handleTaskIncomplete: (params: { 
        agent: AgentType; 
        task: TaskType; 
        error: Error;
        metadata?: {
            iterationCount?: number;
            lastAttemptTime?: number;
            retryCount?: number;
        };
    }) => void;

    handleTaskError: (params: { 
        task: TaskType; 
        error: ErrorType;
        context?: {
            phase?: string;
            attemptNumber?: number;
            lastSuccessfulOperation?: string;
            recoveryPossible?: boolean;
        };
        metadata?: Record<string, unknown>;
    }) => void;

    handleTaskBlocked: (params: { 
        task: TaskType; 
        error: ErrorType;
        blockingReason?: string;
        dependencies?: {
            taskId: string;
            status: keyof typeof TASK_STATUS_enum;
            requiredFor: string;
        }[];
        metadata?: {
            timeBlocked?: number;
            previousStatus?: keyof typeof TASK_STATUS_enum;
            recoveryStrategy?: string;
        };
    }) => void;

    handleTaskStatusChange: (
        taskId: string, 
        status: keyof typeof TASK_STATUS_enum,
        metadata?: {
            changedBy?: string;
            reason?: string;
            timestamp?: number;
            previousStatus?: keyof typeof TASK_STATUS_enum;
            statusDuration?: number;
        }
    ) => void;

    // Tool handling methods
    handleToolExecution: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        input: string;
        result?: string;
    }) => void;

    handleToolError: (params: {
        agent: AgentType;
        task: TaskType;
        tool: Tool;
        error: Error;
        toolName: string;
    }) => void;

    handleToolDoesNotExist: (params: {
        agent: AgentType;
        task: TaskType;
        toolName: string;
    }) => void;

    // Agent handling methods
    handleAgentStatusChange: (agent: AgentType, status: keyof typeof AGENT_STATUS_enum) => void;
    handleAgentError: (params: {
        agent: AgentType;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
    }) => void;
    handleAgentThinking: (params: {
        agent: AgentType;
        task: TaskType;
        messages: BaseMessage[];
        output?: Output;
    }) => void;
    handleAgentAction: (params: {
        agent: AgentType;
        task: TaskType;
        action: unknown;
        runId: string;
    }) => void;


    // Workflow handling methods
    handleWorkflowError: (params: { task: TaskType; error: ErrorType }) => void;
    handleWorkflowBlocked: (params: { task: TaskType; error: ErrorType }) => void;
    handleWorkflowStatusChange: (status: keyof typeof WORKFLOW_STATUS_enum) => void;
    finishWorkflowAction: () => void;

    // Logging and feedback methods
    prepareNewLog: (params: PrepareNewLogParams) => Log;  // Removed undefined from return type
    addWorkflowLog: (log: Log) => void;
    provideFeedback: (taskId: string, feedbackContent: string) => Promise<void>;
    processFeedback: (taskId: string, feedbackId: string) => Promise<void>;

    // State management methods
    resetWorkflowState: () => void;
    clearWorkflowLogs: () => void;
    updateInputs: (inputs: TeamInputs) => void;
    updateEnvironment: (env: TeamEnvironment) => void;

    // Utility methods
    getTaskStats: (task: TaskType) => TaskStats;
    getWorkflowStats: () => WorkflowStats;
    deriveContextFromLogs: (logs: Log[], currentTaskId: string) => string;
    validateTask: (taskId: string) => Promise<void>;

    // Lifecycle methods
    initialize: (config: {
        name: string;
        agents?: AgentType[];
        tasks?: TaskType[];
        inputs?: TeamInputs;
        env?: TeamEnvironment;
    }) => void;
    cleanup: () => Promise<void>;

    // Output handling methods
    handleAgentOutput: (params: {
        agent: AgentType;
        task: TaskType;
        output: Output;
        type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
    }) => void;
    handleStreamingOutput: (params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
    }) => void;

    // Iteration handling methods
    handleIterationStart: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;
    handleIterationEnd: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }) => void;
    handleMaxIterationsExceeded: (params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
        error: ErrorType;
    }) => void;
}


// ─── Workflow Start Result Type ─────────────────────────────────────────

export interface WorkflowStartResult {
    status: keyof typeof WORKFLOW_STATUS_enum;
    result: WorkflowResult;
    stats: WorkflowStats;
}

// ─── Team Parameters Interface ────────────────────────────────────────────

export interface ITeamParams {
    name: string;
    agents?: IBaseAgent[];
    tasks?: TaskType[];
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    inputs?: TeamInputs;
    env?: TeamEnvironment;
}

// ─── Team Interface ───────────────────────────────────────────────────────

export type TeamStateKey = keyof TeamState;

export interface ITeam {
    store: TeamStore;

    start(inputs?: TeamInputs): Promise<WorkflowStartResult>;

    getStore(): TeamStore;
    useStore(): UseBoundTeamStore;
    subscribeToChanges(
        listener: (newValues: Partial<TeamState>) => void,
        properties?: TeamStateKey[]
    ): () => void;

    provideFeedback(taskId: string, feedbackContent: string): void;
    validateTask(taskId: string): void;
    getTasksByStatus(status: keyof typeof TASK_STATUS_enum): TaskType[];
    getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum;
    getWorkflowResult(): WorkflowResult;
    getWorkflowStats(): WorkflowStats;
}
// ─── Display Props Types ───────────────────────────────────────────────────

export interface TaskCompletionProps {
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    duration: number;
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
    taskStatus: keyof typeof TASK_STATUS_enum;
    agentName: string;
}

export interface WorkflowStatusProps {
    status: keyof typeof WORKFLOW_STATUS_enum;
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

// ─── Cost Calculation Types ─────────────────────────────────────────────────

export interface CostDetails {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    breakdown: {
        promptTokens: {
            count: number;
            cost: number;
        };
        completionTokens: {
            count: number;
            cost: number;
        };
        functionCalls?: {
            count: number;
            cost: number;
        };
    };
}

export interface BudgetConfig {
    maxCostPerRequest?: number;
    maxCostPerDay?: number;
    alertThreshold?: number;
    onThresholdReached?: (details: CostDetails) => void;
}

export interface ModelPricing {
    modelCode: string;
    provider: string;
    inputPricePerMillionTokens: number;
    outputPricePerMillionTokens: number;
    features: string;
}