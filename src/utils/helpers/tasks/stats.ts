/**
 * @file stats.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\helpers\stats.ts
 * @description Statistical calculation and analysis utilities
 */

import { logger } from "../../core/logger";
import { TASK_STATUS_enum, AGENT_STATUS_enum } from "@/utils/types/common/enums";
import { TaskType, TaskStats } from "@/types/task/taskBase";
import { Log, AgentLogMetadata } from "@/types/team/teamLogsTypes";
import { LLMUsageStats, Output } from "@/utils/types/llm/responses";
import { formatCost } from "../llm/llmCostCalculator";
import { ModelStats, ModelUsageStats } from "../../../types/workflow";

/**
 * Type guard to check if metadata is AgentLogMetadata
 */
function isAgentLogMetadata(metadata: unknown): metadata is AgentLogMetadata {
    return (
        typeof metadata === 'object' &&
        metadata !== null &&
        'output' in metadata &&
        typeof metadata.output === 'object' &&
        metadata.output !== null &&
        'llmUsageStats' in metadata.output
    );
}

/**
 * Type guard to check if output has LLM usage stats
 */
function hasLLMUsageStats(output: unknown): output is { llmUsageStats: LLMUsageStats } {
    return (
        typeof output === 'object' &&
        output !== null &&
        'llmUsageStats' in output &&
        output.llmUsageStats !== null
    );
}

/**
 * Calculates comprehensive statistics for a given task
 * @param task - Task to calculate statistics for
 * @param logs - Workflow logs to analyze
 * @returns TaskStats object containing calculated statistics
 */
export function calculateTaskStats(
    task: TaskType,
    logs: Log[]
): TaskStats {
    const endTime = Date.now();
    const lastDoingLog = logs
        .slice()
        .reverse()
        .find(log =>
            log.task?.id === task.id && 
            log.logType === "TaskStatusUpdate" && 
            log.taskStatus === TASK_STATUS_enum.DOING
        );
    
    const startTime = lastDoingLog ? lastDoingLog.timestamp : endTime;
    const duration = (endTime - startTime) / 1000;

    let llmUsageStats: LLMUsageStats = {
        inputTokens: 0,
        outputTokens: 0,
        callsCount: 0,
        callsErrorCount: 0,
        parsingErrors: 0,
        totalLatency: 0,
        averageLatency: 0,
        lastUsed: endTime,
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
    
    let iterationCount = 0;
    let totalLatency = 0;
    const modelUsage: ModelUsageStats = {};

    logs.forEach(log => {
        if (log.task?.id === task.id && 
            log.timestamp >= startTime && 
            log.logType === 'AgentStatusUpdate'
        ) {
            if (log.agentStatus === AGENT_STATUS_enum.THINKING_END) {
                if (isAgentLogMetadata(log.metadata) && hasLLMUsageStats(log.metadata.output)) {
                    const stats = log.metadata.output.llmUsageStats;
                    llmUsageStats.inputTokens += stats.inputTokens;
                    llmUsageStats.outputTokens += stats.outputTokens;
                    llmUsageStats.callsCount += 1;
                    
                    // Update latency statistics
                    if (stats.totalLatency) {
                        totalLatency += stats.totalLatency;
                        llmUsageStats.totalLatency = totalLatency;
                        llmUsageStats.averageLatency = totalLatency / llmUsageStats.callsCount;
                    }

                    // Update cost breakdown
                    if (stats.costBreakdown) {
                        llmUsageStats.costBreakdown.input += stats.costBreakdown.input;
                        llmUsageStats.costBreakdown.output += stats.costBreakdown.output;
                        llmUsageStats.costBreakdown.total += stats.costBreakdown.total;
                    }

                    // Update memory utilization
                    if (stats.memoryUtilization) {
                        llmUsageStats.memoryUtilization.peakMemoryUsage = Math.max(
                            llmUsageStats.memoryUtilization.peakMemoryUsage,
                            stats.memoryUtilization.peakMemoryUsage
                        );
                        llmUsageStats.memoryUtilization.averageMemoryUsage = 
                            (llmUsageStats.memoryUtilization.averageMemoryUsage * (llmUsageStats.callsCount - 1) + 
                            stats.memoryUtilization.averageMemoryUsage) / llmUsageStats.callsCount;
                        llmUsageStats.memoryUtilization.cleanupEvents += stats.memoryUtilization.cleanupEvents;
                    }

                    // Update model-specific usage
                    const modelName = log.agent?.llmConfig?.model;
                    if (modelName) {
                        if (!modelUsage[modelName]) {
                            modelUsage[modelName] = {
                                ...llmUsageStats,
                                inputTokens: 0,
                                outputTokens: 0,
                                callsCount: 0,
                                callsErrorCount: 0,
                                parsingErrors: 0
                            };
                        }
                        const modelStats = modelUsage[modelName];
                        modelStats.inputTokens += stats.inputTokens;
                        modelStats.outputTokens += stats.outputTokens;
                        modelStats.callsCount += 1;
                    }
                }
            }
            if (log.agentStatus === AGENT_STATUS_enum.THINKING_ERROR) {
                llmUsageStats.callsErrorCount += 1;
                const modelName = log.agent?.llmConfig?.model;
                if (modelName && modelUsage[modelName]) {
                    modelUsage[modelName].callsErrorCount += 1;
                }
            }
            if (log.agentStatus === AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT) {
                llmUsageStats.parsingErrors += 1;
                const modelName = log.agent?.llmConfig?.model;
                if (modelName && modelUsage[modelName]) {
                    modelUsage[modelName].parsingErrors += 1;
                }
            }
            if (log.agentStatus === AGENT_STATUS_enum.ITERATION_END) {
                iterationCount += 1;
            }
        }
    });

    return {
        startTime,
        endTime,
        duration,
        llmUsageStats,
        iterationCount,
        modelUsage
    };
}

/**
 * Calculate average cost per token across all models
 * @param modelUsage - Usage statistics per model
 * @returns Average cost per token
 */
export function calculateAverageCostPerToken(modelUsage: ModelUsageStats): number {
    let totalCost = 0;
    let totalTokens = 0;

    Object.values(modelUsage).forEach(stats => {
        totalCost += stats.costBreakdown.total;
        totalTokens += stats.inputTokens + stats.outputTokens;
    });

    return totalTokens > 0 ? totalCost / totalTokens : 0;
}

/**
 * Calculate token processing rate
 * @param startTime - Start timestamp
 * @param endTime - End timestamp
 * @param totalTokens - Total tokens processed
 * @returns Tokens per second
 */
export function calculateTokenRate(startTime: number, endTime: number, totalTokens: number): number {
    const duration = Math.max((endTime - startTime) / 1000, 1); // Minimum 1 second
    return totalTokens / duration;
}

export { formatCost };