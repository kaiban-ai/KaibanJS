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
    if (currentStatus !== WORKFLOW_STATUS_enum.RUNNING) {
      throw new WorkflowError('Cannot pause workflow unless it is running');
    }

    try {
      // Pause task queue
      get().taskQueue.pause();
      // Abort all active agent promises
      for (const agentId of get().activePromises.keys()) {
        get().abortAgentPromises(agentId, WORKFLOW_ACTION_enum.PAUSE);
      }

      set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.PAUSED });
      const tasks = get().tasks;

      const tasksToPause = tasks.filter(
        (task) => task.status === TASK_STATUS_enum.DOING
      );

      const taskIdsToPause = tasksToPause.map((task) => task.id);

      // update status of all tasks to PAUSED
      get().updateStatusOfMultipleTasks(
        tasksToPause.map((task) => task.id),
        TASK_STATUS_enum.PAUSED
      );

      get()
        .tasks.filter((task) => taskIdsToPause.includes(task.id))
        .forEach((task) => {
          get().handleAgentTaskPaused({ agent: task.agent, task });
        });

      logger.info('Workflow paused');
    } catch (error) {
      logger.error('Error pausing workflow:', error);
      set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.PAUSED });
      throw error;
    }
  },

  resumeWorkflow: async () => {
    const currentStatus = get().teamWorkflowStatus;
    if (currentStatus !== WORKFLOW_STATUS_enum.PAUSED) {
      throw new WorkflowError('Cannot resume workflow unless it is paused');
    }
    set({
      teamWorkflowStatus: WORKFLOW_STATUS_enum.RESUMED,
    });

    const tasks = get().tasks;

    tasks.forEach((task) => {
      if (task.status === TASK_STATUS_enum.DOING) {
        get().handleAgentTaskResumed({ agent: task.agent, task });
      }
    });

    const pausedTasks = tasks.filter(
      (task) => task.status === TASK_STATUS_enum.PAUSED
    );
    get().updateStatusOfMultipleTasks(
      pausedTasks.map((task) => task.id),
      TASK_STATUS_enum.DOING
    );

    // Resume task queue
    get().taskQueue.start();

    logger.info('Workflow resumed');
    set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING });
  },

  stopWorkflow: async () => {
    const currentStatus = get().teamWorkflowStatus;

    if (
      currentStatus !== WORKFLOW_STATUS_enum.RUNNING &&
      currentStatus !== WORKFLOW_STATUS_enum.PAUSED
    ) {
      throw new WorkflowError(
        'Cannot stop workflow unless it is running or paused'
      );
    }

    set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPING });

    try {
      // Abort all active agent promises
      for (const agentId of get().activePromises.keys()) {
        get().abortAgentPromises(agentId, WORKFLOW_ACTION_enum.STOP);
      }

      // Clear task queue
      get().taskQueue.clear();

      // Update all DOING tasks to TODO
      const tasks = get().tasks;
      tasks.forEach((task) => {
        get().handleAgentTaskAborted({
          agent: task.agent,
          task,
          error: new StopAbortError(),
        });
        get().updateTaskStatus(task.id, TASK_STATUS_enum.TODO);
      });

      set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED });
      logger.info('Workflow stopped successfully');
    } catch (error) {
      logger.error('Error stopping workflow:', error);
      set({ teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED });
      throw error;
    }
  },
});
