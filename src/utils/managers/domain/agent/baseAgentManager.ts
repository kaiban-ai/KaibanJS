/**
 * @file baseAgentManager.ts
 * @path src/utils/managers/domain/agent/baseAgentManager.ts
 * @description Base manager providing core agent management functionality and service registry integration
 *
 * @module @managers/domain/agent
 */

import { CoreManager } from '../../core/coreManager';
import { getApiKey } from '@/utils/helpers/agent/agentUtils';

// Import canonical types
import type { 
    AgentType,
    AgentValidationResult,
    AgentSelectionCriteria,
    HandlerResult
} from '@/utils/types/agent';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Base manager for agent operations implementing the manager registry pattern
 */
export abstract class BaseAgentManager extends CoreManager {
    // Track active agents
    protected readonly activeAgents: Map<string, AgentType>;

    protected constructor() {
        super();
        this.activeAgents = new Map();
        // Register this manager in the CoreManager registry
        this.registerDomainManager('BaseAgentManager', this);
    }

    // ─── Required Abstract Methods ──────────────────────────────────────────────────

    /**
     * Validate agent configuration and properties
     */
    protected abstract validateAgent(agent: AgentType): Promise<AgentValidationResult>;

    /**
     * Initialize agent resources and state
     */
    protected abstract initializeAgent(agent: AgentType): Promise<void>;

    /**
     * Clean up agent resources
     */
    protected abstract cleanupAgent(agentId: string): Promise<void>;

    // ─── Protected Registry Methods ─────────────────────────────────────────────────

    /**
     * Register an agent with the manager service registry
     */
    protected async registerAgent(agent: AgentType): Promise<HandlerResult> {
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

            // Log using core manager's logger
            this.logManager.info(`Agent registered: ${agent.name}`, agent.name);

            return {
                success: true,
                data: {
                    agentId: agent.id,
                    timestamp: Date.now()
                }
            };

        }, `Failed to register agent ${agent.name}`);
    }

    /**
     * Unregister an agent from the service registry
     */
    protected async unregisterAgent(agentId: string): Promise<HandlerResult> {
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

            return {
                success: true,
                data: {
                    agentId,
                    timestamp: Date.now()
                }
            };

        }, `Failed to unregister agent ${agentId}`);
    }

    // ─── Protected Resource Management ────────────────────────────────────────────

    /**
     * Initialize LLM for an agent using core manager's LLMManager
     */
    protected async initializeLLM(agent: AgentType): Promise<void> {
        if (!agent.llmInstance) {
            const apiKey = getApiKey(agent.llmConfig, agent.env as Record<string, string> || {});
            if (!apiKey) {
                throw new Error('API key is required via config or environment');
            }
            
            agent.llmConfig.apiKey = apiKey;
            
            // Access LLMManager through core manager
            const llmManager = this.getDomainManager('LLMManager');
            agent.llmInstance = await llmManager.createInstance(agent.llmConfig);
        }
    }

    /**
     * Select an agent based on criteria
     */
    protected async selectAgent(criteria: AgentSelectionCriteria): Promise<AgentType | null> {
        const agents = Array.from(this.activeAgents.values());
        
        return agents.find(agent => (
            (!criteria.role || agent.role === criteria.role) &&
            (!criteria.tools?.length || criteria.tools.every(tool => 
                agent.tools.some(agentTool => agentTool.name === tool))) &&
            (!criteria.preferredModels?.length || 
             criteria.preferredModels.includes(agent.llmConfig.model))
        )) || null;
    }

    // ─── Public API Methods ──────────────────────────────────────────────────────

    /**
     * Get active agent count
     */
    public getActiveAgentCount(): number {
        return this.activeAgents.size;
    }

    /**
     * Get agent by id
     */
    public getAgent(agentId: string): AgentType | undefined {
        return this.activeAgents.get(agentId);
    }

    /**
     * Get all active agents
     */
    public getActiveAgents(): AgentType[] {
        return Array.from(this.activeAgents.values());
    }
}