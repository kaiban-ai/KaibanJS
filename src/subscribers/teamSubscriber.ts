/**
 * @file teamSubscriber.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\subscribers\teamSubscriber.ts
 * @description Monitors and handles workflow status updates within the team workflow. 
 * Provides functionality to log detailed workflow statuses and results, 
 * ensuring structured insights for team activities and performance metrics.
 * 
 * 
 * @packageDocumentation
 * @module @subscribers/team
 */

// Imports
import { UseBoundStore } from 'zustand';
import { logPrettyWorkflowStatus, logPrettyWorkflowResult } from "@/utils/helpers/formatting/prettyLogs";
import { WORKFLOW_STATUS_enum } from "@/utils/types/common/enums";
import { logger } from "@/utils/core/logger";

import type { TeamStore, TeamState } from '@/types/team/teamBaseTypes';
import type { WorkflowLogMetadata, Log } from '@/types/team/teamLogsTypes';
import type { CostDetails } from '@/types/workflow/workflowStats';
import type { LLMUsageStats } from '@/utils/types/llm/responses';

// Define interface
interface WorkflowResultMetadata {
    result: string;
    duration: number;
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    costDetails: CostDetails;
    teamName: string;
    taskCount: number;
    agentCount: number;
}

// Default values
const DEFAULT_LLM_STATS: LLMUsageStats = {
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

const DEFAULT_COST_DETAILS: CostDetails = {
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    currency: 'USD',
    breakdown: {
        promptTokens: { count: 0, cost: 0 },
        completionTokens: { count: 0, cost: 0 }
    }
};

const DEFAULT_WORKFLOW_RESULT: WorkflowResultMetadata = {
    result: 'No result available',
    duration: 0,
    llmUsageStats: DEFAULT_LLM_STATS,
    iterationCount: 0,
    costDetails: DEFAULT_COST_DETAILS,
    teamName: 'Unknown Team',
    taskCount: 0,
    agentCount: 0
};

// Type guard for LLMUsageStats
const isLLMUsageStats = (stats: unknown): stats is LLMUsageStats => {
    if (!stats || typeof stats !== 'object') return false;
    
    const s = stats as Record<string, unknown>;
    return (
        typeof s.inputTokens === 'number' &&
        typeof s.outputTokens === 'number' &&
        typeof s.callsCount === 'number' &&
        typeof s.callsErrorCount === 'number' &&
        typeof s.parsingErrors === 'number'
    );
};

// Type guard for CostDetails
const isCostDetails = (details: unknown): details is CostDetails => {
    if (!details || typeof details !== 'object') return false;
    
    const d = details as Record<string, unknown>;
    return (
        typeof d.inputCost === 'number' &&
        typeof d.outputCost === 'number' &&
        typeof d.totalCost === 'number' &&
        typeof d.currency === 'string' &&
        typeof d.breakdown === 'object' &&
        d.breakdown !== null
    );
};

// Extract metadata with defaults
const extractMetadata = (log: Log): WorkflowResultMetadata => {
    if (!log.metadata || typeof log.metadata !== 'object') {
        return DEFAULT_WORKFLOW_RESULT;
    }

    const m = log.metadata as Partial<WorkflowResultMetadata>;
    return {
        result: m.result || DEFAULT_WORKFLOW_RESULT.result,
        duration: m.duration || DEFAULT_WORKFLOW_RESULT.duration,
        llmUsageStats: isLLMUsageStats(m.llmUsageStats) ? m.llmUsageStats : DEFAULT_LLM_STATS,
        iterationCount: m.iterationCount || DEFAULT_WORKFLOW_RESULT.iterationCount,
        costDetails: isCostDetails(m.costDetails) ? m.costDetails : DEFAULT_COST_DETAILS,
        teamName: typeof m.teamName === 'string' ? m.teamName : DEFAULT_WORKFLOW_RESULT.teamName,
        taskCount: typeof m.taskCount === 'number' ? m.taskCount : DEFAULT_WORKFLOW_RESULT.taskCount,
        agentCount: typeof m.agentCount === 'number' ? m.agentCount : DEFAULT_WORKFLOW_RESULT.agentCount
    };
};

// Subscribe to workflow status updates
export const subscribeWorkflowStatusUpdates = (
    store: UseBoundStore<TeamStore>
): (() => void) => {
    try {
        return store.subscribe((state: TeamState) => {
            const newLogs = state.workflowLogs;
            const previousLogs = newLogs.slice(0, -1);
            const newLogsCount = newLogs.length - previousLogs.length;

            if (newLogsCount > 0) {
                for (let i = newLogs.length - newLogsCount; i < newLogs.length; i++) {
                    const log = newLogs[i];
                    if (log.logType === 'WorkflowStatusUpdate') {
                        handleWorkflowStatusUpdate(log);
                    }
                }
            }
        });
    } catch (error) {
        logger.error('Error setting up workflow status subscription:', error);
        return () => {};
    }
};

// Handle workflow status update
const handleWorkflowStatusUpdate = (log: Log): void => {
    if (!log.workflowStatus) return;

    logPrettyWorkflowStatus({
        status: log.workflowStatus,
        message: getStatusMessage(log.workflowStatus)
    });

    if (log.workflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
        try {
            logWorkflowResult(log);
        } catch (error) {
            logger.error('Failed to log workflow result:', error);
        }
    }
};

// Get status message
const getStatusMessage = (status: keyof typeof WORKFLOW_STATUS_enum): string => {
    switch (status) {
        case WORKFLOW_STATUS_enum.INITIAL:
            return 'Workflow is being initialized.';
        case WORKFLOW_STATUS_enum.RUNNING:
            return 'Workflow is actively processing tasks.';
        case WORKFLOW_STATUS_enum.STOPPING:
            return 'Workflow is stopping.';
        case WORKFLOW_STATUS_enum.STOPPED:
            return 'Workflow has been stopped.';
        case WORKFLOW_STATUS_enum.ERRORED:
            return 'Workflow encountered an error.';
        case WORKFLOW_STATUS_enum.FINISHED:
            return 'Workflow has successfully completed all tasks.';
        case WORKFLOW_STATUS_enum.BLOCKED:
            return 'Workflow is blocked due to one or more blocked tasks.';
        default:
            return `Encountered an unexpected workflow status: ${status}`;
    }
};

// Log workflow result
const logWorkflowResult = (log: Log): void => {
    const metadata = extractMetadata(log);
    logPrettyWorkflowResult({ metadata });
};
