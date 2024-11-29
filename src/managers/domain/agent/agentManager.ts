/**
 * @file agentManager.ts
 * @path src/managers/domain/agent/agentManager.ts
 * @description Primary agent domain manager coordinating agent lifecycle and operations
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import AgentEventEmitter from './agentEventEmitter';
import AgentMetricsManager from './agentMetricsManager';
import { AGENT_STATUS_enum, LLM_PROVIDER_enum } from '../../../types/common/commonEnums';
import { AgentValidationSchema } from '../../../types/agent/agentValidationTypes';

import type { IAgentType, IReactChampionAgent } from '../../../types/agent';
import type { ITaskType } from '../../../types/task';
import type { 
    IAgenticLoopManager, 
    IMessageManager, 
    ILLMManager, 
    IToolManager,
    IThinkingManager,
    IIterationManager,
    ILoopResult
} from '../../../types/agent/agentManagerTypes';
import type { IAgentValidationResult } from '../../../types/agent/agentValidationTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IBaseError } from '../../../types/common/commonErrorTypes';

export class AgentManager extends CoreManager {
    private static instance: AgentManager | null = null;
    private readonly metricsManager: typeof AgentMetricsManager;
    private readonly eventEmitter: typeof AgentEventEmitter;
    protected readonly activeAgents: Map<string, IAgentType>;

    private constructor() {
        super();
        this.registerDomainManager('AgentManager', this);
        this.metricsManager = AgentMetricsManager;
        this.eventEmitter = AgentEventEmitter;
        this.activeAgents = new Map();
        this.log('AgentManager initialized');
    }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    /**
     * Create a default agent validation schema using Zod
     * @returns Default validation schema for agents
     */
    public createValidationSchema() {
        return AgentValidationSchema.extend({
            llmConfig: AgentValidationSchema.shape.llmConfig.extend({
                provider: AgentValidationSchema.shape.llmConfig.shape.provider.default(LLM_PROVIDER_enum.GROQ),
                model: AgentValidationSchema.shape.llmConfig.shape.model.default('mixtral-8x7b-32768'),
                temperature: AgentValidationSchema.shape.llmConfig.shape.temperature.default(0.7),
                streaming: AgentValidationSchema.shape.llmConfig.shape.streaming.default(true),
                maxRetries: AgentValidationSchema.shape.llmConfig.shape.maxRetries.default(3),
                timeout: AgentValidationSchema.shape.llmConfig.shape.timeout.default(30000),
                maxConcurrency: AgentValidationSchema.shape.llmConfig.shape.maxConcurrency.default(1)
            })
        });
    }

    public async executeAgentLoop(
        agent: IReactChampionAgent,
        task: ITaskType,
        feedbackMessage?: string
    ): Promise<ILoopResult> {
        const result = await this.safeExecute(async () => {
            const agenticLoop = this.getAgenticLoopManager();
            return await agenticLoop.executeLoop({ agent, task, feedbackMessage });
        }, `Failed to execute agent loop for ${agent.name}`);

        return {
            success: result.success,
            result: result.data?.result,
            error: result.error as IBaseError | undefined,
            metadata: {
                iterations: result.data?.metadata.iterations || 0,
                maxAgentIterations: result.data?.metadata.maxAgentIterations || 0,
                ...result.data?.metadata
            }
        };
    }

    public getAgent(agentId: string): IAgentType | undefined {
        return this.activeAgents.get(agentId);
    }

    public getActiveAgents(): IAgentType[] {
        return Array.from(this.activeAgents.values());
    }

    protected async validateAgent(agent: IAgentType): Promise<IAgentValidationResult> {
        const startTime = Date.now();
        const result = await this.safeExecute(async () => {
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!agent.name) errors.push('Agent name is required');
            if (!agent.role) errors.push('Agent role is required');
            if (!agent.goal) errors.push('Agent goal is required');
            if (!agent.llmConfig) errors.push('LLM configuration is required');

            if (agent.llmConfig) {
                const llmManager = this.getLLMManager();
                await llmManager.validateConfig(agent.llmConfig);
            }

            if (agent.tools?.length) {
                const toolManager = this.getToolManager();
                for (const tool of agent.tools) {
                    await toolManager.validateToolConfig(tool);
                }
            }

            const endTime = Date.now();
            const validationResult: IAgentValidationResult = {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: {
                    timestamp: startTime,
                    duration: endTime - startTime,
                    validatorName: this.constructor.name,
                    validatedFields: ['name', 'role', 'goal', 'llmConfig', 'tools'],
                    configHash: `${agent.name}_${Date.now()}`,
                    validationDuration: endTime - startTime
                }
            };

            const eventMetadata = await this.createAgentEventMetadata(agent, null, 'validation');
            await this.eventEmitter.emitAgentValidationCompleted({
                agentId: agent.id,
                validationResult
            });

            return validationResult;
        }, `Failed to validate agent ${agent.name}`);

        return result.data as IAgentValidationResult;
    }

    protected async initializeAgent(agent: IAgentType): Promise<void> {
        await this.safeExecute(async () => {
            if (!agent.llmInstance) {
                const llmManager = this.getLLMManager();
                agent.llmInstance = await llmManager.createInstance(agent.llmConfig);
            }

            const toolManager = this.getToolManager();
            agent.tools = await toolManager.initializeTools(agent);

            this.metricsManager.startCollection(agent.id, {
                detailed: true,
                includeHistory: true,
                samplingRate: 1000
            });

            const eventMetadata = await this.createAgentEventMetadata(agent, null, 'initialization');
            await this.eventEmitter.emitAgentCreated({
                agentId: agent.id,
                agentType: agent
            });

            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.INITIAL,
                context: { operation: 'initialization' }
            });
        }, `Failed to initialize agent ${agent.name}`);
    }

    protected async cleanupAgent(agentId: string): Promise<void> {
        await this.safeExecute(async () => {
            const agent = this.activeAgents.get(agentId);
            if (!agent) return;

            this.metricsManager.stopCollection(agentId);
            this.metricsManager.clearMetricsHistory(agentId);

            if (agent.llmInstance) {
                const llmManager = this.getLLMManager();
                await llmManager.cleanup(agent.llmInstance);
            }

            const toolManager = this.getToolManager();
            await toolManager.cleanupTools(agent);

            const eventMetadata = await this.createAgentEventMetadata(agent, null, 'cleanup');
            await this.eventEmitter.emitAgentDeleted({
                agentId: agent.id,
                finalState: agent
            });

            this.activeAgents.delete(agentId);
        }, `Failed to cleanup agent ${agentId}`);
    }

    private async createAgentEventMetadata(
        agent: IAgentType,
        task: ITaskType | null,
        operation: string
    ) {
        const metrics = await this.metricsManager.getCurrentMetrics(agent.id);
        return {
            ...createBaseMetadata('agent', operation),
            agent: {
                id: agent.id,
                name: agent.name,
                role: agent.role,
                status: agent.status,
                metrics
            }
        };
    }

    private getAgenticLoopManager(): IAgenticLoopManager {
        return this.getDomainManager<IAgenticLoopManager>('AgenticLoopManager');
    }

    private getLLMManager(): ILLMManager {
        return this.getDomainManager<ILLMManager>('LLMManager');
    }

    private getToolManager(): IToolManager {
        return this.getDomainManager<IToolManager>('ToolManager');
    }
}

export default AgentManager.getInstance();
