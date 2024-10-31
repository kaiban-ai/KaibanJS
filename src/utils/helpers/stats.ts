/**
 * Path: C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\helpers\stats.ts
 * Utility functions for calculating statistics
 */

import { TASK_STATUS_enum, AGENT_STATUS_enum } from '@/utils/core/enums';
import type { 
    TaskType, 
    TaskStats, 
    Log, 
    LLMUsageStats,
    AgentLogMetadata,
    Output
} from '@/utils/types';

// Type guard to check if metadata is AgentLogMetadata
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

// Type guard to check if output has llmUsageStats
function hasLLMUsageStats(output: unknown): output is { llmUsageStats: LLMUsageStats } {
    return (
        typeof output === 'object' &&
        output !== null &&
        'llmUsageStats' in output &&
        output.llmUsageStats !== null
    );
}

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
        // Required base properties
        inputTokens: 0,
        outputTokens: 0,
        callsCount: 0,
        callsErrorCount: 0,
        parsingErrors: 0,
        totalLatency: 0,
        averageLatency: 0,
        lastUsed: endTime,
        
        // Required cost breakdown
        costBreakdown: {
            input: 0,
            output: 0,
            total: 0,
            currency: 'USD'
        },
        
        // Required memory utilization
        memoryUtilization: {
            peakMemoryUsage: 0,
            averageMemoryUsage: 0,
            cleanupEvents: 0
        }
    };
    
    let iterationCount = 0;
    let totalLatency = 0;

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

                    // Update cost breakdown if available
                    if (stats.costBreakdown) {
                        llmUsageStats.costBreakdown.input += stats.costBreakdown.input;
                        llmUsageStats.costBreakdown.output += stats.costBreakdown.output;
                        llmUsageStats.costBreakdown.total += stats.costBreakdown.total;
                    }

                    // Update memory utilization if available
                    if (stats.memoryUtilization) {
                        llmUsageStats.memoryUtilization.peakMemoryUsage = Math.max(
                            llmUsageStats.memoryUtilization.peakMemoryUsage,
                            stats.memoryUtilization.peakMemoryUsage
                        );
                        // Calculate running average for memory usage
                        llmUsageStats.memoryUtilization.averageMemoryUsage = 
                            (llmUsageStats.memoryUtilization.averageMemoryUsage * (llmUsageStats.callsCount - 1) + 
                            stats.memoryUtilization.averageMemoryUsage) / llmUsageStats.callsCount;
                        llmUsageStats.memoryUtilization.cleanupEvents += stats.memoryUtilization.cleanupEvents;
                    }
                }
            }
            if (log.agentStatus === AGENT_STATUS_enum.THINKING_ERROR) {
                llmUsageStats.callsErrorCount += 1;
            }
            if (log.agentStatus === AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT) {
                llmUsageStats.parsingErrors += 1;
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