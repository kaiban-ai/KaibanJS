/**
 * @file iterationHandler.ts
 * @path KaibanJS/src/utils/handlers/iterationHandler.ts
 * @description Centralized iteration handling implementation
 */

// Core utilities
import { logger } from '../core/logger';
import { PrettyError } from '../core/errors';

// Services
import { LogCreator } from '../factories/logCreator';
import { DefaultFactory } from '../factories/defaultFactory';

// Types from canonical locations
import type {
    AgentType,
    TaskType,
    HandlerResult,
    IterationHandlerParams,
    ParsedOutput
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface IterationResult {
    shouldContinue: boolean;
    feedbackMessage?: string;
    error?: Error;
}

// ─── Iteration Handler Implementation ───────────────────────────────────────────

export class IterationHandler {
    constructor(
        private readonly logCreator = LogCreator,
        private readonly defaultFactory = DefaultFactory
    ) {}

    // ─── Iteration Start/End Management ──────────────────────────────────────────

    public async handleIterationStart(params: IterationHandlerParams): Promise<HandlerResult> {
        const { agent, task, iterations, maxAgentIterations } = params;

        try {
            const log = this.logCreator.createAgentLog({
                agent,
                task,
                description: `📍 Starting iteration ${iterations + 1}/${maxAgentIterations}`,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: this.defaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: AGENT_STATUS_enum.ITERATION_START,
                logType: 'AgentStatusUpdate'
            });

            this.updateAgentState(agent, log);
            logger.info(`📍 Starting iteration ${iterations + 1}/${maxAgentIterations}`);

            return {
                success: true,
                data: log
            };

        } catch (error) {
            logger.error('Error starting iteration:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    public async handleIterationEnd(params: IterationHandlerParams): Promise<HandlerResult> {
        const { agent, task, iterations, maxAgentIterations } = params;

        try {
            const log = this.logCreator.createAgentLog({
                agent,
                task,
                description: `✓ Completed iteration ${iterations + 1}/${maxAgentIterations}`,
                metadata: {
                    iterations,
                    maxAgentIterations,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: this.defaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: AGENT_STATUS_enum.ITERATION_END,
                logType: 'AgentStatusUpdate'
            });

            this.updateAgentState(agent, log);
            logger.info(`✓ Completed iteration ${iterations + 1}/${maxAgentIterations}`);

            return {
                success: true,
                data: log
            };

        } catch (error) {
            logger.error('Error ending iteration:', error);
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    // ─── Iteration Control ─────────────────────────────────────────────────────

    public async checkIterationControl(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
        parsedOutput: ParsedOutput | null;
    }): Promise<IterationResult> {
        const { agent, task, iterations, maxIterations, parsedOutput } = params;

        try {
            // Check for final answer
            if (parsedOutput?.finalAnswer) {
                await this.handleIterationEnd({ agent, task, iterations, maxAgentIterations: maxIterations });
                return { shouldContinue: false };
            }

            // Check max iterations
            if (iterations >= maxIterations) {
                const error = new PrettyError({
                    message: `Maximum iterations [${maxIterations}] reached without final answer`,
                    context: { taskId: task.id, iterations, maxIterations }
                });

                await this.handleMaxIterationsError({ agent, task, iterations, maxIterations, error });
                return { shouldContinue: false, error };
            }

            // Force final answer if approaching max iterations
            if (iterations === maxIterations - 2) {
                return {
                    shouldContinue: true,
                    feedbackMessage: agent.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({
                        agent,
                        task,
                        iterations,
                        maxAgentIterations: maxIterations
                    })
                };
            }

            return { shouldContinue: true };

        } catch (error) {
            logger.error('Error checking iteration control:', error);
            throw error;
        }
    }

    // ─── Error Handling ─────────────────────────────────────────────────────────

    private async handleMaxIterationsError(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
        error: Error;
    }): Promise<void> {
        const { agent, task, iterations, maxIterations, error } = params;

        try {
            const log = this.logCreator.createAgentLog({
                agent,
                task,
                description: `⚠️ Maximum iterations exceeded: ${maxIterations}`,
                metadata: {
                    error,
                    iterations,
                    maxIterations,
                    timestamp: Date.now(),
                    output: {
                        llmUsageStats: this.defaultFactory.createLLMUsageStats()
                    }
                },
                agentStatus: AGENT_STATUS_enum.MAX_ITERATIONS_ERROR,
                logType: 'AgentStatusUpdate'
            });

            this.updateAgentState(agent, log);
            logger.warn(`⚠️ Maximum iterations [${maxIterations}] reached for task ${task.id}`);

        } catch (error) {
            logger.error('Error handling max iterations error:', error);
            throw error;
        }
    }

    // ─── State Management ──────────────────────────────────────────────────────

    private updateAgentState(agent: AgentType, log: Log): void {
        if (agent.store) {
            agent.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        }
    }
}

// Export singleton instance
export const iterationHandler = new IterationHandler();
export default iterationHandler;