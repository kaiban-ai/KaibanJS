/**
 * @file TaskHandler.ts
 * @path KaibanJS/src/utils/handlers/taskHandler.ts
 * @description High-level task operations handling and orchestration
 */

// Core utilities
import { logger } from "@/utils/core/logger";
import { PrettyError } from "@/utils/core/errors";
import { TaskManager } from "@/utils/managers/domain/task/TaskManager";

// Import from canonical locations
import type { 
    HandlerResult,
    TaskType, 
    AgentType,
    TeamStore,
    TaskValidationResult,
    ErrorType,
    LLMUsageStats,
    CostDetails
} from '@/utils/types';

/**
 * High-level task operation handling
 */
export class TaskHandler {
    private readonly taskManager: TaskManager;

    constructor() {
        this.taskManager = TaskManager.getInstance();
    }

    // ─── Task Completion ────────────────────────────────────────────────────────

    public async handleCompletion(params: {
        store: TeamStore;
        agent: AgentType;
        task: TaskType;
        result: unknown;
        metadata?: {
            llmUsageStats?: LLMUsageStats;
            costDetails?: CostDetails;
        };
    }): Promise<HandlerResult<TaskType>> {
        try {
            return await this.taskManager.completeTask(params);
        } catch (error) {
            logger.error('Error handling task completion:', error);
            throw error;
        }
    }

    // ─── Error Handling ─────────────────────────────────────────────────────────

    public async handleError(params: {
        store: TeamStore;
        task: TaskType;
        error: ErrorType;
        context?: Record<string, unknown>;
    }): Promise<HandlerResult<void>> {
        try {
            return await this.taskManager.handleTaskError(params);
        } catch (error) {
            logger.error('Error handling task error:', error);
            throw error;
        }
    }

    // ─── Task Validation ────────────────────────────────────────────────────────

    public async handleValidation(
        task: TaskType,
        context?: Record<string, unknown>
    ): Promise<TaskValidationResult> {
        try {
            return await this.taskManager.validateTask(task, context);
        } catch (error) {
            logger.error('Error validating task:', error);
            throw error;
        }
    }

    // ─── Task Blocking ─────────────────────────────────────────────────────────

    public async handleBlocking(params: {
        store: TeamStore;
        task: TaskType;
        error: ErrorType;
        blockingReason?: string;
    }): Promise<HandlerResult<void>> {
        try {
            return await this.taskManager.handleTaskBlocking(params);
        } catch (error) {
            logger.error('Error handling task blocking:', error);
            throw error;
        }
    }

    // ─── Task Timeout ──────────────────────────────────────────────────────────

    public async handleTimeout(params: {
        store: TeamStore;
        task: TaskType;
        timeoutConfig: {
            limit: number;
            type: 'execution' | 'response' | 'total';
        };
        elapsedTime: number;
    }): Promise<HandlerResult<void>> {
        try {
            return await this.taskManager.handleTaskTimeout(params);
        } catch (error) {
            logger.error('Error handling task timeout:', error);
            throw error;
        }
    }

    // ─── Resource Exhaustion ───────────────────────────────────────────────────

    public async handleResourceExhaustion(params: {
        store: TeamStore;
        task: TaskType;
        resourceStats: {
            memory: number;
            tokens: number;
            cpuTime?: number;
        };
        threshold: {
            memory?: number;
            tokens?: number;
            cpuTime?: number;
        };
    }): Promise<HandlerResult<void>> {
        try {
            return await this.taskManager.handleResourceExhaustion(params);
        } catch (error) {
            logger.error('Error handling resource exhaustion:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const taskHandler = new TaskHandler();
export default taskHandler;