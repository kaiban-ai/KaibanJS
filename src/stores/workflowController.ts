/**
 * @file workflowController.ts
 * @path KaibanJS/src/stores/workflowController.ts
 * @description Workflow lifecycle and execution controller managing task queues and error handling
 */

import PQueue, { Options as PQueueOptions } from 'p-queue';
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';
import { errorHandler } from '@/utils/handlers/errorHandler';
import { storeHandler } from '@/utils/handlers/storeHandler';
import { calculateTaskStats } from '@/utils/helpers/stats';
import { StatusManager } from '@/utils/managers/statusManager';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '@/utils/types/common/enums';

import type {
  WorkflowState,
  WorkflowRuntimeState,
  WorkflowProgress,
  WorkflowExecutionStats,
  WorkflowActionParams,
  WorkflowActionResult,
  WorkflowStoreConfig,
  WorkflowExecutionContext,
} from '@/utils/types/workflow/store';

import type {
  TaskType,
  TeamStore,
  TaskExecutionParams,
} from '@/utils/types';

import type { ErrorType } from '@/utils/types/common/errors';

// Default configuration values with strong typing
const DEFAULT_CONFIG: Required<WorkflowStoreConfig> = {
  name: 'WorkflowController',
  logLevel: 'info',
  devMode: false,
  maxConcurrentTasks: 1,
  taskTimeout: 300000, // 5 minutes
  progressCheckInterval: 60000, // 1 minute
  maxTaskRetries: 3,
  retryDelay: 5000, // 5 seconds
  middleware: {
    devtools: true,
    subscribeWithSelector: true,
    persistence: false,
  },
  costLimits: {
    warning: 1.0,
    critical: 5.0,
  },
};

// Default queue options with strong typing
const DEFAULT_QUEUE_OPTIONS: Required<PQueueOptions<unknown, unknown>> = {
  concurrency: 1,
  autoStart: true,
  intervalCap: 1,
  interval: 0,
  carryoverConcurrencyCount: true,
};

/**
 * Workflow Controller Implementation
 */
export class WorkflowController {
  private store: TeamStore;
  private config: Required<WorkflowStoreConfig>;
  private taskQueue: PQueue<unknown, unknown>;
  private statusManager: StatusManager;
  private isActive: boolean = true;
  private lastTaskUpdateTime: number;
  private timeoutTimer?: NodeJS.Timeout;
  private progressCheckTimer?: NodeJS.Timeout;
  private executionContext: Map<string, WorkflowExecutionContext> = new Map();

  constructor(store: TeamStore, userConfig: Partial<WorkflowStoreConfig> = {}) {
    this.store = store;
    this.config = { ...DEFAULT_CONFIG, ...userConfig };
    this.lastTaskUpdateTime = Date.now();
    this.statusManager = StatusManager.getInstance();

    this.taskQueue = new PQueue({
      ...DEFAULT_QUEUE_OPTIONS,
      concurrency: this.config.maxConcurrentTasks,
    });

    this.setupEventHandlers();
    logger.info('Workflow controller initialized');
  }

  /**
   * Setup workflow event handlers
   */
  private setupEventHandlers(): void {
    // Subscribe to task status changes
    this.store.subscribe(
      (state) => state.tasks,
      (tasks) => {
        if (!this.isActive) return;

        const doingTasks = tasks.filter(
          (task) => task.status === TASK_STATUS_enum.DOING
        );

        doingTasks.forEach((task) => {
          this.taskQueue.add(async () => {
            try {
              await this.processTask(task);
            } catch (error) {
              await this.handleTaskError(task, error);
            }
          });
        });
      }
    );

    // Subscribe to workflow status changes
    this.store.subscribe(
      (state) => state.teamWorkflowStatus,
      (status) => {
        if (
          status === WORKFLOW_STATUS_enum.FINISHED ||
          status === WORKFLOW_STATUS_enum.ERRORED
        ) {
          this.cleanup();
        }
      }
    );

    // Setup queue event handling
    this.setupQueueEvents();
  }

  /**
   * Setup queue event handlers
   */
  private setupQueueEvents(): void {
    this.taskQueue
      .on('active', () => {
        logger.debug('Task queue active:', {
          pending: this.taskQueue.pending,
          size: this.taskQueue.size,
        });
      })
      .on('idle', () => {
        logger.debug('Task queue idle');
        this.checkWorkflowCompletion();
      })
      .on('error', async (error) => {
        logger.error('Task queue error:', error);
        await errorHandler.handleError({
          error: error instanceof Error ? error : new Error(String(error)),
          context: { component: 'WorkflowController', queue: 'taskQueue' },
          store: {
            getState: () => this.store.getState(),
            setState: (fn) => this.store.setState(fn),
            prepareNewLog: this.store.prepareNewLog,
          },
        });
      });
  }

  /**
   * Process a task with error handling and retries
   */
  private async processTask(task: TaskType): Promise<void> {
    if (!this.isActive) return;

    const context = this.getExecutionContext(task.id);
    const startTime = Date.now();

    try {
      logger.debug(`Processing task: ${task.title}`);

      if (!task.agent) {
        throw new PrettyError({
          message: 'Cannot process task without an assigned agent',
          context: { taskId: task.id, taskTitle: task.title },
        });
      }

      // Process task with timeout
      await Promise.race([
        this.store.workOnTask(task.agent, task),
        new Promise((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Task timeout after ${this.config.taskTimeout}ms`
                )
              ),
            this.config.taskTimeout
          );
        }),
      ]);

      this.lastTaskUpdateTime = Date.now();
      context.lastSuccessTime = Date.now();
      context.consecutiveFailures = 0;
    } catch (error) {
      await this.handleExecutionError(task, error, context);
    } finally {
      this.updateExecutionStats(task, context, startTime);
    }
  }

  /**
   * Handle task execution error with retries
   */
  private async handleExecutionError(
    task: TaskType,
    error: unknown,
    context: WorkflowExecutionContext
  ): Promise<void> {
    context.consecutiveFailures = (context.consecutiveFailures || 0) + 1;
    context.lastErrorTime = Date.now();
    context.lastError =
      error instanceof Error ? error : new Error(String(error));

    if (context.consecutiveFailures <= this.config.maxTaskRetries) {
      logger.warn(
        `Retrying task ${task.id}, attempt ${context.consecutiveFailures}`
      );
      await this.handleRetry(task, context);
    } else {
      await this.handleTaskError(task, context.lastError);
    }
  }

  /**
   * Handle task retry logic
   */
  private async handleRetry(
    task: TaskType,
    context: WorkflowExecutionContext
  ): Promise<void> {
    const delay =
      this.config.retryDelay * Math.pow(2, context.consecutiveFailures - 1);

    await storeHandler.handleTaskStateUpdate(this.store, task.id, {
      status: TASK_STATUS_enum.DOING,
      retryCount: context.consecutiveFailures,
      nextRetryTime: Date.now() + delay,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.processTask(task);
  }

  /**
   * Handle task error
   */
  private async handleTaskError(
    task: TaskType,
    error: unknown
  ): Promise<void> {
    const prettyError =
      error instanceof PrettyError
        ? error
        : new PrettyError({
            message: error instanceof Error ? error.message : String(error),
            context: { taskId: task.id, taskTitle: task.title },
            rootError: error instanceof Error ? error : undefined,
          });

    await errorHandler.handleError({
      error: prettyError,
      context: {
        taskId: task.id,
        executionStats: this.getExecutionContext(task.id),
      },
      store: {
        getState: () => this.store.getState(),
        setState: (fn) => this.store.setState(fn),
        prepareNewLog: this.store.prepareNewLog,
      },
    });
  }

  /**
   * Check if workflow is complete
   */
  private checkWorkflowCompletion(): void {
    if (this.taskQueue.size === 0 && this.taskQueue.pending === 0) {
      const allTasks = this.store.getState().tasks;
      const isComplete = allTasks.every(
        (task) =>
          task.status === TASK_STATUS_enum.DONE ||
          task.status === TASK_STATUS_enum.VALIDATED
      );

      if (isComplete) {
        this.store.handleWorkflowStatusChange(WORKFLOW_STATUS_enum.FINISHED);
      }
    }
  }

  /**
   * Resource management methods
   */
  public start(): void {
    this.isActive = true;
    this.lastTaskUpdateTime = Date.now();
    this.startTimeoutMonitor();
    this.taskQueue.start();
    logger.info('Workflow controller started');
  }

  public pause(): void {
    this.isActive = false;
    this.taskQueue.pause();
    logger.info('Workflow controller paused');
  }

  public resume(): void {
    this.isActive = true;
    this.taskQueue.start();
    logger.info('Workflow controller resumed');
  }

  public cleanup(): void {
    if (!this.isActive) return;

    logger.debug('Cleaning up workflow controller');

    this.isActive = false;
    this.taskQueue.clear();
    this.executionContext.clear();

    if (this.timeoutTimer) {
      clearInterval(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }

    if (this.progressCheckTimer) {
      clearInterval(this.progressCheckTimer);
      this.progressCheckTimer = undefined;
    }

    logger.debug('Workflow controller cleanup completed');
  }

  /**
   * Private utility methods
   */
  private getExecutionContext(taskId: string): WorkflowExecutionContext {
    if (!this.executionContext.has(taskId)) {
      this.executionContext.set(taskId, {
        totalExecutions: 0,
        consecutiveFailures: 0,
        totalDuration: 0,
        startTime: Date.now(),
      });
    }
    return this.executionContext.get(taskId)!;
  }

  private startTimeoutMonitor(): void {
    this.timeoutTimer = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceUpdate = currentTime - this.lastTaskUpdateTime;

      if (timeSinceUpdate > this.config.taskTimeout) {
        const runningTasks = this.store
          .getState()
          .tasks.filter(
            (task) => task.status === TASK_STATUS_enum.DOING
          );

        runningTasks.forEach((task) => {
          const error = new PrettyError({
            message: 'Task exceeded timeout duration',
            context: {
              taskId: task.id,
              timeout: this.config.taskTimeout,
              timeSinceUpdate,
            },
          });

          this.handleTaskError(task, error);
        });
      }
    }, this.config.progressCheckInterval);
  }

  private updateExecutionStats(
    task: TaskType,
    context: WorkflowExecutionContext,
    startTime: number
  ): void {
    const duration = Date.now() - startTime;
    context.totalExecutions = (context.totalExecutions || 0) + 1;
    context.totalDuration = (context.totalDuration || 0) + duration;

    const stats = calculateTaskStats(task, this.store.getState().workflowLogs);
    storeHandler.handleTaskStateUpdate(this.store, task.id, {
      ...stats,
      lastUpdateTime: Date.now(),
    });
  }
}

/**
 * Create and setup the workflow controller
 */
export const setupWorkflowController = (
  store: TeamStore,
  config?: WorkflowStoreConfig
): (() => void) => {
  const controller = new WorkflowController(store, config);
  controller.start();

  // Setup cleanup handlers
  process.on('SIGTERM', () => controller.cleanup());
  process.on('SIGINT', () => controller.cleanup());

  return () => controller.cleanup();
};
