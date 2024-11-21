/**
 * @file agenticLoopManager.ts
 * @path src/managers/domain/agent/agenticLoopManager.ts
 * @description Orchestrates the agentic loop execution using manager registry pattern
 *
 * @module @managers/domain/agent
 */

import CoreManager from '../../core/coreManager';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';

// Import types from canonical locations
import type { 
    IAgentType, 
    IReactChampionAgent
} from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IOutput, IParsedOutput } from '../../../types/llm/llmResponseTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import { IBaseError } from '../../../types/common/commonErrorTypes';
import { IAgenticLoopResult } from '../../../types/llm/llmInstanceTypes';
import { 
    IIterationManager,
    IThinkingManager,
    IToolManager 
} from '../../../types/agent/managerTypes';

/**
 * Manages agentic loop execution and orchestration
 */
export class AgenticLoopManager extends CoreManager {
    private static instance: AgenticLoopManager;

    private constructor() {
        super();
        this.registerDomainManager('AgenticLoopManager', this);
    }

    public static getInstance(): AgenticLoopManager {
        if (!AgenticLoopManager.instance) {
            AgenticLoopManager.instance = new AgenticLoopManager();
        }
        return AgenticLoopManager.instance;
    }

    /**
     * Execute agent's thought-action loop
     */
    public async executeLoop(params: {
        agent: IReactChampionAgent;
        task: ITaskType;
        feedbackMessage?: string;
    }): Promise<IAgenticLoopResult> {
        const { agent, task, feedbackMessage } = params;
        let iterations = 0;
        let lastOutput: IOutput | undefined;

        try {
            while (iterations < agent.maxIterations) {
                // Get managers through registry pattern
                const iterationManager = this.getDomainManager<IIterationManager>('IterationManager');
                const thinkingManager = this.getDomainManager<IThinkingManager>('ThinkingManager');
                const toolManager = this.getDomainManager<IToolManager>('ToolManager');

                await iterationManager.handleIterationStart({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                const thinkingResult = await thinkingManager.executeThinking({
                    agent,
                    task,
                    ExecutableAgent: agent.executableAgent,
                    feedbackMessage: iterations === 0 ? feedbackMessage : undefined
                });

                if (!thinkingResult.parsedLLMOutput) {
                    this.logManager.error('No parsed output from thinking phase', agent.name, task.id);
                    return {
                        error: 'No parsed output from thinking phase',
                        metadata: {
                            iterations,
                            maxAgentIterations: agent.maxIterations
                        }
                    };
                }

                lastOutput = {
                    llmOutput: thinkingResult.llmOutput,
                    llmUsageStats: thinkingResult.llmUsageStats,
                    ...thinkingResult.parsedLLMOutput
                };

                if (thinkingResult.parsedLLMOutput.finalAnswer) {
                    await iterationManager.handleIterationEnd({
                        agent,
                        task,
                        iterations,
                        maxAgentIterations: agent.maxIterations
                    });

                    return {
                        result: lastOutput,
                        metadata: {
                            iterations,
                            maxAgentIterations: agent.maxIterations
                        }
                    };
                }

                if (thinkingResult.parsedLLMOutput.action) {
                    const toolResult = await this.executeToolPhase({
                        agent,
                        task,
                        action: thinkingResult.parsedLLMOutput.action,
                        actionInput: thinkingResult.parsedLLMOutput.actionInput,
                        parsedOutput: thinkingResult.parsedLLMOutput
                    });

                    if (!toolResult.success) {
                        const errorMessage = toolResult.error?.message || 'Unknown tool execution error';
                        this.logManager.error(errorMessage, agent.name, task.id);
                        return {
                            error: errorMessage,
                            metadata: {
                                iterations,
                                maxAgentIterations: agent.maxIterations
                            }
                        };
                    }
                }

                await iterationManager.handleIterationEnd({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                iterations++;
            }

            return this.handleMaxIterations({ agent, task, iterations, lastOutput });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logManager.error(errorMessage, agent.name, task.id, error instanceof Error ? error : undefined);
            return {
                error: errorMessage,
                metadata: {
                    iterations,
                    maxAgentIterations: agent.maxIterations
                }
            };
        }
    }

    /**
     * Execute tool phase of the agentic loop
     */
    private async executeToolPhase(params: {
        agent: IAgentType;
        task: ITaskType;
        action: string;
        actionInput?: Record<string, unknown>;
        parsedOutput: IParsedOutput;
    }): Promise<IHandlerResult> {
        const { agent, task, action, actionInput, parsedOutput } = params;
        const tool = agent.tools.find(t => t.name === action);

        if (!tool) {
            return MetadataFactory.createErrorResult({
                name: 'ToolNotFoundError',
                message: `Tool '${action}' not found`,
                type: 'ValidationError',
                context: { 
                    toolName: action,
                    availableTools: agent.tools.map(t => t.name)
                }
            });
        }

        try {
            const toolManager = this.getDomainManager<IToolManager>('ToolManager');
            return await toolManager.executeTool({
                agent,
                task,
                tool,
                input: actionInput || {},
                parsedOutput
            });

        } catch (error) {
            return MetadataFactory.createErrorResult({
                name: 'ToolExecutionError',
                message: error instanceof Error ? error.message : String(error),
                type: 'SystemError',
                context: { 
                    toolName: action,
                    error: error instanceof Error ? error.stack : String(error)
                }
            });
        }
    }

    /**
     * Handle maximum iterations reached
     */
    private async handleMaxIterations(params: {
        agent: IAgentType;
        task: ITaskType;
        iterations: number;
        lastOutput?: IOutput;
    }): Promise<IAgenticLoopResult> {
        const { agent, task, iterations, lastOutput } = params;

        const iterationManager = this.getDomainManager<IIterationManager>('IterationManager');
        await iterationManager.handleMaxIterationsError({
            agent,
            task,
            iterations,
            maxIterations: agent.maxIterations,
            error: new Error('Maximum iterations reached')
        });

        return {
            error: `Maximum iterations (${agent.maxIterations}) reached without final answer`,
            result: lastOutput,
            metadata: {
                iterations,
                maxAgentIterations: agent.maxIterations
            }
        };
    }

    /**
     * Update agent status
     */
    private async handleStatus(
        agent: IAgentType, 
        status: keyof typeof AGENT_STATUS_enum
    ): Promise<void> {
        await this.handleStatusTransition({
            currentStatus: agent.status,
            targetStatus: status,
            entity: 'agent',
            entityId: agent.id,
            metadata: this.prepareMetadata({ timestamp: Date.now() })
        });
    }
}

export default AgenticLoopManager.getInstance();
