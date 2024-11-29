/**
 * @file baseAgent.ts
 * @path src/agents/baseAgent.ts
 * @description Base agent implementation providing core functionality
 */

import { CoreManager } from '../managers/core/coreManager';
import { AgentManager } from '../managers/domain/agent/agentManager';
import { WorkflowManager } from '../managers/domain/workflow/workflowManager';
import { TaskManager } from '../managers/domain/task/taskManager';
import { Tool } from 'langchain/tools';
import { IBaseAgent, IAgentMetadata, IAgentCapabilities, IAgentMetrics } from '../types/agent/agentBaseTypes';
import { ITaskType, ITaskFeedback } from '../types/task/taskBaseTypes';
import { IHandlerResult } from '../types/common/commonHandlerTypes';
import { IAgentExecutionState } from '../types/agent/agentStateTypes';
import { IAgenticLoopResult } from '../types/llm/llmInstanceTypes';
import { AGENT_STATUS_enum } from '../types/common/commonEnums';
import { IValidationSchema } from '../types/common/commonValidationTypes';
import { IAgentStoreMethods } from '../types/agent/agentStoreTypes';
import { ILLMConfig, IRuntimeLLMConfig, createProviderConfig, isRuntimeConfig } from '../types/llm/llmCommonTypes';
import { ILLMInstance } from '../types/llm/llmInstanceTypes';
import { IMessageHistory } from '../types/llm/message/messagingHistoryTypes';
import { IREACTChampionAgentPrompts } from '../types/agent/promptsTypes';
import { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../types/metrics/base/performanceMetrics';
import { IRateLimitMetrics } from '../types/metrics/base/usageMetrics';
import { isLangchainTool, isValidToolName } from '../types/tool/toolTypes';
import { AgentValidationSchema } from '../types/agent/agentValidationTypes';
import { createError } from '../types/common/commonErrorTypes';

/**
 * Base Agent Class
 * Provides core functionality for all agent implementations
 */
export abstract class BaseAgent extends CoreManager implements IBaseAgent {
    protected readonly agentManager: AgentManager;
    protected readonly workflowManager: WorkflowManager;
    protected readonly taskManager: TaskManager;

    // IBaseAgent required properties
    public readonly id: string;
    public readonly name: string;
    public readonly role: string;
    public readonly goal: string;
    public readonly background: string = '';
    public readonly version: string = '1.0.0';
    public readonly capabilities: IAgentCapabilities;
    public readonly validationSchema: IValidationSchema<IBaseAgent> = {
        required: ['id', 'name', 'role', 'goal'],
        constraints: {
            id: { type: 'string', required: true },
            name: { type: 'string', required: true },
            role: { type: 'string', required: true },
            goal: { type: 'string', required: true },
            version: { type: 'string', required: false },
            background: { type: 'string', required: false },
            capabilities: { type: 'object', required: true },
            llmConfig: { type: 'object', required: true },
            tools: { type: 'array', required: false }
        },
        customValidation: (value: IBaseAgent) => {
            return AgentValidationSchema.safeParse(value).success;
        }
    };

    public tools: Tool[] = [];
    public maxIterations: number = 10;
    public store: IAgentStoreMethods;
    public status: keyof typeof AGENT_STATUS_enum = AGENT_STATUS_enum.IDLE;
    public env: Record<string, unknown> | null = null;
    public metrics?: IAgentMetrics;

    public llmInstance: ILLMInstance | null = null;
    public llmConfig: IRuntimeLLMConfig;
    public llmSystemMessage: string | null = null;
    public forceFinalAnswer: boolean = false;
    public promptTemplates: IREACTChampionAgentPrompts;
    public messageHistory: IMessageHistory;

    public metadata: IAgentMetadata;
    public executionState: IAgentExecutionState;

    constructor(config: {
        id: string;
        name: string;
        role: string;
        goal: string;
        tools?: Tool[];
        llmConfig: IRuntimeLLMConfig;
        promptTemplates: IREACTChampionAgentPrompts;
        messageHistory: IMessageHistory;
        store: IAgentStoreMethods;
    }) {
        super();
        this.id = config.id;
        this.name = config.name;
        this.role = config.role;
        this.goal = config.goal;
        this.tools = config.tools?.filter(isLangchainTool) || [];
        this.llmConfig = config.llmConfig;
        this.promptTemplates = config.promptTemplates;
        this.messageHistory = config.messageHistory;
        this.store = config.store;

        // Initialize managers
        this.agentManager = AgentManager.getInstance();
        this.workflowManager = WorkflowManager.getInstance();
        this.taskManager = TaskManager.getInstance();
        this.registerDomainManager('BaseAgent', this);

        // Get tool names from tools and validate them
        const toolNames = this.tools
            .map(tool => tool.name)
            .filter(isValidToolName);

        this.capabilities = {
            canThink: true,
            canUseTools: true,
            canLearn: false,
            supportedToolTypes: toolNames,
            supportedTools: toolNames,
            maxConcurrentTasks: 1,
            memoryCapacity: 1000
        };

        this.metadata = {
            id: this.id,
            name: this.name,
            capabilities: toolNames,
            skills: [],
            created: new Date()
        };

        const defaultTimeMetrics: ITimeMetrics = {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };

        const defaultThroughputMetrics: IThroughputMetrics = {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        };

        const defaultErrorMetrics: IErrorMetrics = {
            totalErrors: 0,
            errorRate: 0
        };

        const defaultRateLimitMetrics: IRateLimitMetrics = {
            current: 0,
            limit: 0,
            remaining: 0,
            resetTime: 0
        };

        this.executionState = {
            status: this.status,
            thinking: false,
            busy: false,
            errorCount: 0,
            retryCount: 0,
            maxRetries: 3,
            assignedTasks: [],
            completedTasks: [],
            failedTasks: [],
            blockedTasks: [],
            iterations: 0,
            maxIterations: this.maxIterations,
            performance: {
                completedTaskCount: 0,
                failedTaskCount: 0,
                averageTaskDuration: 0,
                successRate: 0,
                averageIterationsPerTask: 0
            },
            metrics: {
                resources: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    gpuMemoryUsage: 0,
                    modelMemoryAllocation: { weights: 0, cache: 0, workspace: 0 },
                    timestamp: Date.now()
                },
                performance: {
                    executionTime: defaultTimeMetrics,
                    latency: defaultTimeMetrics,
                    throughput: defaultThroughputMetrics,
                    responseTime: defaultTimeMetrics,
                    queueLength: 0,
                    errorRate: 0,
                    successRate: 0,
                    errorMetrics: defaultErrorMetrics,
                    resourceUtilization: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        diskIO: { read: 0, write: 0 },
                        networkUsage: { upload: 0, download: 0 },
                        gpuMemoryUsage: 0,
                        modelMemoryAllocation: { weights: 0, cache: 0, workspace: 0 },
                        timestamp: Date.now()
                    },
                    tokensPerSecond: 0,
                    coherenceScore: 0,
                    temperatureImpact: 0,
                    timestamp: Date.now()
                },
                usage: {
                    totalRequests: 0,
                    activeInstances: 0,
                    activeUsers: 0,  // Added missing field
                    requestsPerSecond: 0,
                    averageResponseLength: 0,
                    averageResponseSize: 0,  // Added missing field
                    peakMemoryUsage: 0,
                    uptime: 0,
                    rateLimit: defaultRateLimitMetrics,
                    tokenDistribution: {
                        prompt: 0,
                        completion: 0,
                        total: 0
                    },
                    modelDistribution: {
                        gpt4: 0,
                        gpt35: 0,
                        other: 0
                    },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            },
            history: []
        };

        // Validate the configuration using Zod schema
        const validationResult = AgentValidationSchema.safeParse({
            id: this.id,
            name: this.name,
            role: this.role,
            goal: this.goal,
            version: this.version,
            background: this.background,
            capabilities: this.capabilities,
            llmConfig: this.llmConfig,
            llmSystemMessage: this.llmSystemMessage,
            forceFinalAnswer: this.forceFinalAnswer,
            tools: this.tools,
            env: this.env,
            metadata: this.metadata,
            promptTemplates: this.promptTemplates,
            executionConfig: {
                maxRetries: this.executionState.maxRetries,
                timeoutMs: 30000,
                errorThreshold: 5
            }
        });

        if (!validationResult.success) {
            throw createError({
                message: `Invalid agent configuration: ${validationResult.error.message}`,
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    validationErrors: validationResult.error.errors
                }
            });
        }
    }

    /**
     * Initialize agent
     */
    public async initialize(store: IAgentStoreMethods, env: Record<string, unknown>): Promise<void> {
        const result = await this.safeExecute(async () => {
            this.setStore(store);
            this.setEnv(env);
            await this.agentManager['initializeAgent'](this);
            this.logInfo(`Initialized agent: ${this.id}`);
        }, `Failed to initialize agent ${this.id}`);

        if (!result.success) {
            throw result.error;
        }
    }

    /**
     * Set agent store
     */
    public setStore(store: IAgentStoreMethods): void {
        this.store = store;
    }

    /**
     * Set agent status with proper transition handling
     */
    public async setStatus(status: keyof typeof AGENT_STATUS_enum): Promise<void> {
        const result = await this.handleStatusTransition({
            entity: 'agent',
            entityId: this.id,
            currentStatus: this.status,
            targetStatus: status,
            context: {
                agentId: this.id,
                agentName: this.name,
                operation: 'status_change'
            }
        });

        if (result) {
            this.status = status;
            this.executionState.status = status;
            this.logInfo(`Agent ${this.id} status changed to ${status}`);
        } else {
            throw createError({
                message: `Failed to transition agent status from ${this.status} to ${status}`,
                type: 'StateError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    currentStatus: this.status,
                    targetStatus: status
                }
            });
        }
    }

    /**
     * Set agent environment
     */
    public setEnv(env: Record<string, unknown>): void {
        this.env = env;
    }

    /**
     * Execute task - abstract method to be implemented by specific agent types
     */
    public abstract workOnTask(task: ITaskType): Promise<IAgenticLoopResult>;

    /**
     * Handle task feedback
     */
    public async workOnFeedback(task: ITaskType, feedbackList: ITaskFeedback[]): Promise<void> {
        await this.safeExecute(
            async () => {
                this.logInfo(`Processing feedback for task ${task.id}: ${feedbackList.length} items`);
                // Base implementation - override in specific agent implementations
            },
            `Failed to process feedback for task ${task.id}`
        );
    }

    /**
     * Normalize LLM config by converting runtime config to provider-specific config
     */
    public normalizeLlmConfig(llmConfig: IRuntimeLLMConfig): ILLMConfig {
        try {
            if (!isRuntimeConfig(llmConfig)) {
                throw new Error('Invalid runtime LLM configuration');
            }

            const normalizedConfig = createProviderConfig({
                ...llmConfig,
                provider: llmConfig.provider,
                model: llmConfig.model
            });

            // Validate the normalized config
            const validationResult = AgentValidationSchema.shape.llmConfig.safeParse(normalizedConfig);
            if (!validationResult.success) {
                throw new Error(`Invalid LLM configuration: ${validationResult.error.message}`);
            }

            return normalizedConfig;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error during LLM config normalization');
            throw createError({
                message: `Failed to normalize LLM config: ${error.message}`,
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    config: llmConfig,
                    error: error
                }
            });
        }
    }

    /**
     * Create LLM instance
     */
    public abstract createLLMInstance(): void;

    /**
     * Think about next action
     */
    public abstract think(): Promise<IHandlerResult<unknown>>;

    /**
     * Handle error with proper context
     */
    protected handleError(error: Error | unknown, context: string): void {
        super.handleError(error, context, 'AgentError');
    }

    /**
     * Cleanup with proper error handling
     */
    public async cleanup(): Promise<void> {
        const result = await this.safeExecute(
            async () => {
                await this.agentManager['cleanupAgent'](this.id);
                this.logInfo(`Disposed agent: ${this.id}`);
            },
            `Failed to cleanup agent ${this.id}`
        );

        if (!result.success) {
            throw result.error;
        }
    }
}
