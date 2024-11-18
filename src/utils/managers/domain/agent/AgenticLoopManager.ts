/**
 * @file agenticLoopManager.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\managers\domain\agent\agenticLoopManager.ts
 * @description Orchestrates the agentic loop execution using other managers
 *
 * @module @managers/domain/agent
 */
import CoreManager from '../../core/coreManager';
import type {
    AgentType,
    TaskType,
    Output,
    ParsedOutput
} from '@/utils/types';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import type { IReactChampionAgent } from 'KaibanJS/src/utils/types/agent/base';
import type { AgenticLoopResult } from '@/utils/types/llm';

export class AgenticLoopManager extends CoreManager {
    private static instance: AgenticLoopManager;

    private constructor() {
        super();
    }

    public static getInstance(): AgenticLoopManager {
        if (!AgenticLoopManager.instance) {
            AgenticLoopManager.instance = new AgenticLoopManager();
        }
        return AgenticLoopManager.instance;
    }

    public async executeLoop(params: {
        agent: IReactChampionAgent;
        task: TaskType;
        feedbackMessage?: string;
    }): Promise<AgenticLoopResult> {
        const { agent, task, feedbackMessage } = params;
        let iterations = 0;
        let lastOutput: Output | undefined;

        try {
            while (iterations < agent.maxIterations) {
                await this.getDomainManager('IterationManager').handleIterationStart({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                const thinkingResult = await this.getDomainManager('ThinkingManager').executeThinking({
                    agent,
                    task,
                    ExecutableAgent: agent.executableAgent,
                    feedbackMessage: iterations === 0 ? feedbackMessage : undefined
                });

                if (!thinkingResult.parsedLLMOutput) {
                    this.handleError(new Error('No parsed output'), 'Iteration Thinking Error');
                    return {
                        error: 'No parsed output',
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
                    await this.getDomainManager('IterationManager').handleIterationEnd({
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
                        this.handleError(toolResult.error!, 'Tool Execution Error');
                        return {
                            error: toolResult.error?.message,
                            metadata: {
                                iterations,
                                maxAgentIterations: agent.maxIterations
                            }
                        };
                    }
                }

                await this.getDomainManager('IterationManager').handleIterationEnd({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                iterations++;
            }

            return this.handleMaxIterations({ agent, task, iterations, lastOutput });

        } catch (error) {
            this.handleError(error as Error, 'Agentic Loop Execution Error');
            return {
                error: (error as Error).message,
                metadata: {
                    iterations,
                    maxAgentIterations: agent.maxIterations
                }
            };
        }
    }

    private async executeToolPhase(params: {
        agent: AgentType;
        task: TaskType;
        action: string;
        actionInput?: Record<string, unknown>;
        parsedOutput: ParsedOutput;
    }): Promise<{ success: boolean; error?: Error }> {
        const { agent, task, action, actionInput, parsedOutput } = params;

        const tool = agent.tools.find(t => t.name === action);
        if (!tool) {
            return {
                success: false,
                error: new Error(`Tool '${action}' not found`)
            };
        }

        try {
            const result = await this.getDomainManager('ToolManager').executeTool({
                agent,
                task,
                tool,
                input: actionInput || {},
                parsedOutput
            });

            return {
                success: result.success,
                error: result.error
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error
            };
        }
    }

    protected handleError(error: Error, context: string): void { // Changed to protected
        console.error(`[AgenticLoopManager Error]: ${context} - ${error.message}`, {
            context,
            stack: error.stack
        });
    }

    private async handleMaxIterations(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        lastOutput?: Output;
    }): Promise<AgenticLoopResult> {
        const { agent, task, iterations, lastOutput } = params;

        await this.getDomainManager('IterationManager').handleMaxIterationsError({
            agent,
            task,
            iterations,
            maxIterations: agent.maxIterations,
            error: new Error(`Maximum iterations reached`)
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

    private async handleStatus(agent: AgentType, status: keyof typeof AGENT_STATUS_enum): Promise<void> {
        await this.getDomainManager('StatusManager').transition({
            currentStatus: agent.status,
            targetStatus: status,
            entity: 'agent',
            entityId: agent.id,
            metadata: {
                timestamp: Date.now()
            }
        });
    }
}

export default AgenticLoopManager.getInstance();
