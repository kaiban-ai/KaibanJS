import { logPrettyWorkflowStatus, logPrettyWorkflowResult, WorkflowResultProps } from "../utils/prettyLogs";
import { WORKFLOW_STATUS_enum } from '../utils/enums';
import { TeamState, Log, TeamStoreApi } from '../../types/types';  // Import TeamStoreApi
import { UseBoundStore } from 'zustand';  // Use the correct export from zustand
import { shallow } from 'zustand/shallow';

export const subscribeWorkflowStatusUpdates = (store: UseBoundStore<TeamStoreApi>): void => {
    store.subscribe((state: TeamState) => {  // Use a single argument to subscribe
        const newLogs = state.workflowLogs;
        const previousLogs = newLogs.slice(0, -1); // Get all logs except the last one
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
};

const handleWorkflowStatusUpdate = (log: Log) => {
    if (log.workflowStatus) {
        logPrettyWorkflowStatus({
            status: log.workflowStatus,
            message: getStatusMessage(log.workflowStatus)
        });

        if (log.workflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
            logWorkflowResult(log);
        }
    }
};

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

const logWorkflowResult = (log: Log) => {
    if (log.metadata && typeof log.metadata === 'object') {
        const workflowResult: WorkflowResultProps = {
            metadata: {
                result: log.metadata.result as string || '',
                duration: log.metadata.duration as number || 0,
                llmUsageStats: log.metadata.llmUsageStats as WorkflowResultProps['metadata']['llmUsageStats'] || {
                    inputTokens: 0,
                    outputTokens: 0,
                    callsCount: 0,
                    callsErrorCount: 0,
                    parsingErrors: 0
                },
                iterationCount: log.metadata.iterationCount as number || 0,
                costDetails: log.metadata.costDetails as WorkflowResultProps['metadata']['costDetails'] || {
                    costInputTokens: 0,
                    costOutputTokens: 0,
                    totalCost: 0
                },
                teamName: log.metadata.teamName as string || '',
                taskCount: log.metadata.taskCount as number || 0,
                agentCount: log.metadata.agentCount as number || 0
            }
        };
        logPrettyWorkflowResult(workflowResult);
    }
};
