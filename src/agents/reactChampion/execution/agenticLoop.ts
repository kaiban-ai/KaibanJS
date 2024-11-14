/**
 * @file agenticLoop.ts
 * @path KaibanJS/src/agents/reactChampion/execution/agenticLoop.ts
 * @description Agentic loop execution using manager-based architecture
 */

// Core managers
import { logger } from '@/utils/core/logger';
import { ThinkingManager } from '@/utils/managers/domain/agent/ThinkingManager';
import { StatusManager } from '@/utils/managers/core/StatusManager';
import { IterationManager } from '@/utils/managers/domain/task/IterationManager';

// Tools
import { toolExecution } from './toolExecution';
import { thinkingProcess } from './thinkingProcess';

// Handlers
import { errorHandler } from '@/utils/handlers/errorHandler';

// Types from canonical locations
import type { 
    AgentType,
    TaskType,
    ThinkingResult,
    ParsedOutput,
    Output,
    AgenticLoopResult,
    ExecutionContext,
    ThinkingExecutionParams,
    ToolExecutionParams,
    Tool
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Agentic loop execution orchestrator
 */
export class AgenticLoopExecutor {
    private readonly thinkingManager: ThinkingManager;
    private readonly statusManager: StatusManager;
    private readonly iterationManager: IterationManager;

    constructor() {
        this.thinkingManager = ThinkingManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.iterationManager = new IterationManager();
    }

    // ─── Main Loop Execution ─────────────────────────────────────────────────────

    public async executeLoop(params: {
        agent: AgentType;
        task: TaskType;
        feedbackMessage?: string;
    }): Promise<AgenticLoopResult> {
        const { agent, task, feedbackMessage } = params;
        let iterations = 0;
        let lastOutput: Output | undefined;

        try {
            while (iterations < agent.maxIterations) {
                // Start iteration
                await this.iterationManager.handleIterationStart({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                // Execute thinking process
                const thinkingResult = await thinkingProcess.executeThinking({
                    agent,
                    task,
                    ExecutableAgent: agent.executableAgent,
                    feedbackMessage: iterations === 0 ? feedbackMessage : undefined
                });

                if (!thinkingResult.parsedLLMOutput) {
                    const error = new Error('No parsed output from thinking process');
                    return this.handleLoopError({ agent, task, error, iterations });
                }

                lastOutput = {
                    llmOutput: thinkingResult.llmOutput,
                    llmUsageStats: thinkingResult.llmUsageStats,
                    ...thinkingResult.parsedLLMOutput
                };

                // If we have a final answer, complete the loop
                if (thinkingResult.parsedLLMOutput.finalAnswer) {
                    await this.iterationManager.handleIterationEnd({
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

                // If we have an action, execute the tool
                if (thinkingResult.parsedLLMOutput.action) {
                    const toolResult = await this.executeToolPhase({
                        agent,
                        task,
                        action: thinkingResult.parsedLLMOutput.action,
                        actionInput: thinkingResult.parsedLLMOutput.actionInput,
                        parsedOutput: thinkingResult.parsedLLMOutput
                    });

                    if (!toolResult.success) {
                        return this.handleLoopError({
                            agent,
                            task,
                            error: toolResult.error!,
                            iterations
                        });
                    }
                }

                // Complete iteration
                await this.iterationManager.handleIterationEnd({
                    agent,
                    task,
                    iterations,
                    maxAgentIterations: agent.maxIterations
                });

                iterations++;
            }

            // Handle max iterations reached
            return this.handleMaxIterations({
                agent,
                task,
                iterations,
                lastOutput
            });

        } catch (error) {
            return this.handleLoopError({
                agent,
                task,
                error: error as Error,
                iterations
            });
        }
    }

    // ─── Tool Execution Phase ────────────────────────────────────────────────────

    private async executeToolPhase(params: {
        agent: AgentType;
        task: TaskType;
        action: string;
        actionInput?: Record<string, unknown>;
        parsedOutput: ParsedOutput;
    }): Promise<{ success: boolean; error?: Error }> {
        const { agent, task, action, actionInput, parsedOutput } = params;

        // Find the requested tool
        const tool = agent.tools.find(t => t.name === action);
        if (!tool) {
            return {
                success: false,
                error: new Error(`Tool '${action}' not found`)
            };
        }

        try {
            // Execute the tool
            const toolResult = await toolExecution.executeTool({
                task,
                tool,
                input: actionInput || {},
                context: {
                    task,
                    agent,
                    iterations: 0,
                    maxAgentIterations: agent.maxIterations,
                    startTime: Date.now()
                },
                parsedOutput
            });

            return {
                success: toolResult.success,
                error: toolResult.error
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    // ─── Error Handling ─────────────────────────────────────────────────────────

    private async handleLoopError(params: {
        agent: AgentType;
        task: TaskType;
        error: Error;
        iterations: number;
    }): Promise<AgenticLoopResult> {
        const { agent, task, error, iterations } = params;

        try {
            await errorHandler.handleError({
                error,
                context: {
                    phase: 'agentic_loop',
                    iterations
                },
                task,
                agent,
                store: task.store
            });

            return {
                error: error.message,
                metadata: {
                    iterations,
                    maxAgentIterations: agent.maxIterations
                }
            };

        } catch (handlingError) {
            logger.error('Error handling loop error:', handlingError);
            return {
                error: error.message,
                metadata: {
                    iterations,
                    maxAgentIterations: agent.maxIterations
                }
            };
        }
    }

    private async handleMaxIterations(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        lastOutput?: Output;
    }): Promise<AgenticLoopResult> {
        const { agent, task, iterations, lastOutput } = params;

        await this.iterationManager.handleMaxIterationsError({
            agent,
            task,
            iterations,
            maxAgentIterations: agent.maxIterations,
            error: new Error(`Maximum iterations (${agent.maxIterations}) reached without final answer`)
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
}

// Export singleton instance
export const agenticLoop = new AgenticLoopExecutor();
export default agenticLoop;