/**
 * @file thinkingActions.ts
 * @path KaibanJS/src/stores/agentStore/actions/thinkingActions.ts
 * @description Agent thinking process and LLM interaction actions
 */

import { BaseMessage } from '@langchain/core/messages';
import { logger } from '@/utils/core/logger';
import { LogCreator } from '@/utils/factories/logCreator';
import { DefaultFactory } from '@/utils/factories/defaultFactory';
import { calculateTaskCost } from '@/utils/helpers/costs/llmCostCalculator';
import { ParsedOutput } from '@/utils/types/llm';
import { 
    AgentType,
    TaskType,
    Output,
    LLMUsageStats
} from '@/utils/types';
import { ThinkingResult } from '@/utils/types/agent/handlers';
import { AgentState } from '../state';

// Action creators for agent thinking process management
export const createThinkingActions = (
    get: () => AgentState,
    set: (partial: Partial<AgentState> | ((state: AgentState) => Partial<AgentState>)) => void
) => ({
    // Handle the start of agent thinking process
    handleThinkingStart: async (params: {
        agent: AgentType;
        task: TaskType;
        messages: BaseMessage[];
    }): Promise<void> => {
        const { agent, task, messages } = params;
        const startTime = Date.now();

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: '🤔 Starting thinking process',
            metadata: {
                messages,
                timestamp: startTime,
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats()
                }
            },
            agentStatus: 'THINKING',
            logType: 'AgentStatusUpdate'
        });

        logger.info(`🤔 Agent ${agent.name} starting thinking process`);
        logger.debug('System Message:', messages[0]);
        logger.debug('Context Messages:', messages.slice(1));

        set(state => ({
            status: 'THINKING',
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    // Handle the completion of agent thinking process
    handleThinkingEnd: async (params: {
        agent: AgentType;
        task: TaskType;
        output: ThinkingResult;
    }): Promise<ParsedOutput | null> => {
        const { agent, task, output } = params;
        const endTime = Date.now();

        const modelName = agent.llmConfig.model;
        const costDetails = calculateTaskCost(modelName, output.llmUsageStats);

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: '💡 Completed thinking process',
            metadata: {
                output: {
                    ...output,
                    costDetails
                },
                duration: endTime - Date.now(),
                timestamp: endTime
            },
            agentStatus: 'THINKING_END',
            logType: 'AgentStatusUpdate'
        });

        logger.info(`💡 Agent ${agent.name} completed thinking process`);
        if (output.parsedLLMOutput) {
            logger.debug('Thinking result:', {
                thought: output.parsedLLMOutput.thought,
                action: output.parsedLLMOutput.action,
                finalAnswer: output.parsedLLMOutput.finalAnswer
            });
        }

        set(state => ({
            status: 'THINKING_END',
            workflowLogs: [...state.workflowLogs, log],
            stats: {
                ...state.stats,
                llmUsageStats: mergeLLMStats(state.stats.llmUsageStats, output.llmUsageStats),
                totalCalls: state.stats.totalCalls + 1,
                averageLatency: calculateNewAverageLatency(
                    state.stats.averageLatency,
                    state.stats.totalCalls,
                    endTime - Date.now()
                ),
                costDetails: {
                    ...state.stats.costDetails,
                    inputCost: state.stats.costDetails.inputCost + costDetails.inputCost,
                    outputCost: state.stats.costDetails.outputCost + costDetails.outputCost,
                    totalCost: state.stats.costDetails.totalCost + costDetails.totalCost
                }
            }
        }));

        return output.parsedLLMOutput;
    },

    // Handle agent thought processing
    handleThought: (params: {
        agent: AgentType;
        task: TaskType;
        thought: string;
        parsedOutput: ParsedOutput;
    }): void => {
        const { agent, task, thought, parsedOutput } = params;

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `💭 Processing thought: ${thought}`,
            metadata: {
                thought,
                parsedOutput,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    thought
                }
            },
            agentStatus: 'THOUGHT',
            logType: 'AgentStatusUpdate'
        });

        logger.info(`💭 Agent ${agent.name} processing thought`);
        logger.debug('Thought:', thought);

        set(state => ({
            status: 'THOUGHT',
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    // Handle self-questioning process
    handleSelfQuestion: (params: {
        agent: AgentType;
        task: TaskType;
        question: string;
        parsedOutput: ParsedOutput;
    }): void => {
        const { agent, task, question, parsedOutput } = params;

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: `❓ Self-question: ${question}`,
            metadata: {
                question,
                parsedOutput,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    thought: question
                }
            },
            agentStatus: 'SELF_QUESTION',
            logType: 'AgentStatusUpdate'
        });

        logger.info(`❓ Agent ${agent.name} asking self-question`);
        logger.debug('Question:', question);

        set(state => ({
            status: 'SELF_QUESTION',
            workflowLogs: [...state.workflowLogs, log]
        }));
    },

    // Handle final answer from agent
    handleFinalAnswer: (params: {
        agent: AgentType;
        task: TaskType;
        parsedOutput: ParsedOutput;
    }): void => {
        const { agent, task, parsedOutput } = params;

        const log = LogCreator.createAgentLog({
            agent,
            task,
            description: '🎯 Final answer reached',
            metadata: {
                parsedOutput,
                timestamp: Date.now(),
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    finalAnswer: parsedOutput.finalAnswer
                }
            },
            agentStatus: 'FINAL_ANSWER',
            logType: 'AgentStatusUpdate'
        });

        logger.info(`🎯 Agent ${agent.name} reached final answer`);
        logger.debug('Final answer:', parsedOutput.finalAnswer);

        set(state => ({
            status: 'FINAL_ANSWER',
            workflowLogs: [...state.workflowLogs, log]
        }));
    }
});

// Merge two LLM usage stats objects
function mergeLLMStats(
    current: LLMUsageStats,
    new_stats: LLMUsageStats
): LLMUsageStats {
    return {
        ...current,
        inputTokens: current.inputTokens + new_stats.inputTokens,
        outputTokens: current.outputTokens + new_stats.outputTokens,
        callsCount: current.callsCount + new_stats.callsCount,
        callsErrorCount: current.callsErrorCount + new_stats.callsErrorCount,
        parsingErrors: current.parsingErrors + new_stats.parsingErrors,
        totalLatency: current.totalLatency + new_stats.totalLatency,
        lastUsed: new_stats.lastUsed,
        memoryUtilization: {
            peakMemoryUsage: Math.max(
                current.memoryUtilization.peakMemoryUsage,
                new_stats.memoryUtilization.peakMemoryUsage
            ),
            averageMemoryUsage: (
                current.memoryUtilization.averageMemoryUsage +
                new_stats.memoryUtilization.averageMemoryUsage
            ) / 2,
            cleanupEvents: current.memoryUtilization.cleanupEvents + 
                new_stats.memoryUtilization.cleanupEvents
        },
        costBreakdown: {
            input: current.costBreakdown.input + new_stats.costBreakdown.input,
            output: current.costBreakdown.output + new_stats.costBreakdown.output,
            total: current.costBreakdown.total + new_stats.costBreakdown.total,
            currency: current.costBreakdown.currency
        }
    };
}

// Calculate new average latency
function calculateNewAverageLatency(
    currentAverage: number,
    currentCount: number,
    newLatency: number
): number {
    return ((currentAverage * currentCount) + newLatency) / (currentCount + 1);
}

/**
 * Type for thinking actions when instantiated
 */
export type ThinkingActions = ReturnType<typeof createThinkingActions>;
