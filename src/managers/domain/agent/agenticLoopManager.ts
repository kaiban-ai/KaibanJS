/**
 * @file agenticLoopManager.ts
 * @path src/managers/domain/agent/agenticLoopManager.ts
 * @description Orchestrates the agentic loop execution using Langchain integration
 */

import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { CoreManager } from '../../core/coreManager';
import { createError, ERROR_KINDS, type IErrorType } from '../../../types/common/errorTypes';
import { AgentTypeGuards } from '../../../types/agent/agentTypeGuards';
import { createBaseMetadata} from '../../../types/common/baseTypes';
import { isLangchainTool } from '../../../types/tool/toolTypes';
import { MANAGER_CATEGORY_enum, ERROR_SEVERITY_enum, AGENT_STATUS_enum } from '../../../types/common/enumTypes';

// Manager imports
import AgenticLoopStateManager from './agenticLoopStateManager';
import CacheInitManager from './cache/cacheInitManager';
import ThinkingManager from './thinkingManager';
import ToolManager from './toolManager';

// Type imports
import type { IReactChampionAgent } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import type { IToolHandlerParams } from '../../../types/tool/toolHandlerTypes';
import {
    createLoopHandlerResult,
    type ILoopContext,
    type ILoopExecutionParams,
    type ILoopHandlerResult,
    type ILoopResult,
    type ILoopHandlerMetadata,
    type ExecutionStatus
} from '../../../types/agent/agentExecutionFlow';
import type { IAgenticLoopManager } from '../../../types/agent/agentManagerTypes';

// ─── Manager Implementation ───────────────────────────────────────────────────

export class AgenticLoopManager extends CoreManager implements IAgenticLoopManager {
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;

    protected constructor() {
        super();
        this.registerDomainManager('AgenticLoopManager', this);
    }

    public static getInstance(): AgenticLoopManager {
        return CoreManager.getInstance() as AgenticLoopManager;
    }

    // ─── Initialization ──────────────────────────────────────────────────────────

    private registerManagers(): void {
        this.registerDomainManager('AgenticLoopManager', this);
        this.registerDomainManager('CacheInitManager', CacheInitManager);
        this.registerDomainManager('AgenticLoopStateManager', AgenticLoopStateManager);
        this.registerDomainManager('ThinkingManager', ThinkingManager);
        this.registerDomainManager('ToolManager', ToolManager);
    }

    public async initialize(metadata?: IBaseManagerMetadata): Promise<void> {
        if (this.isInitialized) return;

        try {
            const cacheInitManager = this.getDomainManager<typeof CacheInitManager>('CacheInitManager');
            await cacheInitManager.initialize();
            this.isInitialized = true;
        } catch (error) {
            throw createError({
                message: 'AgenticLoopManager initialization failed',
                type: ERROR_KINDS.InitializationError,
                severity: ERROR_SEVERITY_enum.ERROR,
                context: { error: error instanceof Error ? error : new Error(String(error)) }
            } as IErrorType);
        }
    }

    public async validate(params?: ILoopExecutionParams): Promise<boolean> {
        if (!params) {
            return this.isInitialized;
        }
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
                status: AGENT_STATUS_enum.IDLE
            },
            timestamp: Date.now(),
            component: 'AgenticLoopManager'
        };
    }

    // ─── Loop Execution ──────────────────────────────────────────────────────────

    public async executeLoop(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        metadata: ILoopHandlerMetadata;
        feedbackMessage?: string;
    }): Promise<ILoopHandlerResult<ILoopResult>> {
        const executeResult = await this.safeExecute<ILoopResult>(async () => {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const isValid = await this.validate(params);
            if (!isValid) {
                throw createError({
                    message: 'Invalid loop execution parameters',
                    type: ERROR_KINDS.ValidationError,
                    context: {
                        component: this.constructor.name,
                        params
                    }
                });
            }

            const { agent, task, metadata, feedbackMessage } = params;
            const loopKey = this.generateLoopKey(agent.id, task.id);

            // Start with iteration 0
            const loopMetadata = await this.enhanceMetadata(metadata, agent, 0);

            const cacheInitManager = this.getDomainManager<typeof CacheInitManager>('CacheInitManager');
            const langchainCache = cacheInitManager.createLangchainCacheAdapter(agent.id, task.id);
            const llm = agent.executableAgent.runnable as BaseChatModel;
            llm.cache = langchainCache;

            const iterationResult = await this.executeLoopIteration(agent, task, loopKey, loopMetadata, undefined, feedbackMessage);
            if (!iterationResult?.data) {
                throw new Error('Loop iteration failed');
            }

            return {
                success: true,
                result: iterationResult.data.result,
                metadata: {
                    iterations: iterationResult.data.metadata.iterations,
                    maxAgentIterations: agent.maxIterations,
                    metrics: iterationResult.data.metadata.metrics
                }
            } as ILoopResult;
        }, 'executeLoop');

        if (!executeResult?.data) {
            throw new Error('Loop execution failed');
        }

        const result = executeResult.data;
        return createLoopHandlerResult(executeResult.success, params.metadata, result);
    }

    // ─── Loop Iteration ──────────────────────────────────────────────────────────

    private async executeLoopIteration(
        agent: IReactChampionAgent,
        task: ITaskType,
        loopKey: string,
        metadata: ILoopHandlerMetadata,
        context?: ILoopContext,
        feedbackMessage?: string
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const stateManager = this.getDomainManager<typeof AgenticLoopStateManager>('AgenticLoopStateManager');
        const thinkingManager = this.getDomainManager<typeof ThinkingManager>('ThinkingManager');

        let currentIteration = context?.iterations || metadata.loop.iterations || 0;
        let lastOutput = context?.lastOutput;

        while (currentIteration < agent.maxIterations) {
            // Update metadata with current iteration
            const updatedMetadata = await this.enhanceMetadata(metadata, agent, currentIteration);

            const thinkingResult = await thinkingManager.executeThinking({
                agent,
                task,
                ExecutableAgent: agent.executableAgent,
                feedbackMessage: currentIteration === 0 ? feedbackMessage : undefined,
            });

            if (!thinkingResult?.data) {
                throw createError({
                    message: 'No data from thinking phase',
                    type: ERROR_KINDS.ValidationError,
                    context: { agentId: agent.id, taskId: task.id, iterations: currentIteration },
                });
            }

            const messages = thinkingResult.data.messages as BaseMessage[];
            lastOutput = thinkingResult.data.output;

            // Check for final answer
            const finalAnswerMessage = messages.find(
                (msg: BaseMessage) => msg instanceof AIMessage && typeof msg.content === 'string' && msg.content.includes('Final Answer:')
            );

            if (finalAnswerMessage) {
                // Update metadata one last time with final iteration count
                const finalMetadata = await this.enhanceMetadata(updatedMetadata, agent, currentIteration);
                const result = await this.handleLoopCompletion(agent, task, currentIteration, lastOutput, finalMetadata);
                return result;
            }

            // Handle action if present
            const actionMessage = messages.find(
                (msg: BaseMessage) => msg instanceof AIMessage && typeof msg.content === 'string' && msg.content.includes('Action:')
            ) as AIMessage | undefined;

            if (actionMessage && typeof actionMessage.content === 'string') {
                await this.handleToolExecution(agent, task, actionMessage);
            }

            currentIteration++;
        }

        // Update metadata with final iteration count
        const maxIterationsMetadata = await this.enhanceMetadata(metadata, agent, currentIteration);
        return this.handleMaxIterations(agent, task, currentIteration, lastOutput, maxIterationsMetadata);
    }

    // ─── Private Helper Methods ────────────────────────────────────────────────

    private generateLoopKey(agentId: string, taskId: string): string {
        return `${agentId}:${taskId}:${Date.now()}`;
    }

    private async enhanceMetadata(
        baseMetadata: ILoopHandlerMetadata,
        agent: IReactChampionAgent,
        currentIteration: number
    ): Promise<ILoopHandlerMetadata> {
        // Keep existing metrics if they exist, otherwise use base metrics
        const existingLoop = baseMetadata.loop || {};
        const existingContext = existingLoop.context || {};
        const existingPerformance = existingLoop.performance || baseMetadata.performance;
        const existingResources = existingLoop.resources || {};
        const existingUsage = existingLoop.usage || {};
        const existingCosts = existingLoop.costs || {};
        const existingLLMMetrics = existingLoop.llmUsageMetrics || {};

        return {
            ...baseMetadata,
            loop: {
                ...existingLoop,
                iterations: currentIteration,  // Use actual iteration count
                maxIterations: agent.maxIterations,  // Use agent's max iterations
                status: currentIteration >= agent.maxIterations ? 'completed' : 'running' as ExecutionStatus,
                performance: existingPerformance,
                context: {
                    ...existingContext,
                    startTime: existingContext.startTime || Date.now(),
                    endTime: existingContext.endTime,
                    totalTokens: existingContext.totalTokens || 0,
                    confidence: existingContext.confidence || 0,
                    reasoningChain: existingContext.reasoningChain || []
                },
                resources: existingResources,
                usage: existingUsage,
                costs: existingCosts,
                llmUsageMetrics: existingLLMMetrics
            }
        };
    }

    private async handleToolExecution(
        agent: IReactChampionAgent,
        task: ITaskType,
        actionMessage: AIMessage
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
                    type: ERROR_KINDS.NotFoundError,
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
                messages: [] // Empty array for messages parameter
            } as IToolHandlerParams);

            if (!result.success) {
                throw createError({
                    message: result.error?.message || 'Unknown tool execution error',
                    type: ERROR_KINDS.ExecutionError,
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

    private async handleLoopCompletion(
        agent: IReactChampionAgent,
        task: ITaskType,
        iterations: number,
        lastOutput: any,
        metadata: ILoopHandlerMetadata
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const result: ILoopResult = {
            success: true,
            result: lastOutput,
            metadata: {
                iterations,
                maxAgentIterations: agent.maxIterations,
                metrics: metadata.loop
            }
        };

        return {
            success: true,
            data: result,
            metadata
        };
    }

    private async handleMaxIterations(
        agent: IReactChampionAgent,
        task: ITaskType,
        iterations: number,
        lastOutput: any,
        metadata: ILoopHandlerMetadata
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const error = createError({
            message: `Max iterations (${agent.maxIterations}) reached`,
            type: ERROR_KINDS.ExecutionError,
            context: {
                agentId: agent.id,
                taskId: task.id,
                iterations,
                maxIterations: agent.maxIterations,
            },
        });

        const result: ILoopResult = {
            success: false,
            error,
            result: lastOutput,
            metadata: {
                iterations,
                maxAgentIterations: agent.maxIterations
            }
        };

        return {
            success: false,
            data: result,
            metadata
        };
    }
}

export default AgenticLoopManager.getInstance();
