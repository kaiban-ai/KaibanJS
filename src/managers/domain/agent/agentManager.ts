/**
 * @file agentManager.ts
 * @path src/managers/domain/agent/agentManager.ts
 * @description Primary agent domain manager coordinating specialized managers
 */

// Runtime dependencies
import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';
import { AgentEventEmitter } from './agentEventEmitter';
import { AgentStateManager } from './agentStateManager';
import { AgentValidator } from './agentValidator';
import { ToolManager } from './toolManager';
import { AgentMetricsManager } from './agentMetricsManager';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatMistralAI } from '@langchain/mistralai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Tool } from '@langchain/core/tools';

// Type-only imports
import type {
    IBaseAgentEvent,
    IAgentEventMetadata,
    IAgentCreatedEvent,
    IAgentDeletedEvent,
    IAgentValidationCompletedEvent,
    IAgentEventHandler
} from '../../../types/agent/agentEventTypes';
import type {
    IAgentType,
    IReactChampionAgent
} from '../../../types/agent/agentBaseTypes';
import type {
    IAgentValidationResult,
    IAgentValidationSchema
} from '../../../types/agent/agentValidationTypes';
import type {
    IAgenticLoopManager,
    IMessageManager,
    ILLMManager,
    IToolManager as IToolManagerType,
    IThinkingManager,
    IIterationManager,
    IBaseManager
} from '../../../types/agent/agentManagerTypes';
import type {
    IAgentMetrics,
    IAgentResourceMetrics,
    IAgentPerformanceMetrics,
    IAgentUsageMetrics
} from '../../../types/agent/agentMetricTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { ILLMValidationResult } from '../../../types/llm/llmValidationTypes';
import type { IToolHandlerResult } from '../../../types/tool/toolHandlerTypes';
import type { IBaseError } from '../../../types/common/errorTypes';
import type { IToolInitializationState } from '../../../types/tool/toolManagerTypes';
import type { IMetricsManager } from '../../../types/metrics/base/metricsManagerTypes';
import type { IAgentError, IAgentErrorContext } from '../../../types/agent/errorHandlingTypes';
import { RecoveryStrategyType } from '../../../types/common/recoveryTypes';
import type { IErrorContext } from '../../../types/common/errorTypes';
import type { IAgentExecutionState } from '../../../types/agent/agentStateTypes';
import type { ILLMUsageMetrics } from '../../../types/llm/llmMetricTypes';

// Add imports for base metrics types
import type { IPerformanceMetrics, IErrorMetrics, IBasicErrorMetrics } from '../../../types/metrics/base/performanceMetrics';

// Enum imports
import {
    AGENT_STATUS_enum,
    LLM_PROVIDER_enum,
    VALIDATION_ERROR_enum,
    VALIDATION_WARNING_enum,
    MANAGER_CATEGORY_enum,
    ERROR_SEVERITY_enum
} from '../../../types/common/enumTypes';
import { AGENT_EVENT_CATEGORY, AGENT_EVENT_TYPE } from '../../../types/agent/agentEventTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

// Error handling imports
import { createAgentError } from '../../../types/agent/errorHandlingTypes';
import { ERROR_KINDS, type IErrorKind, type IErrorSeverity } from '../../../types/common/errorTypes';

// Type trick to handle runtime dependencies
declare interface _RuntimeImports {
    external: {
        langchain: {
            models: {
                base: typeof BaseChatModel;
                providers: {
                    groq: typeof ChatGroq;
                    anthropic: typeof ChatAnthropic;
                    openai: typeof ChatOpenAI;
                    mistralai: typeof ChatMistralAI;
                    googlegenai: typeof ChatGoogleGenerativeAI;
                };
            };
            tools: typeof Tool;
        };
    };
    internal: {
        core: {
            base: typeof CoreManager;
            events: typeof BaseEventEmitter;
        };
        domain: {
            agent: {
                manager: typeof AgentManager;  // Primary domain manager
                events: typeof AgentEventEmitter;
                state: typeof AgentStateManager;
                validation: typeof AgentValidator;
                metrics: typeof AgentMetricsManager;
                tool: typeof ToolManager;
            };
        };
    };
    types: {
        agent: {
            base: {
                AgentType: IAgentType;
                ReactChampionAgent: IReactChampionAgent;
            };
            events: {
                BaseAgentEvent: IBaseAgentEvent;
                AgentEventMetadata: IAgentEventMetadata;
                AgentCreatedEvent: IAgentCreatedEvent;
                AgentDeletedEvent: IAgentDeletedEvent;
                AgentValidationCompletedEvent: IAgentValidationCompletedEvent;
                AgentEventHandler: IAgentEventHandler;
            };
            validation: {
                AgentValidationResult: IAgentValidationResult;
                AgentValidationSchema: IAgentValidationSchema;
            };
            managers: {
                AgenticLoopManager: IAgenticLoopManager;
                MessageManager: IMessageManager;
                LLMManager: ILLMManager;
                ToolManager: IToolManagerType;
                ThinkingManager: IThinkingManager;
                IterationManager: IIterationManager;
                BaseManager: IBaseManager;
            };
            metrics: {
                AgentMetrics: IAgentMetrics;
                AgentResourceMetrics: IAgentResourceMetrics;
                AgentPerformanceMetrics: IAgentPerformanceMetrics;
                AgentUsageMetrics: IAgentUsageMetrics;
            };
        };
        task: {
            TaskType: ITaskType;
        };
        llm: {
            LLMValidationResult: ILLMValidationResult;
        };
        tool: {
            ToolHandlerResult: IToolHandlerResult;
            ToolInitializationState: IToolInitializationState;
        };
        common: {
            BaseError: IBaseError;
            MetricsManager: IMetricsManager;
        };
    };
    enums: {
        agent: {
            status: typeof AGENT_STATUS_enum;
            events: {
                category: typeof AGENT_EVENT_CATEGORY;
                type: typeof AGENT_EVENT_TYPE;
            };
        };
        llm: typeof LLM_PROVIDER_enum;
        validation: {
            error: typeof VALIDATION_ERROR_enum;
            warning: typeof VALIDATION_WARNING_enum;
        };
        manager: typeof MANAGER_CATEGORY_enum;
        metrics: {
            domain: typeof MetricDomain;
            type: typeof MetricType;
        };
    };
}

export class AgentManager extends CoreManager {
    private static instance: AgentManager | null = null;
    private readonly stateManager: AgentStateManager;
    private readonly validator: AgentValidator;
    private readonly toolManager: ToolManager;
    private readonly agentMetricsManager: AgentMetricsManager;
    protected override readonly eventEmitter: BaseEventEmitter & AgentEventEmitter;

    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.SERVICE;

    private constructor() {
        super();
        // Initialize manager instances
        this.stateManager = AgentStateManager.getInstance();
        this.validator = AgentValidator.getInstance();
        this.toolManager = ToolManager.getInstance();
        this.agentMetricsManager = AgentMetricsManager.getInstance();
        this.eventEmitter = AgentEventEmitter.getInstance() as BaseEventEmitter & AgentEventEmitter;

        // Register domain managers in AgentManager
        this.registerDomainManager('AgentStateManager', this.stateManager);
        this.registerDomainManager('AgentValidator', this.validator);
        this.registerDomainManager('ToolManager', this.toolManager);
        this.registerDomainManager('AgentMetricsManager', this.agentMetricsManager);
        this.registerDomainManager('AgentEventEmitter', this.eventEmitter);

        // Register self with CoreManager
        const coreManager = CoreManager.getInstance();
        if (coreManager instanceof CoreManager) {
            coreManager['registerDomainManager']('AgentManager', this);
        }
    }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    protected override async createErrorContext(
        operation: string,
        details?: Record<string, unknown>
    ): Promise<IErrorContext> {
        const baseContext = await super.createErrorContext(operation, details);
        const agentDetails = details?.agent as IAgentType | undefined;

        if (!agentDetails) {
            return baseContext;
        }

        const metrics = await this.agentMetricsManager.getCurrentMetrics(agentDetails.id);
        
        // Create basic error metrics if base context metrics are undefined
        const basicErrorMetrics: IBasicErrorMetrics = baseContext.metrics || {
            totalErrors: metrics.performance.errorCount,
            errorRate: 1 - metrics.performance.taskSuccessRate
        };

        // Create performance metrics that match IPerformanceMetrics interface
        const performanceMetrics: IPerformanceMetrics = {
            executionTime: metrics.performance.thinking.reasoningTime,
            latency: metrics.performance.thinking.planningTime,
            throughput: {
                operationsPerSecond: metrics.performance.taskSuccessRate * 100,
                dataProcessedPerSecond: 0
            },
            responseTime: metrics.performance.thinking.learningTime,
            queueLength: metrics.performance.taskSuccessRate ? 0 : 1,
            errorRate: 1 - metrics.performance.taskSuccessRate,
            successRate: metrics.performance.taskSuccessRate,
            errorMetrics: basicErrorMetrics,
            resourceUtilization: metrics.resources,
            timestamp: metrics.performance.timestamp
        };

        return {
            ...baseContext,
            component: this.constructor.name,
            operation,
            details: {
                ...details,
                agentId: agentDetails.id,
                agentName: agentDetails.name,
                taskId: agentDetails.executionState?.core.currentTask?.id,
                metrics: {
                    performance: performanceMetrics,
                    resources: metrics.resources,
                    usage: metrics.usage
                }
            }
        };
    }

    private async handleAgentError(
        error: Error | IAgentError,
        agent: IAgentType,
        operation: string,
        subtype: IAgentErrorContext['subtype'],
        recoveryStrategy?: RecoveryStrategyType
    ): Promise<never> {
        const context = await this.createErrorContext(operation, { agent });
        const metrics = await this.agentMetricsManager.getCurrentMetrics(agent.id);

        // Initialize error distribution records
        const errorDistribution: Record<IErrorKind, number> = Object.values(ERROR_KINDS).reduce(
            (acc, kind) => ({ ...acc, [kind]: 0 }), 
            {} as Record<IErrorKind, number>
        );
        errorDistribution[ERROR_KINDS.AgentError] = 1;

        const severityDistribution: Record<IErrorSeverity, number> = {
            DEBUG: 0,
            INFO: 0,
            WARNING: 0,
            ERROR: 1,
            CRITICAL: 0
        };

        const strategyDistribution: Record<RecoveryStrategyType, number> = Object.values(RecoveryStrategyType).reduce(
            (acc, strategy) => ({ ...acc, [strategy]: 0 }), 
            {} as Record<RecoveryStrategyType, number>
        );
        if (recoveryStrategy) {
            strategyDistribution[recoveryStrategy] = 1;
        }

        // Create enhanced error metrics
        const errorMetrics: IErrorMetrics = {
            totalErrors: metrics.performance.errorCount,
            errorRate: 1 - metrics.performance.taskSuccessRate,
            errorDistribution,
            severityDistribution,
            patterns: [],
            impact: {
                severity: ERROR_SEVERITY_enum.ERROR,
                businessImpact: 0,
                userExperienceImpact: 0,
                systemStabilityImpact: 0,
                resourceImpact: {
                    cpu: metrics.resources.cpuUsage,
                    memory: metrics.resources.memoryUsage,
                    io: metrics.resources.diskIO.read + metrics.resources.diskIO.write
                }
            },
            recovery: {
                meanTimeToRecover: 0,
                recoverySuccessRate: 1,
                strategyDistribution,
                failedRecoveries: 0
            },
            prevention: {
                preventedCount: 0,
                preventionRate: 1,
                earlyWarnings: 0
            },
            trends: {
                dailyRates: [],
                weeklyRates: [],
                monthlyRates: []
            }
        };

        // Create performance metrics that match IPerformanceMetrics interface
        const performanceMetrics: IPerformanceMetrics = {
            executionTime: metrics.performance.thinking.reasoningTime,
            latency: metrics.performance.thinking.planningTime,
            throughput: {
                operationsPerSecond: metrics.performance.taskSuccessRate * 100,
                dataProcessedPerSecond: 0
            },
            responseTime: metrics.performance.thinking.learningTime,
            queueLength: metrics.performance.taskSuccessRate ? 0 : 1,
            errorRate: 1 - metrics.performance.taskSuccessRate,
            successRate: metrics.performance.taskSuccessRate,
            errorMetrics,
            resourceUtilization: metrics.resources,
            timestamp: metrics.performance.timestamp
        };
        
        const llmUsageMetrics: ILLMUsageMetrics = {
            totalRequests: 0,
            activeInstances: 1,
            activeUsers: 1,
            requestsPerSecond: 0,
            averageResponseLength: 0,
            averageResponseSize: 0,
            peakMemoryUsage: 0,
            uptime: 0,
            rateLimit: {
                current: 0,
                limit: 100,
                remaining: 100,
                resetTime: Date.now() + 3600000
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

        const agentError = createAgentError({
            message: error.message,
            subtype,
            severity: ERROR_SEVERITY_enum.ERROR,
            context: {
                agentId: agent.id,
                agentName: agent.name,
                taskId: agent.executionState?.core.currentTask?.id,
                operation,
                timestamp: Date.now(),
                subtype,
                metrics: {
                    performance: performanceMetrics,
                    resources: metrics.resources,
                    llm: {
                        ...llmUsageMetrics,
                        ...agent.llmConfig
                    }
                },
                cognitive: {
                    load: metrics.resources.cognitive.cognitiveLoad,
                    capacity: metrics.resources.cognitive.processingCapacity,
                    memoryUtilization: metrics.resources.cognitive.memoryAllocation,
                    processingEfficiency: metrics.resources.cognitive.processingCapacity,
                    thinkingLatency: metrics.performance.thinking.reasoningTime
                },
                state: {
                    currentPhase: agent.executionState?.core.status || '',
                    iterationCount: agent.executionState?.assignment.iterations || 0,
                    lastSuccessfulOperation: operation,
                    lastSuccessfulTimestamp: Date.now()
                }
            },
            cause: error,
            recovery: recoveryStrategy ? {
                strategy: recoveryStrategy,
                maxAttempts: 3,
                timeout: 30000,
                resourceThresholds: {
                    maxCpuUsage: 90,
                    maxMemoryUsage: 1e9,
                    maxCognitiveLoad: 0.9,
                    maxNetworkUsage: 1e8
                }
            } : undefined
        });

        // Track error metrics
        await this.metricsManager.trackMetric({
            domain: MetricDomain.AGENT,
            type: MetricType.PERFORMANCE,
            value: 1,
            timestamp: Date.now(),
            metadata: {
                agentId: agent.id,
                operation,
                error: true,
                errorType: agentError.type,
                subtype: agentError.context.subtype
            }
        });

        throw agentError;
    }

    public async validateAgent(agent: IAgentType): Promise<IAgentValidationResult | never> {
        const startTime = Date.now();
        try {
            const result = await this.validator.validateAgent(agent);
            const duration = Date.now() - startTime;

            // Track validation metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.AGENT,
                type: MetricType.PERFORMANCE,
                value: duration,
                timestamp: startTime,
                metadata: {
                    agentId: agent.id,
                    operation: 'validation',
                    success: result.isValid
                }
            });

            return {
                ...result,
                errors: result.errors.map((error: string) => error as VALIDATION_ERROR_enum),
                warnings: Array.from(result.warnings || []) as VALIDATION_WARNING_enum[],
                metadata: {
                    timestamp: startTime,
                    duration,
                    validatorName: this.validator.constructor.name,
                    validatedFields: ['id', 'name', 'role', 'status', 'config'],
                    configHash: agent.id,
                    validationDuration: duration
                }
            };
        } catch (error) {
            await this.handleAgentError(
                error as Error,
                agent,
                'validation',
                'validation'
            );
            throw error; // Explicit throw to satisfy TypeScript
        }
    }

    public async initializeAgent(agent: IAgentType): Promise<void> {
        try {
            const startTime = Date.now();

            // Initialize LLM instance
            if (!agent.llmInstance) {
                const llmManager = this.getDomainManager<ILLMManager>('LLMManager');
                const instanceResult = await llmManager.createInstance(agent.llmConfig);
                if (!instanceResult.success || !instanceResult.data) {
                    throw new Error('Failed to create LLM instance');
                }
                agent.llmInstance = instanceResult.data;
            }

            // Initialize tools
            await this.toolManager.initializeTools(agent);

            // Track initialization metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.AGENT,
                type: MetricType.RESOURCE,
                value: Date.now() - startTime,
                timestamp: startTime,
                metadata: {
                    agentId: agent.id,
                    operation: 'initialization',
                    success: true
                }
            });

            // Add to state manager
            await this.stateManager.addAgent(agent);

            // Emit initialization event
            await this.eventEmitter.emitAgentCreated({
                agentId: agent.id,
                agentType: agent
            });

            // Update agent status
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.INITIAL,
                context: { operation: 'initialization' }
            });
        } catch (error) {
            await this.handleAgentError(
                error as Error,
                agent,
                'initialization',
                'initialization',
                RecoveryStrategyType.AGENT_RESTART
            );
        }
    }

    public async cleanupAgent(agentId: string): Promise<void> {
        const agent = this.stateManager.getAgent(agentId);
        if (!agent) return;

        try {
            const startTime = Date.now();

            // Track cleanup metrics
            await this.metricsManager.trackMetric({
                domain: MetricDomain.AGENT,
                type: MetricType.RESOURCE,
                value: 0,
                timestamp: startTime,
                metadata: {
                    agentId,
                    operation: 'cleanup'
                }
            });

            // Cleanup LLM instance
            if (agent.llmInstance) {
                const llmManager = this.getDomainManager<ILLMManager>('LLMManager');
                await llmManager.cleanupInstance(agent.llmInstance);
            }

            // Cleanup tools
            await this.toolManager.cleanupTools(agent);

            // Remove from state manager
            await this.stateManager.removeAgent(agentId);

            // Emit cleanup event
            await this.eventEmitter.emitAgentDeleted({
                agentId: agent.id,
                finalState: agent
            });
        } catch (error) {
            await this.handleAgentError(
                error as Error,
                agent,
                'cleanup',
                'resource',
                RecoveryStrategyType.GRACEFUL_DEGRADATION
            );
        }
    }

    public getAgent(agentId: string): IAgentType | undefined {
        return this.stateManager.getAgent(agentId);
    }

    public getActiveAgents(): IAgentType[] {
        return this.stateManager.getActiveAgents();
    }
}

export default AgentManager.getInstance();
