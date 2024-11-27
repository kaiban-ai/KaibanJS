/**
 * @file taskExecutor.ts
 * @path src/managers/domain/task/taskExecutor.ts
 * @description Task execution and lifecycle management
 *
 * @module @managers/domain/task
 */

import { CoreManager } from '../../core/coreManager';
import { createError } from '../../../types/common/commonErrorTypes';
import { TASK_STATUS_enum } from '../../../types/common/commonEnums';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { TaskEventEmitter } from './taskEventEmitter';

import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { 
    ITaskHandlerResult,
    ITaskHandlerMetadata 
} from '../../../types/task/taskHandlerTypes';
import type { IStatusTransitionContext } from '../../../types/common/commonStatusTypes';

// ─── Executor Implementation ───────────────────────────────────────────────────

export class TaskExecutor extends CoreManager {
    private readonly eventEmitter: TaskEventEmitter;

    constructor() {
        super();
        this.eventEmitter = TaskEventEmitter.getInstance();
    }

    public async executeTask(
        task: ITaskType, 
        input: unknown
    ): Promise<ITaskHandlerResult<unknown>> {
        try {
            task.metrics.startTime = Date.now();
            const previousStatus = task.status;
            task.status = TASK_STATUS_enum.DOING;

            // Emit status change event
            await this.eventEmitter.emitTaskStatusChanged({
                taskId: task.id,
                previousStatus,
                newStatus: TASK_STATUS_enum.DOING,
                reason: 'Task execution started'
            });

            const result = await task.execute(input);
            
            task.metrics.endTime = Date.now();
            task.metrics.duration = task.metrics.endTime - task.metrics.startTime;
            task.result = result;
            
            const newStatus = task.externalValidationRequired ? 
                TASK_STATUS_enum.AWAITING_VALIDATION : 
                TASK_STATUS_enum.DONE;

            // Emit status change event
            await this.eventEmitter.emitTaskStatusChanged({
                taskId: task.id,
                previousStatus: task.status,
                newStatus,
                reason: task.externalValidationRequired ? 
                    'Task completed, awaiting validation' : 
                    'Task completed successfully'
            });

            task.status = newStatus;

            const metadata: ITaskHandlerMetadata = {
                ...createBaseMetadata('task', 'execute'),
                taskId: task.id,
                taskName: task.title,
                status: task.status,
                priority: 0,
                assignedAgent: task.agent.id,
                progress: task.progress?.progress || 0,
                metrics: {
                    resources: task.metrics.resources,
                    usage: {
                        totalRequests: task.metrics.iterationCount,
                        activeUsers: 1,
                        requestsPerSecond: 1000 / task.metrics.duration,
                        averageResponseSize: task.metrics.llmUsage.inputTokens + task.metrics.llmUsage.outputTokens,
                        peakMemoryUsage: process.memoryUsage().heapUsed,
                        uptime: process.uptime(),
                        rateLimit: {
                            current: 1,
                            limit: 100,
                            remaining: 99,
                            resetTime: Date.now() + 3600000
                        },
                        timestamp: Date.now()
                    },
                    performance: task.metrics.performance
                },
                dependencies: {
                    completed: [],
                    pending: [],
                    blocked: []
                }
            };

            // Emit task completed event
            await this.eventEmitter.emitTaskCompleted({
                taskId: task.id,
                result,
                duration: task.metrics.duration
            });

            // Emit metrics updated event
            await this.eventEmitter.emitTaskMetricsUpdated({
                taskId: task.id,
                previousMetrics: {
                    ...task.metrics,
                    startTime: task.metrics.startTime,
                    endTime: task.metrics.startTime,
                    duration: 0
                },
                newMetrics: task.metrics
            });

            return {
                success: true,
                data: result.data,
                metadata
            };

        } catch (error) {
            const taskError = createError({
                message: error instanceof Error ? error.message : String(error),
                type: 'TaskError',
                context: { taskId: task.id }
            });

            // Emit error occurred event
            await this.eventEmitter.emitTaskErrorOccurred({
                taskId: task.id,
                error: taskError,
                context: {
                    operation: 'executeTask',
                    state: {
                        id: task.id,
                        status: task.status,
                        metrics: task.metrics
                    }
                }
            });

            const previousStatus = task.status;
            task.error = taskError;
            task.status = TASK_STATUS_enum.ERROR;
            task.metrics.endTime = Date.now();
            task.metrics.duration = task.metrics.endTime - task.metrics.startTime;

            // Emit status change event
            await this.eventEmitter.emitTaskStatusChanged({
                taskId: task.id,
                previousStatus,
                newStatus: TASK_STATUS_enum.ERROR,
                reason: taskError.message
            });

            // Emit task failed event
            await this.eventEmitter.emitTaskFailed({
                taskId: task.id,
                error: taskError,
                context: {
                    operation: 'executeTask',
                    state: {
                        id: task.id,
                        status: TASK_STATUS_enum.ERROR,
                        metrics: task.metrics
                    }
                }
            });

            throw taskError;
        }
    }
}
