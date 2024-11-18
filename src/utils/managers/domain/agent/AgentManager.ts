/**
 * @file agentManager.ts
 * @path src/utils/managers/domain/agent/agentManager.ts
 * @description Core agent management implementation leveraging manager registry
 *
 * @module @managers/domain/agent
 */

import { BaseAgentManager } from './baseAgentManager';
import type { 
    AgentType,
    AgentCreationResult,
    AgentValidationResult,
    AgentValidationSchema,
    AgentSelectionCriteria,
    HandlerResult,
    ErrorType
} from '@/utils/types/agent';

import type { 
    TaskType,
    TaskResult  
} from '@/utils/types/task';

import type {
    Output,
    LLMUsageStats
} from '@/utils/types/llm';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

/**
 * Core agent management implementation
 */
export class AgentManager extends BaseAgentManager {
    private static instance: AgentManager;

    private constructor() {
        super();
        // Register this manager in CoreManager's registry
        this.registerDomainManager('AgentManager', this);
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    /**
     * Create and initialize a new agent
     */
    public async createAgent(config: AgentValidationSchema): Promise<AgentCreationResult> {
        return await this.safeExecute(async () => {
            // Validate agent configuration
            const validation = await this.validateAgent(config as AgentType);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Create agent instance
            const agentResult = DefaultFactory.createAgent(config);
            if (!agentResult.success || !agentResult.agent) {
                throw new Error('Failed to create agent instance');
            }

            // Register the agent
            await this.registerAgent(agentResult.agent);

            return {
                success: true,
                agent: agentResult.agent,
                validation,
                metadata: {
                    createdAt: Date.now(),
                    configHash: this.generateConfigHash(config),
                    version: '1.0.0'
                }
            };

        }, 'Agent creation failed');
    }

    /**
     * Execute agent operation
     */
    public async executeOperation(params: {
        agent: AgentType;
        task: TaskType;
        store: TeamStore;
        context?: Record<string, unknown>;
    }): Promise<AgentExecutionResult> {
        const { agent, task, store, context } = params;

        return await this.safeExecute(async () => {
            // Create execution context
            const executionContext: ExecutionContext = {
                task,
                agent,
                iterations: 0,
                maxAgentIterations: agent.maxIterations,
                startTime: Date.now()
            };

            // Get required domain managers
            const agenticLoopManager = this.getDomainManager<AgenticLoopManager>('AgenticLoopManager');
            const messageManager = this.getDomainManager<MessageManager>('MessageManager');

            // Initialize message history
            await messageManager.clear();

            // Execute through agentic loop
            const result = await agenticLoopManager.executeLoop({
                agent,
                task,
                ExecutableAgent: agent.executableAgent,
                context: executionContext
            });

            if (result.error) {
                throw new Error(result.error);
            }

            return {
                success: true,
                result: result.result as Output,
                metadata: {
                    iterations: result.metadata.iterations,
                    executionTime: Date.now() - executionContext.startTime,
                    llmUsageStats: result.result?.llmUsageStats || DefaultFactory.createLLMUsageStats()
                }
            };

        }, 'Agent operation execution failed');
    }

    /**
     * Process task feedback
     */
    public async processFeedback(params: {
        agent: AgentType;
        task: TaskType;
        feedback: string;
        context?: string;
    }): Promise<HandlerResult> {
        const { agent, task, feedback, context } = params;

        return await this.safeExecute(async () => {
            const result = await agent.workOnFeedback(task, [{
                id: Date.now().toString(),
                content: feedback,
                timestamp: new Date(),
                userId: 'system',
                status: 'PENDING'
            }], context || '');

            return {
                success: true,
                data: result
            };

        }, 'Feedback processing failed');
    }

    /**
     * Select appropriate agent based on criteria
     */
    public async selectAgent(criteria: AgentSelectionCriteria): Promise<AgentType | null> {
        return await this.safeExecute(async () => {
            const agents = Array.from(this.activeAgents.values());
            
            return agents.find(agent => this.matchesCriteria(agent, criteria)) || null;

        }, 'Agent selection failed') || null;
    }

    /**
     * Handle agent errors during execution
     */
    public async handleAgentError(params: {
        agent: AgentType;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
    }): Promise<HandlerResult> {
        const { agent, task, error, context } = params;

        return await this.safeExecute(async () => {
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.THINKING_ERROR,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    error,
                    context,
                    timestamp: Date.now()
                }
            });

            const errorLog = this.prepareErrorLog(agent, task, error, context);
            agent.store?.setState((state) => ({
                workflowLogs: [...state.workflowLogs, errorLog]
            }));

            return {
                success: false,
                error,
                data: {
                    errorLog,
                    timestamp: Date.now()
                }
            };

        }, 'Error handling failed');
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Validate agent against schema
     */
    protected async validateAgent(agent: AgentType): Promise<AgentValidationResult> {
        const errors: string[] = [];

        // Basic validation
        if (!agent.name) errors.push('Agent name is required');
        if (!agent.role) errors.push('Agent role is required');
        if (!agent.goal) errors.push('Agent goal is required');
        if (!agent.llmConfig) errors.push('LLM configuration is required');

        // Validate LLM configuration
        if (agent.llmConfig) {
            const llmManager = this.getDomainManager<LLMManager>('LLMManager');
            try {
                await llmManager.validateConfig(agent.llmConfig);
            } catch (error) {
                errors.push(`Invalid LLM configuration: ${error instanceof Error ? error.message : String(error)}`);
            }
        }

        // Validate tools if present
        if (agent.tools?.length) {
            const toolManager = this.getDomainManager<ToolManager>('ToolManager');
            for (const tool of agent.tools) {
                try {
                    await toolManager.validateToolConfig(tool);
                } catch (error) {
                    errors.push(`Invalid tool configuration for ${tool.name}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Initialize agent with required resources
     */
    protected async initializeAgent(agent: AgentType): Promise<void> {
        try {
            // Create LLM instance
            if (!agent.llmInstance) {
                const llmManager = this.getDomainManager<LLMManager>('LLMManager');
                agent.llmInstance = await llmManager.createInstance(agent.llmConfig);
            }

            // Initialize tools
            const toolManager = this.getDomainManager<ToolManager>('ToolManager');
            const tools = await toolManager.initializeTools(agent);
            agent.tools = tools;

            // Set initial status
            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.INITIAL,
                entity: 'agent',
                entityId: agent.id,
                metadata: {
                    agentName: agent.name,
                    timestamp: Date.now()
                }
            });

            this.logManager.info(`Agent initialized: ${agent.name}`, agent.name);

        } catch (error) {
            this.handleError(error as Error, `Failed to initialize agent: ${agent.name}`);
            throw error;
        }
    }

    /**
     * Clean up agent resources
     */
    protected async cleanupAgent(agentId: string): Promise<void> {
        const agent = this.activeAgents.get(agentId);
        if (!agent) return;

        try {
            // Cleanup LLM instance
            if (agent.llmInstance) {
                const llmManager = this.getDomainManager<LLMManager>('LLMManager');
                await llmManager.cleanup(agent.llmInstance);
            }

            // Cleanup tools
            const toolManager = this.getDomainManager<ToolManager>('ToolManager');
            await toolManager.cleanupTools(agent);

            this.activeAgents.delete(agentId);
            this.logManager.info(`Agent cleaned up: ${agent.name}`, agent.name);

        } catch (error) {
            this.handleError(error as Error, `Failed to cleanup agent: ${agent.name}`);
            throw error;
        }
    }

    /**
     * Check if agent matches selection criteria
     */
    private matchesCriteria(agent: AgentType, criteria: AgentSelectionCriteria): boolean {
        if (criteria.role && agent.role !== criteria.role) return false;

        if (criteria.tools?.length) {
            const hasAllTools = criteria.tools.every(tool =>
                agent.tools.some(agentTool => agentTool.name === tool)
            );
            if (!hasAllTools) return false;
        }

        if (criteria.preferredModels?.length) {
            if (!criteria.preferredModels.includes(agent.llmConfig.model)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Generate config hash for tracking
     */
    private generateConfigHash(config: AgentValidationSchema): string {
        return createHash('sha256')
            .update(JSON.stringify(config))
            .digest('hex');
    }

    /**
     * Prepare error log entry
     */
    private prepareErrorLog(
        agent: AgentType,
        task: TaskType,
        error: ErrorType,
        context?: Record<string, unknown>
    ): any {
        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `Agent error: ${error.message}`,
            metadata: {
                error: {
                    message: error.message,
                    name: error.name,
                    type: error.type,
                    context: error.context,
                },
                agentContext: context,
                timestamp: Date.now()
            },
            agentStatus: AGENT_STATUS_enum.THINKING_ERROR
        });

        return log;
    }
}

// Export singleton instance
export default AgentManager.getInstance();