/**
 * @file IterationManager.ts
 * @path KaibanJS/src/utils/managers/agent/IterationManager.ts
 * @description Management of agent iterations, state transitions, and stats tracking.
 */

import CoreManager from '../../core/CoreManager';
import type { AgentType, TaskType, ParsedOutput, Output } from '@/utils/types';
import type { IterationContext, IterationControl } from '@/utils/types/task/base';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';
import type { Log } from '@/utils/types/team/logs';

export class IterationManager extends CoreManager {
    // Checks control conditions to decide if an iteration should continue
    public async checkIterationControl(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
        parsedOutput: ParsedOutput | null;
    }): Promise<IterationControl> {
        const { agent, task, iterations, maxIterations, parsedOutput } = params;

        try {
            if (parsedOutput?.finalAnswer) {
                await this.handleIterationEnd({ agent, task, iterations, maxIterations });
                return { shouldContinue: false };
            }

            if (iterations >= maxIterations) {
                const error = new Error(`Maximum iterations [${maxIterations}] reached without final answer`);
                await this.handleMaxIterationsError({ agent, task, iterations, maxIterations, error });
                return { shouldContinue: false, error };
            }

            if (iterations === maxIterations - 2) {
                return {
                    shouldContinue: true,
                    feedbackMessage: agent.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({ agent, task, iterations, maxIterations })
                };
            }

            return { shouldContinue: true };
        } catch (error) {
            this.handleError(error as Error, 'Error in checkIterationControl');
            throw error;
        }
    }

    // Initiates a new iteration and logs the start
    public async handleIterationStart(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
    }): Promise<void> {
        const { agent, task, iterations, maxIterations } = params;

        try {
            const log = this.createAgentLog(agent, task, `📍 Starting iteration ${iterations + 1}/${maxIterations}`, iterations, maxIterations, AGENT_STATUS_enum.ITERATION_START);
            this.updateAgentState(agent, log);
            this.log(`📍 Starting iteration ${iterations + 1}/${maxIterations}`, 'info');
        } catch (error) {
            this.handleError(error as Error, 'Error in handleIterationStart');
            throw error;
        }
    }

    // Finalizes an iteration and logs the end
    public async handleIterationEnd(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
    }): Promise<void> {
        const { agent, task, iterations, maxIterations } = params;

        try {
            const log = this.createAgentLog(agent, task, `✓ Completed iteration ${iterations + 1}/${maxIterations}`, iterations, maxIterations, AGENT_STATUS_enum.ITERATION_END);
            this.updateAgentState(agent, log);
            this.log(`✓ Completed iteration ${iterations + 1}/${maxIterations}`, 'info');
        } catch (error) {
            this.handleError(error as Error, 'Error in handleIterationEnd');
            throw error;
        }
    }

    // Handles an error when maximum iterations are exceeded
    private async handleMaxIterationsError(params: {
        agent: AgentType;
        task: TaskType;
        iterations: number;
        maxIterations: number;
        error: Error;
    }): Promise<void> {
        const { agent, task, iterations, maxIterations, error } = params;

        try {
            const log = this.createAgentLog(agent, task, `⚠️ Maximum iterations exceeded: ${maxIterations}`, iterations, maxIterations, AGENT_STATUS_enum.MAX_ITERATIONS_ERROR, error);
            this.updateAgentState(agent, log);
            this.log(`⚠️ Maximum iterations [${maxIterations}] reached for task ${task.id}`, 'warn');
        } catch (innerError) {
            this.handleError(innerError as Error, 'Error in handleMaxIterationsError');
            throw innerError;
        }
    }

    // Updates the agent state with the provided log
    private updateAgentState(agent: AgentType, log: Log): void {
        if (agent.store) {
            agent.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        }
    }

    // Creates a log entry for an iteration event
    private createAgentLog(agent: AgentType, task: TaskType, description: string, iterations: number, maxIterations: number, status: AGENT_STATUS_enum, error?: Error): Log {
        return {
            agent,
            task,
            description,
            metadata: {
                iterations,
                maxIterations,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: { /* Mocked LLM usage stats */ }
                },
                error
            },
            agentStatus: status,
            logType: 'AgentStatusUpdate'
        };
    }
}

export default IterationManager;
