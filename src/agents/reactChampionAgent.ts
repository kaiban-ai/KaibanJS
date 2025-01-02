/**
 * @file reactChampionAgent.ts
 * @path src/agents/reactChampionAgent.ts
 * @description React Champion agent implementation using manager layers
 */

import { BaseAgent } from './baseAgent';
import { Tool } from 'langchain/tools';
import { ChatMessageHistory } from 'langchain/memory';
import { BaseMessage } from '@langchain/core/messages';
import { AgentManager } from '../managers/domain/agent/agentManager';
import { IterationManager } from '../managers/domain/agent/iterationManager';
import { TaskManager } from '../managers/domain/task/taskManager';
import { AGENT_STATUS_enum } from '../types/common/enumTypes';
import { createError, IErrorType } from '../types/common/errorTypes';
import { IExecutableAgent, IReactChampionAgent } from '../types/agent/agentBaseTypes';
import { IREACTChampionAgentPrompts } from '../types/agent/promptsTypes';
import { ILLMInstance } from '../types/llm/llmInstanceTypes';
import { IRuntimeLLMConfig } from '../types/llm/llmCommonTypes';
import { ILLMProviderConfig, IProviderInstance } from '../types/llm/llmProviderTypes';
import { IMessageHistory } from '../types/llm/message/messagingBaseTypes';
import { ITaskType } from '../types/task/taskBaseTypes';
import { ILLMManager, IThinkingManager } from '../types/agent/agentManagerTypes';
import { ITimeMetrics, IThroughputMetrics } from '../types/metrics/base';
import { ITaskFeedback } from '../types/task/taskFeedbackTypes';
import { ILoopResult } from '../types/agent/agentExecutionFlow';
import { IThinkingHandlerResult } from '../types/agent/agentHandlersTypes';
import { ILLMMetrics } from '../types/llm/llmMetricTypes';
import { 
    IAgentPerformanceMetrics,
    IAgentResourceMetrics,
    IAgentUsageMetrics,
    ICognitiveResourceMetrics,
    IThinkingOperationMetrics,
    IAgentStateMetrics
} from '../types/agent/agentMetricTypes';

// Create default metrics functions
const createDefaultTimeMetrics = (): ITimeMetrics => ({
    average: 0,
    min: 0,
    max: 0,
    total: 0
});

const createDefaultThroughputMetrics = (): IThroughputMetrics => ({
    requestsPerSecond: 0,
    bytesPerSecond: 0,
    operationsPerSecond: 0,
    dataProcessedPerSecond: 0
});

const createDefaultBaseMetricsData = (component: string) => ({
    component,
    category: 'base',
    version: '1.0.0',
    timestamp: Date.now()
});

const createDefaultCognitiveResourceMetrics = (component: string): ICognitiveResourceMetrics => ({
    ...createDefaultBaseMetricsData(component),
    usage: 0,
    limit: 100,
    available: 100,
    memoryAllocation: 0,
    cognitiveLoad: 0,
    processingCapacity: 1,
    contextUtilization: 0
});

const createDefaultThinkingOperationMetrics = (component: string): IThinkingOperationMetrics => ({
    ...createDefaultBaseMetricsData(component),
    duration: 0,
    success: true,
    errorCount: 0,
    reasoningTime: createDefaultTimeMetrics(),
    planningTime: createDefaultTimeMetrics(),
    learningTime: createDefaultTimeMetrics(),
    decisionConfidence: 0,
    learningEfficiency: 0
});

const createDefaultAgentStateMetrics = (component: string): IAgentStateMetrics => ({
    ...createDefaultBaseMetricsData(component),
    currentState: 'IDLE',
    stateTime: 0,
    transitionCount: 0,
    failedTransitions: 0,
    blockedTaskCount: 0,
    historyEntryCount: 0,
    lastHistoryUpdate: Date.now(),
    taskStats: {
        completedCount: 0,
        failedCount: 0,
        averageDuration: 0,
        successRate: 0,
        averageIterations: 0
    }
});

const createDefaultAgentResourceMetrics = (component: string): IAgentResourceMetrics => ({
    ...createDefaultBaseMetricsData(component),
    usage: 0,
    limit: 100,
    available: 100,
    cognitive: createDefaultCognitiveResourceMetrics(component),
    cpuUsage: 0,
    memoryUsage: process.memoryUsage().heapUsed,
    diskIO: { read: 0, write: 0 },
    networkUsage: { upload: 0, download: 0 }
});

const createDefaultAgentPerformanceMetrics = (component: string): IAgentPerformanceMetrics => ({
    ...createDefaultBaseMetricsData(component),
    duration: 0,
    success: true,
    errorCount: 0,
    thinking: createDefaultThinkingOperationMetrics(component),
    taskSuccessRate: 0,
    goalAchievementRate: 0,
    responseTime: createDefaultTimeMetrics(),
    throughput: createDefaultThroughputMetrics()
});

const createDefaultAgentUsageMetrics = (component: string): IAgentUsageMetrics => ({
    ...createDefaultBaseMetricsData(component),
    totalRequests: 0,
    activeUsers: 0,
    requestsPerSecond: 0,
    averageResponseSize: 0,
    peakMemoryUsage: 0,
    uptime: 0,
    rateLimit: {
        current: 0,
        limit: 100,
        remaining: 100,
        resetTime: Date.now() + 3600000
    },
    state: createDefaultAgentStateMetrics(component),
    toolUsageFrequency: {},
    taskCompletionCount: 0,
    averageTaskTime: 0,
    costs: {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
    }
});

export class ReactChampionAgent extends BaseAgent implements IReactChampionAgent {
    private static readonly defaultCapabilities = {
        canThink: true,
        canUseTools: true,
        canLearn: true,
        supportedToolTypes: ['function', 'web', 'system'],
        maxConcurrentTasks: 5,
        memoryCapacity: 1000,
        canDelegate: false,
        canTeach: false,
        canCollaborate: true,
        supportedProviders: ['openai', 'mistral', 'anthropic', 'groq', 'google'],
        supportedModels: ['gpt-4', 'gpt-3.5-turbo', 'mistral', 'claude'],
        maxContextSize: 8192,
        features: {
            streaming: true,
            batching: true,
            caching: true,
            recovery: true,
            metrics: true
        }
    };

    public executableAgent!: IExecutableAgent & { runnable: IProviderInstance };
    protected readonly agentManager: AgentManager;
    protected readonly llmManager: ILLMManager;
    protected readonly iterationManager: IterationManager;
    protected readonly taskManager: TaskManager;
    
    public readonly type: string = 'ReactChampionAgent';
    public readonly description: string = 'A REACT-based agent implementation';
    public readonly supportedModels: string[] = ['gpt-4', 'gpt-3.5-turbo', 'mistral', 'claude'];
    public readonly supportedProviders: string[] = ['openai', 'mistral', 'anthropic'];
    public readonly maxContextSize: number = 8192;
    public readonly features = {
        streaming: true,
        batching: true,
        caching: true,
        recovery: true,
        metrics: true
    } as const;
    
    public messages: BaseMessage[] = [];
    public context: string = '';
    private _history: ChatMessageHistory;
    private _messageHistory: IMessageHistory;

    public readonly capabilities = ReactChampionAgent.defaultCapabilities;

    constructor(config: {
        id: string;
        name: string;
        role: string;
        goal: string;
        tools?: Tool[];
        llmConfig: IRuntimeLLMConfig;
        promptTemplates: IREACTChampionAgentPrompts;
        messageHistory: ChatMessageHistory;
    }) {
        const messageHistory: IMessageHistory = {
            messages: [],
            metadata: {
                conversationId: config.id,
                sessionId: Date.now().toString()
            }
        };

        super({
            ...config,
            capabilities: ReactChampionAgent.defaultCapabilities,
            messageHistory
        });

        this._history = config.messageHistory;
        this._messageHistory = messageHistory;

        this.agentManager = this.getDomainManager<AgentManager>('AgentManager');
        this.llmManager = this.getDomainManager<ILLMManager>('LLMManager');
        this.iterationManager = this.getDomainManager<IterationManager>('IterationManager');
        this.taskManager = TaskManager.getInstance();

        this.initializeAgent().catch(error => {
            this.handleError(
                createError({
                    message: `Failed to initialize agent: ${error.message}`,
                    type: 'InitializationError',
                    context: {
                        component: this.constructor.name,
                        agentId: this.id,
                        error: error
                    }
                }),
                'Agent initialization'
            );
        });
    }
    execute: () => Promise<void> = async () => { throw new Error('Not implemented'); };
    pause: () => Promise<void> = async () => { throw new Error('Not implemented'); };
    resume: () => Promise<void> = async () => { throw new Error('Not implemented'); };
    stop: () => Promise<void> = async () => { throw new Error('Not implemented'); };
    reset: () => Promise<void> = async () => { throw new Error('Not implemented'); };

    protected async updateMessageHistory(): Promise<void> {
        const messages = await this._history.getMessages();
        this._messageHistory.messages = messages.map(msg => ({
            message: msg,
            timestamp: Date.now(),
            metadata: {
                timestamp: Date.now(),
                component: this.constructor.name,
                operation: 'message'
            }
        }));
    }

    public get history(): IMessageHistory {
        return this._messageHistory;
    }

    private async initializeAgent(): Promise<void> {
        await this.updateMessageHistory();

        this.executableAgent = {
            name: this.name,
            role: this.role,
            goal: this.goal,
            type: 'ReactChampionAgent',
            description: 'A REACT-based agent implementation',
            supportedModels: this.supportedModels,
            supportedProviders: this.supportedProviders,
            maxContextSize: this.maxContextSize,
            features: this.features,
            background: this.background,
            version: this.version,
            capabilities: this.capabilities,
            tools: this.tools,
            maxIterations: this.maxIterations,
            status: this.status,
            env: this.env,
            metrics: this.metrics,
            llmInstance: this.llmInstance,
            llmSystemMessage: this.llmSystemMessage,
            forceFinalAnswer: this.forceFinalAnswer,
            promptTemplates: this.promptTemplates,
            messageHistory: this.messageHistory,
            metadata: this.metadata,
            executionState: this.executionState,
            execute: async () => { throw new Error('Not implemented'); },
            pause: async () => { throw new Error('Not implemented'); },
            resume: async () => { throw new Error('Not implemented'); },
            stop: async () => { throw new Error('Not implemented'); },
            reset: async () => { throw new Error('Not implemented'); },
            validate: async () => true,
            runnable: {
                pause: async () => { throw new Error('Not implemented'); },
                resume: async () => { throw new Error('Not implemented'); },
                stop: ['<stop>', '</stop>'],
                reset: async () => { throw new Error('Not implemented'); }
            }
        };

        this.logInfo(`Agent created: ${this.name}`);
    }

    protected async createGroqInstance(): Promise<void> {
        await this.createLLMInstance();
    }

    protected async createOpenAIInstance(): Promise<void> {
        await this.createLLMInstance();
    }

    protected async createAnthropicInstance(): Promise<void> {
        await this.createLLMInstance();
    }

    protected async createGoogleInstance(): Promise<void> {
        await this.createLLMInstance();
    }

    protected async createMistralInstance(): Promise<void> {
        await this.createLLMInstance();
    }

    protected async someAbstractMethod(_params?: unknown): Promise<void> {
        throw new Error('Method not implemented.');
    }

    public async validate(): Promise<boolean> {
        return true;
    }

    public async workOnFeedback(_task: ITaskType, _feedbackList: ITaskFeedback[], _context: string): Promise<void> {
        throw new Error('Method not implemented.');
    }

    public async workOnTask(task: ITaskType): Promise<ILoopResult> {
        const result = await this.agentManager.executeAgentLoop(this, task);

        if (!result.success) {
            let errorMessage: string;
            const error = result.error;

            if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = error.message;
            } else {
                errorMessage = 'Failed to execute task';
            }

            throw createError({
                message: errorMessage,
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    taskId: task.id
                }
            });
        }

        return {
            success: result.success,
            result: result.result,
            metadata: {
                iterations: result.metadata.iterations,
                maxAgentIterations: result.metadata.maxAgentIterations,
                metrics: {
                    performance: result.metadata.metrics?.performance || {
                        ...createDefaultAgentPerformanceMetrics(this.constructor.name),
                        thinking: createDefaultThinkingOperationMetrics(this.constructor.name),
                        taskSuccessRate: 0,
                        goalAchievementRate: 0
                    },
                    resources: result.metadata.metrics?.resources || createDefaultAgentResourceMetrics(this.constructor.name),
                    usage: result.metadata.metrics?.usage || {
                        ...createDefaultAgentUsageMetrics(this.constructor.name),
                        state: createDefaultAgentStateMetrics(this.constructor.name),
                        toolUsageFrequency: {},
                        taskCompletionCount: 0,
                        averageTaskTime: 0
                    },
                    costs: {
                        totalCost: 0,
                        inputCost: 0,
                        outputCost: 0,
                        currency: 'USD',
                        breakdown: {
                            promptTokens: { count: 0, cost: 0 },
                            completionTokens: { count: 0, cost: 0 }
                        }
                    }
                }
            }
        };
    }

    public async createLLMInstance(): Promise<void> {
        try {
            const normalizedConfig = await this.llmManager.validateConfig(this.llmConfig);
            if (!normalizedConfig.isValid) {
                throw new Error(`Invalid LLM config: ${normalizedConfig.errors.join(', ')}`);
            }

            const result = await this.llmManager.createInstance(this.llmConfig);
            if (!result.success || !result.data) {
                throw new Error('Failed to create LLM instance');
            }

            const llmInstance: ILLMInstance = {
                ...result.data,
                id: this.id,
                getConfig: () => this.llmConfig as ILLMProviderConfig,
                updateConfig: (updates: Partial<ILLMProviderConfig>) => {
                    Object.assign(this.llmConfig, updates);
                },
                getProvider: () => this.llmConfig.provider,
                validateConfig: async () => normalizedConfig,
                cleanup: async () => {}
            };

            this.llmInstance = llmInstance;

        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error during LLM instance creation');
            throw createError({
                message: `Failed to create LLM instance: ${error.message}`,
                type: 'InitializationError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    error: error
                }
            });
        }
    }

    public async think(task: ITaskType): Promise<IThinkingHandlerResult> {
        if (!task || !task.id) {
            throw createError({
                message: 'No current task assigned',
                type: 'StateError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id
                }
            });
        }

        const thinkingManager = this.getDomainManager<IThinkingManager>('ThinkingManager');
        const result = await thinkingManager.executeThinking({
            agent: this,
            task: task,
            ExecutableAgent: this.executableAgent
        });

        const metrics = result.metadata?.metrics ? result.metadata.metrics as unknown as ILLMMetrics : undefined;
        const component = this.constructor.name;

        const thinkingMetadata = {
            messageCount: 0,
            processingTime: 0,
            metrics,
            context: {
                iteration: 0,
                totalTokens: metrics?.usage?.tokenDistribution?.total || 0,
                confidence: 0,
                reasoningChain: [] as string[]
            },
            performance: createDefaultAgentPerformanceMetrics(component),
            resources: createDefaultAgentResourceMetrics(component),
            usage: createDefaultAgentUsageMetrics(component),
            costs: {
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

        return {
            success: result.success,
            data: result.data,
            metadata: {
                ...result.metadata,
                thinking: thinkingMetadata,
                agent: {
                    id: this.id,
                    name: this.name,
                    role: this.role,
                    status: this.status,
                    metrics: {
                        iterations: 0,
                        executionTime: 0,
                        llmMetrics: metrics
                    }
                },
                task: {
                    id: task.id,
                    title: task.title,
                    metrics: {
                        iterations: 0,
                        executionTime: 0,
                        llmMetrics: metrics
                    }
                },
                llm: {
                    model: this.llmConfig.model,
                    provider: this.llmConfig.provider,
                    requestId: Date.now().toString(),
                    usageMetrics: metrics
                }
            }
        };
    }

    public handleIterationStart(params: {
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.iterationManager.handleIterationStart({
            agent: this,
            task: params.task,
            iterations: params.iterations,
            maxAgentIterations: params.maxAgentIterations
        });

        this.handleStatusTransition({
            entity: 'agent',
            entityId: this.id,
            currentStatus: this.status,
            targetStatus: 'ITERATION_START' as keyof typeof AGENT_STATUS_enum,
            context: {
                agentId: this.id,
                agentName: this.name,
                operation: 'iteration_start',
                ...params
            }
        });
    }

    public handleIterationEnd(params: {
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.iterationManager.handleIterationEnd({
            agent: this,
            task: params.task,
            iterations: params.iterations,
            maxAgentIterations: params.maxAgentIterations
        });

        this.handleStatusTransition({
            entity: 'agent',
            entityId: this.id,
            currentStatus: this.status,
            targetStatus: 'ITERATION_END' as keyof typeof AGENT_STATUS_enum,
            context: {
                agentId: this.id,
                agentName: this.name,
                operation: 'iteration_end',
                ...params
            }
        });
    }

    public handleThinkingError(params: {
        task: ITaskType;
        error: IErrorType;
    }): void {
        this.handleError(
            createError({
                message: params.error.message,
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    taskId: params.task.id
                }
            }),
            'Error during thinking phase'
        );
    }

    public handleMaxIterationsError(params: {
        task: ITaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const error = createError({
            message: `Maximum iterations (${params.maxAgentIterations}) reached`,
            type: 'ExecutionError',
            context: {
                component: this.constructor.name,
                agentId: this.id,
                taskId: params.task.id,
                iterations: params.iterations,
                maxIterations: params.maxAgentIterations
            }
        });

        this.iterationManager.handleMaxIterationsError({
            agent: this,
            task: params.task,
            iterations: params.iterations,
            maxIterations: params.maxAgentIterations,
            error
        });

        this.handleError(
            error,
            'Max iterations exceeded'
        );
    }

    public handleAgenticLoopError(params: {
        task: ITaskType;
        error: IErrorType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.handleError(
            createError({
                message: params.error.message,
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    taskId: params.task.id,
                    iterations: params.iterations,
                    maxIterations: params.maxAgentIterations
                }
            }),
            'Agentic loop error'
        );
    }

    public async handleTaskCompleted(params: {
        task: ITaskType;
        parsedResultWithFinalAnswer: any;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<void> {
        await this.taskManager.executeTask({
            ...params.task,
            inputs: params.parsedResultWithFinalAnswer,
            metrics: {
                ...params.task.metrics,
                startTime: params.task.metrics.startTime || 0,
                endTime: Date.now(),
                duration: Date.now() - (params.task.metrics.startTime || 0)
            }
        });

        this.handleStatusTransition({
            entity: 'agent',
            entityId: this.id,
            currentStatus: this.status,
            targetStatus: 'TASK_COMPLETED' as keyof typeof AGENT_STATUS_enum,
            context: {
                agentId: this.id,
                agentName: this.name,
                operation: 'task_completed',
                ...params
            }
        });
    }

    public handleFinalAnswer(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        parsedLLMOutput: any;
    }): any {
        return params.parsedLLMOutput;
    }

    public handleIssuesParsingLLMOutput(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        output: any;
        llmOutput: string;
    }): string {
        return this.promptTemplates.INVALID_JSON_FEEDBACK?.({
            agent: params.agent,
            task: params.task,
            llmOutput: params.llmOutput
        }) || 'Unable to parse LLM output';
    }
}
