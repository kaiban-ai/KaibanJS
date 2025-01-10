/**
 * @file taskStateManager.ts
 * @path src/managers/domain/task/taskStateManager.ts
 * @description Task state management and recovery implementation
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import { LogManager } from '../../core/logManager';

interface ITaskStateSnapshot {
    timestamp: number;
    activeTasks: Map<string, ITaskType>;
    version: string;
}

export class TaskStateManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.STATE;
    private static instance: TaskStateManager;
    private readonly stateVersion = '1.0.0';
    private snapshots: ITaskStateSnapshot[] = [];
    private readonly maxSnapshots = 10;
    private readonly logManager: LogManager;

    private constructor() {
        super();
        this.registerDomainManager('TaskStateManager', this);
        this.logManager = LogManager.getInstance();
    }

    public static getInstance(): TaskStateManager {
        if (!TaskStateManager.instance) {
            TaskStateManager.instance = new TaskStateManager();
        }
        return TaskStateManager.instance;
    }

    public createSnapshot(activeTasks: Map<string, ITaskType>): ITaskStateSnapshot {
        const snapshot: ITaskStateSnapshot = {
            timestamp: Date.now(),
            activeTasks: new Map(activeTasks),
            version: this.stateVersion
        };

        this.snapshots.push(snapshot);
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }

        this.logManager.logEvent(
            'TaskStateManager',
            `State snapshot created - timestamp: ${snapshot.timestamp}, tasks: ${snapshot.activeTasks.size}, version: ${snapshot.version}`,
            'debug',
            'createSnapshot'
        );
        return snapshot;
    }

    public async restoreSnapshot(snapshot: ITaskStateSnapshot): Promise<void> {
        try {
            await this.validateSnapshot(snapshot);
            
            const metric: IMetricEvent = {
                timestamp: Date.now(),
                domain: METRIC_DOMAIN_enum.TASK,
                type: METRIC_TYPE_enum.STATE_TRANSITION,
                value: snapshot.activeTasks.size,
                metadata: {
                    operation: 'restoreSnapshot',
                    snapshotTimestamp: snapshot.timestamp,
                    version: snapshot.version
                }
            };

            await this.metricsManager.trackMetric(metric);

            this.logManager.logEvent(
                'TaskStateManager',
                `State snapshot restored - timestamp: ${snapshot.timestamp}, tasks: ${snapshot.activeTasks.size}, version: ${snapshot.version}`,
                'info',
                'restoreSnapshot'
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logManager.logEvent(
                'TaskStateManager',
                `Failed to restore state snapshot: ${errorMessage}`,
                'error',
                'restoreSnapshot',
                { error: error as Error }
            );
            throw new Error('State restoration failed');
        }
    }

    private async validateSnapshot(snapshot: ITaskStateSnapshot): Promise<void> {
        if (!snapshot || !snapshot.timestamp || !snapshot.activeTasks || !snapshot.version) {
            throw new Error('Invalid snapshot format');
        }

        if (snapshot.version !== this.stateVersion) {
            throw new Error('Incompatible snapshot version');
        }

        // Validate each task in the snapshot
        for (const [taskId, task] of snapshot.activeTasks) {
            if (!this.validateTask(task)) {
                throw new Error(`Invalid task state in snapshot: ${taskId}`);
            }
        }
    }

    private validateTask(task: ITaskType): boolean {
        return (
            typeof task.id === 'string' &&
            typeof task.title === 'string' &&
            typeof task.status === 'string'
        );
    }

    public getLatestSnapshot(): ITaskStateSnapshot | undefined {
        return this.snapshots[this.snapshots.length - 1];
    }

    public cleanup(): void {
        this.snapshots = [];
        this.logManager.logEvent(
            'TaskStateManager',
            'State manager cleaned up - snapshots cleared',
            'debug',
            'cleanup'
        );
    }
}

export default TaskStateManager.getInstance();
