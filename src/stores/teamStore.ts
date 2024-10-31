/**
 * Path: src/stores/teamStore.ts
 * 
 * Team Store Implementation
 * ------------------------
 * Core state management solution for the KaibanJS library.
 */

// Core imports
import { create, StoreApi, StateCreator, UseBoundStore } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { 
    BaseMessage, 
    SystemMessage, 
    HumanMessage, 
    AIMessage, 
    FunctionMessage,
    MessageContent 
} from "@langchain/core/messages";

// Store imports
import { useAgentStore } from './agentStore';
import { useTaskStore } from './taskStore';
import { setupWorkflowController } from './workflowController';

// Utility imports
import CustomMessageHistory from '@/utils/CustomMessageHistory';
import { getTaskTitleForLogs, interpolateTaskDescription, validateTask } from '@/utils/tasks';
import { logger, setLogLevel } from '@/utils/core/logger';
import { calculateTotalWorkflowCost } from '@/utils/helpers/llmCostCalculator';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { PrettyError } from "@/utils/core/errors";
import { logPrettyTaskCompletion, logPrettyTaskStatus, logPrettyWorkflowStatus } from "@/utils/helpers/prettyLogs";
import { getParsedJSON } from "@/utils/parsers/parser";

// Subscriber imports
import { subscribeWorkflowStatusUpdates } from '@/subscribers/teamSubscriber';
import { subscribeTaskStatusUpdates } from '@/subscribers/taskSubscriber';

// Enum imports
import { 
    TASK_STATUS_enum, 
    AGENT_STATUS_enum, 
    WORKFLOW_STATUS_enum 
} from '@/utils/core/enums';

// Import all types from types.ts
import type {
    TeamState, TeamStore, CreateTeamStore, UseBoundTeamStore,
    TeamStoreCreator, AgentType, TaskType, FeedbackObject,
    TaskResult, Log, ErrorType, LLMUsageStats, AgentLogMetadata,
    WorkflowStats, TeamInputs, TeamEnvironment, PrepareNewLogParams,
    AgentStoreState, TaskStoreState, Tool, CostDetails, Output,
    ParsedJSON, TaskMetadata, WorkflowMetadata, LogMetadata, TaskStats,
    TaskLogMetadata, WorkflowLogMetadata, IBaseAgent, TeamStoreApi,
    LogType, StatusLogType, MessageLogType, MessageMetadataFields,
    AdditionalKwargs, FunctionCall
} from '@/utils/types';

/**
 * Core Utilities
 * -------------
 */
// Add these utility functions at the start of teamStore.ts
const MessageUtils = {
    stringifyFunctionArgs(args: Record<string, unknown>): string {
        return JSON.stringify(args);
    },

    parseFunctionArgs(argsString: string): Record<string, unknown> {
        try {
            return JSON.parse(argsString);
        } catch {
            return {};
        }
    },

    convertToLangChainKwargs(metadata: MessageMetadataFields): Record<string, unknown> {
        const kwargs: Record<string, unknown> = { ...metadata };
        if (metadata.function_call) {
            kwargs.function_call = {
                name: metadata.function_call.name,
                arguments: typeof metadata.function_call.arguments === 'string'
                    ? metadata.function_call.arguments
                    : this.stringifyFunctionArgs(metadata.function_call.arguments as Record<string, unknown>)
            };
        }
        return kwargs;
    },

    convertToString(content: MessageContent | null): string {
        if (content === null) return "";
        if (typeof content === 'string') return content;
        if (Array.isArray(content)) {
            return content.map(item => 
                typeof item === 'string' ? item : JSON.stringify(item)
            ).join(' ');
        }
        return JSON.stringify(content);
    }
};

// Factory for creating default objects
const DefaultFactory = {
    createLLMUsageStats(): LLMUsageStats {
        return {
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
        };
    },

    createCostDetails(): CostDetails {
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        };
    },

    createInitialState(): Partial<TeamState> {
        return {
            teamWorkflowStatus: 'INITIAL',
            workflowResult: null,
            name: '',
            agents: [],
            tasks: [],
            workflowLogs: [],
            inputs: {},
            workflowContext: '',
            env: {},
            logLevel: 'info',
            tasksInitialized: false
        };
    }
};

// Helper Function for converting TaskStats to WorkflowStats
const convertTaskStatsToWorkflowStats = (stats: TaskStats, state: TeamState): WorkflowStats => {
    return {
        startTime: stats.startTime,
        endTime: stats.endTime,
        duration: stats.duration,
        llmUsageStats: stats.llmUsageStats,
        iterationCount: stats.iterationCount,
        costDetails: calculateTotalWorkflowCost(stats.modelUsage),
        taskCount: state.tasks.length,
        agentCount: state.agents.length,
        teamName: state.name,
        messageCount: state.workflowLogs.length,
        modelUsage: stats.modelUsage
    };
};

// Metadata Factory for creating different types of metadata
const MetadataFactory = {
    forTask(
        stats: { llmUsageStats: LLMUsageStats; iterationCount: number; duration: number },
        result: TaskResult,
        costDetails: CostDetails
    ): TaskLogMetadata {
        return {
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            duration: stats.duration,
            costDetails,
            result
        };
    },

    forWorkflow(
        state: TeamState,
        stats: WorkflowStats,
        additionalData?: Record<string, unknown>
    ): WorkflowLogMetadata {
        return {
            result: state.workflowResult?.status || '',
            duration: stats.duration,
            llmUsageStats: stats.llmUsageStats,
            iterationCount: stats.iterationCount,
            costDetails: stats.costDetails,
            teamName: state.name,
            taskCount: state.tasks.length,
            agentCount: state.agents.length,
            ...additionalData
        };
    }
};

// Type guards and validators
const TypeGuards = {
    isFunction(value: unknown): value is Function {
        return typeof value === 'function';
    },

    isTeamStore(store: unknown): store is TeamStore {
        return (
            typeof store === 'object' &&
            store !== null &&
            'getState' in store &&
            'setState' in store &&
            'subscribe' in store &&
            'destroy' in store
        );
    },

    isTaskMetadata(metadata: unknown): metadata is TaskLogMetadata {
        if (!metadata || typeof metadata !== 'object') return false;
        const m = metadata as any;
        return (
            'llmUsageStats' in m &&
            'iterationCount' in m &&
            'duration' in m &&
            'costDetails' in m &&
            typeof m.iterationCount === 'number' &&
            typeof m.duration === 'number'
        );
    },

    isWorkflowMetadata(metadata: unknown): metadata is WorkflowLogMetadata {
        if (!metadata || typeof metadata !== 'object') return false;
        const m = metadata as any;
        return (
            'duration' in m &&
            'llmUsageStats' in m &&
            'iterationCount' in m &&
            'costDetails' in m &&
            'teamName' in m &&
            'taskCount' in m &&
            'agentCount' in m
        );
    }
};

// Store utilities
const StoreUtils = {
    createSafeStateUpdate<T extends Partial<TeamState>>(
        updates: T
    ): Partial<TeamStore> {
        return updates as unknown as Partial<TeamStore>;
    },

    createStoreProxy(
        store: UseBoundStore<StoreApi<TeamStore>>
    ): UseBoundStore<TeamStoreApi> {
        return store as UseBoundStore<TeamStoreApi>;
    },

    setupSubscribers(
        store: UseBoundStore<TeamStoreApi>
    ): (() => void) {
        const taskUnsubscribe = subscribeTaskStatusUpdates(store);
        const workflowUnsubscribe = subscribeWorkflowStatusUpdates(store);
        
        return () => {
            if (TypeGuards.isFunction(taskUnsubscribe)) taskUnsubscribe();
            if (TypeGuards.isFunction(workflowUnsubscribe)) workflowUnsubscribe();
        };
    }
};

/**
 * Log Management and Error Handling
 * -------------------------------
 */

// Log Creator Service
const LogCreator = {
    createAgentLog(params: {
        agent: AgentType;
        task: TaskType;
        description: string;
        metadata: AgentLogMetadata;
        agentStatus: keyof typeof AGENT_STATUS_enum;
        logType?: LogType;
    }): Log {
        const { 
            agent, 
            task, 
            description, 
            metadata, 
            agentStatus, 
            logType = 'AgentStatusUpdate' 
        } = params;
        
        return {
            timestamp: Date.now(),
            task,
            agent,
            agentName: agent.name,
            taskTitle: task.title,
            logDescription: description,
            taskStatus: task.status,
            agentStatus,
            workflowStatus: 'RUNNING',
            metadata,
            logType: logType as LogType
        };
    },

    createTaskLog(params: {
        task: TaskType;
        description: string;
        status: keyof typeof TASK_STATUS_enum;
        metadata: TaskLogMetadata;
    }): Log {
        const { task, description, status, metadata } = params;
        
        return {
            timestamp: Date.now(),
            task,
            agent: task.agent,
            agentName: task.agent?.name || '',
            taskTitle: task.title,
            logDescription: description,
            taskStatus: status,
            agentStatus: task.agent?.status || 'IDLE',
            workflowStatus: 'RUNNING',
            metadata,
            logType: 'TaskStatusUpdate' as LogType
        };
    },

    createWorkflowLog(
        description: string,
        status: keyof typeof WORKFLOW_STATUS_enum,
        metadata: WorkflowLogMetadata
    ): Log {
        return {
            timestamp: Date.now(),
            task: null,
            agent: null,
            agentName: '',
            taskTitle: '',
            logDescription: description,
            taskStatus: 'TODO',
            agentStatus: 'INITIAL',
            workflowStatus: status,
            metadata,
            logType: 'WorkflowStatusUpdate' as LogType
        };
    }
};

// Error Handler Service
const ErrorHandler = {
    workflow(params: { 
        task: TaskType; 
        error: ErrorType; 
        get: () => TeamState;
        set: (fn: (state: TeamState) => Partial<TeamState>) => void;
    }): void {
        const { task, error, get, set } = params;
        logger.error(`Workflow Error:`, error.message);
        
        const stats = calculateTaskStats(task, get().workflowLogs);
        const workflowStats = convertTaskStatsToWorkflowStats(stats, get());
        const workflowMetadata = MetadataFactory.forWorkflow(get(), workflowStats, {
            error,
            errorTimestamp: Date.now()
        });

        const errorLog = LogCreator.createWorkflowLog(
            `Workflow error encountered: ${error.message}`,
            'ERRORED',
            workflowMetadata
        );

        set(state => ({
            ...state,
            teamWorkflowStatus: 'ERRORED',
            workflowResult: {
                status: 'ERRORED',
                error: {
                    message: error.message,
                    type: error.name || 'WorkflowError',
                    context: error.context,
                    timestamp: Date.now(),
                    taskId: task.id
                },
                metadata: workflowStats,
                erroredAt: Date.now()
            },
            workflowLogs: [...state.workflowLogs, errorLog]
        }));
    },

    agent(params: {
        agent: AgentType;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
        get: () => TeamState;
        set: (fn: (state: TeamState) => Partial<TeamState>) => void;
    }): void {
        const { agent, task, error, context, get, set } = params;
        logger.error(`Agent ${agent.name} error:`, error);

        const errorLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Agent error: ${error.message}`,
            metadata: {
                error: {
                    message: error.message,
                    name: error.name,
                    stack: error.stack,
                    context: error.context || context,
                    originalError: error.originalError,
                    recommendedAction: error.recommendedAction
                },
                timestamp: Date.now()
            },
            agentStatus: 'THINKING_ERROR'
        });

        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, errorLog]
        }));
    },

    task(params: {
        agent: AgentType;
        task: TaskType;
        error: Error;
        metadata?: {
            iterationCount?: number;
            lastAttemptTime?: number;
            retryCount?: number;
        };
        get: () => TeamState;
        set: (fn: (state: TeamState) => Partial<TeamState>) => void;
    }): void {
        const { agent, task, error, metadata, get, set } = params;
        logger.warn(`Task ${task.title} incomplete: ${error.message}`);

        const taskLog = LogCreator.createTaskLog({
            task,
            description: `Task incomplete: ${error.message}`,
            status: 'TODO',
            metadata: {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    timestamp: Date.now()
                },
                iterationCount: metadata?.iterationCount,
                lastAttemptTime: metadata?.lastAttemptTime,
                retryCount: metadata?.retryCount,
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                costDetails: DefaultFactory.createCostDetails(),
                result: null
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map(t => 
                t.id === task.id ? { 
                    ...t, 
                    status: 'TODO',
                    lastError: error.message,
                    iterationCount: metadata?.iterationCount || 0,
                    lastAttemptTime: metadata?.lastAttemptTime || Date.now(),
                    retryCount: metadata?.retryCount || 0
                } : t
            ),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
    }
};

/**
 * Status Management
 * ----------------------------------
 */

// Status Manager Service
const StatusManager = {
    updateTask(params: {
        taskId: string;
        status: keyof typeof TASK_STATUS_enum;
        get: () => TeamState;
        set: (fn: (state: TeamState) => Partial<TeamState>) => void;
        metadata?: Record<string, unknown>;
    }): void {
        const { taskId, status, get, set, metadata } = params;
        const task = get().tasks.find(t => t.id === taskId);
        
        if (!task) {
            logger.error(`Task not found: ${taskId}`);
            return;
        }

        const taskNumber = get().tasks.findIndex(t => t.id === taskId) + 1;
        
        logPrettyTaskStatus({
            currentTaskNumber: taskNumber,
            totalTasks: get().tasks.length,
            taskTitle: task.title,
            taskStatus: status,
            agentName: task.agent?.name
        });

        const taskLog = LogCreator.createTaskLog({
            task,
            description: `Task status changed to ${status}: ${getTaskTitleForLogs(task)}`,
            status,
            metadata: {
                ...DefaultFactory.createLLMUsageStats(),
                ...metadata,
                previousStatus: task.status,
                timestamp: Date.now()
            }
        });

        set(state => ({
            ...state,
            tasks: state.tasks.map(t =>
                t.id === taskId ? { ...t, status } : t
            ),
            workflowLogs: [...state.workflowLogs, taskLog]
        }));
    },

    updateAgent(params: {
        agent: AgentType;
        status: keyof typeof AGENT_STATUS_enum;
        task: TaskType;
        get: () => TeamState;
        set: (fn: (state: TeamState) => Partial<TeamState>) => void;
        metadata?: Record<string, unknown>;
    }): void {
        const { agent, status, task, get, set, metadata } = params;
        
        const agentLog = LogCreator.createAgentLog({
            agent,
            task,
            description: `Agent ${agent.name} status changed to ${status}`,
            metadata: {
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    ...metadata,
                    previousStatus: agent.status,
                    timestamp: Date.now()
                }
            },
            agentStatus: status
        });

        agent.setStatus(status);
        
        set(state => ({
            ...state,
            workflowLogs: [...state.workflowLogs, agentLog]
        }));
    }
};

/**
 * Message History Manager
 * Custom implementation for handling message history with proper typing
 */
class MessageHistoryManager {
    private messageHistory: CustomMessageHistory;

    constructor() {
        this.messageHistory = new CustomMessageHistory();
    }

    private prepareAdditionalKwargs(metadata?: MessageMetadataFields): Record<string, unknown> {
        const kwargs: Record<string, unknown> = {
            timestamp: Date.now(),
            ...metadata
        };

        // If there's a function call, ensure arguments are stringified
        if (kwargs.function_call) {
            const functionCall = kwargs.function_call as FunctionCall;
            kwargs.function_call = {
                name: functionCall.name,
                arguments: typeof functionCall.arguments === 'string' 
                    ? functionCall.arguments 
                    : JSON.stringify(functionCall.arguments)
            };
        }

        return kwargs;
    }

    async addSystemMessage(
        content: string, 
        metadata?: MessageMetadataFields
    ): Promise<void> {
        const message = new SystemMessage({
            content,
            additional_kwargs: this.prepareAdditionalKwargs(metadata)
        });
        await this.messageHistory.addMessage(message);
    }

    async addUserMessage(
        content: string, 
        metadata?: MessageMetadataFields
    ): Promise<void> {
        const message = new HumanMessage({
            content,
            additional_kwargs: this.prepareAdditionalKwargs(metadata)
        });
        await this.messageHistory.addMessage(message);
    }

    async addAIMessage(
        content: MessageContent, 
        metadata?: MessageMetadataFields
    ): Promise<void> {
        const message = new AIMessage({
            content,
            additional_kwargs: this.prepareAdditionalKwargs(metadata)
        });
        await this.messageHistory.addMessage(message);
    }

    async addFunctionMessage(
        name: string, 
        content: string, 
        metadata?: MessageMetadataFields
    ): Promise<void> {
        const message = new FunctionMessage({
            content,
            name,
            additional_kwargs: this.prepareAdditionalKwargs(metadata)
        });
        await this.messageHistory.addMessage(message);
    }

    async addMessage(message: BaseMessage, metadata?: MessageMetadataFields): Promise<void> {
        const newMessage = new (message.constructor as any)({
            content: message.content,
            ...(message instanceof FunctionMessage && { name: message.name }),
            additional_kwargs: this.prepareAdditionalKwargs({
                ...message.additional_kwargs,
                ...metadata
            })
        });
        await this.messageHistory.addMessage(newMessage);
    }

    async getMessages(): Promise<BaseMessage[]> {
        return await this.messageHistory.getMessages();
    }

    parseFunctionArguments(message: BaseMessage): Record<string, unknown> | null {
        if (message.additional_kwargs?.function_call?.arguments) {
            try {
                return JSON.parse(message.additional_kwargs.function_call.arguments);
            } catch (e) {
                logger.warn('Failed to parse function arguments:', e);
                return null;
            }
        }
        return null;
    }

    async clear(): Promise<void> {
        await this.messageHistory.clear();
    }

    get length(): number {
        return this.messageHistory.length;
    }
}

// Message handler factory
const createMessageHandler = (messageHistory: MessageHistoryManager) => ({
    async handleSystemMessage(
        content: string,
        metadata?: MessageMetadataFields
    ): Promise<void> {
        await messageHistory.addSystemMessage(content, metadata);
        logger.debug('System message added:', content);
    },

    async handleUserMessage(
        content: string,
        metadata?: MessageMetadataFields
    ): Promise<void> {
        await messageHistory.addUserMessage(content, metadata);
        logger.debug('User message added:', content);
    },

    async handleAIMessage(
        content: string,
        metadata?: MessageMetadataFields
    ): Promise<void> {
        await messageHistory.addAIMessage(content, metadata);
        logger.debug('AI message added:', content);
    },

    async handleFunctionMessage(
        name: string,
        content: string,
        functionCall?: FunctionCall,
        metadata?: MessageMetadataFields
    ): Promise<void> {
        const combinedMetadata: MessageMetadataFields = {
            ...metadata,
            function_call: functionCall ? {
                name: functionCall.name,
                arguments: typeof functionCall.arguments === 'string'
                    ? functionCall.arguments
                    : JSON.stringify(functionCall.arguments)
            } : undefined
        };

        await messageHistory.addFunctionMessage(name, content, combinedMetadata);
        logger.debug('Function message added:', { name, content, functionCall });
    }
});

export { MessageHistoryManager, createMessageHandler };

// Add these utility functions
const FunctionCallUtils = {
    stringify(functionCall: FunctionCall): FunctionCall {
        return {
            name: functionCall.name,
            arguments: typeof functionCall.arguments === 'string'
                ? functionCall.arguments
                : JSON.stringify(functionCall.arguments)
        };
    },

    parse(functionCall: FunctionCall): { name: string; arguments: Record<string, unknown> } {
        return {
            name: functionCall.name,
            arguments: typeof functionCall.arguments === 'string'
                ? JSON.parse(functionCall.arguments)
                : functionCall.arguments
        };
    },

    createFunctionCall(
        name: string, 
        args: Record<string, unknown> | string
    ): FunctionCall {
        return {
            name,
            arguments: typeof args === 'string' ? args : JSON.stringify(args)
        };
    }
};

/**
 * Core Store Implementation
 * -----------------------
 */

// Store Creator Implementation
export const createTeamStore: CreateTeamStore = (initialState: Partial<TeamState> = {}) => {
    // Set initial log level
    if (initialState.logLevel) {
        setLogLevel(initialState.logLevel);
        logger.debug('Log level set to:', initialState.logLevel);
    }

    // Create message history manager
    const messageHistoryManager = new MessageHistoryManager();
    const messageHandler = createMessageHandler(messageHistoryManager);

    const store: TeamStore = {
        // Include sub-store implementations
        ...useAgentStore(agentStoreSet, () => get() as unknown as AgentStoreState),
        ...useTaskStore(taskStoreSet, () => get() as unknown as TaskStoreState),
    
        // Core state from merged initial state
        ...mergedInitialState,
    
        // Store API methods
        subscribe: api.subscribe,
        getState: api.getState as () => TeamStore,
        setState: api.setState,
        destroy: () => {
            messageHistoryManager.clear();
            api.destroy();
        },
    
        // Add the missing clearAll method
        clearAll: (): void => {
            typeSafeSet(state => ({
                ...DefaultFactory.createInitialState(),
                name: state.name
            }));
            messageHistoryManager.clear();
        },
    
        // Add the missing workOnTask method
        workOnTask: async (agent: AgentType, task: TaskType): Promise<void> => {
            logger.debug(`Agent ${agent.name} working on task ${task.title}`);
            
            try {
                const result = await agent.workOnTask(task);
                if (result.error) {
                    throw new PrettyError({
                        message: result.error,
                        context: { 
                            taskId: task.id, 
                            agentId: agent.id,
                            iterations: result.metadata.iterations,
                            maxIterations: result.metadata.maxAgentIterations
                        }
                    });
                }
            } catch (error) {
                store.handleAgentError({
                    agent,
                    task,
                    error: error as ErrorType,
                    context: {
                        phase: 'task_execution',
                        taskId: task.id,
                        agentId: agent.id
                    }
                });
                throw error;
            }
        },
    
        // Message history methods with updated handleSystemMessage
        handleSystemMessage: (message: string): void => {
            logger.info(`System message: ${message}`);
            messageHandler.handleSystemMessage(message);
        },
    
        addSystemMessage: async (message: string) => {
            await messageHandler.handleSystemMessage(message);
        },
    
        addUserMessage: async (message: string) => {
            await messageHandler.handleUserMessage(message);
        },
    
        addAIMessage: async (message: string) => {
            await messageHandler.handleAIMessage(message);
        },
    
        getMessageHistory: async () => {
            return await messageHistoryManager.getMessages();
        },
    
        clearMessageHistory: async () => {
            await messageHistoryManager.clear();
        },
    
        // Task Management Methods
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
        ) => {
            StatusManager.updateTask({
                taskId,
                status,
                get,
                set: typeSafeSet,
                metadata
            });
        },
    
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
        }) => {
            const { agent, task, result, metadata } = params;
            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Task completed: ${task.title}`,
                status: 'DONE', // Changed from 'COMPLETED' to 'DONE'
                metadata: {
                    llmUsageStats: metadata?.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                    costDetails: metadata?.costDetails || DefaultFactory.createCostDetails(),
                    iterationCount: metadata?.iterationCount || 0,
                    duration: metadata?.duration || 0,
                    result
                }
            });
    
            typeSafeSet(state => ({
                ...state,
                tasks: state.tasks.map(t => 
                    t.id === task.id ? { ...t, status: 'DONE', result } : t // Changed from 'COMPLETED' to 'DONE'
                ),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));
    
            logPrettyTaskCompletion({
                llmUsageStats: metadata?.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                iterationCount: metadata?.iterationCount || 0,
                duration: metadata?.duration || 0,
                agentName: agent.name,
                agentModel: agent.llmConfig.model,
                taskTitle: task.title,
                currentTaskNumber: get().tasks.findIndex(t => t.id === task.id) + 1,
                totalTasks: get().tasks.length,
                costDetails: metadata?.costDetails || DefaultFactory.createCostDetails()
            });
        },
    
        handleTaskIncomplete: (params: { 
            agent: AgentType; 
            task: TaskType; 
            error: Error;
            metadata?: {
                iterationCount?: number;
                lastAttemptTime?: number;
                retryCount?: number;
            };
        }) => {
            ErrorHandler.task({
                ...params,
                get,
                set: typeSafeSet
            });
        },
    
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
        }) => {
            const { task, error, context, metadata } = params;
            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Task error: ${error.message}`,
                status: 'ERROR',
                metadata: {
                    error,
                    context,
                    ...metadata,
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    costDetails: DefaultFactory.createCostDetails()
                }
            });
    
            typeSafeSet(state => ({
                ...state,
                tasks: state.tasks.map(t =>
                    t.id === task.id ? { ...t, status: 'ERROR', error: error.message } : t
                ),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));
        },
    
        handleTaskBlocked: (params: { 
            task: TaskType; 
            error: ErrorType;
            blockingReason?: string;
            dependencies?: {
                taskId: string;
                status: keyof typeof TASK_STATUS_enum;
                requiredFor: string;
            }[];
        }) => {
            const { task, error, blockingReason, dependencies } = params;
            const taskLog = LogCreator.createTaskLog({
                task,
                description: `Task blocked: ${blockingReason || error.message}`,
                status: 'BLOCKED',
                metadata: {
                    error,
                    blockingReason,
                    dependencies,
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    costDetails: DefaultFactory.createCostDetails()
                }
            });
    
            typeSafeSet(state => ({
                ...state,
                tasks: state.tasks.map(t =>
                    t.id === task.id ? { ...t, status: 'BLOCKED' } : t
                ),
                workflowLogs: [...state.workflowLogs, taskLog]
            }));
        },
    
        // Agent Status and Action Handling
        handleAgentStatusChange: (agent: AgentType, status: keyof typeof AGENT_STATUS_enum): void => {
            StatusManager.updateAgent({
                agent,
                status,
                task: get().tasks.find(t => t.agent?.id === agent.id) || get().tasks[0],
                get,
                set: typeSafeSet
            });
        },
    
        handleAgentError: (params: {
            agent: AgentType;
            task: TaskType;
            error: ErrorType;
            context?: Record<string, unknown>;
        }): void => {
            ErrorHandler.agent({
                ...params,
                get,
                set: typeSafeSet
            });
        },
    
        // Agent Iteration Handling with fixed statuses
        handleIterationStart: (params: {
            agent: AgentType;
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
        }) => {
            const { agent, task, iterations, maxAgentIterations } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Starting iteration ${iterations}/${maxAgentIterations}`,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: 'ITERATION_START'  // Using correct enum value
            });
    
            store.addWorkflowLog(log);
        },
    
        handleIterationEnd: (params: {
            agent: AgentType;
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
        }) => {
            const { agent, task, iterations, maxAgentIterations } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Completed iteration ${iterations}/${maxAgentIterations}`,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: 'ITERATION_END'  // Using correct enum value
            });
    
            store.addWorkflowLog(log);
        },
    
        handleMaxIterationsExceeded: (params: {
            agent: AgentType;
            task: TaskType;
            iterations: number;
            maxAgentIterations: number;
            error: ErrorType;
        }) => {
            const { agent, task, iterations, maxAgentIterations, error } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Max iterations (${maxAgentIterations}) exceeded`,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    error,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: 'MAX_ITERATIONS_ERROR'  // Using correct enum value
            });
    
            store.addWorkflowLog(log);
            ErrorHandler.agent({
                agent,
                task,
                error,
                context: { iterations, maxAgentIterations },
                get,
                set: typeSafeSet
            });
        },
    
        // Agent Task Completion Handler
        handleAgentTaskCompleted: (params: {
            agent: AgentType;
            task: TaskType;
            result: unknown;
        }) => {
            const { agent, task, result } = params;
            const stats = store.getTaskStats(task);
            
            store.handleTaskCompletion({
                agent,
                task,
                result: result as TaskResult,
                metadata: {
                    duration: stats.duration,
                    iterationCount: stats.iterationCount,
                    llmUsageStats: stats.llmUsageStats,
                    costDetails: calculateTotalWorkflowCost(stats.modelUsage)
                }
            });
    
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Task completed successfully`,
                metadata: {
                    output: {
                        llmUsageStats: stats.llmUsageStats,
                        result
                    },
                    stats
                },
                agentStatus: 'TASK_COMPLETED'
            });
    
            store.addWorkflowLog(log);
        },
    
        // Agent Thinking and Output Handling
        handleAgentThinking: (params: {
            agent: AgentType;
            task: TaskType;
            messages: BaseMessage[];
            output?: Output;
        }): void => {
            const { agent, task, messages, output } = params;
            const thinkingLog = LogCreator.createAgentLog({
                agent,
                task,
                description: `Agent thinking process`,
                metadata: {
                    output: output ? {
                        llmUsageStats: output.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                        thought: output.thought,
                        action: output.action,
                        observation: output.observation,
                        finalAnswer: output.finalAnswer
                    } : undefined,
                    messages,
                    timestamp: Date.now()
                },
                agentStatus: 'THINKING'
            });
    
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, thinkingLog]
            }));
        },
    
        handleAgentThinkingStart: (params: {
            agent: AgentType;
            task: TaskType;
            messages: BaseMessage[];
        }): void => {
            const { agent, task, messages } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: 'Agent started thinking process',
                metadata: {
                    messages,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: 'THINKING'
            });
    
            store.addWorkflowLog(log);
        },
    
        handleAgentThinkingEnd: (params: {
            agent: AgentType;
            task: TaskType;
            output: Output;
        }): void => {
            const { agent, task, output } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: 'Agent completed thinking process',
                metadata: {
                    output: {
                        llmUsageStats: output.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                        thought: output.thought,
                        action: output.action,
                        observation: output.observation,
                        finalAnswer: output.finalAnswer
                    },
                    timestamp: Date.now()
                },
                agentStatus: 'THINKING_END'
            });
    
            store.addWorkflowLog(log);
        },
    
        handleAgentThinkingError: (params: {
            agent: AgentType;
            task: TaskType;
            error: ErrorType;
        }): void => {
            const { agent, task, error } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Thinking error: ${error.message}`,
                metadata: {
                    error,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: 'THINKING_ERROR'
            });
    
            store.addWorkflowLog(log);
        },
    
        handleAgentOutput: (params: {
            agent: AgentType;
            task: TaskType;
            output: Output;
            type: 'thought' | 'observation' | 'finalAnswer' | 'selfQuestion' | 'weird';
        }): void => {
            const { agent, task, output, type } = params;
            
            const metadata: AgentLogMetadata = {
                output: {
                    llmUsageStats: output.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                    thought: output.thought,
                    action: output.action,
                    observation: output.observation,
                    finalAnswer: output.finalAnswer
                },
                timestamp: Date.now()
            };
    
            let agentStatus: keyof typeof AGENT_STATUS_enum;
            let description: string;
    
            switch (type) {
                case 'thought':
                    agentStatus = 'THOUGHT';
                    description = `Agent thought: ${output.thought}`;
                    break;
                case 'observation':
                    agentStatus = 'OBSERVATION';
                    description = `Agent observation: ${output.observation}`;
                    break;
                case 'finalAnswer':
                    agentStatus = 'FINAL_ANSWER';
                    description = `Agent final answer: ${output.finalAnswer}`;
                    break;
                case 'selfQuestion':
                    agentStatus = 'SELF_QUESTION';
                    description = `Agent self question: ${output.thought}`;
                    break;
                case 'weird':
                    agentStatus = 'WEIRD_LLM_OUTPUT';
                    description = 'Agent produced unexpected output format';
                    break;
                default:
                    agentStatus = 'THINKING';
                    description = 'Agent processing';
            }
    
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description,
                metadata,
                agentStatus
            });
    
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },
    
        // Streaming Output Handling
        handleStreamingOutput: (params: {
            agent: AgentType;
            task: TaskType;
            chunk: string;
            isDone: boolean;
        }): void => {
            const { agent, task, chunk, isDone } = params;
            
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: isDone ? 'Streaming completed' : 'Streaming chunk received',
                metadata: {
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats(),
                        content: chunk
                    },
                    timestamp: Date.now(),
                    isDone
                },
                agentStatus: isDone ? 'THINKING_END' : 'THINKING'
            });
    
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },
    
        // Tool Handling Methods
        handleToolExecution: (params: {
            agent: AgentType;
            task: TaskType;
            tool: Tool;
            input: string;
            result?: string;
        }) => {
            const { agent, task, tool, input, result } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Tool execution: ${tool.name}`,
                metadata: {
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats(),
                        toolResult: result
                    },
                    tool,
                    input,
                    timestamp: Date.now()
                },
                agentStatus: 'USING_TOOL'
            });
    
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },
    
        handleToolError: (params: {
            agent: AgentType;
            task: TaskType;
            tool: Tool;
            error: Error;
            toolName: string;
        }) => {
            const { agent, task, tool, error, toolName } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Tool error: ${toolName}`,
                metadata: {
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats(),
                        toolResult: error.message
                    },
                    tool,
                    error: {
                        message: error.message,
                        name: error.name,
                        stack: error.stack
                    },
                    timestamp: Date.now()
                },
                agentStatus: 'USING_TOOL_ERROR'
            });
    
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },
    
        handleToolDoesNotExist: (params: {
            agent: AgentType;
            task: TaskType;
            toolName: string;
        }) => {
            const { agent, task, toolName } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Tool not found: ${toolName}`,
                metadata: {
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats(),
                        toolResult: `Tool '${toolName}' does not exist`
                    },
                    toolName,
                    timestamp: Date.now()
                },
                agentStatus: 'TOOL_DOES_NOT_EXIST'
            });
    
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },
    
        handleToolStart: (params: {
            agent: AgentType;
            task: TaskType;
            tool: Tool;
            input: unknown;
        }): void => {
            const { agent, task, tool, input } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Starting tool execution: ${tool.name}`,
                metadata: {
                    tool,
                    input,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: 'USING_TOOL'
            });
    
            store.addWorkflowLog(log);
        },
    
        handleToolEnd: (params: {
            agent: AgentType;
            task: TaskType;
            output: unknown;
            tool: Tool;
        }): void => {
            const { agent, task, output, tool } = params;
            const log = LogCreator.createAgentLog({
                agent,
                task,
                description: `Tool execution completed: ${tool.name}`,
                metadata: {
                    tool,
                    output: {
                        llmUsageStats: DefaultFactory.createLLMUsageStats(),
                        toolResult: output
                    },
                    timestamp: Date.now()
                },
                agentStatus: 'USING_TOOL_END'
            });
    
            store.addWorkflowLog(log);
        },
    
        // Workflow Management Methods
        startWorkflow: async (inputs?: TeamInputs): Promise<void> => {
            logger.info(`🚀 Team *${get().name}* starting workflow`);
            store.resetWorkflowStateAction();
    
            if (inputs) {
                store.setInputs(inputs);
            }
    
            const stats = store.getWorkflowStats();
            const workflowMetadata = MetadataFactory.forWorkflow(get(), stats, {
                message: 'Workflow initialized with input settings',
                inputs,
                timestamp: Date.now()
            });
    
            const initialLog = LogCreator.createWorkflowLog(
                `Workflow initiated for team *${get().name}*`,
                'RUNNING',
                workflowMetadata
            );
    
            await store.handleSystemMessage(
                `Workflow started for team ${get().name}`
            );
    
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, initialLog],
                teamWorkflowStatus: 'RUNNING',
            }));
    
            const tasks = get().tasks;
            if (tasks.length > 0 && tasks[0].status === 'TODO') {
                store.handleTaskStatusChange(tasks[0].id, 'DOING');
            }
        },
    
        handleWorkflowStatusChange: (status: keyof typeof WORKFLOW_STATUS_enum): void => {
            logger.info(`Changing workflow status to: ${status}`);
            
            const workflowStats = store.getWorkflowStats();
            const metadata = MetadataFactory.forWorkflow(get(), workflowStats, {
                previousStatus: get().teamWorkflowStatus,
                timestamp: Date.now()
            });
    
            const statusLog = LogCreator.createWorkflowLog(
                `Workflow status changed to ${status}`,
                status,
                metadata
            );
    
            typeSafeSet(state => ({
                ...state,
                teamWorkflowStatus: status,
                workflowLogs: [...state.workflowLogs, statusLog]
            }));
    
            switch (status) {
                case 'FINISHED':
                    store.finishWorkflowAction();
                    break;
                case 'BLOCKED':
                    logger.warn('Workflow blocked - waiting for resolution');
                    break;
                case 'STOPPING':
                    logger.info('Workflow is being stopped gracefully');
                    break;
                case 'ERRORED':
                    logger.error('Workflow encountered an error');
                    break;
            }
        },
    
        handleWorkflowError: (params: { 
            task: TaskType; 
            error: ErrorType 
        }): void => {
            ErrorHandler.workflow({
                ...params,
                get,
                set: typeSafeSet
            });
    
            const { task, error } = params;
            typeSafeSet(state => ({
                ...state,
                teamWorkflowStatus: 'ERRORED',
                workflowResult: {
                    status: 'ERRORED',
                    error: {
                        message: error.message,
                        type: error.name,
                        context: error.context,
                        timestamp: Date.now(),
                        taskId: task.id,
                        agentId: task.agent?.id
                    },
                    metadata: store.getWorkflowStats(),
                    erroredAt: Date.now()
                }
            }));
        },
    
        handleWorkflowBlocked: (params: { 
            task: TaskType; 
            error: ErrorType 
        }): void => {
            const { task, error } = params;
            logger.warn(`Workflow blocked at task ${task.title}: ${error.message}`);
            
            const stats = calculateTaskStats(task, get().workflowLogs);
            const workflowStats = convertTaskStatsToWorkflowStats(stats, get());
            
            typeSafeSet(state => ({
                ...state,
                teamWorkflowStatus: 'BLOCKED',
                workflowResult: {
                    status: 'BLOCKED',
                    blockedTasks: [{
                        taskId: task.id,
                        taskTitle: task.title,
                        reason: error.message
                    }],
                    metadata: workflowStats
                }
            }));
        },
    
        finishWorkflowAction: (): void => {
            const stats = store.getWorkflowStats();
            logger.info('Workflow completed successfully');
            
            typeSafeSet(state => ({
                ...state,
                teamWorkflowStatus: 'FINISHED',
                workflowResult: {
                    status: 'FINISHED',
                    result: 'Workflow completed successfully',
                    metadata: stats,
                    completionTime: Date.now()
                }
            }));
    
            logPrettyWorkflowResult({
                metadata: {
                    result: 'Workflow completed successfully',
                    duration: stats.duration,
                    llmUsageStats: stats.llmUsageStats,
                    iterationCount: stats.iterationCount,
                    costDetails: stats.costDetails,
                    teamName: get().name,
                    taskCount: get().tasks.length,
                    agentCount: get().agents.length
                }
            });
        },
    
        // Core State Management Methods
        setInputs: (inputs: TeamInputs): void => {
            logger.debug('Setting inputs:', inputs);
            typeSafeSet(state => ({ ...state, inputs }));
        },
    
        setName: (name: string): void => {
            logger.debug('Setting team name:', name);
            typeSafeSet(state => ({ ...state, name }));
        },
    
        setEnv: (env: TeamEnvironment): void => {
            logger.debug('Setting environment variables');
            typeSafeSet(state => ({ ...state, env }));
        },
    
        setTeamWorkflowStatus: (status: keyof typeof WORKFLOW_STATUS_enum): void => {
            logger.info(`Changing workflow status to: ${status}`);
            logPrettyWorkflowStatus({ 
                status, 
                message: `Workflow status changed to ${status}` 
            });
            typeSafeSet(state => ({ ...state, teamWorkflowStatus: status }));
        },
    
        // State Reset and Cleanup Methods
        resetWorkflowState: async (): Promise<void> => {
            logger.debug('Resetting workflow state');
            await messageHistoryManager.clear();
            
            typeSafeSet(state => ({
                ...state,
                tasks: state.tasks.map(task => ({
                    ...task,
                    status: 'TODO' as keyof typeof TASK_STATUS_enum,
                })),
                agents: state.agents.map(agent => {
                    agent.setStatus('INITIAL' as keyof typeof AGENT_STATUS_enum);
                    return agent;
                }),
                workflowLogs: [],
                workflowContext: '',
                workflowResult: null,
                teamWorkflowStatus: 'INITIAL'
            }));
        },
    
        resetWorkflowStateAction: (): void => {
            store.resetWorkflowState();
        },
    
        clearWorkflowLogs: (): void => {
            typeSafeSet(state => ({
                ...state,
                workflowLogs: []
            }));
        },
    
        // State Update Methods
        updateInputs: (inputs: TeamInputs): void => {
            typeSafeSet(state => ({
                ...state,
                inputs: {
                    ...state.inputs,
                    ...inputs
                }
            }));
        },
    
        updateEnvironment: (env: TeamEnvironment): void => {
            typeSafeSet(state => ({
                ...state,
                env: {
                    ...state.env,
                    ...env
                }
            }));
        },
    
        // Statistics and Metrics
        getTaskStats: (task: TaskType): TaskStats => {
            return calculateTaskStats(task, get().workflowLogs);
        },
    
        getWorkflowStats: (): WorkflowStats => {
            const endTime = Date.now();
            const workflowLogs = get().workflowLogs;
            const lastWorkflowRunningLog = workflowLogs
                .slice()
                .reverse()
                .find(log => 
                    log.logType === 'WorkflowStatusUpdate' && 
                    log.workflowStatus === 'RUNNING'
                );
    
            const startTime = lastWorkflowRunningLog?.timestamp || endTime;
            const duration = (endTime - startTime) / 1000;
    
            const stats = calculateTaskStats({ id: 'workflow' } as TaskType, workflowLogs);
            const workflowStats = convertTaskStatsToWorkflowStats(stats, get());
            
            return {
                startTime,
                endTime,
                duration,
                llmUsageStats: workflowStats.llmUsageStats,
                iterationCount: workflowStats.iterationCount,
                costDetails: workflowStats.costDetails,
                taskCount: get().tasks.length,
                agentCount: get().agents.length,
                teamName: get().name,
                messageCount: workflowLogs.length,
                modelUsage: workflowStats.modelUsage
            };
        },
    
        // Context Management
        deriveContextFromLogs: (logs: Log[], currentTaskId: string): string => {
            const relevantLogs = logs
                .filter(log => log.task?.id === currentTaskId)
                .map(log => {
                    const timestamp = new Date(log.timestamp).toISOString();
                    let contextEntry = `[${timestamp}] ${log.logDescription}`;
                    
                    if (log.logType === 'AgentStatusUpdate' && 'output' in log.metadata) {
                        const output = (log.metadata as AgentLogMetadata).output;
                        if (output?.thought) contextEntry += `\nThought: ${output.thought}`;
                        if (output?.observation) contextEntry += `\nObservation: ${output.observation}`;
                    }
                    
                    return contextEntry;
                })
                .join('\n');
    
            return `Current context for task ${currentTaskId}:\n${relevantLogs}`;
        },
    
        // Initialization and Configuration
        initialize: (config: {
            name: string;
            agents?: AgentType[];
            tasks?: TaskType[];
            inputs?: TeamInputs;
            env?: TeamEnvironment;
        }): void => {
            const { name, agents = [], tasks = [], inputs = {}, env = {} } = config;
            
            store.setName(name);
            store.setEnv(env);
            store.setInputs(inputs);
            store.addAgents(agents);
            store.addTasks(tasks);
            
            logger.info(`Team "${name}" initialized with ${agents.length} agents and ${tasks.length} tasks`);
        },
    
        // Agent Management
        addAgents: (agents: AgentType[]): void => {
            const { env } = get();
            logger.info(`Adding ${agents.length} agents to team`);
            
            agents.forEach((agent) => {
                logger.debug(`Initializing agent: ${agent.name}`);
                agent.initialize(store, env);
            });
            
            typeSafeSet(state => ({
                ...state,
                agents: [...state.agents, ...agents]
            }));
        },
    
        // Task Management
        addTasks: (tasks: TaskType[]): void => {
            logger.info(`Adding ${tasks.length} tasks to workflow`);
            
            tasks.forEach((task) => {
                if (!validateTask(task)) {
                    throw new PrettyError({
                        message: 'Invalid task structure',
                        context: { taskId: task.id, taskTitle: task.title }
                    });
                }
                logger.debug(`Setting store for task: ${task.title}`);
                task.setStore(store);
            });
            
            typeSafeSet(state => ({
                ...state,
                tasks: [...state.tasks, ...tasks.map((task) => ({
                    ...task,
                    agent: task.agent,
                    status: task.status || 'TODO'
                }))],
            }));
        },
    
        // Cleanup and Resource Management
        cleanup: async (): Promise<void> => {
            await messageHistoryManager.clear();
            store.clearWorkflowLogs();
            logger.debug('Team store cleaned up');
        },
    
        // State Export and Cleaning
        getCleanedState: (): unknown => {
            const state = get();
            return {
                teamWorkflowStatus: state.teamWorkflowStatus,
                workflowResult: state.workflowResult,
                name: state.name,
                agents: state.agents.map(agent => ({
                    ...agent,
                    id: '[REDACTED]',
                    env: '[REDACTED]',
                    llmConfig: {
                        ...agent.llmConfig,
                        apiKey: '[REDACTED]',
                    }
                })),
                tasks: state.tasks.map(task => ({
                    ...task,
                    id: '[REDACTED]',
                    agent: task.agent ? {
                        ...task.agent,
                        id: '[REDACTED]',
                        env: '[REDACTED]',
                        llmConfig: {
                            ...task.agent.llmConfig,
                            apiKey: '[REDACTED]',
                        },
                    } : null,
                    duration: '[REDACTED]',
                    endTime: '[REDACTED]',
                    startTime: '[REDACTED]',
                    feedbackHistory: task.feedbackHistory?.map(feedback => ({
                        ...feedback,
                        timestamp: '[REDACTED]',
                    }))
                })),
                workflowLogs: state.workflowLogs,
                inputs: state.inputs,
                workflowContext: state.workflowContext,
                logLevel: state.logLevel,
            };
        },
    
        // Logging Management
        addWorkflowLog: (log: Log) => {
            typeSafeSet(state => ({
                ...state,
                workflowLogs: [...state.workflowLogs, log]
            }));
        },
    
        prepareNewLog: (params: PrepareNewLogParams): Log => {
            const { 
                agent, 
                task, 
                logDescription, 
                metadata, 
                logType, 
                agentStatus, 
                taskStatus, 
                workflowStatus 
            } = params;
    
            if (task && agent) {
                return LogCreator.createAgentLog({
                    agent,
                    task,
                    description: logDescription,
                    metadata: {
                        ...metadata,
                        output: {
                            llmUsageStats: DefaultFactory.createLLMUsageStats(),
                            ...(metadata as AgentLogMetadata).output
                        }
                    },
                    agentStatus: agentStatus || agent.status,
                    logType: logType || 'AgentStatusUpdate'
                });
            } else if (task) {
                return LogCreator.createTaskLog({
                    task,
                    description: logDescription,
                    status: taskStatus || task.status,
                    metadata: metadata as TaskLogMetadata
                });
            } else {
                return LogCreator.createWorkflowLog(
                    logDescription,
                    workflowStatus || get().teamWorkflowStatus,
                    metadata as WorkflowLogMetadata
                );
            }
        }
    }; // End of store object
    
        

        return store;
    }; // End of storeCreator

    // Create the store with middleware
    const boundStore = create<TeamStore>()(
        devtools(
            subscribeWithSelector(storeCreator as StateCreator<TeamStore>),
            {
                name: 'TeamStore',
                serialize: {
                    options: {
                        undefined: true,
                        function: false,
                        symbol: false,
                        error: true,
                        date: true,
                        regexp: true,
                        infinity: true,
                        nan: true,
                        set: true,
                        map: true,
                    }
                },
                stateSanitizer: (state: TeamState) => ({
                    ...state,
                    env: Object.keys(state.env || {}).reduce((acc, key) => ({
                        ...acc,
                        [key]: '[REDACTED]'
                    }), {}),
                    agents: (state.agents || []).map(agent => ({
                        ...agent,
                        llmConfig: {
                            ...agent.llmConfig,
                            apiKey: '[REDACTED]'
                        }
                    }))
                })
            }
        )
    );

    // Create store proxy and setup resources
    const proxiedStore = StoreUtils.createStoreProxy(boundStore);

    if (TypeGuards.isTeamStore(proxiedStore)) {
        const controllerCleanup = setupWorkflowController(proxiedStore);
        const unsubscribe = StoreUtils.setupSubscribers(proxiedStore);
        
        const originalDestroy = proxiedStore.destroy;
        proxiedStore.destroy = () => {
            logger.debug('Cleaning up team store resources');
            controllerCleanup();
            unsubscribe();
            messageHistoryManager.clear();
            originalDestroy();
            logger.debug('Team store cleanup completed');
        };
    }

    return boundStore;
}; // End of createTeamStore

// Export store instance and utilities
export const teamStore = createTeamStore({
    name: '',
    teamWorkflowStatus: 'INITIAL',
    workflowResult: null,
    agents: [],
    tasks: [],
    workflowLogs: [],
    inputs: {},
    workflowContext: '',
    env: {},
    logLevel: 'info',
    tasksInitialized: false
});

export const useTeamStore = teamStore;
export const getTeamStore = () => teamStore.getState();
export const subscribeToTeamStore = teamStore.subscribe;

export default teamStore;
