/**
 * @file coreManager.ts
 * @path src/managers/core/coreManager.ts
 * @description Core management implementation providing base functionality and service registry
 *
 * @module managers/core
 */

import { LogManager } from './logManager';
import { ErrorManager } from './errorManager';
import { StatusManager } from './statusManager';
import { MetadataFactory } from '../../utils/factories/metadataFactory';
import { BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import { createError, toErrorType } from '../../types/common/commonErrorTypes';
import { AGENT_STATUS_enum, TASK_STATUS_enum } from '../../types/common/commonEnums';

import type { 
    IStatusTransitionContext,
    IStatusEntity,
    IStatusType
} from '../../types/common/commonStatusTypes';
import type { IStatusValidationResult } from '../../types/common/commonValidationTypes';
import type { ILogLevel } from '../../types/common/commonEnums';
import type { ILoggerConfig } from '../../types/common/commonLoggingTypes';
import type { 
    IErrorType,
    IBaseError,
    IErrorKind
} from '../../types/common/commonErrorTypes';
import type { IHandlerResult } from '../../types/common/commonHandlerTypes';
import type { ITeamState, ITeamStoreMethods } from '../../types/team';
import type { IWorkflowMetadata, ISuccessMetadata, IErrorMetadata } from '../../types/common/commonMetadataTypes';
import type { IMessageHistory } from '../../types/messaging/messagingHistoryTypes';
import type { IReactChampionAgent, IExecutableAgent } from '../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../types/task/taskBaseTypes';
import type { IAgenticLoopResult } from '../../types/llm/llmInstanceTypes';

/**
 * Abstract base manager class providing core functionality for all managers
 */
export abstract class CoreManager {
    protected static _instance: any = null;
    protected readonly logManager: LogManager;
    protected readonly errorManager: ErrorManager;
    protected readonly statusManager: StatusManager;
    private readonly domainManagers: Map<string, any>;

    protected constructor() {
        this.logManager = LogManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.domainManagers = new Map();
    }

    public static getInstance(): CoreManager {
        const Class = this as any;
        if (!Class._instance) {
            Class._instance = new Class();
        }
        return Class._instance;
    }

    // ─── Domain Manager Registry ─────────────────────────────────────────────

    protected registerDomainManager<T>(name: string, manager: T): void {
        if (this.domainManagers.has(name)) {
            throw new Error(`Manager already registered with name: ${name}`);
        }
        this.domainManagers.set(name, manager);
    }

    protected getDomainManager<T>(name: string): T {
        const manager = this.domainManagers.get(name);
        if (!manager) {
            throw new Error(`Domain manager not found: ${name}`);
        }
        return manager as T;
    }

    protected hasDomainManager(name: string): boolean {
        return this.domainManagers.has(name);
    }

    protected getRegisteredDomainManagers(): string[] {
        return Array.from(this.domainManagers.keys());
    }

    // ─── Protected Error Handling ────────────────────────────────────────────

    protected handleError(error: Error, context: string): void {
        const kaibanError = createError({
            message: error.message,
            type: 'SystemError',
            context: {
                component: this.constructor.name,
                details: context,
                originalError: {
                    name: error.name,
                    message: error.message
                }
            },
            recommendedAction: 'Review system error and retry'
        });

        // Mock objects for error handling
        const mockMessageHistory: IMessageHistory = {
            addMessage: async () => {},
            getMessages: async () => [],
            clear: async () => {},
            length: 0,
            addUserMessage: async () => {},
            addAIMessage: async () => {},
            addSystemMessage: async () => {},
            addFunctionMessage: async () => {}
        };

        const mockExecutableAgent: IExecutableAgent = {
            runnable: {} as Runnable,
            getMessageHistory: () => new ChatMessageHistory(),
            inputMessagesKey: 'input',
            historyMessagesKey: 'history'
        };

        const mockAgent: IReactChampionAgent = {
            id: 'mock-agent',
            name: 'Mock Agent',
            role: 'error-handler',
            goal: 'Handle errors',
            version: '1.0.0',
            background: 'Error handling agent',
            capabilities: {
                canThink: true,
                canUseTools: true,
                canLearn: false,
                supportedToolTypes: ['error-handler'],
                supportedTools: ['error-handler']
            },
            status: AGENT_STATUS_enum.THINKING_ERROR,
            tools: [],
            maxIterations: 3,
            store: {} as any,
            env: null,
            llmInstance: null,
            llmConfig: {} as any,
            llmSystemMessage: null,
            forceFinalAnswer: false,
            promptTemplates: {} as any,
            messageHistory: mockMessageHistory,
            metadata: {
                id: 'mock-agent',
                name: 'Mock Agent',
                capabilities: [],
                skills: [],
                created: new Date()
            },
            executionState: {
                status: AGENT_STATUS_enum.THINKING_ERROR,
                thinking: false,
                busy: false,
                errorCount: 0,
                retryCount: 0,
                maxRetries: 3,
                assignedTasks: [],
                completedTasks: [],
                failedTasks: [],
                iterations: 0,
                maxIterations: 3,
                performance: {
                    completedTaskCount: 0,
                    failedTaskCount: 0,
                    averageTaskDuration: 0,
                    successRate: 0,
                    averageIterationsPerTask: 0
                },
                resourceUsage: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    networkUsage: 0
                },
                llmMetrics: {
                    totalTokensUsed: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalCost: 0,
                    averageResponseTime: 0
                }
            },
            executableAgent: mockExecutableAgent,
            validationSchema: {} as any,
            initialize: () => {},
            setStore: () => {},
            setStatus: () => {},
            setEnv: () => {},
            workOnTask: async () => ({
                result: {
                    thought: "Processing error handling",
                    action: "handle_error",
                    actionInput: {},
                    observation: "Error detected and handled",
                    isFinalAnswerReady: true,
                    finalAnswer: "Error handled successfully",
                    llmOutput: "Error handling complete",
                    llmUsageStats: {
                        inputTokens: 0,
                        outputTokens: 0,
                        callsCount: 1,
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
                    }
                },
                metadata: {
                    iterations: 0,
                    maxAgentIterations: 3
                }
            }),
            workOnFeedback: async () => {},
            normalizeLlmConfig: (config) => config,
            createLLMInstance: () => {},
            handleIterationStart: () => {},
            handleIterationEnd: () => {},
            handleThinkingError: () => {},
            handleMaxIterationsError: () => {},
            handleAgenticLoopError: () => {},
            handleTaskCompleted: () => {},
            handleFinalAnswer: () => ({}),
            handleIssuesParsingLLMOutput: () => ''
        };

        const mockTask: ITaskType = {
            id: 'mock-task',
            title: 'Error Task',
            description: 'Handle error for testing',
            expectedOutput: 'Error handled',
            agent: mockAgent,
            status: TASK_STATUS_enum.ERROR,
            stepId: 'error-handling',
            isDeliverable: false,
            externalValidationRequired: false,
            inputs: {},
            metrics: {
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0,
                iterationCount: 0,
                resources: {
                    memory: 0,
                    cpu: 0,
                    tokens: 0
                },
                performance: {
                    averageIterationTime: 0,
                    averageTokensPerSecond: 0,
                    peakMemoryUsage: 0
                },
                costs: {
                    input: 0,
                    output: 0,
                    total: 0,
                    currency: 'USD'
                },
                llmUsage: {
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
                }
            },
            progress: {
                status: TASK_STATUS_enum.ERROR,
                progress: 0,
                timeElapsed: 0
            },
            history: [],
            feedback: [],
            setStore: () => {},
            execute: async () => null
        };

        const mockStore: ITeamStoreMethods = {
            setState: () => {},
            getState: () => ({
                name: 'default',
                teamWorkflowStatus: 'INITIAL',
                workflowContext: '',
                inputs: {},
                env: {},
                workflowLogs: [],
                tasks: [],
                agents: [],
                resources: {},
                tasksInitialized: false
            } as ITeamState),
            subscribe: () => () => {},
            destroy: () => {},
            startWorkflow: async () => ({
                success: true,
                data: undefined,
                metadata: MetadataFactory.createWorkflowMetadata('startWorkflow')
            }),
            stopWorkflow: async () => {},
            handleWorkflowError: async () => {},
            handleAgentStatusChange: async () => {},
            handleAgentError: async () => ({
                success: false,
                error: kaibanError,
                metadata: MetadataFactory.createErrorMetadata(error)
            }),
            handleTaskStatusChange: async () => {},
            handleTaskError: async () => {},
            handleTaskBlocked: async () => {},
            provideFeedback: async () => {}
        };

        this.errorManager.handleAgentError({
            error: kaibanError,
            context: { 
                component: this.constructor.name, 
                details: context 
            },
            task: mockTask,
            agent: mockAgent,
            store: mockStore,
            metadata: MetadataFactory.createErrorMetadata(error)
        });
    }

    // ─── Protected Logging Methods ──────────────────────────────────────────────

    protected log(
        message: string, 
        agentName?: string | null, 
        taskId?: string, 
        level: ILogLevel = 'info',
        error?: Error
    ): void {
        this.logManager.log(message, agentName, taskId, level, error);
    }

    // ─── Status Management ───────────────────────────────────────────────────

    protected async handleStatusTransition(params: {
        currentStatus: IStatusType;
        targetStatus: IStatusType;
        entity: IStatusEntity;
        entityId: string;
        metadata?: Record<string, unknown>;
    }): Promise<boolean> {
        try {
            return await this.statusManager.transition({
                ...params,
                metadata: this.prepareMetadata(params.metadata || {})
            });
        } catch (error) {
            this.handleError(
                error instanceof Error ? error : new Error(String(error)), 
                `Status transition failed: ${params.currentStatus} -> ${params.targetStatus}`
            );
            return false;
        }
    }

    // ─── Protected Helper Methods ────────────────────────────────────────────

    protected prepareMetadata(
        baseMetadata: Record<string, unknown> = {}
    ): Record<string, unknown> {
        return {
            timestamp: Date.now(),
            component: this.constructor.name,
            ...baseMetadata
        };
    }

    protected async safeExecute<T>(
        operation: () => Promise<T>,
        errorContext: string
    ): Promise<IHandlerResult<T>> {
        try {
            const result = await operation();
            return MetadataFactory.createSuccessResult(result);
        } catch (error) {
            const actualError = error instanceof Error ? error : new Error(String(error));
            this.handleError(actualError, errorContext);
            return MetadataFactory.createErrorResult(actualError);
        }
    }
}

export default CoreManager;
