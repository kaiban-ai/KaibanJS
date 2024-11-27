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
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';

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
            error: result.error?.message,
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

            const validationResult: IAgentValidationResult = {
                isValid: errors.length === 0,
                errors,
                warnings,
                metadata: {
                    timestamp: Date.now(),
                    validatedFields: ['name', 'role', 'goal', 'llmConfig', 'tools'],
                    configHash: `${agent.name}_${Date.now()}`
                }
            };

            await this.eventEmitter.emitAgentValidationCompleted(
                agent.id,
                validationResult,
                await this.createAgentEventMetadata(agent, null, 'validation')
            );

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

            await this.eventEmitter.emitAgentCreated(
                agent.id,
                agent,
                await this.createAgentEventMetadata(agent, null, 'initialization')
            );

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

            await this.eventEmitter.emitAgentDeleted(
                agent.id,
                agent,
                await this.createAgentEventMetadata(agent, null, 'cleanup')
            );

            this.activeAgents.delete(agentId);
        }, `Failed to cleanup agent ${agentId}`);
    }

    private async createAgentEventMetadata(
        agent: IAgentType,
        task: ITaskType | null,
        operation: string
    ) {
        const metrics = await this.metricsManager.getCurrentMetrics();
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
