/**
 * @file agentManager.ts
 * @path src/utils/managers/domain/agent/agentManager.ts
 * @description Core agent management implementation leveraging manager registry
 */

import { BaseAgentManager } from './baseAgentManager';
import { createHash } from 'crypto';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';

// Import types from canonical locations
import type { 
    IAgentType,
    IBaseAgent,
    IAgentValidationSchema,
    IAgentValidationResult,
    IAgentSelectionCriteria,
    IAgentMetadata,
    IAgentCapabilities,
    IAgentMetrics
} from '../../../types/agent';

import type { 
    ITaskType,
    ITaskFeedback
} from '../../../types/task';

import type {
    IOutput,
    ILLMUsageStats
} from '../../../types/llm';

import { 
    AGENT_STATUS_enum
} from '../../../types/common/commonEnums';

import type {
    IHandlerResult,
    IAgentCreationResult,
    IAgentExecutionResult
} from '../../../types/common/commonHandlerTypes';

import type { IErrorType } from '../../../types/common/commonErrorTypes';
import type { IAgentStoreMethods } from '../../../types/agent/agentStoreTypes';
import { isActiveConfig } from '../../../types/llm/llmCommonTypes';
import type { IValidationSchema } from '../../../types/common/commonValidationTypes';
import type { 
    IAgentCreationMetadata,
    IAgentExecutionMetadata,
    IBaseHandlerMetadata
} from '../../../types/common/commonMetadataTypes';

// Domain manager interfaces
interface IAgenticLoopManager {
    executeLoop(params: {
        agent: IAgentType;
        task: ITaskType;
        context: IExecutionContext;
    }): Promise<ILoopResult>;
}

interface IMessageManager {
    clear(): Promise<void>;
}

interface ILLMManager {
    validateConfig(config: any): Promise<void>;
    createInstance(config: any): Promise<any>;
    cleanup(instance: any): Promise<void>;
}

interface IToolManager {
    validateToolConfig(tool: any): Promise<void>;
    initializeTools(agent: IAgentType): Promise<any[]>;
    cleanupTools(agent: IAgentType): Promise<void>;
}

// Execution types
interface IExecutionContext {
    task: ITaskType;
    agent: IAgentType;
    iterations: number;
    maxAgentIterations: number;
    startTime: number;
}

interface ILoopResult {
    success: boolean;
    result?: IOutput;
    error?: IErrorType;
    metadata: {
        iterations: number;
        [key: string]: any;
    };
}

/**
 * Core agent management implementation
 */
export class AgentManager extends BaseAgentManager {
    private static instance: AgentManager | null = null;

    private constructor() {
        super();
        this.registerDomainManager('AgentManager', this);
    }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    // ─── Protected Domain Manager Access ─────────────────────────────────────

    protected getAgenticLoopManager(): IAgenticLoopManager {
        return this.getDomainManager<IAgenticLoopManager>('AgenticLoopManager');
    }

    protected getMessageManager(): IMessageManager {
        return this.getDomainManager<IMessageManager>('MessageManager');
    }

    protected getLLMManager(): ILLMManager {
        return this.getDomainManager<ILLMManager>('LLMManager');
    }

    protected getToolManager(): IToolManager {
        return this.getDomainManager<IToolManager>('ToolManager');
    }

    // ─── Abstract Method Implementations ─────────────────────────────────────

    protected override async validateAgent(agent: IAgentType): Promise<IAgentValidationResult> {
        const errors: string[] = [];

        try {
            if (!agent.name) errors.push('Agent name is required');
            if (!agent.role) errors.push('Agent role is required');
            if (!agent.goal) errors.push('Agent goal is required');
            if (!agent.llmConfig) errors.push('LLM configuration is required');

            if (agent.llmConfig) {
                const llmManager = this.getLLMManager();
                try {
                    await llmManager.validateConfig(agent.llmConfig);
                } catch (error) {
                    errors.push(`Invalid LLM configuration: ${error instanceof Error ? error.message : String(error)}`);
                }
            }

            if (agent.tools?.length) {
                const toolManager = this.getToolManager();
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

        } catch (error) {
            this.handleError(error as Error, 'Agent validation failed');
            return {
                isValid: false,
                errors: [...errors, 'Validation process failed']
            };
        }
    }

    protected override async initializeAgent(agent: IAgentType): Promise<void> {
        if (!agent.llmInstance) {
            const llmManager = this.getLLMManager();
            agent.llmInstance = await llmManager.createInstance(agent.llmConfig);
        }

        const toolManager = this.getToolManager();
        const tools = await toolManager.initializeTools(agent);
        agent.tools = tools;

        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.INITIAL,
            entity: 'agent',
            entityId: agent.id,
            metadata: this.prepareMetadata({
                agentName: agent.name
            })
        });

        this.log(`Agent initialized: ${agent.name}`, agent.name);
    }

    protected override async cleanupAgent(agentId: string): Promise<void> {
        const agent = this.activeAgents.get(agentId);
        if (!agent) return;

        if (agent.llmInstance) {
            const llmManager = this.getLLMManager();
            await llmManager.cleanup(agent.llmInstance);
        }

        const toolManager = this.getToolManager();
        await toolManager.cleanupTools(agent);

        this.activeAgents.delete(agentId);
        this.log(`Agent cleaned up: ${agent.name}`, agent.name);
    }

    // ─── Public API Methods ──────────────────────────────────────────────────

    public async createAgent(config: IAgentValidationSchema): Promise<IAgentCreationResult> {
        const validation = await this.validateAgent(config as unknown as IAgentType);
        if (!validation.isValid) {
            throw new Error(validation.errors.join(', '));
        }

        const agentId = createHash('sha256').update(JSON.stringify(config)).digest('hex');
        const agent: IAgentType = {
            id: agentId,
            name: config.name,
            role: config.role,
            goal: config.goal,
            background: config.background || '',
            version: '1.0.0',
            capabilities: config.capabilities || {
                canThink: true,
                canUseTools: true,
                canLearn: true,
                supportedToolTypes: [],
                supportedTools: []
            },
            validationSchema: {} as IValidationSchema,
            tools: [],
            maxIterations: config.maxIterations || 10,
            store: {} as IAgentStoreMethods,
            status: AGENT_STATUS_enum.INITIAL,
            env: config.env || null,
            llmInstance: null,
            llmConfig: config.llmConfig,
            llmSystemMessage: null,
            forceFinalAnswer: false,
            promptTemplates: {} as any,
            messageHistory: {} as any,
            metadata: {
                id: agentId,
                name: config.name,
                capabilities: config.capabilities?.supportedTools || [],
                skills: [],
                created: new Date(),
                description: config.background || '',
                tags: []
            },
            executionState: {
                status: AGENT_STATUS_enum.INITIAL,
                thinking: false,
                busy: false,
                errorCount: 0,
                retryCount: 0,
                maxRetries: 3,
                assignedTasks: [],
                completedTasks: [],
                failedTasks: [],
                iterations: 0,
                maxIterations: config.maxIterations || 10,
                performance: {
                    completedTaskCount: 0,
                    failedTaskCount: 0,
                    averageTaskDuration: 0,
                    successRate: 0,
                    averageIterationsPerTask: 0
                },
                resourceUsage: {},
                llmMetrics: {
                    totalTokensUsed: 0,
                    promptTokens: 0,
                    completionTokens: 0,
                    totalCost: 0,
                    averageResponseTime: 0
                }
            },
            initialize(store: IAgentStoreMethods, env: Record<string, unknown>): void {
                this.store = store;
                this.env = env;
            },
            setStore(store: IAgentStoreMethods): void {
                this.store = store;
            },
            setStatus(status: keyof typeof AGENT_STATUS_enum): void {
                this.status = status;
            },
            setEnv(env: Record<string, unknown>): void {
                this.env = env;
            },
            async workOnTask(): Promise<any> {
                throw new Error('Not implemented');
            },
            async workOnFeedback(task: ITaskType, feedbackList: ITaskFeedback[], context: string): Promise<void> {
                this.status = AGENT_STATUS_enum.THINKING;
                // Process feedback logic would go here
                this.status = AGENT_STATUS_enum.IDLE;
            },
            normalizeLlmConfig(llmConfig: any): any {
                return llmConfig;
            },
            createLLMInstance(): void {
                throw new Error('Not implemented');
            }
        };

        await this.registerAgent(agent);
        this.log(`Agent created successfully: ${agent.name}`, agent.name);

        const metadata: IAgentCreationMetadata = {
            timestamp: Date.now(),
            component: 'AgentManager',
            operation: 'createAgent',
            performance: {
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0,
                memoryUsage: process.memoryUsage().heapUsed
            },
            createdAt: Date.now(),
            configHash: this.generateConfigHash(config),
            version: agent.version,
            validation
        };

        return {
            success: true,
            data: {
                success: true,
                agent,
                validation
            },
            metadata
        };
    }

    public async executeOperation(params: {
        agent: IAgentType;
        task: ITaskType;
        store: IAgentStoreMethods;
        context?: Record<string, unknown>;
    }): Promise<IAgentExecutionResult> {
        const { agent, task, context } = params;
        const executionContext: IExecutionContext = {
            task,
            agent,
            iterations: 0,
            maxAgentIterations: agent.maxIterations || 10,
            startTime: Date.now()
        };

        const [agenticLoopManager, messageManager] = [
            this.getAgenticLoopManager(),
            this.getMessageManager()
        ];

        await messageManager.clear();

        this.log(`Starting agent operation: ${agent.name}`, agent.name, task.id);

        const result = await agenticLoopManager.executeLoop({
            agent,
            task,
            context: executionContext
        });

        if (result.error) {
            this.log(`Agent operation failed: ${result.error.message}`, agent.name, task.id, 'error');
            throw new Error(result.error.message);
        }

        this.log(`Agent operation completed successfully: ${agent.name}`, agent.name, task.id);

        const metadata: IAgentExecutionMetadata = {
            timestamp: Date.now(),
            component: 'AgentManager',
            operation: 'executeOperation',
            performance: {
                startTime: executionContext.startTime,
                endTime: Date.now(),
                duration: Date.now() - executionContext.startTime,
                memoryUsage: process.memoryUsage().heapUsed
            },
            iterations: result.metadata.iterations,
            executionTime: Date.now() - executionContext.startTime,
            llmUsageStats: {
                inputTokens: result.result?.llmUsageStats?.inputTokens || 0,
                outputTokens: result.result?.llmUsageStats?.outputTokens || 0,
                callsCount: result.result?.llmUsageStats?.callsCount || 0,
                callsErrorCount: result.result?.llmUsageStats?.callsErrorCount || 0,
                parsingErrors: result.result?.llmUsageStats?.parsingErrors || 0,
                totalLatency: result.result?.llmUsageStats?.totalLatency || 0,
                averageLatency: result.result?.llmUsageStats?.averageLatency || 0,
                lastUsed: result.result?.llmUsageStats?.lastUsed || Date.now(),
                memoryUtilization: {
                    peakMemoryUsage: result.result?.llmUsageStats?.memoryUtilization?.peakMemoryUsage || 0,
                    averageMemoryUsage: result.result?.llmUsageStats?.memoryUtilization?.averageMemoryUsage || 0,
                    cleanupEvents: result.result?.llmUsageStats?.memoryUtilization?.cleanupEvents || 0
                },
                costBreakdown: {
                    input: result.result?.llmUsageStats?.costBreakdown?.input || 0,
                    output: result.result?.llmUsageStats?.costBreakdown?.output || 0,
                    total: result.result?.llmUsageStats?.costBreakdown?.total || 0,
                    currency: result.result?.llmUsageStats?.costBreakdown?.currency || 'USD'
                }
            }
        };

        return {
            success: true,
            data: {
                success: true,
                result: result.result
            },
            metadata
        };
    }

    public async processFeedback(params: {
        agent: IAgentType;
        task: ITaskType;
        feedback: string;
        context?: string;
    }): Promise<IHandlerResult<void>> {
        const { agent, task, feedback, context } = params;

        this.log(`Processing feedback for agent: ${agent.name}`, agent.name, task.id);

        const feedbackEntry: ITaskFeedback = {
            id: Date.now().toString(),
            content: feedback,
            timestamp: new Date(),
            userId: 'system',
            status: 'PENDING'
        };

        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.THINKING,
            entity: 'agent',
            entityId: agent.id,
            metadata: this.prepareMetadata({ feedbackId: feedbackEntry.id })
        });

        await agent.workOnFeedback(task, [feedbackEntry], context || '');

        this.log(`Feedback processed successfully: ${agent.name}`, agent.name, task.id);

        const metadata: IBaseHandlerMetadata = {
            timestamp: Date.now(),
            component: 'AgentManager',
            operation: 'processFeedback',
            performance: {
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0,
                memoryUsage: process.memoryUsage().heapUsed
            }
        };

        return MetadataFactory.createSuccessResult(undefined);
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private matchesCriteria(agent: IAgentType, criteria: IAgentSelectionCriteria): boolean {
        if (criteria.role && agent.role !== criteria.role) return false;

        if (criteria.tools?.length) {
            const hasAllTools = criteria.tools.every(toolName =>
                agent.tools?.some(agentTool => agentTool.name === toolName)
            );
            if (!hasAllTools) return false;
        }

        if (criteria.preferredModels?.length) {
            if (isActiveConfig(agent.llmConfig)) {
                if (!criteria.preferredModels.includes(agent.llmConfig.model)) {
                    return false;
                }
            } else {
                return false;
            }
        }

        return true;
    }

    private generateConfigHash(config: IAgentValidationSchema): string {
        return createHash('sha256')
            .update(JSON.stringify(config))
            .digest('hex');
    }
}

// Export singleton instance
export default AgentManager.getInstance();
