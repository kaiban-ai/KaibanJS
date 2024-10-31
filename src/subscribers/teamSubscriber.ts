/**
 * Path: src/subscribers/teamSubscriber.ts
 */

import { UseBoundStore } from 'zustand';
import { logPrettyWorkflowStatus, logPrettyWorkflowResult } from "@/utils/helpers/prettyLogs";
import { WORKFLOW_STATUS_enum } from '@/utils/core/enums';
import { logger } from "@/utils/core/logger";
import type {
    TeamStoreApi,
    Log,
    WorkflowResultProps,
    WorkflowMetadata,
    LLMUsageStats,
    CostDetails
} from '@/utils/types';

/**
 * Subscribes to workflow status updates and handles them appropriately.
 */
export const subscribeWorkflowStatusUpdates = (
    store: UseBoundStore<TeamStoreApi>
): (() => void) => {
    try {
        return store.subscribe((state) => {
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

/**
 * Handles individual workflow status updates
 */
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

/**
 * Gets a descriptive message for each workflow status
 */
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

/**
 * Validates and processes the workflow metadata
 */
const validateWorkflowMetadata = (metadata: unknown): metadata is WorkflowMetadata => {
    if (!metadata || typeof metadata !== 'object') {
        return false;
    }

    const required = [
        'result',
        'duration',
        'llmUsageStats',
        'iterationCount',
        'costDetails',
        'teamName',
        'taskCount',
        'agentCount'
    ];

    const m = metadata as Record<string, unknown>;
    
    // Check all required properties exist
    const hasAllProps = required.every(prop => prop in m);
    if (!hasAllProps) return false;

    // Type checks
    return (
        typeof m.duration === 'number' &&
        typeof m.iterationCount === 'number' &&
        typeof m.taskCount === 'number' &&
        typeof m.agentCount === 'number' &&
        typeof m.teamName === 'string' &&
        typeof m.result === 'string' &&
        isLLMUsageStats(m.llmUsageStats) &&
        isCostDetails(m.costDetails)
    );
};

/**
 * Type guard for LLMUsageStats
 */
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

/**
 * Type guard for CostDetails
 */
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

/**
 * Processes and logs the workflow result
 */
const logWorkflowResult = (log: Log): void => {
    if (!validateWorkflowMetadata(log.metadata)) {
        logger.error('Invalid workflow metadata format:', log.metadata);
        return;
    }

    const workflowResult: WorkflowResultProps = {
        metadata: {
            result: log.metadata.result,
            duration: log.metadata.duration,
            llmUsageStats: log.metadata.llmUsageStats,
            iterationCount: log.metadata.iterationCount,
            costDetails: log.metadata.costDetails,
            teamName: log.metadata.teamName,
            taskCount: log.metadata.taskCount,
            agentCount: log.metadata.agentCount
        }
    };

    try {
        logPrettyWorkflowResult(workflowResult);
    } catch (error) {
        logger.error('Failed to format workflow result:', error);
    }
};