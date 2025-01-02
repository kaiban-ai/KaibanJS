/**
 * @file baseAgent.ts
 * @path src/agents/baseAgent.ts
 * @description Base agent implementation with core functionality
 *
 * @module @agents
 */

import { BaseAgentLLM } from './BaseAgentLLM';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { ExtendedAIMessageChunk } from '../types/llm/message/messageStreamTypes';
import { Tool, StructuredTool } from '@langchain/core/tools';
import { BaseEventEmitter } from '../managers/core/eventEmitter';

import {
    AGENT_STATUS_enum,
    LLM_PROVIDER_enum,
    LLM_STATUS_enum,
    ERROR_SEVERITY_enum
} from '../types/common/enumTypes';
import { ERROR_KINDS } from '../types/common/errorTypes';

import {
    IAgentConfig,
    IAgentCapabilities,
    IAgentMetadata,
    IAgentExecutionState,
    IBaseAgent
} from '../types/agent/agentBaseTypes';

import {
    IProviderManager,
    ILLMProviderConfig,
    ILLMProviderMetrics,
    IMistralMetrics,
    IGroqMetrics,
    IOpenAIMetrics,
    IAnthropicMetrics,
    IGoogleMetrics,
    IProviderInstance,
    IBaseProviderMetrics
} from '../types/llm/llmProviderTypes';

import { ILLMInstance } from '../types/llm/llmInstanceTypes';
import { LLMResponse } from '../types/llm/llmResponseTypes';
import { IAgentMetrics, IAgentResourceMetrics, IAgentPerformanceMetrics, IAgentUsageMetrics } from '../types/agent/agentMetricTypes';
import { AgentEvent, AGENT_EVENT_TYPE, IAgentEventMetrics } from '../types/agent/agentEventTypes';
import { IMessageHistory } from '../types/llm/message/messagingBaseTypes';
import { IREACTChampionAgentPrompts } from '../types/agent/promptsTypes';
import { ITaskType } from '../types/task/taskBaseTypes';
import { ITaskFeedback } from '../types/task/taskFeedbackTypes';
import { ILoopResult } from '../types/agent/agentExecutionFlow';
import { HarmCategory } from '../types/llm/googleTypes';
import type { IBaseEvent } from '../types/common/baseTypes';

/**
 * Base agent implementation that emits events to be handled by core and domain managers.
 * Event handling is delegated to specialized handlers in the manager layers.
 */
export abstract class BaseAgent extends BaseAgentLLM implements IBaseAgent {
    protected readonly providerManager: IProviderManager;
    protected readonly eventEmitter: BaseEventEmitter;

    public readonly id: string;
    public readonly name: string;
    public readonly role: string;
    public readonly goal: string;
    public readonly background: string = '';
    public readonly version: string = '1.0.0';
    public readonly capabilities!: IAgentCapabilities;

    public tools: Tool[] = [];
    protected structuredTools: Map<string, StructuredTool> = new Map();
    public maxIterations: number = 10;
    public status: AGENT_STATUS_enum = AGENT_STATUS_enum.IDLE;
    public env: Record<string, unknown> | null = null;
    public metrics?: IAgentMetrics;

    public llmInstance: ILLMInstance | null = null;
    public llmSystemMessage: string | null = null;
    public forceFinalAnswer: boolean = false;
    public promptTemplates: IREACTChampionAgentPrompts;
    public messageHistory: IMessageHistory;

    public metadata!: IAgentMetadata;
    public executionState!: IAgentExecutionState;

    protected constructor(config: IAgentConfig) {
        super({
            llmConfig: config.llmConfig,
            messageHistory: config.messageHistory
        });
        
        this.id = config.id;
        this.name = config.name;
        this.role = config.role;
        this.goal = config.goal;

        this.providerManager = this.getDomainManager<IProviderManager>('ProviderManager');
        this.eventEmitter = BaseEventEmitter.getInstance();

        this.messageHistory = config.messageHistory;
        this.promptTemplates = config.promptTemplates;

        if (config.tools) {
            this.tools = config.tools;
            this.initializeTools();
        }
    }

    // ─── Abstract Methods ─────────────────────────────────────────────────────

    protected abstract createGroqInstance(): Promise<void>;
    protected abstract createOpenAIInstance(): Promise<void>;
    protected abstract someAbstractMethod(): Promise<void>;
    public abstract workOnTask(task: ITaskType): Promise<ILoopResult>;
    public abstract workOnFeedback(task: ITaskType, feedbackList: ITaskFeedback[], context: string): Promise<void>;

    // ─── Tool Management ─────────────────────────────────────────────────────

    protected async initializeTools(): Promise<void> {
        for (const tool of this.tools) {
            this.structuredTools.set(tool.name, tool as StructuredTool);
        }
    }

    // ─── Event Handling ──────────────────────────────────────────────────────

    protected async emitEvent<T extends IBaseEvent>(event: T): Promise<void> {
        await this.eventEmitter.emit(event);
    }

    // ─── Initialization and Cleanup ─────────────────────────────────────────

    public async initialize(params?: Record<string, unknown>): Promise<void> {
        if (params) {
            this.setEnv(params);
        }
    }

    public setEnv(env: Record<string, unknown>): void {
        this.env = env;
    }

    public async cleanup(): Promise<void> {
        if (this.llmInstance) {
            await this.llmInstance.cleanup();
        }
        await this.emitEvent<AgentEvent>({
            id: `${this.id}-${Date.now()}`,
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
            agentId: this.id,
            previousStatus: this.status,
            newStatus: AGENT_STATUS_enum.IDLE,
            reason: 'Cleanup',
            metadata: {
                component: this.constructor.name,
                operation: 'cleanup',
                timestamp: Date.now(),
                category: 'agent_lifecycle',
                source: this.constructor.name,
                correlationId: `${this.id}-cleanup-${Date.now()}`,
                agent: {
                    id: this.id,
                    name: this.name,
                    role: this.role,
                    status: AGENT_STATUS_enum.IDLE,
                    metrics: {
                        performance: this.createPerformanceMetrics(),
                        resources: this.createResourceMetrics(),
                        usage: this.createUsageMetrics()
                    }
                }
            },
            metrics: this.createEventMetrics()
        });
    }

    // ─── Metrics Management ───────────────────────────────────────────────────

    protected createResourceMetrics(): IAgentResourceMetrics {
        const now = Date.now();
        return {
            timestamp: now,
            component: this.constructor.name,
            category: 'resources',
            version: this.version,
            usage: 0,
            limit: 100,
            available: 100,
            cognitive: {
                timestamp: now,
                component: this.constructor.name,
                category: 'cognitive',
                version: this.version,
                usage: 0,
                limit: 100,
                available: 100,
                memoryAllocation: 0,
                cognitiveLoad: 0,
                processingCapacity: 1,
                contextUtilization: 0
            },
            cpuUsage: process.cpuUsage().user / 1000000,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 }
        };
    }

    protected createPerformanceMetrics(): IAgentPerformanceMetrics {
        const now = Date.now();
        return {
            timestamp: now,
            component: this.constructor.name,
            category: 'performance',
            version: this.version,
            duration: 0,
            success: true,
            errorCount: 0,
            thinking: {
                timestamp: now,
                component: this.constructor.name,
                category: 'thinking',
                version: this.version,
                duration: 0,
                success: true,
                errorCount: 0,
                reasoningTime: { total: 0, average: 0, min: 0, max: 0 },
                planningTime: { total: 0, average: 0, min: 0, max: 0 },
                learningTime: { total: 0, average: 0, min: 0, max: 0 },
                decisionConfidence: 1,
                learningEfficiency: 1
            },
            taskSuccessRate: 1,
            goalAchievementRate: 1,
            responseTime: { total: 0, average: 0, min: 0, max: 0 },
            throughput: {
                requestsPerSecond: 0,
                bytesPerSecond: 0,
                operationsPerSecond: 0,
                dataProcessedPerSecond: 0
            }
        };
    }

    protected createUsageMetrics(): IAgentUsageMetrics {
        const now = Date.now();
        return {
            timestamp: now,
            component: this.constructor.name,
            category: 'usage',
            version: this.version,
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
                resetTime: now + 3600000
            },
            state: {
                timestamp: now,
                component: this.constructor.name,
                category: 'state',
                version: this.version,
                currentState: 'initial',
                stateTime: 0,
                transitionCount: 0,
                failedTransitions: 0,
                blockedTaskCount: 0,
                historyEntryCount: 0,
                lastHistoryUpdate: now,
                taskStats: {
                    completedCount: 0,
                    failedCount: 0,
                    averageDuration: 0,
                    successRate: 1,
                    averageIterations: 0
                }
            },
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
                    completionTokens: { count: 0, cost: 0 },
                    functionCalls: { count: 0, cost: 0 }
                }
            }
        };
    }

    protected createEventMetrics(): IAgentEventMetrics {
        return {
            timestamp: Date.now(),
            component: this.constructor.name,
            category: 'agent',
            version: this.version,
            resources: this.createResourceMetrics(),
            performance: this.createPerformanceMetrics(),
            usage: this.createUsageMetrics(),
            errors: {
                count: 0,
                type: ERROR_KINDS.SystemError,
                severity: ERROR_SEVERITY_enum.ERROR,
                timestamp: Date.now(),
                message: ''
            },
            warnings: [],
            info: []
        };
    }

    // ─── Status Management ───────────────────────────────────────────────────

    public async setStatus(status: AGENT_STATUS_enum): Promise<void> {
        const previousStatus = this.status;
        this.status = status;
        const now = Date.now();

        await this.emitEvent<AgentEvent>({
            id: `${this.id}-${now}`,
            timestamp: now,
            type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
            agentId: this.id,
            previousStatus,
            newStatus: status,
            reason: 'Status update',
            metadata: {
                component: this.constructor.name,
                operation: 'setStatus',
                timestamp: now,
                category: 'agent_lifecycle',
                source: this.constructor.name,
                correlationId: `${this.id}-status-${now}`,
                agent: {
                    id: this.id,
                    name: this.name,
                    role: this.role,
                    status: status,
                    metrics: {
                        performance: this.createPerformanceMetrics(),
                        resources: this.createResourceMetrics(),
                        usage: this.createUsageMetrics()
                    }
                }
            },
            metrics: this.createEventMetrics()
        });
    }

    // ─── LLM Instance Management ────────────────────────────────────────────

    public async createLLMInstance(): Promise<void> {
        const normalizedConfig = this.normalizeLlmConfig(this.llmConfig);
        if (!normalizedConfig || typeof normalizedConfig !== 'object') {
            throw new Error('Invalid LLM configuration');
        }

        const config = normalizedConfig as ILLMProviderConfig;
        const validationResult = await this.providerManager.validateConfig(config);
        if (!validationResult.isValid) {
            throw new Error(`Invalid LLM configuration: ${validationResult.errors.join(', ')}`);
        }

        const instance = await this.providerManager.getProviderInstance(config);
        if (!instance.success || !instance.data) {
            throw new Error(`Failed to create LLM instance: ${instance.error}`);
        }

        const providerInstance = instance.data as IProviderInstance;

        const baseMetrics: IBaseProviderMetrics = {
            component: this.constructor.name,
            category: 'provider',
            version: this.version,
            provider: config.provider,
            model: config.model,
            latency: 0,
            tokenUsage: { prompt: 0, completion: 0, total: 0 },
            cost: { promptCost: 0, completionCost: 0, totalCost: 0, currency: 'USD' },
            resources: this.createResourceMetrics(),
            performance: this.createPerformanceMetrics(),
            usage: this.createUsageMetrics(),
            timestamp: Date.now()
        };

        if (!Object.values(LLM_PROVIDER_enum).includes(config.provider)) {
            throw new Error(`Invalid provider type: ${config.provider}`);
        }

        const metrics = this.createProviderMetrics(config.provider, baseMetrics);

        this.llmInstance = new LLMInstanceImpl(config, metrics, providerInstance, validationResult);
    }

    private createProviderMetrics(provider: LLM_PROVIDER_enum, baseMetrics: IBaseProviderMetrics): ILLMProviderMetrics {
        const providerMetrics = {
            ...baseMetrics,
            provider
        };

        switch (provider) {
            case LLM_PROVIDER_enum.MISTRAL:
                return {
                    ...providerMetrics,
                    inferenceTime: 0,
                    throughput: 0,
                    gpuMemoryUsage: 0
                } as IMistralMetrics;
            case LLM_PROVIDER_enum.GROQ:
                return {
                    ...providerMetrics,
                    contextWindow: 0,
                    streamingLatency: 0,
                    gpuUtilization: 0
                } as IGroqMetrics;
            case LLM_PROVIDER_enum.OPENAI:
                return {
                    ...providerMetrics,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0,
                    requestOverhead: 0
                } as IOpenAIMetrics;
            case LLM_PROVIDER_enum.ANTHROPIC:
                return {
                    ...providerMetrics,
                    contextUtilization: 0,
                    responseQuality: 0,
                    modelConfidence: 0
                } as IAnthropicMetrics;
            case LLM_PROVIDER_enum.GOOGLE:
                return {
                    ...providerMetrics,
                    safetyRatings: {
                        [HarmCategory.HARM_CATEGORY_UNSPECIFIED]: 0,
                        [HarmCategory.HARM_CATEGORY_HATE_SPEECH]: 0,
                        [HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT]: 0,
                        [HarmCategory.HARM_CATEGORY_HARASSMENT]: 0,
                        [HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT]: 0
                    },
                    modelLatency: 0,
                    apiOverhead: 0
                } as IGoogleMetrics;
            default:
                throw new Error(`Unsupported provider configuration: ${provider}`);
        }
    }
}

// ─── LLM Instance Implementation ────────────────────────────────────────────

class LLMInstanceImpl implements ILLMInstance {
    public readonly id: string;
    public readonly provider: LLM_PROVIDER_enum;
    public readonly config: ILLMProviderConfig;
    public metrics: ILLMProviderMetrics;
    public status: LLM_STATUS_enum;
    public lastUsed: number;
    public errorCount: number;
    public readonly model: IProviderInstance;
    private readonly validationResult: any;

    constructor(
        config: ILLMProviderConfig,
        metrics: ILLMProviderMetrics,
        providerInstance: IProviderInstance,
        validationResult: any
    ) {
        this.id = `${config.provider}-${Date.now()}`;
        this.provider = config.provider;
        this.config = config;
        this.metrics = metrics;
        this.status = LLM_STATUS_enum.READY;
        this.lastUsed = Date.now();
        this.errorCount = 0;
        this.model = providerInstance;
        this.validationResult = validationResult;
    }

    async generate(messages: BaseMessage[], options?: Record<string, unknown>): Promise<LLMResponse> {
        const result = await this.model.invoke(messages, { ...options } as any);
        if (!result || typeof result.content !== 'string') {
            throw new Error('Invalid response from provider');
        }

        return {
            provider: this.provider,
            model: this.config.model,
            message: new AIMessage({ content: result.content }),
            generations: [[{ text: result.content, generationInfo: {} }]],
            llmOutput: {
                tokenUsage: {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                },
                modelOutput: {}
            },
            metrics: this.metrics
        };
    }

    async *generateStream(messages: BaseMessage[], options?: Record<string, unknown>): AsyncGenerator<ExtendedAIMessageChunk, void, unknown> {
        const stream = await this.model.stream(messages, { ...options } as any);
        for await (const chunk of stream) {
            if (chunk && typeof chunk.content === 'string') {
                yield new ExtendedAIMessageChunk({
                    content: chunk.content,
                    additional_kwargs: chunk.additional_kwargs || {}
                });
            }
        }
    }

    async validateConfig(_configToValidate: ILLMProviderConfig) {
        return this.validationResult;
    }

    async cleanup(): Promise<void> {}

    async getMetrics(): Promise<ILLMProviderMetrics> {
        return this.metrics;
    }

    async getStatus(): Promise<LLM_STATUS_enum> {
        return this.status;
    }

    async reset(): Promise<void> {
        this.errorCount = 0;
        this.metrics = { ...this.metrics };
    }
}
