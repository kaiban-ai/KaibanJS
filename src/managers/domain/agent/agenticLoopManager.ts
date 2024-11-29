/**
 * @file agenticLoopManager.ts
 * @path src/managers/domain/agent/agenticLoopManager.ts
 * @description Orchestrates the agentic loop execution using Langchain integration
 */

import { Tool, StructuredTool } from '@langchain/core/tools';
import { BaseMessage, AIMessage } from '@langchain/core/messages';
import { LLMResult } from '@langchain/core/outputs';

import CoreManager from '../../core/coreManager';
import { ERROR_KINDS, BaseError, createError } from '../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { IAgentTypeGuards } from '../../../types/agent/agentBaseTypes';
import { ILoopTypeGuards, createLoopHandlerResult } from '../../../types/agent/agentLoopTypes';
import { isLangchainTool } from '../../../types/tool/toolTypes';
import { createToolHandlerResult } from '../../../types/tool/toolHandlerTypes';
import { MetricsManager } from '../../core/metricsManager';

import type { IAgentType, IReactChampionAgent } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { 
    IIterationManager,
    IThinkingManager,
    IToolManager,
    ILoopResult
} from '../../../types/agent/agentManagerTypes';
import type {
    ILoopContext,
    ILoopHandlerMetadata,
    ILoopHandlerResult,
    ILoopExecutionParams
} from '../../../types/agent/agentLoopTypes';
import type {
    IToolHandlerMetadata,
    IToolHandlerResult,
    IToolHandlerParams,
    IToolHandlerData
} from '../../../types/tool/toolHandlerTypes';
import type { IToolUsageMetrics } from '../../../types/tool/toolMetricTypes';
import type { ILLMUsageMetrics } from '../../../types/llm/llmMetricTypes';
import type { IThinkingResult } from '../../../types/agent/agentHandlersTypes';
import type { 
    IUsageMetrics,
    IPerformanceMetrics,
    IResourceMetrics,
    IStandardCostDetails
} from '../../../types/common/commonMetricTypes';

/**
 * Manages agentic loop execution and orchestration
 */
export class AgenticLoopManager extends CoreManager {
    private static instance: AgenticLoopManager;
    private readonly activeLoops: Map<string, ILoopContext>;
    private readonly metricsManager: MetricsManager;

    private constructor() {
        super();
        this.activeLoops = new Map();
        this.metricsManager = MetricsManager.getInstance();
        this.registerDomainManager('AgenticLoopManager', this);
    }

    public static getInstance(): AgenticLoopManager {
        if (!AgenticLoopManager.instance) {
            AgenticLoopManager.instance = new AgenticLoopManager();
        }
        return AgenticLoopManager.instance;
    }

    private generateLoopKey(agentId: string, taskId: string): string {
        return `${agentId}:${taskId}:${Date.now()}`;
    }

    private createLoopContext(
        startTime: number,
        iterations: number,
        maxIterations: number
    ): ILoopContext {
        const defaultContext = this.metricsManager.createIterationContext();
        const costs = this.metricsManager.createCostDetails();
        
        const usage: IUsageMetrics = {
            totalOperations: iterations,
            successRate: 1,
            averageDuration: 0,
            costDetails: costs,
            timestamp: startTime
        };

        return {
            startTime,
            iterations,
            maxIterations,
            lastUpdateTime: startTime,
            status: 'running',
            performance: defaultContext.performance,
            resources: defaultContext.resources,
            usage,
            costs
        };
    }

    private createLoopMetadata(agent: IAgentType, task: ITaskType): ILoopHandlerMetadata {
        const baseMetadata = createBaseMetadata('AgenticLoopManager', 'executeLoop');
        const now = Date.now();
        const defaultContext = this.metricsManager.createIterationContext();
        const costs = this.metricsManager.createCostDetails();

        const usage: IUsageMetrics = {
            totalOperations: 0,
            successRate: 1,
            averageDuration: 0,
            costDetails: costs,
            timestamp: now
        };

        const llmUsageMetrics: ILLMUsageMetrics = {
            totalRequests: 0,
            activeInstances: 0,
            activeUsers: 0,  // Added missing field
            requestsPerSecond: 0,
            averageResponseLength: 0,
            averageResponseSize: 0,  // Added missing field
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: now
            },
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
            timestamp: now
        };

        return {
            ...baseMetadata,
            loop: {
                iterations: 0,
                maxIterations: agent.maxIterations,
                status: 'running',
                performance: defaultContext.performance,
                context: {
                    startTime: now,
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                resources: defaultContext.resources,
                usage,
                costs,
                llmUsageMetrics
            },
            agent: {
                id: agent.id,
                name: agent.name,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageMetrics,
                    performance: defaultContext.performance
                }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageMetrics,
                    performance: defaultContext.performance
                }
            }
        };
    }

    private async handleMaxIterations(
        agent: IReactChampionAgent,
        task: ITaskType,
        iterations: number,
        lastOutput?: LLMResult
    ): Promise<ILoopResult> {
        const iterationManager = this.getDomainManager<IIterationManager>('IterationManager');
        const defaultContext = this.metricsManager.createIterationContext();
        const costs = this.metricsManager.createCostDetails();

        const usage: IUsageMetrics = {
            totalOperations: iterations,
            successRate: 0,
            averageDuration: 0,
            costDetails: costs,
            timestamp: Date.now()
        };

        await iterationManager.handleMaxIterationsError({
            agent,
            task,
            iterations,
            maxIterations: agent.maxIterations,
            error: createError({
                message: `Max iterations (${agent.maxIterations}) reached`,
                type: ERROR_KINDS.ExecutionError,
                context: {
                    agentId: agent.id,
                    taskId: task.id,
                    iterations,
                    maxIterations: agent.maxIterations
                }
            })
        });

        return {
            success: false,
            result: lastOutput,
            error: createError({
                message: `Max iterations (${agent.maxIterations}) reached`,
                type: ERROR_KINDS.ExecutionError,
                context: {
                    agentId: agent.id,
                    taskId: task.id,
                    iterations,
                    maxIterations: agent.maxIterations
                }
            }),
            metadata: {
                iterations,
                maxAgentIterations: agent.maxIterations,
                metrics: {
                    performance: defaultContext.performance,
                    resources: defaultContext.resources,
                    usage,
                    costs
                }
            }
        };
    }

    private async executeToolPhase(
        agent: IReactChampionAgent,
        task: ITaskType,
        action: string,
        actionInput: Record<string, unknown>,
        messages: BaseMessage[]
    ): Promise<IToolHandlerResult> {
        const tool = agent.tools.find(t => t.name === action);
        
        if (!tool || !isLangchainTool(tool)) {
            throw createError({
                message: `Tool ${action} not found or invalid`,
                type: ERROR_KINDS.NotFoundError,
                context: {
                    agentId: agent.id,
                    taskId: task.id,
                    action,
                    availableTools: agent.tools.map(t => t.name)
                }
            });
        }

        const toolManager = this.getDomainManager<IToolManager>('ToolManager');
        const now = Date.now();
        const toolUsageMetrics: IToolUsageMetrics = {
            totalRequests: 1,
            activeUsers: 1,
            requestsPerSecond: 0,
            averageResponseSize: 0,
            peakMemoryUsage: process.memoryUsage().heapUsed,
            uptime: process.uptime(),
            rateLimit: {
                current: 1,
                limit: 100,
                remaining: 99,
                resetTime: now + 3600000
            },
            utilizationMetrics: {
                callFrequency: 1,
                resourceConsumption: {
                    cpu: process.cpuUsage().user / 1000000,
                    memory: process.memoryUsage().heapUsed,
                    bandwidth: 0
                },
                peakUsage: {
                    times: [now],
                    values: [process.memoryUsage().heapUsed],
                    duration: [0]
                }
            },
            accessPatterns: {
                distribution: {},
                frequency: {},
                operationTypes: {}
            },
            dependencies: {
                services: [],
                resources: [],
                versions: {}
            },
            timestamp: now
        };

        const defaultContext = this.metricsManager.createIterationContext();
        const toolMetadata: IToolHandlerMetadata = {
            ...createBaseMetadata('AgenticLoopManager', 'executeToolPhase'),
            toolId: `${tool.name}_${Date.now()}`,
            tool: {
                name: tool.name,
                executionTime: 0,
                status: 'success',
                inputSize: JSON.stringify(actionInput).length,
                outputSize: 0,
                performance: defaultContext.performance,
                resources: defaultContext.resources,
                environment: process.env.NODE_ENV || 'development',
                parameters: {},
                version: '1.0.0'
            },
            executionPhase: 'execute',
            metrics: {
                resources: defaultContext.resources,
                usage: toolUsageMetrics,
                performance: defaultContext.performance
            },
            costDetails: this.metricsManager.createCostDetails()
        };

        const result = await toolManager.executeTool({
            agent,
            task,
            tool: tool as Tool,
            input: actionInput,
            messages
        });

        const resultData = result.data as IToolHandlerData | undefined;
        const handlerData: IToolHandlerData = {
            result: resultData?.result,
            error: result.error,
            feedbackMessage: resultData?.feedbackMessage
        };

        return createToolHandlerResult(
            result.success,
            toolMetadata,
            handlerData
        );
    }

    public async executeLoop(
        params: ILoopExecutionParams,
        context?: ILoopContext
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const { agent, task, feedbackMessage } = params;

        // Validate agent type
        if (!IAgentTypeGuards.isReactChampionAgent(agent)) {
            const error = createError({
                message: 'Agent must be a ReactChampionAgent',
                type: ERROR_KINDS.ValidationError,
                context: {
                    component: this.constructor.name,
                    agentId: agent?.id,
                    agentType: agent?.constructor.name
                }
            });
            throw error;
        }

        const loopKey = this.generateLoopKey(agent.id, task.id);
        const metadata = this.createLoopMetadata(agent, task);

        try {
            let iterations = context?.iterations || 0;
            let lastOutput: LLMResult | undefined = context?.lastOutput;

            const loopContext = context || this.createLoopContext(
                Date.now(),
                iterations,
                agent.maxIterations
            );

            if (!ILoopTypeGuards.isLoopContext(loopContext)) {
                throw createError({
                    message: 'Invalid loop context created',
                    type: ERROR_KINDS.ValidationError,
                    context: {
                        component: this.constructor.name,
                        agentId: agent.id,
                        taskId: task.id
                    }
                });
            }

            this.activeLoops.set(loopKey, loopContext);

            const iterationManager = this.getDomainManager<IIterationManager>('IterationManager');
            const thinkingManager = this.getDomainManager<IThinkingManager>('ThinkingManager');

            while (iterations < agent.maxIterations) {
                await iterationManager.handleIterationStart({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                const thinkingResult = await thinkingManager.executeThinking({
                    agent,
                    task,
                    ExecutableAgent: agent.executableAgent,
                    feedbackMessage: iterations === 0 ? feedbackMessage : undefined
                });

                if (!thinkingResult?.data) {
                    throw createError({
                        message: 'No data from thinking phase',
                        type: ERROR_KINDS.ValidationError,
                        context: {
                            component: this.constructor.name,
                            agentId: agent.id,
                            taskId: task.id,
                            iterations
                        }
                    });
                }

                const thinkingData: IThinkingResult = thinkingResult.data;
                const messages: BaseMessage[] = thinkingData.messages;

                if (!messages?.length) {
                    throw createError({
                        message: 'No messages from thinking phase',
                        type: ERROR_KINDS.ValidationError,
                        context: {
                            component: this.constructor.name,
                            agentId: agent.id,
                            taskId: task.id,
                            iterations
                        }
                    });
                }

                lastOutput = thinkingData.output;

                // Check for final answer in messages
                const finalAnswerMessage = messages.find(
                    (msg: BaseMessage) => msg instanceof AIMessage && 
                        typeof msg.content === 'string' &&
                        msg.content.includes('Final Answer:')
                );

                if (finalAnswerMessage) {
                    await iterationManager.handleIterationEnd({
                        agent,
                        task,
                        iterations,
                        maxAgentIterations: agent.maxIterations
                    });

                    loopContext.status = 'completed';
                    loopContext.lastOutput = lastOutput;
                    loopContext.endTime = Date.now();
                    this.activeLoops.delete(loopKey);

                    const loopResult: ILoopResult = {
                        success: true,
                        result: lastOutput,
                        metadata: {
                            iterations,
                            maxAgentIterations: agent.maxIterations,
                            metrics: {
                                performance: loopContext.performance,
                                resources: loopContext.resources,
                                usage: loopContext.usage,
                                costs: loopContext.costs
                            }
                        }
                    };

                    return createLoopHandlerResult(true, metadata, loopResult);
                }

                // Check for action in messages
                const actionMessage = thinkingData.messages.find(
                    (msg: BaseMessage) => msg instanceof AIMessage && 
                        typeof msg.content === 'string' &&
                        msg.content.includes('Action:')
                );

                if (actionMessage && typeof actionMessage.content === 'string') {
                    const actionMatch = actionMessage.content.match(/Action:\s*(\w+)/);
                    const inputMatch = actionMessage.content.match(/Action Input:\s*({[^}]+})/);

                    if (actionMatch) {
                        const action = actionMatch[1];
                        const actionInput = inputMatch ? JSON.parse(inputMatch[1]) : {};

                        const toolResult = await this.executeToolPhase(
                            agent,
                            task,
                            action,
                            actionInput,
                            thinkingData.messages
                        );

                        if (!toolResult.success) {
                            throw createError({
                                message: toolResult.data?.error?.message || 'Unknown tool execution error',
                                type: ERROR_KINDS.ExecutionError,
                                context: {
                                    component: this.constructor.name,
                                    agentId: agent.id,
                                    taskId: task.id,
                                    iterations,
                                    action,
                                    toolError: toolResult.data?.error
                                }
                            });
                        }
                    }
                }

                await iterationManager.handleIterationEnd({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                iterations++;
                loopContext.iterations = iterations;
                loopContext.lastUpdateTime = Date.now();
                
                // Get fresh metrics
                const defaultContext = this.metricsManager.createIterationContext();
                loopContext.performance = defaultContext.performance;
                loopContext.resources = defaultContext.resources;
                loopContext.usage = {
                    ...defaultContext.usage,
                    totalOperations: iterations,
                    successRate: 1,
                    averageDuration: (Date.now() - loopContext.startTime) / iterations,
                    costDetails: this.metricsManager.createCostDetails()
                };
                loopContext.costs = this.metricsManager.createCostDetails();

                if (!ILoopTypeGuards.isLoopContext(loopContext)) {
                    throw createError({
                        message: 'Invalid loop context after update',
                        type: ERROR_KINDS.ValidationError,
                        context: {
                            component: this.constructor.name,
                            agentId: agent.id,
                            taskId: task.id,
                            iterations
                        }
                    });
                }

                this.activeLoops.set(loopKey, loopContext);
            }

            const maxIterationsResult = await this.handleMaxIterations(agent, task, iterations, lastOutput);
            return createLoopHandlerResult(false, metadata, maxIterationsResult);

        } catch (error) {
            const errorType = error instanceof BaseError ? error : createError({
                message: error instanceof Error ? error.message : String(error),
                type: ERROR_KINDS.ExecutionError,
                context: {
                    component: this.constructor.name,
                    agentId: agent.id,
                    taskId: task.id,
                    error
                }
            });

            const defaultContext = this.metricsManager.createIterationContext();
            const loopResult: ILoopResult = {
                success: false,
                error: errorType,
                metadata: {
                    iterations: context?.iterations || 0,
                    maxAgentIterations: agent.maxIterations,
                    metrics: {
                        performance: defaultContext.performance,
                        resources: defaultContext.resources,
                        usage: {
                            ...defaultContext.usage,
                            totalOperations: 0,
                            successRate: 0,
                            averageDuration: 0,
                            costDetails: this.metricsManager.createCostDetails()
                        },
                        costs: this.metricsManager.createCostDetails()
                    }
                }
            };

            return createLoopHandlerResult(false, metadata, loopResult);
        }
    }
}

export default AgenticLoopManager.getInstance();
