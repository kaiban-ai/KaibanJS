/**
 * @file teamExecutionTypes.ts
 * @path KaibanJS/src/types/team/teamExecutionTypes.ts
 * @description Unified team execution state interface and related types
 *
 * @module types/team
 */

import { WORKFLOW_STATUS_enum } from '../common/enumTypes';
import { IResourceMetrics } from '../metrics/base/resourceMetrics';
import { IUsageMetrics } from '../metrics/base/usageMetrics';
import { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import { IAgentType } from '../agent/agentBaseTypes';
import { ITaskType } from '../task/taskBaseTypes';
import { IWorkflowStats } from '../workflow/workflowStatsTypes';
import { ILLMResponse } from '../llm/llmBaseTypes';

// ─── Core Execution State Types ───────────────────────────────────────────────

export interface ITeamExecutionState {
    // Core State
    status: keyof typeof WORKFLOW_STATUS_enum;
    activeAgents: IAgentType[];
    currentWorkflow: string | null;
    teamHealth: {
        isHealthy: boolean;
        lastHealthCheck: number;
        issues: string[];
    };

    // Timing
    startTime: number;
    endTime: number | null;
    duration: number;
    lastUpdate: number;

    // Error Handling
    activeErrors: Array<{
        id: string;
        type: string;
        message: string;
        timestamp: number;
        context?: Record<string, unknown>;
    }>;
    errorCount: number;
    retries: number;
    maxRetries: number;

    // Assignments
    activeTasks: ITaskType[];
    completedTasks: ITaskType[];
    failedTasks: ITaskType[];
    pendingTasks: ITaskType[];
    assignedAgents: Map<string, string[]>; // taskId -> agentIds

    // Metrics
    performance: {
        resources: IResourceMetrics;
        usage: IUsageMetrics;
        workflow: IWorkflowStats;
        system: IPerformanceMetrics;
        llm: {
            totalCalls: number;
            successfulCalls: number;
            failedCalls: number;
            totalTokens: number;
            totalCost: number;
            responses: ILLMResponse[];
            averageLatency: number;
        };
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export const TeamExecutionTypeGuards = {
    isTeamExecutionState: (value: unknown): value is ITeamExecutionState => {
        if (!value || typeof value !== 'object') return false;
        const state = value as Partial<ITeamExecutionState>;
        return (
            typeof state.status === 'string' &&
            Array.isArray(state.activeAgents) &&
            typeof state.startTime === 'number' &&
            typeof state.performance === 'object' &&
            state.performance !== null
        );
    }
};

// ─── Utility Types ────────────────────────────────────────────────────────────

export interface ITeamExecutionSnapshot {
    timestamp: number;
    state: ITeamExecutionState;
}

export interface ITeamExecutionMetrics {
    resources: IResourceMetrics;
    usage: IUsageMetrics;
    performance: IPerformanceMetrics;
    llm: ITeamExecutionState['performance']['llm'];
}
