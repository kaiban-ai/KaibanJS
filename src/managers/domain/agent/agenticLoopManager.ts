/**
 * @file agenticLoopManager.ts
 * @path src/managers/domain/agent/agenticLoopManager.ts
 * @description Orchestrates the agentic loop execution using Langchain integration
 */

import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/errorTypes';
import { AgentTypeGuards } from '../../../types/agent/agentTypeGuards';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { isLangchainTool } from '../../../types/tool/toolTypes';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';

// Manager imports
import CacheInitManager from './cache/cacheInitManager';
import AgenticLoopStateManager from './agenticLoopStateManager';
import AgentMetricsManager from './agentMetricsManager';
import IterationManager from './iterationManager';
import ThinkingManager from './thinkingManager';
import ToolManager from './toolManager';
import { MetricsManager } from '../../core/metricsManager';

// Type imports
import type { IReactChampionAgent } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type {
    ILoopContext,
    ILoopExecutionParams,
    ILoopHandlerResult,
    ILoopResult,
    ILoopHandlerMetadata,
    IStateTransaction
} from '../../../types/agent/executionFlow';
import type { IAgenticLoopManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import type { ILLMUsageMetrics } from '../../../types/llm/llmMetricTypes';

// ─── Manager Implementation ───────────────────────────────────────────────────

export class AgenticLoopManager extends CoreManager implements IAgenticLoopManager {
    private static instance: AgenticLoopManager;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;

    private constructor() {
        super();
        this.registerDomainManager('CacheInitManager', CacheInitManager);
        this.registerDomainManager('AgenticLoopStateManager', AgenticLoopStateManager);
        this.registerDomainManager('AgentMetricsManager', AgentMetricsManager);
        this.registerDomainManager('IterationManager', IterationManager);
        this.registerDomainManager('ThinkingManager', ThinkingManager);
        this.registerDomainManager('ToolManager', ToolManager);
        this.registerDomainManager('MetricsManager', MetricsManager);
    }

    public static getInstance(): AgenticLoopManager {
        if (!AgenticLoopManager.instance) {
            AgenticLoopManager.instance = new AgenticLoopManager();
        }
        return AgenticLoopManager.instance;
    }

    /**
     * Initialize the manager and its dependencies
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            const cacheInitManager = this.getDomainManager<typeof CacheInitManager>('CacheInitManager');
            await cacheInitManager.initialize();
            this.isInitialized = true;
        } catch (error) {
            throw createError({
                message: 'AgenticLoopManager initialization failed',
                type: 'InitializationError',
                context: { error },
            });
        }
    }

    /**
     * Validate loop parameters
     */
    public async validate(params: ILoopExecutionParams): Promise<boolean> {
        try {
            if (!params.agent || !params.task) {
                return false;
            }

            if (!AgentTypeGuards.isReactChampionAgent(params.agent)) {
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get manager metadata
     */
    public getMetadata(): IBaseManagerMetadata {
        return {
            category: MANAGER_CATEGORY_enum.EXECUTION,
            operation: 'executeLoop',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: ''
            },
            timestamp: Date.now(),
            component: 'AgenticLoopManager'
        };
    }

    /**
     * Execute the agentic loop
     */
    public async executeLoop(params: ILoopExecutionParams): Promise<ILoopResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const isValid = await this.validate(params);
        if (!isValid) {
            throw createError({
                message: 'Invalid loop execution parameters',
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    params
                }
            });
        }

        // Ensure agent is ReactChampionAgent
        if (!AgentTypeGuards.isReactChampionAgent(params.agent)) {
            throw createError({
                message: 'Agent must be a ReactChampionAgent',
                type: 'ValidationError',
                context: {
                    component: this.constructor.name,
                    agentId: params.agent?.id,
                    agentType: params.agent?.constructor.name,
                },
            });
        }

        const agent = params.agent;
        const { task, feedbackMessage } = params;
        const loopKey = this.generateLoopKey(agent.id, task.id);
        const metadata = await this.createLoopMetadata(agent, task);

        // Setup cache
        const cacheInitManager = this.getDomainManager<typeof CacheInitManager>('CacheInitManager');
        const langchainCache = cacheInitManager.createLangchainCacheAdapter(agent.id, task.id);
        const llm = agent.executableAgent.runnable as BaseChatModel;
        llm.cache = langchainCache;

        try {
            const result = await this.executeLoopIteration(agent, task, loopKey, metadata, undefined, feedbackMessage);
            return result.data as ILoopResult;
        } catch (error) {
            const errorResult = await this.handleLoopError(error, agent, task, metadata);
            return errorResult.data as ILoopResult;
        }
    }

    /**
     * Execute a single loop iteration
     */
    private async executeLoopIteration(
        agent: IReactChampionAgent,
        task: ITaskType,
        loopKey: string,
        metadata: ILoopHandlerMetadata,
        context?: ILoopContext,
        feedbackMessage?: string
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const stateManager = this.getDomainManager<typeof AgenticLoopStateManager>('AgenticLoopStateManager');
        const iterationManager = this.getDomainManager<typeof IterationManager>('IterationManager');
        const thinkingManager = this.getDomainManager<typeof ThinkingManager>('ThinkingManager');

        let iterations = context?.iterations || 0;
        let lastOutput = context?.lastOutput;

        // Get iteration context from iteration manager
        const iterationResult = await iterationManager.handleIterationStart({
            agent,
            task,
            iterations,
            maxAgentIterations: agent.maxIterations
        });

        // Convert iteration context to loop context
        const loopContext = context || await this.convertToLoopContext(iterationResult.data);
        if (!loopContext) {
            throw createError({
                message: 'Failed to create loop context',
                type: 'InitializationError',
                context: { agent, task }
            });
        }

        // Begin state transaction
        const transactionId = stateManager.beginTransaction(loopKey, loopContext);

        try {
            while (iterations < agent.maxIterations) {
                const thinkingResult = await thinkingManager.executeThinking({
                    agent,
                    task,
                    ExecutableAgent: agent.executableAgent,
                    feedbackMessage: iterations === 0 ? feedbackMessage : undefined,
                });

                if (!thinkingResult?.data) {
                    throw createError({
                        message: 'No data from thinking phase',
                        type: 'ValidationError',
                        context: { agentId: agent.id, taskId: task.id, iterations },
                    });
                }

                const messages = thinkingResult.data.messages as BaseMessage[];
                lastOutput = thinkingResult.data.output;

                // Check for final answer
                const finalAnswerMessage = messages.find(
                    (msg: BaseMessage) => msg instanceof AIMessage && typeof msg.content === 'string' && msg.content.includes('Final Answer:')
                );

                if (finalAnswerMessage) {
                    await iterationManager.handleIterationEnd({
                        agent,
                        task,
                        iterations,
                        maxAgentIterations: agent.maxIterations
                    });

                    stateManager.commitTransaction(transactionId);
                    return this.handleLoopCompletion(agent, task, iterations, lastOutput, loopContext, loopKey);
                }

                // Handle action if present
                const actionMessage = messages.find(
                    (msg: BaseMessage) => msg instanceof AIMessage && typeof msg.content === 'string' && msg.content.includes('Action:')
                ) as AIMessage | undefined;

                if (actionMessage && typeof actionMessage.content === 'string') {
                    await this.handleToolExecution(agent, task, actionMessage, messages);
                }

                iterations++;
                loopContext.iterations = iterations;
                loopContext.lastUpdateTime = Date.now();
            }

            stateManager.commitTransaction(transactionId);
            return this.handleMaxIterations(agent, task, iterations, lastOutput);
        } catch (error) {
            stateManager.rollbackTransaction(transactionId);
            throw error;
        }
    }

    /**
     * Convert iteration context to loop context
     */
    private async convertToLoopContext(iterationContext: any): Promise<ILoopContext> {
        const metricsManager = this.getDomainManager<typeof AgentMetricsManager>('AgentMetricsManager');
        const metrics = await metricsManager.getCurrentMetrics(iterationContext.agentId);

        return {
            startTime: iterationContext.startTime,
            endTime: iterationContext.endTime,
            iterations: iterationContext.iterations,
            maxIterations: iterationContext.maxIterations,
            lastUpdateTime: iterationContext.lastUpdateTime,
            status: iterationContext.status,
            error: iterationContext.error,
            performance: metrics.performance,
            resources: metrics.resources,
            usage: metrics.usage,
            costs: metrics.usage.costs,
            lastOutput: iterationContext.lastOutput
        };
    }

    /**
     * Generate a unique loop key
     */
    private generateLoopKey(agentId: string, taskId: string): string {
        return `${agentId}:${taskId}:${Date.now()}`;
    }

    /**
     * Create loop metadata
     */
    private async createLoopMetadata(agent: IReactChampionAgent, task: ITaskType): Promise<ILoopHandlerMetadata> {
        const metricsManager = this.getDomainManager<typeof AgentMetricsManager>('AgentMetricsManager');
        const metrics = await metricsManager.getCurrentMetrics(agent.id);

        const llmUsageMetrics: ILLMUsageMetrics = {
            totalRequests: 0,
            activeInstances: 1,
            activeUsers: 0,
            requestsPerSecond: 0,
            averageResponseLength: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: Date.now()
            },
            tokenDistribution: {
                prompt: 0,
                completion: 0,
                total: 0
            },
            modelDistribution: {
                gpt4: 0,
                gpt35: 0,
                other: 1
            },
            timestamp: Date.now()
        };

        return {
            ...createBaseMetadata('AgenticLoopManager', 'executeLoop'),
            loop: {
                iterations: 0,
                maxIterations: agent.maxIterations,
                status: 'running',
                performance: metrics.performance,
                context: {
                    startTime: Date.now(),
                    endTime: undefined,
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                resources: metrics.resources,
                usage: metrics.usage,
                costs: metrics.usage.costs,
                llmUsageMetrics
            },
            agent: {
                id: agent.id,
                name: agent.name,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageMetrics,
                    performance: metrics.performance
                }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageMetrics,
                    performance: metrics.performance
                }
            }
        };
    }

    /**
     * Handle tool execution
     */
    private async handleToolExecution(
        agent: IReactChampionAgent,
        task: ITaskType,
        actionMessage: AIMessage,
        messages: BaseMessage[]
    ): Promise<void> {
        if (typeof actionMessage.content !== 'string') return;

        const actionMatch = actionMessage.content.match(/Action:\s*(\w+)/);
        const inputMatch = actionMessage.content.match(/Action Input:\s*({[^}]+})/);

        if (actionMatch) {
            const action = actionMatch[1];
            const actionInput = inputMatch ? JSON.parse(inputMatch[1]) : {};

            const tool = agent.tools.find(t => t.name === action);
            if (!tool || !isLangchainTool(tool)) {
                throw createError({
                    message: `Tool ${action} not found or invalid`,
                    type: 'NotFoundError',
                    context: {
                        agentId: agent.id,
                        taskId: task.id,
                        action,
                        availableTools: agent.tools.map(t => t.name),
                    },
                });
            }

            const toolManager = this.getDomainManager<typeof ToolManager>('ToolManager');
            const result = await toolManager.executeTool({
                agent,
                task,
                tool,
                input: actionInput,
                messages,
            });

            if (!result.success) {
                throw createError({
                    message: result.error?.message || 'Unknown tool execution error',
                    type: 'ExecutionError',
                    context: {
                        agentId: agent.id,
                        taskId: task.id,
                        action,
                        toolError: result.error,
                    },
                });
            }
        }
    }

    /**
     * Handle loop completion
     */
    private async handleLoopCompletion(
        agent: IReactChampionAgent,
        task: ITaskType,
        iterations: number,
        lastOutput: any,
        context: ILoopContext,
        loopKey: string
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const stateManager = this.getDomainManager<typeof AgenticLoopStateManager>('AgenticLoopStateManager');

        context.status = 'completed';
        context.lastOutput = lastOutput;
        context.endTime = Date.now();

        await stateManager.cleanup(loopKey);

        const result: ILoopResult = {
            success: true,
            result: lastOutput,
            metadata: {
                iterations,
                maxAgentIterations: agent.maxIterations,
                metrics: {
                    performance: context.performance,
                    resources: context.resources,
                    usage: context.usage,
                    costs: context.costs,
                },
            },
        };

        return {
            success: true,
            data: result,
            metadata: await this.createLoopMetadata(agent, task)
        };
    }

    /**
     * Handle max iterations error
     */
    private async handleMaxIterations(
        agent: IReactChampionAgent,
        task: ITaskType,
        iterations: number,
        lastOutput: any
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const iterationManager = this.getDomainManager<typeof IterationManager>('IterationManager');

        const iterationResult = await iterationManager.handleMaxIterationsError({
            agent,
            task,
            iterations,
            maxIterations: agent.maxIterations,
            error: createError({
                message: `Max iterations (${agent.maxIterations}) reached`,
                type: 'ExecutionError',
                context: {
                    agentId: agent.id,
                    taskId: task.id,
                    iterations,
                    maxIterations: agent.maxIterations,
                },
            }),
        });

        const metricsManager = this.getDomainManager<typeof AgentMetricsManager>('AgentMetricsManager');
        const metrics = await metricsManager.getCurrentMetrics(agent.id);

        const result: ILoopResult = {
            success: false,
            result: lastOutput,
            metadata: {
                iterations,
                maxAgentIterations: agent.maxIterations,
                metrics: {
                    performance: metrics.performance,
                    resources: metrics.resources,
                    usage: metrics.usage,
                    costs: metrics.usage.costs,
                },
            },
        };

        return {
            success: false,
            data: result,
            metadata: await this.createLoopMetadata(agent, task)
        };
    }

    /**
     * Handle loop error
     */
    private async handleLoopError(error: any, agent: IReactChampionAgent, task: ITaskType, metadata: any): Promise<ILoopHandlerResult<ILoopResult>> {
        const metricsManager = this.getDomainManager<typeof AgentMetricsManager>('AgentMetricsManager');
        const metrics = await metricsManager.getCurrentMetrics(agent.id);

        const result: ILoopResult = {
            success: false,
            error: createError({
                message: error instanceof Error ? error.message : String(error),
                type: 'ExecutionError',
                context: {
                    component: this.constructor.name,
                    agentId: agent.id,
                    taskId: task.id,
                    error,
                },
            }),
            metadata: {
                iterations: 0,
                maxAgentIterations: agent.maxIterations,
                metrics: {
                    performance: metrics.performance,
                    resources: metrics.resources,
                    usage: metrics.usage,
                    costs: metrics.usage.costs,
                },
            },
        };

        return {
            success: false,
            data: result,
            metadata: await this.createLoopMetadata(agent, task)
        };
    }
}

export default AgenticLoopManager.getInstance();
