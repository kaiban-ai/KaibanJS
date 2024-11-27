/**
 * @file taskStateManager.ts
 * @path src/managers/domain/task/taskStateManager.ts
 * @description Task state management and recovery implementation
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { TASK_STATUS_enum } from '../../../types/common/commonEnums';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

import type { ITaskType } from '../../../types/task/taskBaseTypes';

interface ITaskStateSnapshot {
    timestamp: number;
    activeTasks: Map<string, ITaskType>;
    metrics: Record<string, unknown>;
    version: string;
}

export class TaskStateManager extends CoreManager {
    private static instance: TaskStateManager;
    private readonly stateVersion = '1.0.0';
    private snapshots: ITaskStateSnapshot[] = [];
    private readonly maxSnapshots = 10;

    private constructor() {
        super();
        this.registerDomainManager('TaskStateManager', this);
    }

    public static getInstance(): TaskStateManager {
        if (!TaskStateManager.instance) {
            TaskStateManager.instance = new TaskStateManager();
        }
        return TaskStateManager.instance;
    }

    public createSnapshot(activeTasks: Map<string, ITaskType>, metrics: Record<string, unknown>): ITaskStateSnapshot {
        const snapshot: ITaskStateSnapshot = {
            timestamp: Date.now(),
            activeTasks: new Map(activeTasks),
            metrics: { ...metrics },
            version: this.stateVersion
        };

        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }

        this.logDebug(
            `State snapshot created - timestamp: ${snapshot.timestamp}, tasks: ${snapshot.activeTasks.size}, version: ${snapshot.version}`
        );
        return snapshot;
    }

    public async restoreSnapshot(snapshot: ITaskStateSnapshot): Promise<void> {
        try {
            await this.validateSnapshot(snapshot);
            
            // Track restoration metrics
            await this.getMetricsManager().trackMetric({
                domain: MetricDomain.TASK,
                type: MetricType.PERFORMANCE,
                value: JSON.stringify({
                    operation: 'restoreSnapshot',
                    timestamp: snapshot.timestamp,
                    taskCount: snapshot.activeTasks.size
                }),
                timestamp: Date.now(),
                metadata: { operation: 'stateRestore' }
            });

            this.logInfo(
                `State snapshot restored - timestamp: ${snapshot.timestamp}, tasks: ${snapshot.activeTasks.size}, version: ${snapshot.version}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logError(`Failed to restore state snapshot: ${errorMessage}`);
            throw createError({
                message: 'State restoration failed',
                type: 'StateError',
                cause: error as Error
            });
        }
    }

    private async validateSnapshot(snapshot: ITaskStateSnapshot): Promise<void> {
        if (!snapshot || !snapshot.timestamp || !snapshot.activeTasks || !snapshot.version) {
            throw createError({
                message: 'Invalid snapshot format',
                type: 'ValidationError'
            });
        }

        if (snapshot.version !== this.stateVersion) {
            throw createError({
                message: 'Incompatible snapshot version',
                type: 'ValidationError'
            });
        }

        // Validate each task in the snapshot
        for (const [taskId, task] of snapshot.activeTasks) {
            if (!this.validateTask(task)) {
                throw createError({
                    message: `Invalid task state in snapshot: ${taskId}`,
                    type: 'ValidationError'
                });
            }
        }
    }

    private validateTask(task: ITaskType): boolean {
        return (
            typeof task.id === 'string' &&
            typeof task.title === 'string' &&
            task.status in TASK_STATUS_enum &&
            typeof task.metrics === 'object'
        );
    }

    public getLatestSnapshot(): ITaskStateSnapshot | undefined {
        return this.snapshots[this.snapshots.length - 1];
    }

    public cleanup(): void {
        this.snapshots = [];
        this.logDebug('State manager cleaned up - snapshots cleared');
    }
}

export default TaskStateManager.getInstance();
