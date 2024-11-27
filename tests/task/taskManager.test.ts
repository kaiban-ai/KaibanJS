/**
 * @file taskManager.test.ts
 * @description Test suite for TaskManager implementation
 */

import { TaskManager } from '../../src/managers/domain/task/taskManager';
import { TaskStateManager } from '../../src/managers/domain/task/taskStateManager';
import { TASK_STATUS_enum } from '../../src/types/common/commonEnums';
import type { ITaskType } from '../../src/types/task/taskBaseTypes';

describe('TaskManager', () => {
    let taskManager: TaskManager;
    let stateManager: TaskStateManager;

    beforeEach(() => {
        taskManager = TaskManager.getInstance();
        stateManager = TaskStateManager.getInstance();
    });

    afterEach(() => {
        taskManager.cleanup();
        stateManager.cleanup();
    });

    describe('Task Lifecycle', () => {
        test('should execute task successfully', async () => {
            const mockTask: ITaskType = {
                id: 'test-task-1',
                title: 'Test Task',
                status: TASK_STATUS_enum.PENDING,
                metrics: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    iterationCount: 0,
                    resources: {},
                    performance: {},
                    costs: {},
                    llmUsage: {}
                }
            };

            const result = await taskManager.executeTask({
                task: mockTask,
                input: {}
            });

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        test('should handle task failure', async () => {
            const mockTask: ITaskType = {
                id: 'test-task-2',
                title: 'Failed Task',
                status: TASK_STATUS_enum.PENDING,
                metrics: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    iterationCount: 0,
                    resources: {},
                    performance: {},
                    costs: {},
                    llmUsage: {}
                }
            };

            await expect(taskManager.executeTask({
                task: mockTask,
                input: { shouldFail: true }
            })).rejects.toThrow();

            const failedTask = taskManager.getTask(mockTask.id);
            expect(failedTask?.status).toBe(TASK_STATUS_enum.ERROR);
        });

        test('should handle task timeout', async () => {
            const mockTask: ITaskType = {
                id: 'test-task-3',
                title: 'Timeout Task',
                status: TASK_STATUS_enum.PENDING,
                metrics: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    iterationCount: 0,
                    resources: {},
                    performance: {},
                    costs: {},
                    llmUsage: {}
                }
            };

            await expect(taskManager.executeTask({
                task: mockTask,
                input: {},
                options: { timeout: 100 }
            })).rejects.toThrow();

            const timedOutTask = taskManager.getTask(mockTask.id);
            expect(timedOutTask?.status).toBe(TASK_STATUS_enum.ERROR);
        });
    });

    describe('State Management', () => {
        test('should maintain active tasks', () => {
            const mockTask: ITaskType = {
                id: 'test-task-4',
                title: 'Active Task',
                status: TASK_STATUS_enum.PENDING,
                metrics: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    iterationCount: 0,
                    resources: {},
                    performance: {},
                    costs: {},
                    llmUsage: {}
                }
            };

            taskManager.executeTask({ task: mockTask, input: {} });
            expect(taskManager.getActiveTaskCount()).toBe(1);
            expect(taskManager.getTask(mockTask.id)).toBeDefined();
        });

        test('should cleanup tasks properly', async () => {
            const mockTask: ITaskType = {
                id: 'test-task-5',
                title: 'Cleanup Task',
                status: TASK_STATUS_enum.PENDING,
                metrics: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    iterationCount: 0,
                    resources: {},
                    performance: {},
                    costs: {},
                    llmUsage: {}
                }
            };

            await taskManager.executeTask({ task: mockTask, input: {} });
            expect(taskManager.getTask(mockTask.id)).toBeUndefined();
            expect(taskManager.getActiveTaskCount()).toBe(0);
        });
    });

    describe('Performance', () => {
        test('should handle multiple concurrent tasks', async () => {
            const tasks = Array.from({ length: 10 }, (_, i) => ({
                id: `test-task-${i}`,
                title: `Concurrent Task ${i}`,
                status: TASK_STATUS_enum.PENDING,
                metrics: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    iterationCount: 0,
                    resources: {},
                    performance: {},
                    costs: {},
                    llmUsage: {}
                }
            }));

            const results = await Promise.all(
                tasks.map(task => taskManager.executeTask({ task, input: {} }))
            );

            expect(results).toHaveLength(10);
            expect(results.every(r => r.success)).toBe(true);
        });

        test('should maintain performance under load', async () => {
            const startTime = Date.now();
            const tasks = Array.from({ length: 100 }, (_, i) => ({
                id: `test-task-perf-${i}`,
                title: `Performance Task ${i}`,
                status: TASK_STATUS_enum.PENDING,
                metrics: {
                    startTime: Date.now(),
                    endTime: 0,
                    duration: 0,
                    iterationCount: 0,
                    resources: {},
                    performance: {},
                    costs: {},
                    llmUsage: {}
                }
            }));

            await Promise.all(
                tasks.map(task => taskManager.executeTask({ task, input: {} }))
            );

            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });
});
