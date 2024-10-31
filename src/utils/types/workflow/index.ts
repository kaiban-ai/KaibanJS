/**
 * @file index.ts
 * @path src/types/workflow/index.ts
 * @description Central export point for all workflow-related types
 *
 * @packageDocumentation
 * @module @types/workflow
 */

import { WORKFLOW_STATUS_enum } from '@/utils/core/enums';
import type { 
    WorkflowResult,
    WorkflowSuccess,
    WorkflowBlocked,
    WorkflowStopped,
    WorkflowErrored 
} from './base';
import type { 
    WorkflowStats,
    CostDetails,
    ModelUsageStats 
} from './stats';
import { logger } from '@/utils/core/logger';

// Re-export base workflow types
export * from './base';

// Re-export statistics types
export * from './stats';

/**
 * Workflow utility functions
 */
export const WorkflowUtils = {
    /**
     * Check if workflow is active
     */
    isWorkflowActive: (status: keyof typeof WORKFLOW_STATUS_enum): boolean => {
        logger.debug(`Checking workflow status: ${status}`);
        return [
            WORKFLOW_STATUS_enum.RUNNING, 
            WORKFLOW_STATUS_enum.INITIAL
        ].includes(status as unknown as WORKFLOW_STATUS_enum);
    },

    /**
     * Check if workflow is finished
     */
    isWorkflowFinished: (status: keyof typeof WORKFLOW_STATUS_enum): boolean => {
        return [
            WORKFLOW_STATUS_enum.FINISHED,
            WORKFLOW_STATUS_enum.ERRORED,
            WORKFLOW_STATUS_enum.STOPPED
        ].includes(status as unknown as WORKFLOW_STATUS_enum);
    },

    /**
     * Check if workflow needs attention
     */
    needsAttention: (result: WorkflowResult): boolean => {
        if (!result) return false;
        return (
            result.status === WORKFLOW_STATUS_enum.BLOCKED ||
            result.status === WORKFLOW_STATUS_enum.ERRORED ||
            (result.status === WORKFLOW_STATUS_enum.STOPPED && 
             'reason' in result && 
             result.reason === 'USER_INTERVENTION_REQUIRED')
        );
    },

    /**
     * Calculate success rate
     */
    calculateSuccessRate: (stats: WorkflowStats): number => {
        if (!stats.modelUsage || typeof stats.taskCount !== 'number') {
            return 0;
        }

        const totalTasks = stats.taskCount;
        const successfulTasks = Object.values(stats.modelUsage).reduce(
            (acc, usage) => {
                // Calculate successful calls based on calls and errors
                const successful = (usage.callsCount || 0) - (usage.callsErrorCount || 0);
                return acc + successful;
            }, 
            0
        );

        return totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0;
    },

    /**
     * Format currency value
     */
    formatCurrency: (amount: number, currency: string = 'USD'): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    /**
     * Create workflow summary
     */
    createWorkflowSummary: (result: WorkflowResult | null): string => {
        if (!result) return 'No workflow result available';
        if (!result.metadata) return `Status: ${result.status}`;

        const base = [
            `Status: ${result.status}`,
            `Duration: ${result.metadata.duration}s`,
            `Tasks: ${result.metadata.taskCount}`,
            `Agents: ${result.metadata.agentCount}`,
            `Cost: ${this.formatCurrency(result.metadata.costDetails?.totalCost || 0)}`
        ].join('\n');

        switch (result.status) {
            case WORKFLOW_STATUS_enum.FINISHED:
                const successResult = result as WorkflowSuccess;
                return `${base}\nResult: ${successResult.result || 'No result provided'}`;
            case WORKFLOW_STATUS_enum.BLOCKED:
                const blockedResult = result as WorkflowBlocked;
                return `${base}\nBlocked Tasks: ${blockedResult.blockedTasks?.length || 0}`;
            case WORKFLOW_STATUS_enum.STOPPED:
                const stoppedResult = result as WorkflowStopped;
                return `${base}\nReason: ${stoppedResult.reason || 'Unknown reason'}`;
            case WORKFLOW_STATUS_enum.ERRORED:
                const erroredResult = result as WorkflowErrored;
                return `${base}\nError: ${erroredResult.error?.message || 'Unknown error'}`;
            default:
                return base;
        }
    }
};