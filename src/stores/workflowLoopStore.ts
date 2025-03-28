import { StateCreator } from 'zustand';
import {
  TASK_STATUS_enum,
  WORKFLOW_ACTION_enum,
  WORKFLOW_STATUS_enum,
} from '../utils/enums';
import {
  PauseAbortError,
  StopAbortError,
  WorkflowError,
} from '../utils/errors';
import { logger } from '../utils/logger';
import {
  WorkflowOperationErrorLog,
  WorkflowResumedLog,
  WorkflowStoppedLog,
  WorkflowStoppingLog,
} from '../types/logs';
import { CombinedStoresState } from './teamStore.types';
import { PromiseObject, WorkflowLoopState } from './workflowLoopStore.types';

export const useWorkflowLoopStore: StateCreator<
  CombinedStoresState,
  [],
  [],
  WorkflowLoopState
> = (set, get) => ({
  activePromises: new Map(),

  // Promise Management
  trackPromise: (agentId: string, promiseObj: PromiseObject) => {
    set((state) => {
      const agentPromises = state.activePromises.get(agentId) || new Set();
      agentPromises.add(promiseObj);
      return {
        activePromises: new Map(state.activePromises).set(
          agentId,
          agentPromises
        ),
      };
    });
  },

  removePromise: (agentId: string, promiseObj: PromiseObject) => {
    set((state) => {
      const agentPromises = state.activePromises.get(agentId);
      if (agentPromises) {
        agentPromises.delete(promiseObj);
      }
      return {
        activePromises: new Map(state.activePromises),
      };
    });
  },

  abortAgentPromises: (agentId: string, action: WORKFLOW_ACTION_enum) => {
    const agentPromises = get().activePromises.get(agentId);
    if (agentPromises) {
      for (const { reject } of Array.from(agentPromises)) {
        switch (action) {
          case WORKFLOW_ACTION_enum.STOP:
            reject(new StopAbortError());
            break;
          case WORKFLOW_ACTION_enum.PAUSE:
            reject(new PauseAbortError());
            break;
          default:
            break;
        }
      }
      set((state) => ({
        activePromises: new Map(state.activePromises).set(agentId, new Set()),
      }));
    }
  },

  // Workflow Control Actions
  pauseWorkflow: async () => {
    const currentStatus = get().teamWorkflowStatus;
    const allowedStatuses = [WORKFLOW_STATUS_enum.RUNNING];

    if (!allowedStatuses.includes(currentStatus)) {
      throw new WorkflowError('Cannot pause workflow unless it is running');
    }

    try {
      // Abort all active agent promises
      for (const agentId of Array.from(get().activePromises.keys())) {
        get().abortAgentPromises(agentId, WORKFLOW_ACTION_enum.PAUSE);
      }

      set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.PAUSED });
      const tasks = get().tasks;

      const tasksToPause = tasks.filter(
        (task) => task.status === TASK_STATUS_enum.DOING
      );

      // handle task paused for each task
      tasksToPause.forEach((task) => {
        get().handleAgentTaskPaused({ task });
      });

      logger.info('⏸️ Workflow paused - Taking a breather! 🛑');
    } catch (error) {
      logger.error(
        'Failed to pause workflow:',
        error instanceof Error ? error.message : 'Unknown error',
        '\nStack:',
        error instanceof Error ? error.stack : ''
      );
      set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.PAUSED });
      throw error;
    }
  },

  resumeWorkflow: async () => {
    const currentStatus = get().teamWorkflowStatus;
    const allowedStatuses = [WORKFLOW_STATUS_enum.PAUSED];

    if (!allowedStatuses.includes(currentStatus)) {
      throw new WorkflowError('Cannot resume workflow unless it is paused');
    }

    const tasks = get().tasks;
    const pausedTasks = tasks.filter(
      (task) => task.status === TASK_STATUS_enum.PAUSED
    );

    logger.info('🔄 Workflow resumed - Back in action! 🚀');

    const resumeLog = get().prepareWorkflowStatusUpdateLog<WorkflowResumedLog>({
      logType: 'WorkflowStatusUpdate',
      workflowStatus: WORKFLOW_STATUS_enum.RESUMED,
      metadata: {
        message:
          'Workflow execution has been resumed after being paused. All agents will continue working on their assigned tasks.',
        resumedAt: new Date().toISOString(),
        previousStatus: WORKFLOW_STATUS_enum.PAUSED,
      },
      logDescription: `🔄 Workflow resumed for team "${
        get().name
      }" - All paused tasks will continue execution`,
    });

    set({
      teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
      workflowLogs: [...get().workflowLogs, resumeLog],
    });

    pausedTasks.forEach((task) => {
      get().handleAgentTaskResumed({ task });
    });
  },

  stopWorkflow: async () => {
    const currentStatus = get().teamWorkflowStatus;
    const allowedStatuses = [
      WORKFLOW_STATUS_enum.RUNNING,
      WORKFLOW_STATUS_enum.PAUSED,
    ];

    if (!allowedStatuses.includes(currentStatus)) {
      throw new WorkflowError(
        'Cannot stop workflow unless it is running or paused'
      );
    }

    try {
      // Update state to stopping and log the transition
      const stoppingLog =
        get().prepareWorkflowStatusUpdateLog<WorkflowStoppingLog>({
          logType: 'WorkflowStatusUpdate',
          workflowStatus: WORKFLOW_STATUS_enum.STOPPING,
          metadata: {
            previousStatus: currentStatus,
            message: 'Workflow stop operation initiated',
          },
          logDescription: 'Workflow stopping - Aborting all running tasks...',
        });

      set((state) => ({
        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPING,
        workflowLogs: [...state.workflowLogs, stoppingLog],
      }));

      // Abort all active agent promises
      for (const agentId of Array.from(get().activePromises.keys())) {
        get().abortAgentPromises(agentId, WORKFLOW_ACTION_enum.STOP);
      }

      // Update all DOING tasks to TODO
      const tasks = get().tasks;
      const tasksToAbort = tasks.filter(
        (task) =>
          ![TASK_STATUS_enum.DONE, TASK_STATUS_enum.TODO].includes(
            task.status as TASK_STATUS_enum
          )
      );
      tasksToAbort.forEach((task) => {
        get().handleAgentTaskAborted({
          agent: task.agent.agentInstance,
          task,
          error: new StopAbortError(),
        });
      });

      // Final state update to stopped
      const stoppedLog =
        get().prepareWorkflowStatusUpdateLog<WorkflowStoppedLog>({
          logType: 'WorkflowStatusUpdate',
          workflowStatus: WORKFLOW_STATUS_enum.STOPPED,
          metadata: {
            message: 'Workflow stop operation completed successfully',
            previousStatus: currentStatus,
            tasksReset: tasks.length,
          },
          logDescription:
            'Workflow stopped successfully - All tasks reset to TODO state.',
        });

      set((state) => ({
        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
        tasks: tasks.map((task) => ({
          ...task,
          status:
            task.status !== TASK_STATUS_enum.DONE
              ? TASK_STATUS_enum.TODO
              : task.status,
        })),
        workflowLogs: [...state.workflowLogs, stoppedLog],
      }));

      logger.info(
        '🛑 Workflow stopped successfully - All tasks have been reset'
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('❌ Error stopping workflow:', errorMessage);

      // Single state update for error case
      const errorLog =
        get().prepareWorkflowStatusUpdateLog<WorkflowOperationErrorLog>({
          logType: 'WorkflowStatusUpdate',
          workflowStatus: WORKFLOW_STATUS_enum.STOPPED,
          metadata: {
            error: errorMessage,
            message: 'Workflow stop operation failed',
          },
          logDescription: `Error stopping workflow: ${errorMessage}`,
        });

      set((state) => ({
        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
        workflowLogs: [...state.workflowLogs, errorLog],
      }));
      throw error;
    }
  },
});
