/**
 * @file resourceManager.ts
 * @path src/utils/managers/domain/task/resourceManager.ts
 * @description Task resource tracking and management implementation using CoreManager
 *
 * @module @managers/domain/task
 */

import CoreManager from '../../core/coreManager';
import type { TASK_STATUS_enum } from '@/utils/types/common/enums';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

import type { 
    TaskType,
    TaskResourceParams,
    TaskStats,
    HandlerResult
} from '@/utils/types/task';

import type {
    LLMUsageStats,
    Output,
    ParsedOutput
} from '@/utils/types/llm';

import type { CostDetails } from '@/utils/types/workflow';

export class ResourceManager extends CoreManager {
    private static instance: ResourceManager;
    private readonly activeResources: Map<string, {
        startTime: number;
        memory: number[];
        tokens: number[];
        networkRequests: number;
        llmUsageStats: LLMUsageStats;
        costDetails: CostDetails;
    }>;

    private constructor() {
        super();
        this.activeResources = new Map();
        this.registerDomainManager('ResourceManager', this);
    }

    public static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }

    // ─── Resource Tracking Methods ─────────────────────────────────────────────────

    public async trackResourceUsage(params: TaskResourceParams): Promise<HandlerResult> {
        const { task, resourceStats, thresholds } = params;

        return await this.safeExecute(async () => {
            // Get or initialize resource tracking
            const resources = this.getOrCreateResources(task.id);
            
            // Update resource metrics
            resources.memory.push(resourceStats.memory);
            resources.tokens.push(resourceStats.tokens);
            resources.networkRequests += resourceStats.networkRequests || 0;

            // Check thresholds if provided
            if (thresholds) {
                const violations = this.checkThresholds(task.id, thresholds);
                if (violations.length > 0) {
                    return await this.handleThresholdViolation(task, violations);
                }
            }

            // Log resource update
            const log = task.store?.prepareNewLog({
                task,
                logDescription: 'Resource usage updated',
                metadata: {
                    resourceStats,
                    resources,
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
                data: resources
            };

        }, 'Resource tracking failed');
    }

    // ─── Task Statistics Methods ──────────────────────────────────────────────────

    public async getTaskStats(task: TaskType): Promise<TaskStats> {
        return await this.safeExecute(async () => {
            const resources = this.activeResources.get(task.id);
            if (!resources) {
                return this.createDefaultTaskStats();
            }

            const endTime = Date.now();
            const duration = endTime - resources.startTime;

            return {
                startTime: resources.startTime,
                endTime,
                duration,
                llmUsageStats: resources.llmUsageStats,
                iterationCount: task.iterationCount || 0,
                modelUsage: {}  // Populated by LLM manager
            };

        }, 'Task stats calculation failed') || this.createDefaultTaskStats();
    }

    // ─── Resource Management Methods ───────────────────────────────────────────────

    public async cleanup(taskId: string): Promise<void> {
        return await this.safeExecute(async () => {
            const resources = this.activeResources.get(taskId);
            if (!resources) return;

            // Log final resource state
            this.logManager.debug('Resource cleanup', undefined, taskId, {
                finalMemory: Math.max(...resources.memory),
                totalTokens: resources.tokens.reduce((a, b) => a + b, 0),
                networkRequests: resources.networkRequests
            });

            this.activeResources.delete(taskId);

        }, 'Resource cleanup failed');
    }

    // ─── Protected Helper Methods ───────────────────────────────────────────────

    protected getOrCreateResources(taskId: string) {
        if (!this.activeResources.has(taskId)) {
            this.activeResources.set(taskId, {
                startTime: Date.now(),
                memory: [],
                tokens: [],
                networkRequests: 0,
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                costDetails: DefaultFactory.createCostDetails()
            });
        }
        return this.activeResources.get(taskId)!;
    }

    protected checkThresholds(
        taskId: string,
        thresholds: Record<string, number>
    ): string[] {
        const resources = this.activeResources.get(taskId);
        if (!resources) return [];

        const violations: string[] = [];
        const currentMemory = Math.max(...resources.memory);
        const totalTokens = resources.tokens.reduce((a, b) => a + b, 0);

        if (thresholds.maxMemory && currentMemory > thresholds.maxMemory) {
            violations.push(`Memory usage (${currentMemory}) exceeds threshold (${thresholds.maxMemory})`);
        }

        if (thresholds.maxTokens && totalTokens > thresholds.maxTokens) {
            violations.push(`Token usage (${totalTokens}) exceeds threshold (${thresholds.maxTokens})`);
        }

        if (thresholds.maxNetworkRequests && resources.networkRequests > thresholds.maxNetworkRequests) {
            violations.push(`Network requests (${resources.networkRequests}) exceeds threshold (${thresholds.maxNetworkRequests})`);
        }

        return violations;
    }

    protected async handleThresholdViolation(
        task: TaskType,
        violations: string[]
    ): Promise<HandlerResult> {
        await this.handleStatusTransition({
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
                resources: this.activeResources.get(task.id),
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
                resources: this.activeResources.get(task.id)
            }
        };
    }

    private createDefaultTaskStats(): TaskStats {
        return {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            iterationCount: 0,
            modelUsage: {}
        };
    }
}

export default ResourceManager.getInstance();0