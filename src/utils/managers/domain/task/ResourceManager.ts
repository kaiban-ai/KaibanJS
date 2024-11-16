/**
 * @file ResourceManager.ts
 * @path src/managers/domain/task/ResourceManager.ts
 * @description Domain manager for task resource tracking and limitations
 *
 * @module @managers/domain/task
 */

import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { StatusManager } from '../../core/StatusManager';
import { DefaultFactory } from '../../../factories/defaultFactory';
import { calculateTaskStats } from '../../../helpers/stats';

// Import types from canonical locations
import type { 
    TaskType,
    TaskResourceParams,
    TaskStats,
    HandlerResult
} from '@/utils/types/task';

import type {
    LLMUsageStats,
    Output
} from '@/utils/types/llm';

import type { CostDetails } from '@/utils/types/workflow';
import { TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Resource threshold configuration
 */
interface ResourceThresholds {
    memory: number;
    tokens: number;
    cpuTime?: number;
    networkRequests?: number;
    cost: number;
}

/**
 * Resource usage tracking
 */
interface ResourceUsage {
    startTime: number;
    memory: number[];
    tokens: number[];
    cpuTime: number[];
    networkRequests: number;
    peakMemory: number;
    totalTokens: number;
    averageCpuTime: number;
    cost: number;
}

/**
 * Manages task resource tracking and limitations
 */
export class ResourceManager extends CoreManager {
    private static instance: ResourceManager;
    private readonly errorManager: ErrorManager;
    private readonly logManager: LogManager;
    private readonly statusManager: StatusManager;
    private readonly resourceUsage: Map<string, ResourceUsage>;
    private readonly thresholds: Map<string, ResourceThresholds>;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.resourceUsage = new Map();
        this.thresholds = new Map();
    }

    public static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }

    // ─── Resource Tracking Methods ───────────────────────────────────────────────

    /**
     * Track task resource usage
     */
    public async trackResourceUsage(params: TaskResourceParams): Promise<HandlerResult> {
        const { task, resourceStats, thresholds } = params;

        try {
            // Initialize or get existing resource tracking
            const usage = this.getOrCreateResourceUsage(task.id);
            
            // Update resource metrics
            usage.memory.push(resourceStats.memory);
            usage.tokens.push(resourceStats.tokens);
            if (resourceStats.cpuTime) {
                usage.cpuTime.push(resourceStats.cpuTime);
            }
            if (resourceStats.networkRequests) {
                usage.networkRequests += resourceStats.networkRequests;
            }

            // Update peak values
            usage.peakMemory = Math.max(usage.peakMemory, resourceStats.memory);
            usage.totalTokens += resourceStats.tokens;
            usage.averageCpuTime = usage.cpuTime.reduce((a, b) => a + b, 0) / usage.cpuTime.length;

            // Calculate costs using task stats
            const stats = await this.calculateResourceStats(task);
            usage.cost = stats.costDetails.totalCost;

            // Check thresholds
            if (thresholds) {
                this.thresholds.set(task.id, thresholds);
                const violations = await this.checkThresholds(task.id);
                if (violations.length > 0) {
                    return this.handleThresholdViolations(task, violations);
                }
            }

            // Log resource update
            const log = task.store?.prepareNewLog({
                task,
                logDescription: 'Resource usage updated',
                metadata: {
                    resourceStats,
                    usage,
                    timestamp: Date.now()
                },
                logType: 'TaskStatusUpdate',
                taskStatus: task.status
            });

            if (log && task.store) {
                task.store.setState(state => ({
                    workflowLogs: [...state.workflowLogs, log]
                }));
            }

            return {
                success: true,
                data: usage
            };

        } catch (error) {
            return this.handleTrackingError(task, error);
        }
    }

    /**
     * Get current resource usage for task
     */
    public getResourceUsage(taskId: string): ResourceUsage | null {
        return this.resourceUsage.get(taskId) || null;
    }

    /**
     * Set resource thresholds for task
     */
    public setThresholds(taskId: string, thresholds: ResourceThresholds): void {
        this.thresholds.set(taskId, thresholds);
    }

    /**
     * Clear resource tracking for task
     */
    public clearTracking(taskId: string): void {
        this.resourceUsage.delete(taskId);
        this.thresholds.delete(taskId);
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────────

    /**
     * Get or create resource usage tracking
     */
    private getOrCreateResourceUsage(taskId: string): ResourceUsage {
        if (!this.resourceUsage.has(taskId)) {
            this.resourceUsage.set(taskId, {
                startTime: Date.now(),
                memory: [],
                tokens: [],
                cpuTime: [],
                networkRequests: 0,
                peakMemory: 0,
                totalTokens: 0,
                averageCpuTime: 0,
                cost: 0
            });
        }
        return this.resourceUsage.get(taskId)!;
    }

    /**
     * Check resource thresholds
     */
    private async checkThresholds(taskId: string): Promise<string[]> {
        const usage = this.resourceUsage.get(taskId);
        const thresholds = this.thresholds.get(taskId);
        const violations: string[] = [];

        if (!usage || !thresholds) return violations;

        if (usage.peakMemory > thresholds.memory) {
            violations.push(`Memory usage (${usage.peakMemory}) exceeds threshold (${thresholds.memory})`);
        }

        if (usage.totalTokens > thresholds.tokens) {
            violations.push(`Token usage (${usage.totalTokens}) exceeds threshold (${thresholds.tokens})`);
        }

        if (thresholds.cpuTime && usage.averageCpuTime > thresholds.cpuTime) {
            violations.push(`CPU time (${usage.averageCpuTime}) exceeds threshold (${thresholds.cpuTime})`);
        }

        if (thresholds.networkRequests && usage.networkRequests > thresholds.networkRequests) {
            violations.push(`Network requests (${usage.networkRequests}) exceeds threshold (${thresholds.networkRequests})`);
        }

        if (usage.cost > thresholds.cost) {
            violations.push(`Cost (${usage.cost}) exceeds threshold (${thresholds.cost})`);
        }

        return violations;
    }

    /**
     * Calculate resource statistics
     */
    private async calculateResourceStats(task: TaskType): Promise<TaskStats> {
        const stats = task.store ? calculateTaskStats(task, task.store.getState().workflowLogs) : {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            costDetails: DefaultFactory.createCostDetails(),
            iterationCount: 0,
            modelUsage: {}
        };

        return stats;
    }

    /**
     * Handle threshold violations
     */
    private async handleThresholdViolations(
        task: TaskType,
        violations: string[]
    ): Promise<HandlerResult> {
        await this.statusManager.transition({
            currentStatus: task.status,
            targetStatus: TASK_STATUS_enum.ERROR,
            entity: 'task',
            entityId: task.id,
            metadata: {
                violations,
                timestamp: Date.now()
            }
        });

        const log = task.store?.prepareNewLog({
            task,
            logDescription: `Resource thresholds violated: ${violations.join(', ')}`,
            metadata: {
                violations,
                usage: this.resourceUsage.get(task.id),
                timestamp: Date.now()
            },
            logType: 'TaskStatusUpdate',
            taskStatus: TASK_STATUS_enum.ERROR
        });

        if (log && task.store) {
            task.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        }

        return {
            success: false,
            error: new Error('Resource thresholds violated'),
            data: {
                violations,
                usage: this.resourceUsage.get(task.id)
            }
        };
    }

    /**
     * Handle tracking error
     */
    private handleTrackingError(task: TaskType, error: unknown): HandlerResult {
        this.logManager.error('Resource tracking error:', error);

        const log = task.store?.prepareNewLog({
            task,
            logDescription: `Resource tracking error: ${error instanceof Error ? error.message : String(error)}`,
            metadata: {
                error,
                usage: this.resourceUsage.get(task.id),
                timestamp: Date.now()
            },
            logType: 'TaskStatusUpdate',
            taskStatus: task.status
        });

        if (log && task.store) {
            task.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));
        }

        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            data: {
                taskId: task.id,
                usage: this.resourceUsage.get(task.id)
            }
        };
    }
}

export default ResourceManager.getInstance();