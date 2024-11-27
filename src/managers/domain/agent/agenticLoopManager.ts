/**
 * @file agenticLoopManager.ts
 * @path src/managers/domain/agent/agenticLoopManager.ts
 * @description Orchestrates the agentic loop execution using manager registry pattern
 */

import CoreManager from '../../core/coreManager';
import { createError, BaseError } from '../../../types/common/commonErrorTypes';
import { createBaseMetadata, createDefaultValidation } from '../../../types/common/commonMetadataTypes';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import { IAgentTypeGuards } from '../../../types/agent/agentBaseTypes';
import { ILoopTypeGuards, createLoopHandlerResult } from '../../../types/agent/agentLoopTypes';

// Import types from canonical locations
import type { 
    IAgentType, 
    IReactChampionAgent
} from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IOutput, IParsedOutput, ILLMUsageStats } from '../../../types/llm/llmResponseTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IBaseError } from '../../../types/common/commonErrorTypes';
import type { IAgenticLoopResult } from '../../../types/llm/llmInstanceTypes';
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
    IResourceMetrics,
    IPerformanceMetrics,
    IUsageMetrics,
    IStandardCostDetails
} from '../../../types/common/commonMetricTypes';

type OperationPhase = 'pre-execution' | 'execution' | 'post-execution' | 'error';
type LoopStatus = 'running' | 'completed' | 'error';

interface OperationContext {
    operation: string;
    phase: OperationPhase;
    startTime: number;
    resourceMetrics: IResourceMetrics;
    performanceMetrics: IPerformanceMetrics;
    errorContext?: {
        error: BaseError;
        recoverable: boolean;
        retryCount: number;
        lastRetryTimestamp: number;
        failureReason: string;
    };
}

/**
 * Manages agentic loop execution and orchestration
 */
export class AgenticLoopManager extends CoreManager {
    private static instance: AgenticLoopManager;
    private readonly activeLoops: Map<string, ILoopContext>;
    private readonly loopTimes: Map<string, number[]>;

    private constructor() {
        super();
        this.activeLoops = new Map();
        this.loopTimes = new Map();
        this.registerDomainManager('AgenticLoopManager', this);
    }

    public static getInstance(): AgenticLoopManager {
        if (!AgenticLoopManager.instance) {
            AgenticLoopManager.instance = new AgenticLoopManager();
        }
        return AgenticLoopManager.instance;
    }

    private createMetricsMetadata(iterations: number, maxAgentIterations: number): ILoopResult['metadata'] {
        return {
            iterations,
            maxAgentIterations,
            metrics: {
                performance: MetadataFactory.createPerformanceMetrics(),
                resources: MetadataFactory.createResourceMetrics(),
                usage: MetadataFactory.createUsageMetrics(),
                costs: MetadataFactory.createCostDetails()
            }
        };
    }

    public async executeLoop(
        params: ILoopExecutionParams,
        context?: ILoopContext
    ): Promise<ILoopHandlerResult<ILoopResult>> {
        const { agent, task, feedbackMessage, options = {} } = params;

        // Validate agent type
        if (!IAgentTypeGuards.isReactChampionAgent(agent)) {
            throw new BaseError({
                message: 'Agent must be a ReactChampionAgent',
                type: 'ValidationError'
            });
        }

        const loopKey = this.generateLoopKey(agent.id, task.id);
        const metadata = this.createLoopMetadata(agent, task);

        try {
            const result = await this.handleLoopOperation(
                async () => {
                    let iterations = context?.iterations || 0;
                    let lastOutput: IOutput | undefined = context?.lastOutput;

                    const loopContext = context || this.createLoopContext(
                        Date.now(),
                        iterations,
                        agent.maxIterations,
                        loopKey
                    );

                    if (!ILoopTypeGuards.isLoopContext(loopContext)) {
                        throw new BaseError({
                            message: 'Invalid loop context created',
                            type: 'ValidationError'
                        });
                    }

                    this.activeLoops.set(loopKey, loopContext);

                    const iterationManager = this.getDomainManager<IIterationManager>('IterationManager');
                    const thinkingManager = this.getDomainManager<IThinkingManager>('ThinkingManager');
                    const toolManager = this.getDomainManager<IToolManager>('ToolManager');

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

                        if (!thinkingResult?.data?.parsedLLMOutput) {
                            throw new BaseError({
                                message: 'No parsed output from thinking phase',
                                type: 'ValidationError'
                            });
                        }

                        lastOutput = {
                            llmOutput: thinkingResult.data.llmOutput,
                            llmUsageStats: thinkingResult.data.llmUsageStats,
                            ...thinkingResult.data.parsedLLMOutput
                        };

                        if (thinkingResult.data.parsedLLMOutput.finalAnswer) {
                            await iterationManager.handleIterationEnd({
                                agent,
                                task,
                                iterations,
                                maxAgentIterations: agent.maxIterations
                            });

                            loopContext.status = 'completed';
                            loopContext.lastOutput = lastOutput;
                            loopContext.endTime = Date.now();
                            this.cleanupLoop(loopKey);

                            return {
                                success: true,
                                result: lastOutput,
                                metadata: this.createMetricsMetadata(iterations, agent.maxIterations)
                            } as ILoopResult;
                        }

                        if (thinkingResult.data.parsedLLMOutput.action) {
                            const toolResult = await this.executeToolPhase({
                                agent,
                                task,
                                action: thinkingResult.data.parsedLLMOutput.action,
                                actionInput: thinkingResult.data.parsedLLMOutput.actionInput,
                                parsedOutput: thinkingResult.data.parsedLLMOutput
                            });

                            if (!toolResult.success) {
                                throw new BaseError({
                                    message: toolResult.error?.message || 'Unknown tool execution error',
                                    type: 'ToolError',
                                    context: toolResult.metadata
                                });
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
                        loopContext.performance = MetadataFactory.createPerformanceMetrics();
                        loopContext.resources = MetadataFactory.createResourceMetrics();
                        loopContext.usage = MetadataFactory.createUsageMetrics();
                        loopContext.costs = MetadataFactory.createCostDetails();

                        if (!ILoopTypeGuards.isLoopContext(loopContext)) {
                            throw new BaseError({
                                message: 'Invalid loop context after update',
                                type: 'ValidationError'
                            });
                        }

                        this.activeLoops.set(loopKey, loopContext);
                    }

                    return this.handleMaxIterations({ agent, task, iterations, lastOutput });
                },
                agent,
                task,
                metadata
            );

            return createLoopHandlerResult(true, metadata, result);

        } catch (error) {
            const baseError = error instanceof BaseError ? error : new BaseError({
                message: error instanceof Error ? error.message : String(error),
                type: 'AgentError'
            });

            return createLoopHandlerResult(
                false,
                {
                    ...metadata,
                    loop: {
                        ...metadata.loop,
                        status: 'error',
                        context: {
                            ...metadata.loop.context,
                            endTime: Date.now()
                        }
                    }
                },
                { error: baseError.message }
            );
        }
    }

    protected async handleLoopOperation(
        operation: () => Promise<ILoopResult>,
        agent: IReactChampionAgent,
        task: ITaskType,
        metadata: ILoopHandlerMetadata
    ): Promise<ILoopResult> {
        const startTime = Date.now();
        const operationContext: OperationContext = {
            operation: 'handleLoopOperation',
            phase: 'pre-execution',
            startTime,
            resourceMetrics: MetadataFactory.createResourceMetrics(),
            performanceMetrics: MetadataFactory.createPerformanceMetrics()
        };

        try {
            // Pre-execution validation
            const validationResult = await this.validateLoop(agent, task);
            if (!validationResult.isValid) {
                throw new BaseError({
                    message: validationResult.errors.join(', '),
                    type: 'ValidationError'
                });
            }

            // Update operation context for execution phase
            operationContext.phase = 'execution';
            operationContext.resourceMetrics = MetadataFactory.createResourceMetrics();

            // Execute operation
            const result = await operation();

            // Update metrics for post-execution
            operationContext.phase = 'post-execution';
            operationContext.resourceMetrics = MetadataFactory.createResourceMetrics();
            
            const executionTime = Date.now() - startTime;
            const updatedPerformanceMetrics = MetadataFactory.createPerformanceMetrics(executionTime);

            // Update metadata with final metrics
            metadata.loop.performance = updatedPerformanceMetrics;

            if (!ILoopTypeGuards.isLoopHandlerMetadata(metadata)) {
                throw new BaseError({
                    message: 'Invalid loop handler metadata',
                    type: 'ValidationError'
                });
            }

            return result;

        } catch (error) {
            const baseError = error instanceof BaseError ? error : new BaseError({
                message: error instanceof Error ? error.message : String(error),
                type: 'AgentError'
            });
            
            operationContext.phase = 'error';
            operationContext.resourceMetrics = MetadataFactory.createResourceMetrics();
            operationContext.errorContext = {
                error: baseError,
                recoverable: true,
                retryCount: metadata.loop.iterations,
                lastRetryTimestamp: Date.now(),
                failureReason: baseError.message
            };

            await this.handleLoopError(agent, task, baseError, operationContext);
            throw baseError;
        }
    }

    private async executeToolPhase(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        action: string;
        actionInput?: Record<string, unknown>;
        parsedOutput: IParsedOutput;
    }): Promise<IHandlerResult> {
        const { agent, task, action, actionInput, parsedOutput } = params;
        const tool = agent.tools.find(t => t.name === action);

        if (!tool) {
            throw new BaseError({
                message: `Tool '${action}' not found`,
                type: 'ValidationError',
                context: { 
                    toolName: action,
                    availableTools: agent.tools.map(t => t.name)
                }
            });
        }

        const toolManager = this.getDomainManager<IToolManager>('ToolManager');
        return toolManager.executeTool({
            agent,
            task,
            tool,
            input: actionInput || {},
            parsedOutput
        });
    }

    private async handleMaxIterations(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        iterations: number;
        lastOutput?: IOutput;
    }): Promise<ILoopResult> {
        const { agent, task, iterations, lastOutput } = params;
        const loopKey = this.generateLoopKey(agent.id, task.id);

        const iterationManager = this.getDomainManager<IIterationManager>('IterationManager');
        await iterationManager.handleMaxIterationsError({
            agent,
            task,
            iterations,
            maxIterations: agent.maxIterations,
            error: new BaseError({
                message: 'Maximum iterations reached',
                type: 'AgentError',
                context: {
                    iterations,
                    maxIterations: agent.maxIterations
                }
            })
        });

        const context = this.activeLoops.get(loopKey);
        if (context) {
            context.status = 'error';
            context.endTime = Date.now();
            this.cleanupLoop(loopKey);
        }

        return {
            success: false,
            result: lastOutput,
            error: `Maximum iterations (${agent.maxIterations}) reached without final answer`,
            metadata: this.createMetricsMetadata(iterations, agent.maxIterations)
        };
    }

    private async validateLoop(agent: IReactChampionAgent, task: ITaskType): Promise<{ 
        isValid: boolean; 
        errors: string[];
        context: Record<string, unknown>;
    }> {
        const errors: string[] = [];

        if (!agent) errors.push('Agent is required');
        if (!task) errors.push('Task is required');
        if (agent && !agent.id) errors.push('Agent ID is required');
        if (task && !task.id) errors.push('Task ID is required');
        if (agent && !agent.maxIterations) errors.push('Agent maxIterations is required');
        if (agent && !agent.tools) errors.push('Agent tools are required');
        if (agent && !agent.executableAgent) errors.push('Agent executableAgent is required');

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                agentId: agent?.id,
                taskId: task?.id,
                validationTime: Date.now()
            }
        };
    }

    private async handleLoopError(
        agent: IReactChampionAgent,
        task: ITaskType,
        error: BaseError,
        context: OperationContext
    ): Promise<void> {
        await this.handleStatusTransition({
            entity: 'agent',
            entityId: agent.id,
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.AGENTIC_LOOP_ERROR,
            context: {
                agentId: agent.id,
                taskId: task.id,
                error: context.errorContext,
                operation: context.operation,
                phase: context.phase,
                startTime: context.startTime,
                resourceMetrics: context.resourceMetrics,
                performanceMetrics: context.performanceMetrics,
                timestamp: Date.now()
            }
        });

        this.log(
            `Loop error: ${error.message}`,
            agent.name,
            task.id,
            'error',
            error
        );
    }

    private generateLoopKey(agentId: string, taskId: string): string {
        return `${agentId}:${taskId}`;
    }

    private createLoopContext(
        startTime: number,
        iterations: number,
        maxIterations: number,
        loopKey: string
    ): ILoopContext {
        return {
            startTime,
            iterations,
            maxIterations,
            lastUpdateTime: startTime,
            status: 'running',
            performance: MetadataFactory.createPerformanceMetrics(),
            resources: MetadataFactory.createResourceMetrics(),
            usage: MetadataFactory.createUsageMetrics(),
            costs: MetadataFactory.createCostDetails()
        };
    }

    private createLoopMetadata(
        agent: IReactChampionAgent,
        task: ITaskType
    ): ILoopHandlerMetadata {
        const performanceMetrics = MetadataFactory.createPerformanceMetrics();
        const defaultLLMStats = MetadataFactory.createDefaultLLMStats();
        const baseMetadata = createBaseMetadata('AgenticLoopManager', 'executeLoop');

        const metadata: ILoopHandlerMetadata = {
            ...baseMetadata,
            loop: {
                iterations: 0,
                maxIterations: agent.maxIterations,
                status: 'running' as const,
                performance: performanceMetrics,
                context: {
                    startTime: Date.now(),
                    totalTokens: 0,
                    confidence: 0,
                    reasoningChain: []
                },
                resources: MetadataFactory.createResourceMetrics(),
                usage: MetadataFactory.createUsageMetrics(),
                costs: MetadataFactory.createCostDetails(),
                llmStats: defaultLLMStats
            },
            agent: {
                id: agent.id,
                name: agent.name,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: defaultLLMStats,
                    performance: performanceMetrics
                }
            },
            task: {
                id: task.id,
                title: task.title,
                metrics: {
                    iterations: 0,
                    executionTime: 0,
                    llmUsageStats: defaultLLMStats,
                    performance: performanceMetrics
                }
            },
            context: {
                source: 'AgenticLoopManager',
                target: 'loop',
                correlationId: Date.now().toString(),
                causationId: Date.now().toString()
            },
            validation: createDefaultValidation()
        };

        if (!ILoopTypeGuards.isLoopHandlerMetadata(metadata)) {
            throw new BaseError({
                message: 'Invalid loop handler metadata created',
                type: 'ValidationError'
            });
        }

        return metadata;
    }

    private cleanupLoop(loopKey: string): void {
        const context = this.activeLoops.get(loopKey);
        if (context) {
            context.endTime = context.endTime || Date.now();
            this.activeLoops.delete(loopKey);
            this.loopTimes.delete(loopKey);
        }
    }
}

export default AgenticLoopManager.getInstance();
