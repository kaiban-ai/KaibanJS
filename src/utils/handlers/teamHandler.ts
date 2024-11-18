/**
 * @file TeamHandler.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\handlers\teamHandler.ts
 * @description High-level team operations handling and orchestration
 */

// Core utilities
import { logger } from "@/utils/core/logger";
import { PrettyError } from "@/utils/core/errors";
import { TeamManager } from "@/utils/managers/domain/team/TeamManager";

// Types from canonical locations
import type {
    TeamStore,
    TeamState,
    TaskType,
    TeamInputs,
    WorkflowStats,
    WorkflowStartResult,
    WorkflowResult,
    ModelUsageStats,
    LLMUsageStats,
    CostDetails,
    ErrorType,
    SystemAgent,
    HandlerResult
} from '@/utils/types';

import { WORKFLOW_STATUS_enum } from '@/utils/types/common/enums';

/**
 * High-level team operation handling
 */
export class TeamHandler {
    private readonly teamManager: TeamManager;

    constructor() {
        this.teamManager = TeamManager.getInstance();
    }

    // ─── Workflow Management ───────────────────────────────────────────────────

    public async handleWorkflowStart(
        store: TeamStore,
        inputs: Record<string, unknown> = {}
    ): Promise<WorkflowStartResult> {
        try {
            return await this.teamManager.startWorkflow(store, inputs);
        } catch (error) {
            logger.error('Error starting workflow:', error);
            throw error;
        }
    }

    public async handleWorkflowCompletion(
        store: TeamStore,
        result: string
    ): Promise<WorkflowStartResult> {
        try {
            return await this.teamManager.completeWorkflow(store, result);
        } catch (error) {
            logger.error('Error completing workflow:', error);
            throw error;
        }
    }

    public async handleWorkflowError(
        store: TeamStore,
        error: ErrorType,
        task?: TaskType
    ): Promise<void> {
        try {
            await this.teamManager.handleWorkflowError(store, error, task);
        } catch (handlingError) {
            logger.error('Error handling workflow error:', handlingError);
            throw handlingError;
        }
    }

    // ─── Status Management ────────────────────────────────────────────────────

    public async handleWorkflowStatusChange(
        store: TeamStore, 
        status: keyof typeof WORKFLOW_STATUS_enum
    ): Promise<HandlerResult<WorkflowResult>> {
        try {
            return await this.teamManager.updateWorkflowStatus(store, status);
        } catch (error) {
            logger.error('Error updating workflow status:', error);
            throw error;
        }
    }

    // ─── Cost & Resource Tracking ─────────────────────────────────────────────

    public async handleCostTracking(
        store: TeamStore,
        modelUsage: ModelUsageStats,
        costDetails: CostDetails
    ): Promise<HandlerResult<void>> {
        try {
            return await this.teamManager.updateCostTracking(store, modelUsage, costDetails);
        } catch (error) {
            logger.error('Error updating cost tracking:', error);
            throw error;
        }
    }

    public async handleResourceTracking(
        store: TeamStore,
        task: TaskType,
        llmUsageStats: LLMUsageStats
    ): Promise<HandlerResult<void>> {
        try {
            return await this.teamManager.updateResourceTracking(store, task, llmUsageStats);
        } catch (error) {
            logger.error('Error updating resource tracking:', error);
            throw error;
        }
    }

    // ─── Task Management ─────────────────────────────────────────────────────

    public async handleTaskBlocked(params: {
        store: TeamStore;
        task: TaskType;
        error: ErrorType;
        blockingReason?: string;
    }): Promise<HandlerResult<void>> {
        try {
            return await this.teamManager.handleTaskBlocked(params);
        } catch (error) {
            logger.error('Error handling blocked task:', error);
            throw error;
        }
    }

    public async handleTaskFeedback(
        store: TeamStore,
        taskId: string,
        feedback: string,
        metadata?: Record<string, unknown>
    ): Promise<HandlerResult<void>> {
        try {
            return await this.teamManager.processFeedback(store, taskId, feedback, metadata);
        } catch (error) {
            logger.error('Error handling task feedback:', error);
            throw error;
        }
    }

    // ─── Cleanup ─────────────────────────────────────────────────────────────

    public async cleanup(): Promise<void> {
        try {
            await this.teamManager.cleanup();
        } catch (error) {
            logger.error('Error during team cleanup:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const teamHandler = new TeamHandler();
export default teamHandler;