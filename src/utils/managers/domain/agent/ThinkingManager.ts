/**
 * @file ThinkingManager.ts
 * @path src/managers/domain/agent/ThinkingManager.ts
 * @description Centralized thinking process management using LLM interactions
 *
 * @module @managers/domain/agent
 */

import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { StatusManager } from '../../core/StatusManager';
import { LLMManager } from '../llm/LLMManager';
import { MessageManager } from '../llm/MessageManager';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

// Import types from canonical locations
import type { 
    AgentType,
    TaskType,
    ThinkingResult,
    ThinkingHandlerParams,
    ThinkingExecutionParams,
    ThinkingStats,
    Output
} from '@/utils/types';

import type { LLMUsageStats } from '@/utils/types/llm/responses';
import type { HandlerResult } from '@/utils/types/agent/handlers';
import type { ErrorType } from '@/utils/types/common/errors';
import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Manages the thinking process for agents using LLM interactions
 */
export class ThinkingManager extends CoreManager {
    private static instance: ThinkingManager;
    private readonly errorManager: ErrorManager;
    private readonly logManager: LogManager;
    private readonly statusManager: StatusManager;
    private readonly llmManager: LLMManager;
    private readonly messageManager: MessageManager;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.llmManager = LLMManager.getInstance();
        this.messageManager = MessageManager.getInstance();
    }

    public static getInstance(): ThinkingManager {
        if (!ThinkingManager.instance) {
            ThinkingManager.instance = new ThinkingManager();
        }
        return ThinkingManager.instance;
    }

    // ─── Core Thinking Process ───────────────────────────────────────────────────

    /**
     * Execute a thinking iteration
     */
    public async executeThinking(params: ThinkingExecutionParams): Promise<ThinkingResult> {
        const { agent, task, ExecutableAgent, feedbackMessage } = params;

        try {
            await this.startThinking(agent, task);
            const messages = await this.messageManager.getMessages();

            const result = await this.executeThoughtProcess(
                ExecutableAgent,
                messages,
                feedbackMessage,
                task.id
            );

            const thinkingResult = await this.processThinkingResult(result);
            await this.endThinking(agent, task, thinkingResult);

            return thinkingResult;

        } catch (error) {
            await this.handleThinkingError({
                agent,
                task,
                error: error as ErrorType,
                context: {
                    phase: 'thinking',
                    feedbackMessage
                }
            });
            throw error;
        }
    }

    /**
     * Process a streaming chunk of thinking output
     */
    public async handleStreamingOutput(params: {
        agent: AgentType;
        task: TaskType;
        chunk: string;
        isDone: boolean;
    }): Promise<void> {
        const { agent, task, chunk, isDone } = params;

        try {
            const status = isDone ? AGENT_STATUS_enum.THINKING_END : AGENT_STATUS_enum.THINKING;
            await this.updateAgentStatus(agent, status, {
                chunk,
                isDone,
                timestamp: Date.now()
            });

        } catch (error) {
            await this.errorManager.handleError({
                error: error as Error,
                context: {
                    agent,
                    task,
                    phase: 'streaming'
                }
            });
        }
    }

    // ─── Process Control ────────────────────────────────────────────────────────

    private async startThinking(agent: AgentType, task: TaskType): Promise<void> {
        await this.updateAgentStatus(agent, AGENT_STATUS_enum.THINKING, {
            taskId: task.id,
            startTime: Date.now()
        });
    }

    private async endThinking(
        agent: AgentType,
        task: TaskType,
        result: ThinkingResult
    ): Promise<void> {
        await this.updateAgentStatus(agent, AGENT_STATUS_enum.THINKING_END, {
            taskId: task.id,
            endTime: Date.now(),
            result
        });
    }

    private async executeThoughtProcess(
        executableAgent: any,
        messages: any[],
        feedbackMessage: string,
        taskId: string
    ): Promise<Output> {
        try {
            const response = await executableAgent.invoke(
                { messages, feedbackMessage },
                {
                    timeout: 60000,
                    metadata: { taskId },
                    tags: ['thinking']
                }
            );

            return response;

        } catch (error) {
            this.logManager.error('Error in thought process execution:', {
                error,
                taskId
            });
            throw error;
        }
    }

    private async processThinkingResult(output: Output): Promise<ThinkingResult> {
        const defaultStats = DefaultFactory.createLLMUsageStats();

        return {
            parsedLLMOutput: this.parseOutput(output.llmOutput || ''),
            llmOutput: output.llmOutput || '',
            llmUsageStats: output.llmUsageStats || defaultStats
        };
    }

    private parseOutput(content: string): Output | null {
        try {
            return JSON.parse(content);
        } catch {
            this.logManager.error('Failed to parse thinking output:', { content });
            return null;
        }
    }

    // ─── Error Handling ─────────────────────────────────────────────────────────

    private async handleThinkingError(params: ThinkingHandlerParams): Promise<void> {
        const { agent, task, error, context } = params;

        await this.updateAgentStatus(agent, AGENT_STATUS_enum.THINKING_ERROR, {
            error,
            context,
            timestamp: Date.now()
        });

        await this.errorManager.handleError({
            error,
            context: {
                agent,
                task,
                ...context
            }
        });
    }

    // ─── Agent Status Management ─────────────────────────────────────────────────

    private async updateAgentStatus(
        agent: AgentType,
        status: keyof typeof AGENT_STATUS_enum,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        await this.statusManager.transition({
            currentStatus: agent.status,
            targetStatus: status,
            entity: 'agent',
            entityId: agent.id,
            metadata: {
                ...metadata,
                timestamp: Date.now()
            }
        });

        agent.status = status;
    }

    // ─── Statistics & Metrics ──────────────────────────────────────────────────

    /**
     * Get thinking process statistics
     */
    public getThinkingStats(task: TaskType): ThinkingStats {
        const logs = task.store?.getState().workflowLogs || [];
        const thinkingLogs = logs.filter(log => 
            log.agentStatus === AGENT_STATUS_enum.THINKING || 
            log.agentStatus === AGENT_STATUS_enum.THINKING_END
        );

        const stats: ThinkingStats = {
            totalThinkingTime: 0,
            averageThinkingTime: 0,
            thinkingIterations: 0,
            llmStats: DefaultFactory.createLLMUsageStats()
        };

        thinkingLogs.forEach(log => {
            if (log.metadata?.duration) {
                stats.totalThinkingTime += log.metadata.duration;
                stats.thinkingIterations++;
            }

            if (log.metadata?.output?.llmUsageStats) {
                const llmStats = log.metadata.output.llmUsageStats as LLMUsageStats;
                stats.llmStats.inputTokens += llmStats.inputTokens;
                stats.llmStats.outputTokens += llmStats.outputTokens;
                stats.llmStats.callsCount += llmStats.callsCount;
                stats.llmStats.totalLatency += llmStats.totalLatency;
            }
        });

        if (stats.thinkingIterations > 0) {
            stats.averageThinkingTime = stats.totalThinkingTime / stats.thinkingIterations;
        }

        return stats;
    }
}

export default ThinkingManager.getInstance();