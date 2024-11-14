/**
 * @file StoreHandler.ts
 * @path KaibanJS/src/utils/handlers/storeHandler.ts
 * @description High-level store operations handling and orchestration
 */

// Core utilities
import { logger } from "@/utils/core/logger";
import { WorkflowManager } from "@/utils/managers/domain/workflow/WorkflowManager";

// Types from canonical locations
import type { 
    TeamStore,
    TeamState,
    TaskType,
    HandlerResult,
    ParsedOutput,
    Output,
    CostDetails,
    LLMUsageStats
} from '@/utils/types';

/**
 * High-level store operation handling
 */
export class StoreHandler {
    private readonly workflowManager: WorkflowManager;

    constructor() {
        this.workflowManager = WorkflowManager.getInstance();
    }

    // ─── State Updates ─────────────────────────────────────────────────────────

    public async handleStateUpdate(
        store: TeamStore,
        update: Partial<TeamState>
    ): Promise<HandlerResult<TeamState>> {
        try {
            return await this.workflowManager.updateState(store, update);
        } catch (error) {
            logger.error('Error updating store state:', error);
            throw error;
        }
    }

    // ─── Task State Management ─────────────────────────────────────────────────

    public async handleTaskStateUpdate(
        store: TeamStore,
        taskId: string,
        update: Partial<TaskType>
    ): Promise<HandlerResult<TaskType>> {
        try {
            return await this.workflowManager.updateTaskState(store, taskId, update);
        } catch (error) {
            logger.error('Error updating task state:', error);
            throw error;
        }
    }

    // ─── Task Operations ───────────────────────────────────────────────────────

    public async handleTaskAddition(
        store: TeamStore,
        task: TaskType
    ): Promise<HandlerResult<TaskType>> {
        try {
            return await this.workflowManager.addTask(store, task);
        } catch (error) {
            logger.error('Error adding task:', error);
            throw error;
        }
    }

    // ─── Agent Output ──────────────────────────────────────────────────────────

    public async handleAgentOutput(
        store: TeamStore,
        task: TaskType,
        output: Output,
        metadata?: Record<string, unknown>
    ): Promise<HandlerResult<Output>> {
        try {
            return await this.workflowManager.processAgentOutput(store, task, output, metadata);
        } catch (error) {
            logger.error('Error handling agent output:', error);
            throw error;
        }
    }

    // ─── Cost Tracking ────────────────────────────────────────────────────────

    public async handleCostTracking(
        store: TeamStore,
        task: TaskType,
        llmUsageStats: LLMUsageStats,
        costDetails: CostDetails
    ): Promise<HandlerResult<void>> {
        try {
            return await this.workflowManager.updateCostTracking(store, task, llmUsageStats, costDetails);
        } catch (error) {
            logger.error('Error updating cost tracking:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const storeHandler = new StoreHandler();
export default storeHandler;