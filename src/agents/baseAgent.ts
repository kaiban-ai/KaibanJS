/**
 * @file BaseAgent.ts
 * @path src/agents/BaseAgent.ts
 * @description Core agent implementation providing base functionality
 */

import { CoreManager } from '../managers/core/coreManager';
import { AgentManager } from '../managers/domain/agent/agentManager';
import { WorkflowManager } from '../managers/domain/workflow/workflowManager';
import { TaskManager } from '../managers/domain/task/taskManager';
import { Tool } from "langchain/tools";  // Use the same import as IBaseAgent
import { StructuredTool } from "@langchain/core/tools";
import { BaseChatModelParams } from '@langchain/core/language_models/chat_models';
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { IBaseAgent, IAgentMetadata, IAgentCapabilities } from '../types/agent/agentBaseTypes';
import { IAgentMetrics } from '../types/agent/agentMetricTypes';
import { ITaskType, ITaskFeedback } from '../types/task';
import { IHandlerResult } from '../types/common/commonHandlerTypes';
import { IAgentExecutionState } from '../types/agent/agentStateTypes';
import { IAgenticLoopResult, ILLMInstance } from '../types/llm/llmInstanceTypes';
import { AGENT_STATUS_enum, FEEDBACK_STATUS_enum, TASK_STATUS_enum } from '../types/common/commonEnums';
import { IValidationSchema } from '../types/common/commonValidationTypes';
import { isLangchainTool, isValidToolName, validateTool, IToolValidationResult } from '../types/tool/toolTypes';
import { AgentValidationSchema } from '../types/agent/agentValidationTypes';
import { createError, ERROR_KINDS, IErrorType } from '../types/common/commonErrorTypes';
import { LLMMetricsCollector } from '../metrics/LLMMetricsCollector';
import { EnhancedMessageHistory } from '../managers/domain/llm/message/enhancedMessageHistory';
import { IMessageHistory, IMessageHistoryConfig } from '../types/llm/message/messagingHistoryTypes';
import { IRuntimeLLMConfig } from '../types/llm/llmCommonTypes';
import { IBaseLLMConfig, createProviderConfig } from '../types/llm/llmProviderTypes';
import { IREACTChampionAgentPrompts } from '../types/agent/promptsTypes';
import { CallbackManager } from '@langchain/core/callbacks/manager';
import { Callbacks } from '@langchain/core/callbacks/manager';
import { ILLMMetrics, ILLMResourceMetrics } from '../types/llm/llmMetricTypes';
import messageMetricsManager from '../managers/domain/llm/messageMetricsManager';
import type { ITimeMetrics } from '../types/metrics/base/performanceMetrics';

// ─── Base Agent Implementation ─────────────────────────────────────────────────

export abstract class BaseAgent extends CoreManager implements IBaseAgent {
    protected readonly agentManager: AgentManager;
    protected readonly workflowManager: WorkflowManager;
    protected readonly taskManager: TaskManager;
    protected readonly metricsCollector: LLMMetricsCollector;
    protected readonly callbackManager: CallbackManager;

    // IBaseAgent required properties
    public readonly id: string;
    public readonly name: string;
    public readonly role: string;
    public readonly goal: string;
    public readonly background: string = '';
    public readonly version: string = '1.0.0';
    public readonly capabilities!: IAgentCapabilities;
    public readonly validationSchema: IValidationSchema<IBaseAgent>;

    public tools: Tool[] = [];  // Base tools array for IBaseAgent compatibility
    protected structuredTools: Map<string, StructuredTool> = new Map();  // Enhanced tools for internal use
    public maxIterations: number = 10;
    public status: AGENT_STATUS_enum = AGENT_STATUS_enum.IDLE;
    public env: Record<string, unknown> | null = null;
    public metrics?: IAgentMetrics;

    // LLM-related properties
    public llmInstance: ILLMInstance | null = null;
    public llmConfig: IRuntimeLLMConfig;
    public llmSystemMessage: string | null = null;
    public forceFinalAnswer: boolean = false;
    public promptTemplates: IREACTChampionAgentPrompts;
    public messageHistory: IMessageHistory;

    public metadata!: IAgentMetadata;
    public executionState!: IAgentExecutionState;

    constructor(config: {
        id: string;
        name: string;
        role: string;
        goal: string;
        tools?: Tool[];
        validationSchema?: IValidationSchema<IBaseAgent>;
        llmConfig: IRuntimeLLMConfig;
        promptTemplates: IREACTChampionAgentPrompts;
        messageHistoryConfig?: IMessageHistoryConfig;
    }) {
        super();
        this.id = config.id;
        this.name = config.name;
        this.role = config.role;
        this.goal = config.goal;

        // Enhanced tool validation using both Langchain and our validation
        if (config.tools) {
            this.tools = this.validateAndInitializeTools(config.tools);
        }

        this.validationSchema = config.validationSchema || this.getDefaultValidationSchema();
        this.llmConfig = config.llmConfig;
        this.promptTemplates = config.promptTemplates;
        this.messageHistory = new EnhancedMessageHistory(config.messageHistoryConfig);

        // Initialize managers
        this.agentManager = AgentManager.getInstance();
        this.workflowManager = WorkflowManager.getInstance();
        this.taskManager = TaskManager.getInstance();

        // Initialize metrics collector and callback manager
        this.metricsCollector = new LLMMetricsCollector();
        this.callbackManager = new CallbackManager();
        this.callbackManager.addHandler(this.metricsCollector);

        // Initialize capabilities and metadata
        this.initializeCapabilities();
        this.initializeMetadata();
        this.initializeExecutionState();

        // Register with domain manager
        this.registerDomainManager('BaseAgent', this);

        // Validate configuration
        this.validateConfiguration();
    }

    // ─── Tool Validation and Initialization ─────────────────────────────────────

    private validateAndInitializeTools(tools: Tool[]): Tool[] {
        const validatedTools: Tool[] = [];
        const errors: string[] = [];
        const validationMetrics: Record<string, unknown> = {};

        for (const tool of tools) {
            try {
                // Track validation start time for metrics
                const validationStartTime = Date.now();
                const toolName = tool?.name || 'unknown';  // Safe access to name

                // Basic type validation using Langchain's built-in checks
                if (!isLangchainTool(tool)) {
                    errors.push(`Tool ${toolName} is not a valid Langchain tool`);
                    validationMetrics[`${toolName}_validation`] = {
                        success: false,
                        error: 'Invalid Langchain tool type',
                        duration: Date.now() - validationStartTime
                    };
                    continue;
                }

                // Enhanced validation with detailed error reporting
                const validationResult = validateTool(tool) as IToolValidationResult;
                if (!validationResult.isValid) {
                    const errorDetails = {
                        errors: validationResult.errors,
                        warnings: validationResult.warnings,
                        toolSpecificErrors: validationResult.toolSpecificErrors
                    };
                    errors.push(
                        `Tool ${tool.name} failed validation:\n` +
                        `Errors: ${errorDetails.errors.join(', ')}\n` +
                        `Warnings: ${errorDetails.warnings?.join(', ') || 'none'}\n` +
                        `Details: ${errorDetails.toolSpecificErrors?.join(', ') || 'none'}`
                    );
                    validationMetrics[`${tool.name}_validation`] = {
                        success: false,
                        errors: errorDetails,
                        duration: Date.now() - validationStartTime
                    };
                    continue;
                }

                // Business logic validation
                if (!isValidToolName(tool.name)) {
                    errors.push(`Tool name ${tool.name} is not in the allowed tool names list`);
                    validationMetrics[`${tool.name}_validation`] = {
                        success: false,
                        error: 'Invalid tool name',
                        duration: Date.now() - validationStartTime
                    };
                    continue;
                }

                // Store structured tool if available
                if ('schema' in tool && tool.schema) {
                    const structuredTool = tool as StructuredTool;
                    this.structuredTools.set(tool.name, structuredTool);

                    // Add metrics collector to callbacks
                    if ('callbacks' in structuredTool) {
                        const existingCallbacks = structuredTool.callbacks || [];
                        structuredTool.callbacks = Array.isArray(existingCallbacks)
                            ? [...existingCallbacks, this.metricsCollector]
                            : [this.metricsCollector];
                    }
                }

                // Add performance monitoring wrapper
                const originalInvoke = tool.invoke.bind(tool);
                tool.invoke = async (...args: Parameters<typeof originalInvoke>) => {
                    const startTime = Date.now();
                    try {
                        const result = await originalInvoke(...args);
                        // Track successful invocation
                        this.metricsCollector.trackToolUsage(tool.name, {
                            success: true,
                            duration: Date.now() - startTime,
                            inputSize: JSON.stringify(args).length,
                            outputSize: JSON.stringify(result).length
                        });
                        return result;
                    } catch (error) {
                        // Track failed invocation
                        this.metricsCollector.trackToolUsage(tool.name, {
                            success: false,
                            duration: Date.now() - startTime,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                        throw error;
                    }
                };

                validatedTools.push(tool);
                validationMetrics[`${tool.name}_validation`] = {
                    success: true,
                    duration: Date.now() - validationStartTime
                };
            } catch (error) {
                // Safe access to name in error handling
                const toolName = (tool as { name?: string })?.name || 'unknown';
                const errorMessage = `Failed to initialize tool ${toolName}: ${error}`;
                errors.push(errorMessage);
                validationMetrics[`${toolName}_validation`] = {
                    success: false,
                    error: errorMessage,
                    duration: 0
                };
            }
        }

        // Store validation metrics
        this.metricsCollector.trackMetrics('tool_validation', {
            totalTools: tools.length,
            validatedTools: validatedTools.length,
            failedValidations: errors.length,
            validationDetails: validationMetrics
        });

        if (errors.length > 0) {
            throw createError({
                message: 'Tool validation failed',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    validationErrors: errors,
                    validationMetrics
                }
            });
        }

        return validatedTools;
    }

    // ─── Initialization Methods ─────────────────────────────────────────────────

    private getDefaultValidationSchema(): IValidationSchema<IBaseAgent> {
        return {
            type: 'object',
            required: true,
            children: {
                id: { type: 'string', required: true },
                name: { type: 'string', required: true },
                role: { type: 'string', required: true },
                goal: { type: 'string', required: true },
                version: { type: 'string', required: false },
                background: { type: 'string', required: false },
                capabilities: { type: 'object', required: true },
                tools: { type: 'array', required: false }
            },
            validator: (value: IBaseAgent) => {
                const result = AgentValidationSchema.safeParse(value);
                return result.success;
            }
        };
    }

    private initializeCapabilities(): void {
        const toolNames = this.tools.map(tool => tool.name).filter(isValidToolName);
        // Create capabilities object first, then assign it
        const capabilities: IAgentCapabilities = {
            canThink: true,
            canUseTools: true,
            canLearn: false,
            supportedToolTypes: toolNames,
            supportedTools: toolNames,
            maxConcurrentTasks: 1,
            memoryCapacity: 1000
        };
        // Use type assertion to assign to readonly property
        (this as { capabilities: IAgentCapabilities }).capabilities = Object.freeze(capabilities);
    }

    private initializeMetadata(): void {
        const toolNames = this.tools.map(tool => tool.name).filter(isValidToolName);
        this.metadata = {
            id: this.id,
            name: this.name,
            capabilities: toolNames,
            skills: [],
            created: new Date(),
            updated: new Date(),
            version: this.version,
            tags: []
        };
    }

    private initializeExecutionState(): void {
        this.executionState = {
            core: {
                status: this.status,
                thinking: false,
                busy: false,
                currentTask: undefined,
                lastOutput: undefined
            },
            timing: {
                startTime: undefined,
                endTime: undefined,
                duration: undefined,
                lastActiveTime: undefined,
                timeouts: {
                    thinking: 30000,
                    execution: 300000,
                    idle: 60000
                }
            },
            error: {
                lastError: undefined,
                errorCount: 0,
                retryCount: 0,
                maxRetries: 3,
                errorHistory: []
            },
            assignment: {
                assignedTasks: [],
                completedTasks: [],
                failedTasks: [],
                blockedTasks: [],
                iterations: 0,
                maxIterations: this.maxIterations,
                taskCapacity: 1
            },
            stateMetrics: {
                timestamp: Date.now(),
                component: 'AgentState',
                category: 'Metrics',
                version: this.version,
                currentState: this.status,
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
            },
            llmMetrics: this.metricsCollector.getMetrics(),
            history: [],
            transitions: []
        };
    }

    private validateConfiguration(): void {
        const validationResult = AgentValidationSchema.safeParse({
            id: this.id,
            name: this.name,
            role: this.role,
            goal: this.goal,
            version: this.version,
            background: this.background,
            capabilities: this.capabilities,
            tools: this.tools,
            env: this.env,
            metadata: this.metadata,
            llmConfig: this.llmConfig,
            messageHistory: this.messageHistory,
            promptTemplates: this.promptTemplates
        });

        if (!validationResult.success) {
            throw createError({
                message: `Invalid agent configuration: ${validationResult.error.message}`,
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    validationErrors: validationResult.error.errors
                }
            });
        }
    }

    // ─── LLM Methods ────────────────────────────────────────────────────────────

    public normalizeLlmConfig(llmConfig: IRuntimeLLMConfig): IBaseLLMConfig {
        try {
            // Add our metrics collector to the callbacks
            const configWithCallbacks = {
                ...llmConfig,
                callbacks: [this.metricsCollector],
                cache: false,
                maxRetries: this.executionState.error.maxRetries,
                verbose: false
            };

            // Use the createProviderConfig helper to ensure type safety
            return createProviderConfig(configWithCallbacks);
        } catch (err) {
            throw createError({
                message: 'Failed to normalize LLM configuration',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    error: err
                }
            });
        }
    }

    public abstract createLLMInstance(): void;

    // ─── Public Methods ─────────────────────────────────────────────────────────

    public async initialize(env: Record<string, unknown>): Promise<void> {
        const result = await this.safeExecute(async () => {
            this.setEnv(env);
            await this.agentManager['initializeAgent'](this);
            this.createLLMInstance();
            this.logInfo(`Initialized agent: ${this.id}`);
        }, `Failed to initialize agent ${this.id}`);

        if (!result.success) {
            throw result.error;
        }
    }

    public async setStatus(status: AGENT_STATUS_enum): Promise<void> {
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
            const previousStatus = this.status;
            this.status = status;
            this.executionState.core.status = status;

            this.updateStateMetrics(status);
            await this.emitStatusChange(previousStatus, status);
        } else {
            throw createError({
                message: `Failed to transition agent status from ${this.status} to ${status}`,
                type: ERROR_KINDS.StateError,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    currentStatus: this.status,
                    targetStatus: status
                }
            });
        }
    }

    public setEnv(env: Record<string, unknown>): void {
        this.env = env;
    }

    public async workOnTask(task: ITaskType): Promise<IAgenticLoopResult> {
        const result = await this.safeExecute(async () => {
            const startTime = Date.now();

            // Enhanced validation with business logic
            if (!task || !task.description || task.status === TASK_STATUS_enum.DONE) {
                const error = createError({
                    message: 'Invalid task or task already completed',
                    type: ERROR_KINDS.ValidationError,
                    context: {
                        component: this.constructor.name,
                        agentId: this.id,
                        taskId: task?.id,
                        validationDetails: {
                            hasTask: !!task,
                            hasDescription: !!task?.description,
                            taskStatus: task?.status
                        }
                    }
                });
                this.logError('Task validation failed', this.id, task?.id, error);
                throw error;
            }

            // Clear message history for new task
            await this.messageHistory.clear();

            // Add system message with agent context
            const systemMessage = new SystemMessage(
                `You are ${this.name}, a ${this.role}. Your goal is: ${this.goal}. ` +
                `You are working on the following task: ${task.description}. ` +
                `Expected output: ${task.expectedOutput}`
            );
            await this.messageHistory.addMessage(systemMessage);

            // Add task context as human message with enhanced structure validation
            const taskContext = {
                taskId: task.id,
                title: task.title,
                description: task.description,
                expectedOutput: task.expectedOutput,
                inputs: task.inputs,
                metadata: task.metadata
            };

            // Validate task context structure
            if (!taskContext.taskId || !taskContext.title || !taskContext.description) {
                const error = createError({
                    message: 'Invalid task context structure',
                    type: ERROR_KINDS.ValidationError,
                    context: {
                        component: this.constructor.name,
                        agentId: this.id,
                        taskId: task.id,
                        validationDetails: {
                            hasTaskId: !!taskContext.taskId,
                            hasTitle: !!taskContext.title,
                            hasDescription: !!taskContext.description
                        }
                    }
                });
                this.logError('Task context validation failed', this.id, task.id, error);
                throw error;
            }

            const taskContextMessage = new HumanMessage(JSON.stringify(taskContext));
            await this.messageHistory.addMessage(taskContextMessage);

            // Get response from LLM with enhanced error context
            if (!this.llmInstance) {
                const error = createError({
                    message: 'LLM instance not initialized',
                    type: ERROR_KINDS.StateError,
                    context: {
                        component: this.constructor.name,
                        agentId: this.id,
                        taskId: task.id,
                        state: {
                            hasLLMInstance: false,
                            agentStatus: this.status,
                            messageHistoryLength: await this.messageHistory.getMessages().then(m => m.length)
                        }
                    }
                });
                this.logError('LLM instance validation failed', this.id, task.id, error);
                throw error;
            }

            const messages = await this.messageHistory.getMessages();
            const response = await this.llmInstance.generate(messages);

            // Add AI response to history
            const aiMessage = new AIMessage(String(response.message.content));
            await this.messageHistory.addMessage(aiMessage);

            // Update task progress with enhanced metrics
            task.progress = {
                ...task.progress,
                status: TASK_STATUS_enum.DOING,
                progress: 50,
                timeElapsed: Date.now() - (task.metrics.startTime || Date.now()),
                currentStep: 'Processing LLM response'
            };

            // Convert provider metrics to ILLMMetrics format
            const resourceMetrics: ILLMResourceMetrics = {
                cpuUsage: this.llmInstance.metrics.resources.cpuUsage,
                memoryUsage: this.llmInstance.metrics.resources.memoryUsage,
                diskIO: this.llmInstance.metrics.resources.diskIO,
                networkUsage: this.llmInstance.metrics.resources.networkUsage,
                gpuMemoryUsage: 0, // Default if not available
                modelMemoryAllocation: {
                    weights: 0,
                    cache: 0,
                    workspace: 0
                },
                timestamp: Date.now()
            };

            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Create time metrics objects
            const timeMetrics: ITimeMetrics = {
                total: executionTime,
                average: executionTime,
                min: executionTime,
                max: executionTime
            };

            const llmMetrics: ILLMMetrics = {
                resources: resourceMetrics,
                performance: {
                    executionTime: timeMetrics,
                    latency: timeMetrics, // Use same time metrics for now
                    throughput: {
                        operationsPerSecond: 1, // Default to 1 operation for this task
                        dataProcessedPerSecond: 0 // Default if not available
                    },
                    responseTime: timeMetrics, // Use same time metrics for now
                    queueLength: this.llmInstance.metrics.performance.queueLength,
                    errorRate: this.llmInstance.metrics.performance.errorRate,
                    successRate: this.llmInstance.metrics.performance.successRate,
                    errorMetrics: {
                        totalErrors: 0, // Default if not available
                        errorRate: 0 // Default if not available
                    },
                    resourceUtilization: resourceMetrics,
                    tokensPerSecond: 0, // Default if not available
                    coherenceScore: 0, // Default if not available
                    temperatureImpact: 0, // Default if not available
                    timestamp: Date.now()
                },
                usage: {
                    totalRequests: this.llmInstance.metrics.usage.totalRequests,
                    activeInstances: 1, // Default to 1 active instance
                    activeUsers: 1, // Default to 1 active user
                    requestsPerSecond: this.llmInstance.metrics.usage.requestsPerSecond,
                    averageResponseLength: 0, // Default if not available
                    averageResponseSize: this.llmInstance.metrics.usage.averageResponseSize,
                    peakMemoryUsage: this.llmInstance.metrics.usage.peakMemoryUsage,
                    uptime: this.llmInstance.metrics.usage.uptime,
                    rateLimit: this.llmInstance.metrics.usage.rateLimit,
                    tokenDistribution: {
                        prompt: 0,
                        completion: 0,
                        total: 0
                    },
                    modelDistribution: {
                        gpt4: 0,
                        gpt35: 0,
                        other: 1 // Default to other model
                    },
                    timestamp: Date.now()
                },
                timestamp: Date.now()
            };

            // Store metrics in message metrics manager
            await messageMetricsManager.collectMetrics(task.id, llmMetrics);

            // Return result matching IAgenticLoopResult interface exactly
            return {
                success: true,
                output: String(response.message.content),
                metrics: this.llmInstance.metrics
            };
        }, `Failed to work on task ${task.id}`);

        if (!result.success || !result.data) {
            throw result.error || new Error('Failed to work on task');
        }

        return result.data;
    }

    public async workOnFeedback(task: ITaskType, feedbackList: ITaskFeedback[], context: string): Promise<void> {
        await this.safeExecute(
            async () => {
                this.logInfo(`Processing feedback for task ${task.id}: ${feedbackList.length} items`);

                // Add feedback context to message history
                const feedbackContext = new SystemMessage(
                    `Processing feedback for task ${task.id}. Context: ${context}`
                );
                await this.messageHistory.addMessage(feedbackContext);

                for (const feedback of feedbackList) {
                    // Add feedback as human message
                    const feedbackMessage = new HumanMessage(
                        `Feedback: ${feedback.content}\n` +
                        `Category: ${feedback.category}\n` +
                        `Priority: ${feedback.priority}`
                    );
                    await this.messageHistory.addMessage(feedbackMessage);

                    await this.taskManager.emitTaskFeedbackAdded({
                        taskId: task.id,
                        feedback: {
                            id: `${task.id}_${Date.now()}`,
                            content: feedback.content,
                            status: FEEDBACK_STATUS_enum.PENDING,
                            timestamp: new Date(),
                            userId: feedback.userId,
                            category: feedback.category,
                            priority: feedback.priority,
                            assignedTo: feedback.assignedTo
                        }
                    });
                }

                this.metadata.updated = new Date();
            },
            `Failed to process feedback for task ${task.id}`
        );
    }

    public abstract think(): Promise<IHandlerResult<unknown>>;

    public async cleanup(): Promise<void> {
        const result = await this.safeExecute(
            async () => {
                if (this.llmInstance) {
                    await this.llmInstance.cleanup();
                }
                await this.messageHistory.clear();
                this.metricsCollector.reset();
                await this.agentManager['cleanupAgent'](this.id);
                this.logInfo(`Disposed agent: ${this.id}`);
            },
            `Failed to cleanup agent ${this.id}`
        );

        if (!result.success) {
            throw result.error;
        }
    }

    // ─── Protected Methods ──────────────────────────────────────────────────────

    protected handleError(error: Error | unknown, context: string): void {
        super.handleError(error, context, 'AgentError');
    }

    private updateStateMetrics(status: AGENT_STATUS_enum): void {
        const newStateMetrics = {
            ...this.executionState.stateMetrics,
            currentState: status,
            transitionCount: this.executionState.stateMetrics.transitionCount + 1,
            lastHistoryUpdate: Date.now()
        };

        this.executionState = {
            ...this.executionState,
            stateMetrics: newStateMetrics,
            transitions: [
                ...this.executionState.transitions,
                {
                    from: this.status,
                    to: status,
                    timestamp: new Date(),
                    reason: 'Status update'
                }
            ]
        };
    }

    private async emitStatusChange(previousStatus: AGENT_STATUS_enum, newStatus: AGENT_STATUS_enum): Promise<void> {
        this.metadata.updated = new Date();

        await this.agentManager.getEventEmitter().emitAgentStatusChanged({
            agentId: this.id,
            previousStatus,
            newStatus,
            reason: 'Status update'
        });

        this.logInfo(`Agent ${this.id} status changed to ${newStatus}`);
    }
}
