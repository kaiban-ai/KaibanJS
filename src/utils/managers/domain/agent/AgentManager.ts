/**
 * @file AgentManager.ts
 * @path src/managers/domain/agent/AgentManager.ts
 * @description Core agent lifecycle and operations management
 *
 * @module @managers/domain/agent
 */

import CoreManager from '../../core/CoreManager';
import { DefaultFactory } from '@/utils/factories/defaultFactory';
import { getApiKey } from '@/utils/helpers/agent/agentUtils';

// Import managers from canonical locations
import { ThinkingManager } from './ThinkingManager';
import { ToolManager } from './ToolManager';
import { IterationManager } from './IterationManager';
import { StatusManager } from '../../core/StatusManager';
import { LLMManager } from '../llm/LLMManager';
import { MessageManager } from '../llm/MessageManager';

// Import types from canonical locations
import type {
    BaseAgentConfig,
    AgentCreationResult,
    AgentValidationResult,
    AgentSelectionCriteria,
    ExecutionContext,
    AgentValidationSchema
} from '@/utils/types/agent';

import type {
    AgentType,
    IBaseAgent,
    AgentExecutionResult
} from '@/utils/types/agent';
import { LLMInstance } from '@/utils/types/llm';

import type {
    TaskType,
    TeamStore,
    LLMConfig,
    Output,
    HandlerResult
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core agent lifecycle and operations management
 */
export class AgentManager extends CoreManager {
    private static instance: AgentManager;
    private readonly statusManager: StatusManager;
    private readonly thinkingManager: ThinkingManager;
    private readonly toolManager: ToolManager;
    private readonly iterationManager: IterationManager;
    private readonly llmManager: LLMManager;
    private readonly messageManager: MessageManager;
    private readonly activeAgents: Map<string, AgentType>;
    private readonly executableAgents: Map<string, LLMInstance>;

    private constructor() {
        super();
        this.statusManager = StatusManager.getInstance();
        this.thinkingManager = ThinkingManager.getInstance();
        this.toolManager = ToolManager.getInstance();
        this.iterationManager = IterationManager.getInstance();
        this.llmManager = LLMManager.getInstance();
        this.messageManager = MessageManager.getInstance();
        this.activeAgents = new Map();
        this.executableAgents = new Map();
    }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    // ─── Agent Creation & Initialization ─────────────────────────────────────────

    /**
     * Create a new agent instance
     */
    public async createAgent(config: BaseAgentConfig): Promise<AgentCreationResult> {
        try {
            this.logManager.info(`Creating agent: ${config.name}`);
            await this.validateConfig();

            // Validate agent configuration
            const validationResult = await this.validateAgentConfig(config);
            if (!validationResult.isValid) {
                throw new Error(`Invalid agent configuration: ${validationResult.errors.join(', ')}`);
            }

            // Create agent instance
            const agent = DefaultFactory.createAgent(config);
            if (!agent.success || !agent.agent) {
                throw new Error('Failed to create agent instance');
            }

            // Initialize LLM instance
            const llmInstance = await this.llmManager.createInstance(agent.agent.llmConfig);
            this.executableAgents.set(agent.agent.id, llmInstance);

            // Create message history
            const messageHistory = await this.messageManager.createMessageHistory();

            // Update agent with message history
            agent.agent.messageHistory = messageHistory;

            // Store active agent
            this.activeAgents.set(agent.agent.id, agent.agent);

            return {
                success: true,
                agent: agent.agent,
                validation: validationResult,
                metadata: {
                    createdAt: Date.now(),
                    configHash: Buffer.from(JSON.stringify(config)).toString('base64'),
                    version: '1.0.0'
                }
            };

        } catch (error) {
            return this.handleAgentCreationError(error, config);
        }
    }

    /**
     * Initialize agent with store and environment
     */
    public async initializeAgent(
        agent: AgentType,
        store: TeamStore,
        env: Record<string, unknown>
    ): Promise<void> {
        try {
            this.logManager.info(`Initializing agent: ${agent.name}`);

            // Set store reference
            agent.store = store;
            agent.env = env;

            // Initialize LLM if needed
            if (!agent.llmInstance) {
                const apiKey = getApiKey(agent.llmConfig, env as Record<string, string>);
                if (!apiKey && !agent.llmConfig.apiBaseUrl) {
                    throw new Error('API key is required via config or environment');
                }
                agent.llmConfig.apiKey = apiKey;
                
                const llmInstance = await this.llmManager.createInstance(agent.llmConfig);
                this.executableAgents.set(agent.id, llmInstance);
            }

            // Update agent status
            await this.statusManager.transition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.INITIAL,
                entity: 'agent',
                entityId: agent.id
            });

            // Update active agents
            this.activeAgents.set(agent.id, agent);

        } catch (error) {
            await this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'AgentManager',
                    method: 'initializeAgent',
                    agentId: agent.id
                }
            });
            throw error;
        }
    }

    // ─── Agent Retrieval & Selection ─────────────────────────────────────────────

    /**
     * Get agent by ID
     */
    public async getAgent(agentId: string): Promise<AgentType | null> {
        return this.activeAgents.get(agentId) || null;
    }

    /**
     * Select agent based on criteria
     */
    public async selectAgent(criteria: AgentSelectionCriteria): Promise<AgentType | null> {
        try {
            const availableAgents = Array.from(this.activeAgents.values());
            
            // Filter by role if specified
            if (criteria.role) {
                availableAgents.filter(agent => agent.role === criteria.role);
            }

            // Filter by required tools
            if (criteria.tools?.length) {
                availableAgents.filter(agent => 
                    criteria.tools!.every(tool => 
                        agent.tools.some(agentTool => agentTool.name === tool)
                    )
                );
            }

            // Filter by model preferences
            if (criteria.preferredModels?.length) {
                availableAgents.filter(agent =>
                    criteria.preferredModels!.includes(agent.llmConfig.model)
                );
            }

            // Apply cost constraints if specified
            if (criteria.costConstraints?.maxCostPerTask) {
                availableAgents.filter(agent => {
                    const stats = agent.getMetrics();
                    return stats.llmUsageStats.costBreakdown.total <= (criteria.costConstraints?.maxCostPerTask || 0);
                });
            }

            // Return first matching agent or null
            return availableAgents[0] || null;

        } catch (error) {
            await this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'AgentManager',
                    method: 'selectAgent',
                    criteria
                }
            });
            return null;
        }
    }

    // ─── Agent Status Management ──────────────────────────────────────────────────

    /**
     * Update agent status with validation
     */
    public async updateAgentStatus(
        agentId: string,
        status: keyof typeof AGENT_STATUS_enum
    ): Promise<boolean> {
        const agent = await this.getAgent(agentId);
        if (!agent) return false;

        try {
            await this.statusManager.transition({
                currentStatus: agent.status,
                targetStatus: status,
                entity: 'agent',
                entityId: agentId
            });

            agent.status = status;
            this.activeAgents.set(agentId, agent);
            
            return true;

        } catch (error) {
            await this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'AgentManager',
                    method: 'updateAgentStatus',
                    agentId
                }
            });
            return false;
        }
    }

    // ─── Agent Task Execution ───────────────────────────────────────────────────

    /**
     * Execute task with proper lifecycle management
     */
    public async executeTask(params: {
        agentId: string;
        task: TaskType;
        context: Record<string, unknown>;
    }): Promise<AgentExecutionResult> {
        const { agentId, task, context } = params;
        const agent = await this.getAgent(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }

        try {
            await this.updateAgentStatus(agentId, 'THINKING');

            const executableAgent = this.executableAgents.get(agentId);
            if (!executableAgent) {
                throw new Error(`Executable agent not found: ${agentId}`);
            }

            const result = await this.thinkingManager.executeThinking({
                agent,
                task,
                executableAgent,
                feedbackMessage: ''
            });

            if (result.error) {
                throw new Error(result.error);
            }

            return {
                success: true,
                result: result.output,
                context
            };

        } catch (error) {
            return {
                success: false,
                error: error as Error,
                context
            };
        }
    }

    // ─── Resource Management ──────────────────────────────────────────────────────

    /**
     * Clean up agent resources
     */
    public async cleanup(): Promise<void> {
        try {
            for (const [agentId, agent] of this.activeAgents.entries()) {
                const llmInstance = this.executableAgents.get(agentId);
                if (llmInstance) {
                    await llmInstance.cleanup();
                    this.executableAgents.delete(agentId);
                }
                await agent.cleanup();
                this.activeAgents.delete(agentId);
            }

            this.logManager.info('AgentManager cleanup completed');

        } catch (error) {
            await this.errorManager.handleError({
                error: error as Error,
                context: {
                    component: 'AgentManager',
                    method: 'cleanup'
                }
            });
            throw error;
        }
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────────

    /**
     * Validate agent configuration
     */
    private async validateAgentConfig(config: BaseAgentConfig): Promise<AgentValidationResult> {
        const errors: string[] = [];
        
        if (!config.name) errors.push('Agent name is required');
        if (!config.role) errors.push('Agent role is required');
        if (!config.goal) errors.push('Agent goal is required');
        if (!config.background) errors.push('Agent background is required');
        
        if (config.llmConfig) {
            if (!config.llmConfig.provider) {
                errors.push('LLM provider is required');
            }
            if (!config.llmConfig.model) {
                errors.push('LLM model is required');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Handle agent creation error
     */
    private handleAgentCreationError(
        error: unknown,
        config: BaseAgentConfig
    ): AgentCreationResult {
        const errorResult = this.errorManager.handleError({
            error: error as Error,
            context: {
                component: 'AgentManager',
                method: 'createAgent',
                config
            }
        });

        return {
            success: false,
            error: errorResult.error,
            validation: {
                isValid: false,
                errors: [errorResult.error.message]
            }
        };
    }
}

export default AgentManager.getInstance();