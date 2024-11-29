/**
 * @file reactChampionAgent.ts
 * @path src/agents/reactChampionAgent.ts
 * @description React Champion agent implementation using manager layers
 */

import { BaseAgent } from './baseAgent';
import { Tool } from 'langchain/tools';
import { ChatMessageHistory } from 'langchain/memory';
import { Runnable } from '@langchain/core/runnables';
import { AgentManager } from '../managers/domain/agent/agentManager';
import { IterationManager } from '../managers/domain/agent/iterationManager';
import { TaskManager } from '../managers/domain/task/taskManager';
import { AGENT_STATUS_enum } from '../types/common/commonEnums';
import { createError } from '../types/common/commonErrorTypes';
import { IErrorType } from '../types/common/commonErrorTypes';
import { IHandlerResult } from '../types/common/commonHandlerTypes';
import { IBaseAgent, IExecutableAgent, IReactChampionAgent } from '../types/agent/agentBaseTypes';
import { IAgentStoreMethods } from '../types/agent/agentStoreTypes';
import { IREACTChampionAgentPrompts } from '../types/agent/promptsTypes';
import { IAgenticLoopResult, ILLMInstance } from '../types/llm/llmInstanceTypes';
import { IRuntimeLLMConfig } from '../types/llm/llmCommonTypes';
import { IMessageHistory } from '../types/llm/message/messagingHistoryTypes';
import { ITaskType } from '../types/task/taskBaseTypes';
import { ILLMManager } from '../types/llm/llmManagerTypes';
import { IPerformanceMetrics, IResourceMetrics, IUsageMetrics } from '../types/common/commonMetricTypes';
import { ILoopHandlerResult, ILoopResult } from '../types/agent/agentLoopTypes';
import { IThinkingManager, IThinkingHandlerResult, IThinkingMetadata } from '../types/agent/agentHandlersTypes';
import { IAgentTypeGuards } from '../types/agent/agentBaseTypes';
import { LLMProviderConfig, LLMProviderTypeGuards } from '../types/llm/llmProviderTypes';
import { ILLMMetrics } from '../types/llm/llmMetricTypes';
import { 
    IAgentPerformanceMetrics, 
    IAgentResourceMetrics, 
    IAgentUsageMetrics,
    ICognitiveResourceMetrics,
    IThinkingOperationMetrics,
    IAgentStateMetrics
} from '../types/agent/agentMetricTypes';

// Create default metrics
const createDefaultCognitiveMetrics = (): ICognitiveResourceMetrics => ({
    memoryAllocation: 0,
    cognitiveLoad: 0,
    processingCapacity: 1,
    contextUtilization: 0
});

const createDefaultThinkingMetrics = (): IThinkingOperationMetrics => ({
    reasoningTime: { total: 0, average: 0, min: 0, max: 0 },
    planningTime: { total: 0, average: 0, min: 0, max: 0 },
    learningTime: { total: 0, average: 0, min: 0, max: 0 },
    decisionConfidence: 0,
    learningEfficiency: 0
});

const createDefaultStateMetrics = (): IAgentStateMetrics => ({
    currentState: 'IDLE',
    stateTime: 0,
    transitionCount: 0,
    failedTransitions: 0,
    blockedTaskCount: 0,
    historyEntryCount: 0,
    lastHistoryUpdate: Date.now()
});

const createDefaultAgentResourceMetrics = (): IAgentResourceMetrics => ({
    cognitive: createDefaultCognitiveMetrics(),
    cpuUsage: 0,
    memoryUsage: process.memoryUsage().heapUsed,
    diskIO: { read: 0, write: 0 },
    networkUsage: { upload: 0, download: 0 },
    timestamp: Date.now()
});

const createDefaultAgentPerformanceMetrics = (): IAgentPerformanceMetrics => ({
    executionTime: {
        total: 0,
        average: 0,
        min: 0,
        max: 0
    },
    throughput: {
        operationsPerSecond: 0,
        dataProcessedPerSecond: 0
    },
    errorMetrics: {
        totalErrors: 0,
        errorRate: 0
    },
    resourceUtilization: createDefaultAgentResourceMetrics(),
    timestamp: Date.now(),
    thinking: createDefaultThinkingMetrics(),
    taskSuccessRate: 0,
    goalAchievementRate: 0
});

const createDefaultAgentUsageMetrics = (): IAgentUsageMetrics => ({
    totalOperations: 0,
    successRate: 0,
    averageDuration: 0,
    costDetails: {
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        currency: 'USD',
        breakdown: {
            promptTokens: { count: 0, cost: 0 },
            completionTokens: { count: 0, cost: 0 }
        }
    },
    timestamp: Date.now(),
    state: createDefaultStateMetrics(),
    toolUsageFrequency: {},
    taskCompletionCount: 0,
    averageTaskTime: 0
});

// Create store factory to avoid circular dependency
const createStoreFactory = () => {
    let agent: ReactChampionAgent | null = null;

    const store: IAgentStoreMethods = {
        getState: () => ({
            name: agent?.name || '',
            agents: agent ? [agent] : [],
            activeAgents: agent ? [agent] : [],
            metadata: {},
            executionState: {},
            errors: [],
            loading: false,
            id: agent?.id || '',
            version: '1.0.0',
            timestamp: Date.now(),
            tasks: [],
            workflowLogs: []
        }),
        setState: () => {},
        subscribe: () => () => {},
        destroy: () => {},
        handleAgentError: async (params) => {
            const error = createError({
                message: params.error.message,
                type: 'AgentError',
                context: params.context
            });
            if (agent) {
                agent.handleAgentError(error, 'Agent error');
            }
            return {
                success: false,
                error,
                metadata: {
                    timestamp: Date.now(),
                    component: 'AgentStore',
                    operation: 'handleAgentError',
                    agentId: agent?.id || '',
                    agentName: agent?.name || '',
                    agentType: 'ReactChampionAgent',
                    status: agent?.status || 'IDLE',
                    agentMetrics: {
                        tokensUsed: 0,
                        iterationCount: 0,
                        successRate: 0
                    },
                    metrics: {
                        performance: createDefaultAgentPerformanceMetrics(),
                        resources: createDefaultAgentResourceMetrics(),
                        usage: createDefaultAgentUsageMetrics()
                    },
                    performance: createDefaultAgentPerformanceMetrics(),
                    context: params.context || {},
                    validation: {
                        isValid: false,
                        errors: [error.message],
                        warnings: []
                    }
                }
            };
        },
        handleAgentThinking: async () => {
            const result = await agent?.think();
            return {
                success: true,
                data: result?.data,
                metadata: {
                    timestamp: Date.now(),
                    component: 'AgentStore',
                    operation: 'handleAgentThinking',
                    agentId: agent?.id || '',
                    agentName: agent?.name || '',
                    agentType: 'ReactChampionAgent',
                    status: agent?.status || 'IDLE',
                    agentMetrics: {
                        tokensUsed: 0,
                        iterationCount: 0,
                        successRate: 0
                    },
                    metrics: {
                        performance: createDefaultAgentPerformanceMetrics(),
                        resources: createDefaultAgentResourceMetrics(),
                        usage: createDefaultAgentUsageMetrics()
                    },
                    performance: createDefaultAgentPerformanceMetrics(),
                    context: {},
                    validation: {
                        isValid: true,
                        errors: [],
                        warnings: []
                    }
                }
            };
        },
        handleAgentOutput: async () => ({
            success: true,
            data: null,
            metadata: {
                timestamp: Date.now(),
                component: 'AgentStore',
                operation: 'handleAgentOutput',
                agentId: agent?.id || '',
                agentName: agent?.name || '',
                agentType: 'ReactChampionAgent',
                status: agent?.status || 'IDLE',
                agentMetrics: {
                    tokensUsed: 0,
                    iterationCount: 0,
                    successRate: 0
                },
                metrics: {
                    performance: createDefaultAgentPerformanceMetrics(),
                    resources: createDefaultAgentResourceMetrics(),
                    usage: createDefaultAgentUsageMetrics()
                },
                performance: createDefaultAgentPerformanceMetrics(),
                context: {},
                validation: {
                    isValid: true,
                    errors: [],
                    warnings: []
                }
            }
        }),
        handleAgentStatusChange: async () => ({
            success: true,
            data: undefined,
            metadata: {
                timestamp: Date.now(),
                component: 'AgentStore',
                operation: 'handleAgentStatusChange',
                agentId: agent?.id || '',
                agentName: agent?.name || '',
                agentType: 'ReactChampionAgent',
                status: agent?.status || 'IDLE',
                agentMetrics: {
                    tokensUsed: 0,
                    iterationCount: 0,
                    successRate: 0
                },
                metrics: {
                    performance: createDefaultAgentPerformanceMetrics(),
                    resources: createDefaultAgentResourceMetrics(),
                    usage: createDefaultAgentUsageMetrics()
                },
                performance: createDefaultAgentPerformanceMetrics(),
                context: {},
                validation: {
                    isValid: true,
                    errors: [],
                    warnings: []
                }
            }
        }),
        handleIterationStart: async (params) => {
            agent?.handleIterationStart(params);
            return {
                success: true,
                data: undefined,
                metadata: {
                    timestamp: Date.now(),
                    component: 'AgentStore',
                    operation: 'handleIterationStart',
                    agentId: agent?.id || '',
                    agentName: agent?.name || '',
                    agentType: 'ReactChampionAgent',
                    status: agent?.status || 'IDLE',
                    agentMetrics: {
                        tokensUsed: 0,
                        iterationCount: params.iterations,
                        successRate: 0
                    },
                    metrics: {
                        performance: createDefaultAgentPerformanceMetrics(),
                        resources: createDefaultAgentResourceMetrics(),
                        usage: createDefaultAgentUsageMetrics()
                    },
                    performance: createDefaultAgentPerformanceMetrics(),
                    context: {},
                    validation: {
                        isValid: true,
                        errors: [],
                        warnings: []
                    }
                }
            };
        },
        handleIterationEnd: async (params) => {
            agent?.handleIterationEnd(params);
            return {
                success: true,
                data: undefined,
                metadata: {
                    timestamp: Date.now(),
                    component: 'AgentStore',
                    operation: 'handleIterationEnd',
                    agentId: agent?.id || '',
                    agentName: agent?.name || '',
                    agentType: 'ReactChampionAgent',
                    status: agent?.status || 'IDLE',
                    agentMetrics: {
                        tokensUsed: 0,
                        iterationCount: params.iterations,
                        successRate: 0
                    },
                    metrics: {
                        performance: createDefaultAgentPerformanceMetrics(),
                        resources: createDefaultAgentResourceMetrics(),
                        usage: createDefaultAgentUsageMetrics()
                    },
                    performance: createDefaultAgentPerformanceMetrics(),
                    context: {},
                    validation: {
                        isValid: true,
                        errors: [],
                        warnings: []
                    }
                }
            };
        },
        ensureReactChampionAgent: (agentInstance) => {
            if (!IAgentTypeGuards.isReactChampionAgent(agentInstance)) {
                throw new Error('Agent must be a REACT Champion agent to handle iterations');
            }
        }
    };

    return {
        store,
        setAgent: (newAgent: ReactChampionAgent) => {
            agent = newAgent;
        }
    };
};

export class ReactChampionAgent extends BaseAgent implements IReactChampionAgent {
    public executableAgent: IExecutableAgent;
    protected readonly agentManager: AgentManager;
    protected readonly llmManager: ILLMManager;
    protected readonly iterationManager: IterationManager;
    protected readonly taskManager: TaskManager;
    private static storeFactory = createStoreFactory();

    constructor(config: {
        id: string;
        name: string;
        role: string;
        goal: string;
        tools?: Tool[];
        llmConfig: IRuntimeLLMConfig;
        promptTemplates: IREACTChampionAgentPrompts;
        messageHistory: IMessageHistory;
    }) {
        super({
            ...config,
            llmConfig: config.llmConfig,
            store: ReactChampionAgent.storeFactory.store
        });

        // Get managers through CoreManager registry
        this.agentManager = this.getDomainManager<AgentManager>('AgentManager');
        this.llmManager = this.getDomainManager<ILLMManager>('LLMManager');
        this.iterationManager = this.getDomainManager<IterationManager>('IterationManager');
        this.taskManager = TaskManager.getInstance();

        this.executableAgent = {
            runnable: {} as Runnable,
            getMessageHistory: () => new ChatMessageHistory(),
            inputMessagesKey: 'input',
            historyMessagesKey: 'history'
        };

        // Initialize through AgentManager
        this.agentManager['initializeAgent'](this);

        // Update store with this instance
        ReactChampionAgent.storeFactory.setAgent(this);

        this.logInfo(`Agent created: ${this.name}`);
    }

    // Public error handler for store to use
    public handleAgentError(error: IErrorType, message: string): void {
        this.handleError(error, message);
    }

    // Type guard for store to use
    public isReactChampionAgent(agentInstance: unknown): agentInstance is IReactChampionAgent {
        return IAgentTypeGuards.isReactChampionAgent(agentInstance);
    }

    // Required interface implementations
    public async workOnTask(task: ITaskType): Promise<IAgenticLoopResult> {
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
            result: result.result,
            metadata: {
                iterations: result.metadata.iterations,
                maxAgentIterations: result.metadata.maxAgentIterations
            }
        };
    }

    public async createLLMInstance(): Promise<void> {
        try {
            // Normalize config through LLMManager
            const normalizedConfig = await this.llmManager.validateConfig(this.llmConfig);
            if (!normalizedConfig.isValid) {
                throw new Error(`Invalid LLM config: ${normalizedConfig.errors.join(', ')}`);
            }

            // Create instance through LLMManager
            const result = await this.llmManager.createInstance(this.llmConfig);
            if (!result.success || !result.data) {
                throw new Error('Failed to create LLM instance');
            }

            const llmInstance: ILLMInstance = {
                ...result.data,
                id: this.id,
                getConfig: () => this.llmConfig as LLMProviderConfig,
                updateConfig: (updates) => {
                    Object.assign(this.llmConfig, updates);
                },
                getProvider: () => this.llmConfig.provider,
                validateConfig: async (config) => normalizedConfig,
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
                    config: this.llmConfig,
                    error: error
                }
            });
        }
    }

    public async think(): Promise<IThinkingHandlerResult> {
        if (!this.executionState.currentTask) {
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
            task: this.executionState.currentTask,
            ExecutableAgent: this.executableAgent
        });

        const metrics = result.metadata?.metrics as ILLMMetrics;

        const agentPerformanceMetrics: IAgentPerformanceMetrics = {
            ...createDefaultAgentPerformanceMetrics(),
            executionTime: metrics?.performance?.executionTime || { total: 0, average: 0, min: 0, max: 0 },
            throughput: metrics?.performance?.throughput || { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
            errorMetrics: metrics?.performance?.errorMetrics || { totalErrors: 0, errorRate: 0 },
            resourceUtilization: metrics?.performance?.resourceUtilization || createDefaultAgentResourceMetrics(),
            thinking: createDefaultThinkingMetrics(),
            taskSuccessRate: metrics?.performance?.successRate || 0,
            goalAchievementRate: 0,
            timestamp: Date.now()
        };

        const agentResourceMetrics: IAgentResourceMetrics = {
            cognitive: createDefaultCognitiveMetrics(),
            cpuUsage: metrics?.resources?.cpuUsage || 0,
            memoryUsage: metrics?.resources?.memoryUsage || 0,
            diskIO: metrics?.resources?.diskIO || { read: 0, write: 0 },
            networkUsage: metrics?.resources?.networkUsage || { upload: 0, download: 0 },
            timestamp: Date.now()
        };

        const agentUsageMetrics: IAgentUsageMetrics = {
            totalOperations: metrics?.usage?.totalRequests || 0,
            successRate: metrics?.usage?.successRate || 0,
            averageDuration: metrics?.usage?.averageResponseLength || 0,
            costDetails: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: metrics?.usage?.tokenDistribution?.prompt || 0, cost: 0 },
                    completionTokens: { count: metrics?.usage?.tokenDistribution?.completion || 0, cost: 0 }
                }
            },
            timestamp: Date.now(),
            state: createDefaultStateMetrics(),
            toolUsageFrequency: {},
            taskCompletionCount: 0,
            averageTaskTime: 0
        };

        return {
            success: result.success,
            data: result.data,
            metadata: {
                ...result.metadata,
                thinking: {
                    messageCount: 0,
                    processingTime: 0,
                    metrics,
                    context: {
                        iteration: 0,
                        totalTokens: metrics?.usage?.tokenDistribution?.total || 0,
                        confidence: 0,
                        reasoningChain: []
                    },
                    performance: agentPerformanceMetrics,
                    resources: agentResourceMetrics,
                    usage: agentUsageMetrics,
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
                },
                agent: {
                    id: this.id,
                    name: this.name,
                    metrics: {
                        iterations: 0,
                        executionTime: 0,
                        llmMetrics: metrics
                    }
                },
                task: {
                    id: this.executionState.currentTask.id,
                    title: this.executionState.currentTask.title,
                    metrics: {
                        iterations: 0,
                        executionTime: 0,
                        llmMetrics: metrics
                    }
                },
                llm: {
                    model: this.llmConfig.model,
                    provider: this.llmConfig.provider,
                    temperature: this.llmConfig.temperature,
                    maxTokens: this.llmConfig.maxTokens
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
                type: 'CognitiveError',
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
        const startTime = params.task.metrics.startTime || 0;
        const endTime = Date.now();
        const duration = endTime - startTime;

        // Use TaskManager's event emitter
        await this.taskManager.getInstance().eventEmitter.emitTaskCompleted({
            taskId: params.task.id,
            outputs: params.parsedResultWithFinalAnswer,
            duration
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
        agent: IBaseAgent;
        task: ITaskType;
        parsedLLMOutput: any;
    }): any {
        return params.parsedLLMOutput;
    }

    public handleIssuesParsingLLMOutput(params: {
        agent: IBaseAgent;
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
