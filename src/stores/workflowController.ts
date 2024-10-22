import PQueue from 'p-queue';
import { logger } from '../utils/logger';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../utils/enums';
import { TaskType, TeamStore, ErrorType } from '../../types/types';
import { PrettyError } from '../utils/errors';

/**
 * Configuration interface for the workflow controller
 */
interface WorkflowControllerConfig {
    concurrency?: number;
    taskTimeout?: number;
    progressCheckInterval?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<WorkflowControllerConfig> = {
    concurrency: 1,
    taskTimeout: 300000, // 5 minutes
    progressCheckInterval: 60000 // 1 minute
};

export const setupWorkflowController = (
    teamStore: TeamStore,
    userConfig: WorkflowControllerConfig = {}
): () => void => {
    // Merge user config with defaults
    const config: Required<WorkflowControllerConfig> = {
        ...DEFAULT_CONFIG,
        ...userConfig
    };

    // Initialize task queue with configured concurrency
    const taskQueue = new PQueue({
        concurrency: config.concurrency
    });

    // Controller state
    const state = {
        isActive: true,
        lastTaskUpdateTime: Date.now(),
        timeoutTimerId: undefined as NodeJS.Timeout | undefined,
        progressCheckTimerId: undefined as NodeJS.Timeout | undefined
    };

    // Task processing function with error handling
    const processTask = async (task: TaskType): Promise<void> => {
        if (!state.isActive) return;

        try {
            if (!task.agent) {
                throw new PrettyError({
                    message: 'Cannot process task without an assigned agent',
                    type: 'TaskProcessingError',
                    context: { taskId: task.id, taskTitle: task.title }
                });
            }

            logger.debug(`Processing task: ${task.title}`);
            await teamStore.workOnTask(task.agent, task);
            state.lastTaskUpdateTime = Date.now();

        } catch (error) {
            const prettyError = new PrettyError({
                message: 'Task processing failed',
                rootError: error as Error,
                type: 'TaskProcessingError',
                context: {
                    taskId: task.id,
                    taskTitle: task.title,
                    agentName: task.agent?.name
                }
            });

            logger.error(prettyError.prettyMessage);

            teamStore.handleTaskError({
                task,
                error: prettyError as ErrorType
            });

            teamStore.handleWorkflowError(
                task,
                prettyError as ErrorType
            );
        }
    };

    // Subscribe to task status changes
    const taskStatusUnsubscribe = teamStore.subscribe(
        (state) => state.tasks,
        (tasks) => {
            if (!state.isActive) return;

            const doingTasks = tasks.filter(
                (task) => task.status === TASK_STATUS_enum.DOING
            );

            doingTasks.forEach((task) => {
                taskQueue.add(() => processTask(task))
                    .catch((error) => {
                        logger.error('Task queue processing error:', error);
                    });
            });
        }
    );

    // Subscribe to workflow status changes
    const workflowStatusUnsubscribe = teamStore.subscribe(
        (state) => state.teamWorkflowStatus,
        (status) => {
            if (status === WORKFLOW_STATUS_enum.FINISHED ||
                status === WORKFLOW_STATUS_enum.ERRORED) {
                cleanup();
            }
        }
    );

    // Monitor task timeouts
    const startTimeoutMonitor = () => {
        state.timeoutTimerId = setInterval(() => {
            const currentTime = Date.now();

            if (currentTime - state.lastTaskUpdateTime > config.taskTimeout) {
                const error = new PrettyError({
                    message: 'Workflow timeout: No task updates received within the specified timeout period',
                    type: 'WorkflowTimeoutError',
                    context: {
                        lastUpdateTime: new Date(state.lastTaskUpdateTime).toISOString(),
                        timeoutDuration: `${config.taskTimeout / 1000} seconds`
                    }
                });

                logger.error(error.prettyMessage);

                const currentTasks = teamStore.getState().tasks;
                const runningTask = currentTasks.find(
                    task => task.status === TASK_STATUS_enum.DOING
                );

                if (runningTask) {
                    teamStore.handleTaskError({
                        task: runningTask,
                        error: error as ErrorType
                    });
                }

                cleanup();
            }
        }, config.progressCheckInterval);
    };

    // Initialize timeout monitoring
    startTimeoutMonitor();

    // Cleanup function
    const cleanup = () => {
        if (!state.isActive) return;

        logger.debug('Cleaning up workflow controller');

        state.isActive = false;

        // Clear timers
        if (state.timeoutTimerId) {
            clearInterval(state.timeoutTimerId);
            state.timeoutTimerId = undefined;
        }

        if (state.progressCheckTimerId) {
            clearInterval(state.progressCheckTimerId);
            state.progressCheckTimerId = undefined;
        }

        // Clear task queue
        taskQueue.clear();

        // Remove subscribers
        taskStatusUnsubscribe();
        workflowStatusUnsubscribe();

        logger.debug('Workflow controller cleanup completed');
    };

    // Handle process termination
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);

    // Return cleanup function for manual controller shutdown
    return cleanup;
};
