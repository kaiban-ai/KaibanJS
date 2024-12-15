/**
 * @file workflowSyncManager.ts
 * @description Workflow synchronization and routing manager
 */

import { CoreManager } from '../../core/coreManager';
import { createError, ERROR_KINDS } from '../../../types/common/commonErrorTypes';
import {
    IWorkflowLock,
    IWorkflowSyncMetrics,
    IRoutingCondition,
    IRoutingRule,
    IRoutingPath,
    IRoutingResult,
    IWorkflowSyncOptions,
    IWorkflowSyncState
} from '../../../types/workflow/workflowSyncTypes';
import { ChainValues } from '@langchain/core/utils/types';

/**
 * Workflow synchronization and routing manager
 */
export class WorkflowSyncManager extends CoreManager {
    private static instance: WorkflowSyncManager | null = null;
    private readonly activeLocks: Map<string, IWorkflowLock>;
    private readonly pendingLocks: Map<string, IWorkflowLock[]>;
    private readonly routingRules: Map<string, IRoutingRule[]>;
    private readonly routingPaths: Map<string, IRoutingPath[]>;
    private readonly syncMetrics: Map<string, IWorkflowSyncMetrics>;
    private readonly routingHistory: Map<string, IRoutingResult[]>;

    private constructor() {
        super();
        this.activeLocks = new Map();
        this.pendingLocks = new Map();
        this.routingRules = new Map();
        this.routingPaths = new Map();
        this.syncMetrics = new Map();
        this.routingHistory = new Map();
        this.registerDomainManager('WorkflowSyncManager', this);
    }

    public static getInstance(): WorkflowSyncManager {
        if (!WorkflowSyncManager.instance) {
            WorkflowSyncManager.instance = new WorkflowSyncManager();
        }
        return WorkflowSyncManager.instance;
    }

    /**
     * Acquire a lock for workflow synchronization
     */
    public async acquireLock(
        workflowId: string,
        resourceId: string,
        type: 'exclusive' | 'shared',
        options: IWorkflowSyncOptions
    ): Promise<IWorkflowLock> {
        const startTime = Date.now();
        let retries = 0;

        while (retries < options.maxRetries) {
            const existingLock = this.activeLocks.get(resourceId);
            
            if (!existingLock || (existingLock.expiresAt <= Date.now())) {
                // Create new lock
                const lock: IWorkflowLock = {
                    id: `${workflowId}_${resourceId}_${Date.now()}`,
                    workflowId,
                    resourceId,
                    acquiredAt: Date.now(),
                    expiresAt: Date.now() + options.lockTimeout,
                    type
                };

                this.activeLocks.set(resourceId, lock);
                await this.updateSyncMetrics(resourceId, startTime);
                return lock;
            }

            // Add to pending locks
            if (!this.pendingLocks.has(resourceId)) {
                this.pendingLocks.set(resourceId, []);
            }
            const pendingLock: IWorkflowLock = {
                id: `${workflowId}_${resourceId}_${Date.now()}_pending`,
                workflowId,
                resourceId,
                acquiredAt: Date.now(),
                expiresAt: Date.now() + options.lockTimeout,
                type
            };
            this.pendingLocks.get(resourceId)!.push(pendingLock);

            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, options.retryDelay));
            retries++;
        }

        throw createError({
            message: `Failed to acquire lock for resource ${resourceId} after ${retries} retries`,
            type: ERROR_KINDS.LockError,
            context: {
                component: this.constructor.name,
                operation: 'acquireLock',
                workflowId,
                resourceId
            }
        });
    }

    /**
     * Release a lock
     */
    public async releaseLock(lock: IWorkflowLock): Promise<void> {
        if (this.activeLocks.get(lock.resourceId)?.id === lock.id) {
            this.activeLocks.delete(lock.resourceId);

            // Process pending locks
            const pending = this.pendingLocks.get(lock.resourceId) || [];
            if (pending.length > 0) {
                const nextLock = pending.shift();
                if (nextLock) {
                    this.activeLocks.set(lock.resourceId, {
                        ...nextLock,
                        acquiredAt: Date.now(),
                        expiresAt: Date.now() + (nextLock.expiresAt - nextLock.acquiredAt)
                    });
                }
                this.pendingLocks.set(lock.resourceId, pending);
            }
        }
    }

    /**
     * Add routing rule
     */
    public addRoutingRule(workflowId: string, rule: IRoutingRule): void {
        if (!this.routingRules.has(workflowId)) {
            this.routingRules.set(workflowId, []);
        }
        this.routingRules.get(workflowId)!.push(rule);
    }

    /**
     * Add routing path
     */
    public addRoutingPath(workflowId: string, path: IRoutingPath): void {
        if (!this.routingPaths.has(workflowId)) {
            this.routingPaths.set(workflowId, []);
        }
        this.routingPaths.get(workflowId)!.push(path);
    }

    /**
     * Evaluate routing conditions
     */
    public evaluateConditions(
        conditions: IRoutingCondition[],
        stepResult: ChainValues,
        context: Record<string, any>
    ): boolean {
        return conditions.every(condition => {
            const value = condition.field ? 
                stepResult[condition.field] : 
                context[condition.field || ''];

            switch (condition.operator) {
                case 'eq':
                    return value === condition.value;
                case 'neq':
                    return value !== condition.value;
                case 'gt':
                    return value > condition.value;
                case 'lt':
                    return value < condition.value;
                case 'gte':
                    return value >= condition.value;
                case 'lte':
                    return value <= condition.value;
                case 'contains':
                    return value?.includes(condition.value);
                case 'matches':
                    return new RegExp(condition.value).test(value);
                default:
                    return false;
            }
        });
    }

    /**
     * Get next step based on routing rules
     */
    public getNextStep(
        workflowId: string,
        currentStepId: string,
        stepResult: ChainValues,
        context: Record<string, any>
    ): string | null {
        const paths = this.routingPaths.get(workflowId) || [];
        const rules = this.routingRules.get(workflowId) || [];

        // Find applicable paths
        const applicablePaths = paths.filter(path => 
            path.sourceStepId === currentStepId
        );

        // Evaluate rules for each path
        for (const path of applicablePaths) {
            const pathRules = path.rules.sort((a, b) => b.priority - a.priority);
            for (const rule of pathRules) {
                if (this.evaluateConditions(rule.conditions, stepResult, context)) {
                    // Record routing result
                    const result: IRoutingResult = {
                        pathId: path.id,
                        sourceStepId: currentStepId,
                        targetStepId: rule.targetStepId,
                        matchedRules: [rule.id],
                        timestamp: Date.now(),
                        metadata: {
                            type: path.type,
                            priority: rule.priority
                        }
                    };
                    this.addRoutingHistory(workflowId, result);
                    return rule.targetStepId;
                }
            }
        }

        return null;
    }

    /**
     * Get workflow sync state
     */
    public getSyncState(workflowId: string): IWorkflowSyncState {
        return {
            activeLocks: Array.from(this.activeLocks.values())
                .filter(lock => lock.workflowId === workflowId),
            pendingLocks: Array.from(this.pendingLocks.values())
                .flat()
                .filter(lock => lock.workflowId === workflowId),
            metrics: this.syncMetrics.get(workflowId) || {
                lockContentionCount: 0,
                averageWaitTime: 0,
                maxWaitTime: 0,
                resourceUtilization: {},
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    /**
     * Get routing history
     */
    public getRoutingHistory(workflowId: string): IRoutingResult[] {
        return this.routingHistory.get(workflowId) || [];
    }

    private async updateSyncMetrics(resourceId: string, startTime: number): Promise<void> {
        const waitTime = Date.now() - startTime;
        const pending = this.pendingLocks.get(resourceId)?.length || 0;

        for (const [workflowId, metrics] of this.syncMetrics) {
            const updatedMetrics: IWorkflowSyncMetrics = {
                lockContentionCount: metrics.lockContentionCount + (pending > 0 ? 1 : 0),
                averageWaitTime: (metrics.averageWaitTime + waitTime) / 2,
                maxWaitTime: Math.max(metrics.maxWaitTime, waitTime),
                resourceUtilization: {
                    ...metrics.resourceUtilization,
                    [resourceId]: pending > 0 ? 1 : 0
                },
                timestamp: Date.now()
            };
            this.syncMetrics.set(workflowId, updatedMetrics);
        }
    }

    private addRoutingHistory(workflowId: string, result: IRoutingResult): void {
        if (!this.routingHistory.has(workflowId)) {
            this.routingHistory.set(workflowId, []);
        }
        this.routingHistory.get(workflowId)!.push(result);
    }
}

export default WorkflowSyncManager.getInstance();
