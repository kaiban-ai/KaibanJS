/**
 * @file AgentManager.ts
 * @path KaibanJS/src/managers/domain/agent/AgentManager.ts
 * @description Domain-level agent management and orchestration
 */

import CoreManager from '../../core/CoreManager';
import { StatusManager } from '../../core/StatusManager';
import { ThinkingManager } from './ThinkingManager';
import { ToolManager } from './ToolManager';
import { LogManager } from '../../core/LogManager';
import { ErrorManager } from '../../core/ErrorManager';

// Import types from canonical locations
import type { 
    AgentType,
    BaseAgentConfig,
    AgentCreationResult,
    AgentValidationResult,
    AgentExecutionResult,
    AgentSelectionCriteria
} from '@/utils/types/agent';

import type { 
    TaskType, 
    ExecutionContext 
} from '@/utils/types/task';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import { ErrorType } from '@/utils/types/common/errors';

// ─── Agent Manager Implementation ─────────────────────────────────────────────

export class AgentManager extends CoreManager {
    private static instance: AgentManager;
    private readonly statusManager: StatusManager;
    private readonly thinkingManager: ThinkingManager;
    private readonly toolManager: ToolManager;
    private readonly activeAgents: Map<string, AgentType>;
    private readonly logManager = LogManager.getInstance();
    private readonly errorManager = ErrorManager.getInstance();

    private constructor() {
        super();
        this.statusManager = StatusManager.getInstance();
        this.thinkingManager = new ThinkingManager();
        this.toolManager = new ToolManager();
        this.activeAgents = new Map();
    }

    // ─── Singleton Access ───────────────────────────────────────────────────

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    // ─── Agent Lifecycle Management ──────────────────────────────────────────

    public async createAgent(config: BaseAgentConfig): Promise<AgentCreationResult> {
        try {
            // Validate configuration
            const validationResult = await this.validateAgent(config);
            if (!validationResult.isValid) {
                throw new Error('Invalid agent configuration');
            }

            // Create agent instance
            const agent: AgentType = await this.initializeAgent(config);
            this.activeAgents.set(agent.id, agent);

            this.logManager.info(`Agent created: ${agent.id}`);

            return {
                success: true,
                agent,
                validation: validationResult,
                metadata: {
                    createdAt: Date.now(),
                    configHash: this.generateConfigHash(config),
                    version: '1.0.0'
                }
            };

        } catch (error) {
            return this.handleAgentCreationError(error, config);
        }
    }

    public async getAgent(agentId: string): Promise<AgentType | null> {
        return this.activeAgents.get(agentId) || null;
    }

    public async selectAgent(criteria: AgentSelectionCriteria): Promise<AgentType | null> {
        const availableAgents = Array.from(this.activeAgents.values());
        return this.findBestMatchingAgent(availableAgents, criteria);
    }

    // ─── Agent Task Execution ────────────────────────────────────────────────

    public async executeTask(
        agentId: string,
        task: TaskType,
        context?: ExecutionContext
    ): Promise<AgentExecutionResult> {
        const agent = await this.getAgent(agentId);
        if (!agent) {
            return this.errorManager.handleAgentError({
                error: new Error(`Agent not found: ${agentId}`),
                context: { taskId: task.id }
            });
        }

        try {
            // Initialize execution context
            const executionContext: ExecutionContext = {
                startTime: Date.now(),
                task,
                agent,
                iterations: 0,
                maxAgentIterations: agent.maxIterations
            };

            // Execute thinking process
            const thinkingResult = await this.thinkingManager.executeThinking({
                agent,
                task,
                context: context || executionContext
            });

            // Process result
            if (thinkingResult.parsedLLMOutput?.finalAnswer) {
                return {
                    success: true,
                    result: thinkingResult.parsedLLMOutput,
                    context: executionContext,
                    stats: {
                        duration: Date.now() - executionContext.startTime,
                        iterationCount: executionContext.iterations,
                        llmUsageStats: thinkingResult.llmUsageStats
                    }
                };
            }

            // Continue execution with tool if required
            if (thinkingResult.parsedLLMOutput?.action) {
                const toolResult = await this.toolManager.executeTool({
                    agent,
                    task,
                    tool: agent.tools.find(t => t.name === thinkingResult.parsedLLMOutput?.action),
                    input: thinkingResult.parsedLLMOutput.actionInput,
                    context: executionContext
                });

                return {
                    success: toolResult.success,
                    result: toolResult.result,
                    error: toolResult.error,
                    context: executionContext,
                    stats: {
                        duration: Date.now() - executionContext.startTime,
                        iterationCount: executionContext.iterations,
                        llmUsageStats: thinkingResult.llmUsageStats
                    }
                };
            }

            return {
                success: false,
                error: new Error('No final answer or valid action provided'),
                context: executionContext
            };

        } catch (error) {
            return this.handleExecutionError(error, agent, task);
        }
    }

    // ─── Agent Status Management ──────────────────────────────────────────────

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
            
            this.logManager.info(`Agent status updated: ${agentId} -> ${status}`);

            return true;
        } catch (error) {
            this.logManager.error(`Failed to update agent status: ${error}`);
            return false;
        }
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private async validateAgent(config: BaseAgentConfig): Promise<AgentValidationResult> {
        const errors: string[] = [];

        if (!config.name) errors.push('Agent name is required');
        if (!config.role) errors.push('Agent role is required');
        if (!config.goal) errors.push('Agent goal is required');
        if (!config.background) errors.push('Agent background is required');

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private async initializeAgent(config: BaseAgentConfig): Promise<AgentType> {
        // Initialize agent based on config
        throw new Error('initializeAgent must be implemented');
    }

    private generateConfigHash(config: BaseAgentConfig): string {
        return Buffer.from(JSON.stringify(config)).toString('base64');
    }

    private async handleAgentCreationError(
        error: unknown,
        config: BaseAgentConfig
    ): Promise<AgentCreationResult> {
        const prettyError = this.errorManager.handleAgentError({
            error,
            context: { config }
        });

        this.logManager.error(`Failed to create agent:`, prettyError);

        return {
            success: false,
            error: prettyError,
            validation: {
                isValid: false,
                errors: [prettyError.message]
            }
        };
    }

    private handleExecutionError(
        error: unknown,
        agent: AgentType,
        task: TaskType
    ): AgentExecutionResult {
        const execError = this.errorManager.handleAgentError({
            error,
            context: { agentId: agent.id, taskId: task.id }
        });

        this.logManager.error(`Task execution error:`, execError);

        return {
            success: false,
            error: execError,
            context: {
                startTime: Date.now(),
                task,
                agent,
                iterations: 0,
                maxAgentIterations: agent.maxIterations
            }
        };
    }
}

export default AgentManager;
