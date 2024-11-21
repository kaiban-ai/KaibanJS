/**
 * @file baseAgentManager.ts
 * @path src/managers/domain/agent/baseAgentManager.ts
 * @description Base manager providing core agent management functionality and service registry integration
 */

import { CoreManager } from '../../core/coreManager';
import { getApiKey } from '../../../utils/helpers/agent/agentUtils';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';

// Import types from canonical locations
import { IAgentTypeGuards } from '../../../types/agent/agentBaseTypes';
import type { IAgentType, IReactChampionAgent } from '../../../types/agent/agentBaseTypes';
import type { 
    IAgentValidationResult,
    IAgentSelectionCriteria 
} from '../../../types/agent/agentValidationTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import { 
    ILLMConfig,
    IActiveLLMConfig,
    isActiveConfig
} from '../../../types/llm/llmCommonTypes';
import type { LLMManager } from '../../domain/llm/llmManager';
import type { ErrorManager } from '../../core/errorManager';
import type { ITeamStoreMethods } from '../../../types/team';
import { AGENT_STATUS_enum, TASK_STATUS_enum } from '../../../types/common/commonEnums';
import { IWorkflowMetadata, IErrorMetadata, ISuccessMetadata } from '../../../types/common/commonMetadataTypes';
import { ITeamErrorHandlerParams } from '../../../types/common/commonErrorTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';

const MOCK_API_KEY = 'mock-api-key-for-testing';

/**
 * Base manager for agent operations implementing the manager registry pattern
 */
export abstract class BaseAgentManager extends CoreManager {
    // Track active agents
    protected readonly activeAgents: Map<string, IAgentType>;

    protected constructor() {
        super();
        this.activeAgents = new Map();
        this.registerDomainManager('BaseAgentManager', this);
    }

    // ─── Required Abstract Methods ──────────────────────────────────────────────────

    protected abstract validateAgent(agent: IAgentType): Promise<IAgentValidationResult>;
    protected abstract initializeAgent(agent: IAgentType): Promise<void>;
    protected abstract cleanupAgent(agentId: string): Promise<void>;

    // ─── Protected Registry Methods ─────────────────────────────────────────────────

    /**
     * Register an agent with the manager service registry
     */
    protected async registerAgent(agent: IAgentType): Promise<IHandlerResult> {
        return await this.safeExecute(async () => {
            const validation = await this.validateAgent(agent);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            await this.initializeAgent(agent);
            this.activeAgents.set(agent.id, agent);

            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.INITIAL,
                entity: 'agent',
                entityId: agent.id,
                metadata: this.prepareMetadata({ agent })
            });

            this.logManager.info(`Agent registered: ${agent.name}`, agent.name);

            return MetadataFactory.createSuccessResult({
                agentId: agent.id,
                status: agent.status,
                capabilities: agent.capabilities,
                metadata: {
                    registrationTime: Date.now(),
                    validationResult: validation
                }
            });

        }, `Failed to register agent ${agent.name}`);
    }

    /**
     * Unregister an agent from the service registry
     */
    protected async unregisterAgent(agentId: string): Promise<IHandlerResult> {
        return await this.safeExecute(async () => {
            const agent = this.activeAgents.get(agentId);
            if (!agent) {
                throw new Error(`Agent not found: ${agentId}`);
            }

            await this.cleanupAgent(agentId);
            
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.IDLE,
                entity: 'agent',
                entityId: agentId,
                metadata: {
                    reason: 'unregistered',
                    timestamp: Date.now()
                }
            });

            this.activeAgents.delete(agentId);

            return MetadataFactory.createSuccessResult({
                agentId,
                status: AGENT_STATUS_enum.IDLE,
                metadata: {
                    unregistrationTime: Date.now(),
                    lastStatus: agent.status,
                    cleanupSuccess: true
                }
            });

        }, `Failed to unregister agent ${agentId}`);
    }

    // ─── Protected Resource Management ────────────────────────────────────────────

    /**
     * Initialize LLM for an agent using manager registry
     */
    protected async initializeLLM(agent: IAgentType): Promise<void> {
        if (!agent.llmInstance) {
            const apiKey = agent.llmConfig.provider === 'none' 
                ? MOCK_API_KEY 
                : getApiKey(agent.llmConfig, agent.env as Record<string, string> || {});

            if (!apiKey) {
                throw new Error('API key is required via config or environment');
            }

            const config: ILLMConfig = {
                ...agent.llmConfig,
                apiKey
            };
            
            const llmManager = await this.getDomainManager<LLMManager>('LLMManager');
            agent.llmInstance = await llmManager.createInstance(config);
        }
    }

    /**
     * Select an agent based on criteria
     */
    protected async selectAgent(criteria: IAgentSelectionCriteria): Promise<IAgentType | null> {
        const agents = Array.from(this.activeAgents.values());
        
        const matchingAgents = agents.filter(agent => {
            if (criteria.role && agent.role !== criteria.role) return false;
            if (criteria.tools && !criteria.tools.every(tool => agent.capabilities.supportedTools?.includes(tool))) return false;
            if (criteria.capabilities && !criteria.capabilities.every(cap => agent.metadata.capabilities.includes(cap))) return false;
            if (criteria.preferredModels && !criteria.preferredModels.includes(agent.llmConfig.model || '')) return false;
            if (criteria.minPerformanceScore && (agent.metrics?.performance.performanceScore || 0) < criteria.minPerformanceScore) return false;
            return true;
        });

        return matchingAgents[0] || null;
    }

    // ─── Public API Methods ──────────────────────────────────────────────────────

    public getActiveAgentCount(): number {
        return this.activeAgents.size;
    }

    public getAgent(agentId: string): IAgentType | undefined {
        return this.activeAgents.get(agentId);
    }

    public getActiveAgents(): IAgentType[] {
        return Array.from(this.activeAgents.values());
    }

    // ─── Protected Error Handling ────────────────────────────────────────────────

    /**
     * Handle agent-specific errors through error manager
     */
    protected async handleAgentError(
        error: Error,
        agent: IAgentType,
        context: string
    ): Promise<void> {
        // Type guard to ensure agent is IReactChampionAgent
        if (!IAgentTypeGuards.isReactChampionAgent(agent)) {
            throw new Error('Agent must be a ReactChampionAgent to handle errors');
        }

        const errorManager = await this.getDomainManager<ErrorManager>('ErrorManager');

        // Create a mock task for error handling context
        const mockTask: ITaskType = {
            id: `error-task-${Date.now()}`,
            title: 'Error Handler Task',
            description: `Error handling task for agent ${agent.name}`,
            expectedOutput: 'Error resolution',
            agent: agent,
            status: TASK_STATUS_enum.ERROR,
            stepId: 'error-handling',
            isDeliverable: false,
            externalValidationRequired: false,
            inputs: {},
            metrics: {
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0,
                iterationCount: 0,
                resources: {
                    memory: 0,
                    cpu: 0,
                    tokens: 0
                },
                performance: {
                    averageIterationTime: 0,
                    averageTokensPerSecond: 0,
                    peakMemoryUsage: 0
                },
                costs: {
                    input: 0,
                    output: 0,
                    total: 0,
                    currency: 'USD'
                },
                llmUsage: {
                    inputTokens: 0,
                    outputTokens: 0,
                    callsCount: 0,
                    callsErrorCount: 0,
                    parsingErrors: 0,
                    totalLatency: 0,
                    averageLatency: 0,
                    lastUsed: Date.now(),
                    memoryUtilization: {
                        peakMemoryUsage: 0,
                        averageMemoryUsage: 0,
                        cleanupEvents: 0
                    },
                    costBreakdown: {
                        input: 0,
                        output: 0,
                        total: 0,
                        currency: 'USD'
                    }
                }
            },
            progress: {
                status: TASK_STATUS_enum.ERROR,
                progress: 0,
                timeElapsed: 0
            },
            history: [],
            feedback: [],
            setStore: () => {},
            execute: async () => null
        };

        const errorParams: ITeamErrorHandlerParams = {
            error: {
                name: error.name,
                message: error.message,
                type: 'AgentError'
            },
            agent,
            task: mockTask,
            context: {
                location: this.constructor.name,
                operation: context
            },
            metadata: MetadataFactory.createErrorMetadata(error),
            store: {
                setState: () => {},
                getState: () => ({
                    name: 'default',
                    teamWorkflowStatus: 'INITIAL',
                    workflowContext: '',
                    inputs: {},
                    env: {},
                    workflowLogs: [],
                    tasks: [],
                    agents: [],
                    resources: {},
                    tasksInitialized: false
                }),
                subscribe: () => () => {},
                destroy: () => {},
                startWorkflow: async () => ({
                    success: true,
                    metadata: MetadataFactory.createWorkflowMetadata('start')
                }),
                stopWorkflow: async () => ({
                    success: true,
                    metadata: MetadataFactory.createWorkflowMetadata('stop')
                }),
                handleWorkflowError: async () => MetadataFactory.createErrorResult(error),
                handleAgentStatusChange: async () => MetadataFactory.createSuccessResult({}),
                handleAgentError: async () => MetadataFactory.createErrorResult(error),
                handleTaskStatusChange: async () => MetadataFactory.createSuccessResult({}),
                handleTaskError: async () => MetadataFactory.createErrorResult(error),
                handleTaskBlocked: async () => MetadataFactory.createSuccessResult({}),
                provideFeedback: async () => MetadataFactory.createSuccessResult({})
            }
        };

        await errorManager.handleAgentError(errorParams);
    }
}
