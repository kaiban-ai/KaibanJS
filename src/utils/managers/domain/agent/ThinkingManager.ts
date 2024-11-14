/**
 * @file ThinkingManager.ts
 * @path KaibanJS/src/utils/managers/thinking/ThinkingManager.ts
 * @description Manages the thinking process of an agent, tracking stats and managing stages.
 */

import CoreManager from '../../core/CoreManager';
import errorHandler from '../handlers/errorHandler';
import type { AgentType, TaskType, ThinkingResult, ThinkingExecutionParams, ThinkingStats } from '@/utils/types';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

export class ThinkingManager extends CoreManager {
    // Initiates and executes the thinking process, handles results and errors
    public async executeThinking(params: ThinkingExecutionParams): Promise<ThinkingResult> {
        const { agent, task, executableAgent, feedbackMessage } = params;

        try {
            await this.startThinking(agent, task);
            const output = await this.executeThoughtProcess(executableAgent, feedbackMessage, task.id);
            const result = this.processThinkingResult(output);

            await this.endThinking(agent, task, result);
            return result;

        } catch (error) {
            await errorHandler.handleLLMError({
                error,
                context: { phase: 'thinking' },
                agent,
                task,
                store: task.store
            });
            throw error;
        }
    

    // Retrieves stats related to the agent's thinking process
    public async getThinkingStats(task: TaskType): Promise<ThinkingStats> {
        const logs = task.store?.getState().workflowLogs || [];
        const thinkingLogs = logs.filter(log => 
            log.agentStatus === AGENT_STATUS_enum.THINKING || log.agentStatus === AGENT_STATUS_enum.THINKING_END
        );

        return this.calculateThinkingStats(thinkingLogs);
    }

    // Initiates the thinking process by updating the agent's status
    private async startThinking(agent: AgentType, task: TaskType): Promise<void> {
        await agent.setStatus(AGENT_STATUS_enum.THINKING);
        this.log(`Starting thinking process for agent ${agent.name} on task ${task.title}`, 'info');
    }

    // Executes the thought process and returns the output
    private async executeThoughtProcess(
        executableAgent: any,
        feedbackMessage: string,
        taskId: string
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const callOptions = {
                timeout: 60000,
                metadata: { taskId },
                tags: ['thinking'],
                callbacks: [{
                    handleLLMEnd: async (output: any) => resolve(output)
                }]
            };

            executableAgent.invoke({ feedbackMessage }, callOptions).catch(reject);
        });
    }

    // Processes the result of the thinking output into a ThinkingResult
    private processThinkingResult(output: any): ThinkingResult {
        return {
            parsedLLMOutput: output.parsedLLMOutput || null,
            llmOutput: output.llmOutput || '',
            llmUsageStats: output.llmUsageStats || { inputTokens: 0, outputTokens: 0, callsCount: 0, totalLatency: 0 }
        };
    }

    // Completes the thinking process by updating the agent's status
    private async endThinking(agent: AgentType, task: TaskType, result: ThinkingResult): Promise<void> {
        await agent.setStatus(AGENT_STATUS_enum.THINKING_END);
        this.log(`Completed thinking process for agent ${agent.name} on task ${task.title}`, 'info');
    }

    // Handles any errors that occur during the thinking process
    private async handleThinkingError(error: unknown, agent: AgentType, task: TaskType): Promise<void> {
        this.handleError(error as Error, `Error in thinking process for agent ${agent.name} on task ${task.title}`);
        await agent.setStatus(AGENT_STATUS_enum.THINKING_ERROR);
    }

    // Calculates and returns stats from thinking-related logs
    private calculateThinkingStats(thinkingLogs: any[]): ThinkingStats {
        let totalTime = 0;
        let iterations = 0;
        const llmStats = { inputTokens: 0, outputTokens: 0, callsCount: 0, totalLatency: 0 };

        thinkingLogs.forEach(log => {
            if (log.metadata?.duration) {
                totalTime += log.metadata.duration;
                iterations++;
            }

            if (log.metadata?.output?.llmUsageStats) {
                const stats = log.metadata.output.llmUsageStats;
                llmStats.inputTokens += stats.inputTokens;
                llmStats.outputTokens += stats.outputTokens;
                llmStats.callsCount += stats.callsCount;
                llmStats.totalLatency += stats.totalLatency;
            }
        });

        return {
            totalThinkingTime: totalTime,
            averageThinkingTime: iterations > 0 ? totalTime / iterations : 0,
            thinkingIterations: iterations,
            llmStats
        };
    }
}

export default ThinkingManager;
