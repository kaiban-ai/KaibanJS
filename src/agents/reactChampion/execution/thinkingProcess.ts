/**
 * @file thinkingProcess.ts
 * @path KaibanJS/src/agents/reactChampion/execution/thinkingProcess.ts
 * @description Thinking process execution using manager-based architecture
 */

// Core managers
import { logger } from '@/utils/core/logger';
import { ThinkingManager } from '@/utils/managers/domain/agent/ThinkingManager';
import { StatusManager } from '@/utils/managers/core/StatusManager';

// Handlers
import { errorHandler } from '@/utils/handlers/errorHandler';
import { messageHandler } from '@/utils/handlers/messageHandler';

// Import types from canonical locations
import type { 
    AgentType,
    TaskType,
    ThinkingResult,
    ParsedOutput,
    Output,
    LLMUsageStats,
    ThinkingExecutionParams 
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Thinking process execution orchestrator
 */
export class ThinkingProcessExecutor {
    private readonly thinkingManager: ThinkingManager;
    private readonly statusManager: StatusManager;

    constructor() {
        this.thinkingManager = ThinkingManager.getInstance();
        this.statusManager = StatusManager.getInstance();
    }

    // ─── Main Execution ─────────────────────────────────────────────────────────

    public async executeThinking(params: ThinkingExecutionParams): Promise<ThinkingResult> {
        const { agent, task, ExecutableAgent, feedbackMessage } = params;

        try {
            // Start thinking phase
            await this.startThinking(agent, task);

            // Execute thought process
            const output = await this.thinkingManager.executeThought({
                agent,
                task,
                ExecutableAgent,
                feedbackMessage,
                callOptions: {
                    stop: ExecutableAgent.stop,
                    timeout: 60000,
                    metadata: { taskId: task.id },
                    tags: ['thinking']
                }
            });

            // Process output
            return await this.processThinkingResult(output);

        } catch (error) {
            await this.handleThinkingError(error, agent, task);
            throw error;
        }
    }

    // ─── Process Control ─────────────────────────────────────────────────────────

    private async startThinking(agent: AgentType, task: TaskType): Promise<void> {
        await this.statusManager.transition({
            currentStatus: agent.status,
            targetStatus: AGENT_STATUS_enum.THINKING,
            entity: 'agent',
            entityId: agent.id,
            metadata: {
                taskId: task.id,
                timestamp: Date.now()
            }
        });
    }

    private async processThinkingResult(output: Output): Promise<ThinkingResult> {
        const parsedOutput = await this.thinkingManager.parseOutput(output.llmOutput || '');
        const llmUsageStats = output.llmUsageStats || this.createDefaultLLMStats();

        return {
            parsedLLMOutput: parsedOutput,
            llmOutput: output.llmOutput || '',
            llmUsageStats
        };
    }

    // ─── Error Handling ─────────────────────────────────────────────────────────

    private async handleThinkingError(
        error: unknown,
        agent: AgentType,
        task: TaskType
    ): Promise<void> {
        await errorHandler.handleThinkingError({
            agent,
            task,
            error: error as Error,
            context: {
                phase: 'thinking',
                timestamp: Date.now()
            }
        });
    }

    // ─── Utility Methods ─────────────────────────────────────────────────────────

    private createDefaultLLMStats(): LLMUsageStats {
        return {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastUsed: Date.now(),
            memoryUtilization: {
                peakMemoryUsage: 0,
                averageMemoryUsage: 0,
                cleanupEvents: 0
            },
            costBreakdown: {
                input: 0,
                output: 0,
                total: 0,
                currency: 'USD'
            }
        };
    }
}

// Export singleton instance
export const thinkingProcess = new ThinkingProcessExecutor();
export default thinkingProcess;