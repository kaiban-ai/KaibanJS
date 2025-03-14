import {
  WORKFLOW_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_ACTION_enum,
} from '../utils/enums';
import {
  StopAbortError,
  PauseAbortError,
  WorkflowError,
} from '../utils/errors';
import { logger } from '../utils/logger';

export const useWorkflowLoopStore = (set, get) => ({
  activePromises: new Map(),

  // Promise Management
  trackPromise: (agentId, promiseObj) => {
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

  removePromise: (agentId, promiseObj) => {
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

  abortAgentPromises: (agentId, action) => {
    const agentPromises = get().activePromises.get(agentId);
    if (agentPromises) {
      for (const { reject } of agentPromises) {
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
      for (const agentId of get().activePromises.keys()) {
        get().abortAgentPromises(agentId, WORKFLOW_ACTION_enum.PAUSE);
      }

      set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.PAUSED });
      const tasks = get().tasks;

      const tasksToPause = tasks.filter(
        (task) => task.status === TASK_STATUS_enum.DOING
      );

      // handle task paused for each task
      tasksToPause.forEach((task) => {
        get().handleAgentTaskPaused({ agent: task.agent, task });
      });

      logger.info('⏸️ Workflow paused - Taking a breather! 🛑');
    } catch (error) {
      logger.error(
        'Failed to pause workflow:',
        error.message,
        '\nStack:',
        error.stack
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

    pausedTasks.forEach((task) => {
      get().handleAgentTaskResumed({ agent: task.agent, task });
    });

    logger.info('🔄 Workflow resumed - Back in action! 🚀');

    const resumeLog = {
      task: null,
      agent: null,
      timestamp: Date.now(),
      logDescription: `🔄 Workflow resumed for team "${
        get().name
      }" - All paused tasks will continue execution`,
      workflowStatus: WORKFLOW_STATUS_enum.RESUMED,
      metadata: {
        message:
          'Workflow execution has been resumed after being paused. All agents will continue working on their assigned tasks.',
        resumedAt: new Date().toISOString(),
        previousStatus: WORKFLOW_STATUS_enum.PAUSED,
      },
      logType: 'WorkflowStatusUpdate',
    };

    set({
      teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
      workflowLogs: [...get().workflowLogs, resumeLog],
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
      set((state) => ({
        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPING,
        workflowLogs: [
          ...state.workflowLogs,
          {
            task: null,
            agent: null,
            timestamp: Date.now(),
            logDescription: 'Workflow stopping - Aborting all running tasks...',
            workflowStatus: WORKFLOW_STATUS_enum.STOPPING,
            metadata: {
              previousStatus: currentStatus,
              message: 'Workflow stop operation initiated',
            },
            logType: 'WorkflowStatusUpdate',
          },
        ],
      }));

      // Abort all active agent promises
      for (const agentId of get().activePromises.keys()) {
        get().abortAgentPromises(agentId, WORKFLOW_ACTION_enum.STOP);
      }

      // Update all DOING tasks to TODO
      const tasks = get().tasks;
      const tasksToAbort = tasks.filter(
        (task) =>
          ![TASK_STATUS_enum.DONE, TASK_STATUS_enum.TODO].includes(task.status)
      );
      tasksToAbort.forEach((task) => {
        get().handleAgentTaskAborted({
          agent: task.agent,
          task,
          error: new StopAbortError(),
        });
      });

      // Final state update to stopped
      set((state) => ({
        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
        tasks: tasks.map((task) => ({
          ...task,
          status:
            task.status !== TASK_STATUS_enum.DONE
              ? TASK_STATUS_enum.TODO
              : task.status,
        })),
        workflowLogs: [
          ...state.workflowLogs,
          {
            task: null,
            agent: null,
            timestamp: Date.now(),
            logDescription:
              'Workflow stopped successfully - All tasks reset to TODO state.',
            workflowStatus: WORKFLOW_STATUS_enum.STOPPED,
            metadata: {
              message: 'Workflow stop operation completed successfully',
              tasksReset: tasks.length,
            },
            logType: 'WorkflowStatusUpdate',
          },
        ],
      }));

      logger.info(
        '🛑 Workflow stopped successfully - All tasks have been reset'
      );
    } catch (error) {
      logger.error('❌ Error stopping workflow:', error.message);

      // Single state update for error case
      set((state) => ({
        teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
        workflowLogs: [
          ...state.workflowLogs,
          {
            task: null,
            agent: null,
            timestamp: Date.now(),
            logDescription: `Error stopping workflow: ${error.message}`,
            workflowStatus: WORKFLOW_STATUS_enum.STOPPED,
            metadata: {
              error: error.message,
              errorStack: error.stack,
              message: 'Workflow stop operation failed',
            },
            logType: 'WorkflowStatusUpdate',
          },
        ],
      }));
      throw error;
    }
  },
});
