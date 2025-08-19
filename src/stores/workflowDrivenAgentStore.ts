/**
 * Workflow Driven Agent Store Configuration.
 *
 * This file configures a Zustand store specifically for managing the state of WorkflowDrivenAgent
 * within the KaibanJS library. It outlines actions and state changes related to the lifecycle
 * of workflow execution, including step execution, status updates, and error handling.
 *
 * Usage:
 * Employ this store to handle state updates for WorkflowDrivenAgent dynamically throughout
 * the lifecycle of their workflow execution and interactions.
 */

import { StateCreator } from 'zustand';
import { Task } from '..';
import { BaseAgent } from '../agents/baseAgent';
import { TaskResult } from '../stores/taskStore.types';
import { WORKFLOW_AGENT_STATUS_enum } from '../utils/enums';
import { TASK_STATUS_enum, WORKFLOW_STATUS_enum } from '../utils/enums';
import { logger } from '../utils/logger';
import { getTaskTitleForLogs } from '../utils/tasks';
import {
  WorkflowAgentStatusLog,
  NewWorkflowAgentStatusUpdateLogParams,
  WorkflowAgentStartedLog,
  WorkflowAgentStepStartedLog,
  WorkflowAgentStepCompletedLog,
  WorkflowAgentStepFailedLog,
  WorkflowAgentStepSuspendedLog,
  WorkflowAgentRunningLog,
  WorkflowAgentCompletedLog,
  WorkflowAgentFailedLog,
  WorkflowAgentSuspendedLog,
  WorkflowAgentErrorLog,
  WorkflowAgentTaskCompletedLog,
  WorkflowAgentTaskAbortedLog,
  WorkflowAgentResumedLog,
} from '../types/logs';
import { CombinedStoresState } from './teamStore.types';
import { TaskBlockError, LLMInvocationError } from '../utils/errors';

export interface WorkflowDrivenAgentStoreState {
  // Workflow execution handlers
  handleWorkflowStarted: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    inputData?: any;
  }) => void;
  handleWorkflowStepStarted: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    stepInput?: any;
  }) => void;
  handleWorkflowStepCompleted: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    stepOutput?: any;
    stepDuration?: number;
  }) => void;
  handleWorkflowStepFailed: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    error: Error;
    stepInput?: any;
  }) => void;
  handleWorkflowStepSuspended: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    stepId: string;
    stepDescription?: string;
    suspendReason?: string;
    suspendData?: any;
  }) => void;
  handleWorkflowRunning: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    currentStepId?: string;
    executionPath?: number[];
  }) => void;
  handleWorkflowCompleted: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    result: any;
    totalSteps: number;
    completedSteps: number;
    executionTime: number;
  }) => void;
  handleWorkflowFailed: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    error: Error;
    failedStepId?: string;
    executionPath?: number[];
  }) => void;
  handleWorkflowSuspended: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    suspendReason?: string;
    suspendedSteps?: string[];
    executionPath?: number[];
  }) => void;
  handleWorkflowResumed: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
  }) => void;
  handleWorkflowAgentError: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    error: Error;
    context?: string;
    executionPath?: number[];
  }) => void;

  // Task completion handlers
  handleWorkflowAgentTaskCompleted: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    result: TaskResult;
    iterations: number;
    maxAgentIterations: number;
    executionTime: number;
  }) => void;
  handleWorkflowAgentTaskAborted: (params: {
    agent: BaseAgent;
    task: Task;
    workflowId: string;
    runId: string;
    error: Error;
    reason?: string;
  }) => void;

  // Utility method for creating logs
  prepareWorkflowAgentStatusUpdateLog: <T extends WorkflowAgentStatusLog>(
    params: NewWorkflowAgentStatusUpdateLogParams<T>
  ) => T;
}

export const useWorkflowDrivenAgentStore: StateCreator<
  CombinedStoresState,
  [],
  [],
  WorkflowDrivenAgentStoreState
> = (set, get) => ({
  handleWorkflowStarted: ({ agent, task, workflowId, runId, inputData }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STARTED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentStartedLog>({
        agent,
        task,
        logDescription: `🚀 WorkflowDrivenAgent ${agent.name} started workflow execution`,
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STARTED,
        metadata: {
          workflowId,
          runId,
          inputData,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.info(
      `🚀 WorkflowDrivenAgent ${agent.name} started workflow execution`
    );
    logger.debug('Workflow input data:', inputData);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWorkflowStepStarted: ({
    agent,
    task,
    workflowId,
    runId,
    stepId,
    stepDescription,
    stepInput,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_STARTED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentStepStartedLog>({
        agent,
        task,
        logDescription: `⚡ WorkflowDrivenAgent ${agent.name} started step: ${stepId}`,
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_STARTED,
        metadata: {
          workflowId,
          runId,
          stepId,
          stepDescription,
          stepInput,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.info(`⚡ WorkflowDrivenAgent ${agent.name} started step: ${stepId}`);
    if (stepDescription) {
      logger.debug(`Step description: ${stepDescription}`);
    }
    if (stepInput) {
      logger.debug('Step input:', stepInput);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWorkflowStepCompleted: ({
    agent,
    task,
    workflowId,
    runId,
    stepId,
    stepDescription,
    stepOutput,
    stepDuration,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_COMPLETED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentStepCompletedLog>({
        agent,
        task,
        logDescription: `✅ WorkflowDrivenAgent ${agent.name} completed step: ${stepId}`,
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_COMPLETED,
        metadata: {
          workflowId,
          runId,
          stepId,
          stepDescription,
          stepOutput,
          stepDuration,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.info(
      `✅ WorkflowDrivenAgent ${agent.name} completed step: ${stepId}`
    );
    if (stepDuration) {
      logger.debug(`Step duration: ${stepDuration}ms`);
    }
    if (stepOutput) {
      logger.debug('Step output:', stepOutput);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWorkflowStepFailed: ({
    agent,
    task,
    workflowId,
    runId,
    stepId,
    stepDescription,
    error,
    stepInput,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_FAILED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentStepFailedLog>({
        agent,
        task,
        logDescription: `❌ WorkflowDrivenAgent ${agent.name} failed step: ${stepId}`,
        workflowStatus: WORKFLOW_STATUS_enum.ERRORED,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_FAILED,
        metadata: {
          workflowId,
          runId,
          stepId,
          stepDescription,
          error,
          stepInput,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.error(`❌ WorkflowDrivenAgent ${agent.name} failed step: ${stepId}`);
    logger.error('Step error:', error);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));

    // Update task state when step fails
    get().handleTaskError({ agent, task, error });
  },

  handleWorkflowStepSuspended: ({
    agent,
    task,
    workflowId,
    runId,
    stepId,
    stepDescription,
    suspendReason,
    suspendData,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_SUSPENDED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentStepSuspendedLog>({
        agent,
        task,
        logDescription: `⏸️ WorkflowDrivenAgent ${agent.name} suspended step: ${stepId}`,
        workflowStatus: WORKFLOW_STATUS_enum.PAUSED,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_STEP_SUSPENDED,
        metadata: {
          workflowId,
          runId,
          stepId,
          stepDescription,
          suspendReason,
          suspendData,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.warn(
      `⏸️ WorkflowDrivenAgent ${agent.name} suspended step: ${stepId}`
    );
    if (suspendReason) {
      logger.debug(`Suspend reason: ${suspendReason}`);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWorkflowRunning: ({
    agent,
    task,
    workflowId,
    runId,
    currentStepId,
    executionPath,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_RUNNING);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentRunningLog>({
        agent,
        task,
        logDescription: `🔄 WorkflowDrivenAgent ${agent.name} is running workflow`,
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_RUNNING,
        metadata: {
          workflowId,
          runId,
          currentStepId,
          executionPath,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.debug(`🔄 WorkflowDrivenAgent ${agent.name} is running workflow`);
    if (currentStepId) {
      logger.debug(`Current step: ${currentStepId}`);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWorkflowCompleted: ({
    agent,
    task,
    workflowId,
    runId,
    result,
    totalSteps,
    completedSteps,
    executionTime,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_COMPLETED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentCompletedLog>({
        agent,
        task,
        logDescription: `🎉 WorkflowDrivenAgent ${agent.name} completed workflow successfully`,
        workflowStatus: WORKFLOW_STATUS_enum.FINISHED,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_COMPLETED,
        metadata: {
          workflowId,
          runId,
          result,
          totalSteps,
          completedSteps,
          executionTime,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.info(
      `🎉 WorkflowDrivenAgent ${agent.name} completed workflow successfully`
    );
    logger.info(
      `Completed ${completedSteps}/${totalSteps} steps in ${executionTime}ms`
    );
    logger.debug('Workflow result:', result);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWorkflowFailed: ({
    agent,
    task,
    workflowId,
    runId,
    error,
    failedStepId,
    executionPath,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_FAILED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentFailedLog>({
        agent,
        task,
        logDescription: `💥 WorkflowDrivenAgent ${agent.name} failed workflow execution`,
        workflowStatus: WORKFLOW_STATUS_enum.ERRORED,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_FAILED,
        metadata: {
          workflowId,
          runId,
          error,
          failedStepId,
          executionPath,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.error(
      `💥 WorkflowDrivenAgent ${agent.name} failed workflow execution`
    );
    logger.error('Workflow error:', error);
    if (failedStepId) {
      logger.error(`Failed at step: ${failedStepId}`);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
  },

  handleWorkflowSuspended: ({
    agent,
    task,
    workflowId,
    runId,
    suspendReason,
    suspendedSteps,
    executionPath,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_SUSPENDED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentSuspendedLog>({
        agent,
        task,
        logDescription: `⏸️ WorkflowDrivenAgent ${agent.name} suspended workflow execution`,
        workflowStatus: WORKFLOW_STATUS_enum.PAUSED,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_SUSPENDED,
        metadata: {
          workflowId,
          runId,
          suspendReason,
          suspendedSteps,
          executionPath,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.warn(
      `⏸️ WorkflowDrivenAgent ${agent.name} suspended workflow execution`
    );
    if (suspendReason) {
      logger.warn(`Suspend reason: ${suspendReason}`);
    }
    if (suspendedSteps && suspendedSteps.length > 0) {
      logger.warn(`Suspended steps: ${suspendedSteps.join(', ')}`);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskPaused({ task });
  },
  handleWorkflowResumed: ({ agent, task, workflowId, runId }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.RESUMED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentResumedLog>({
        agent,
        task,
        logDescription: `🔄 WorkflowDrivenAgent ${agent.name} resumed workflow execution`,
        workflowStatus: WORKFLOW_STATUS_enum.RUNNING,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.RESUMED,
        metadata: {
          workflowId,
          runId,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.debug(
      `🔄 WorkflowDrivenAgent ${agent.name} resumed workflow execution`
    );
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskResumed({ task });
  },

  handleWorkflowAgentError: ({
    agent,
    task,
    workflowId,
    runId,
    error,
    context,
    executionPath,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.WORKFLOW_ERROR);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentErrorLog>({
        agent,
        task,
        logDescription: `💥 WorkflowDrivenAgent ${agent.name} encountered workflow error`,
        workflowStatus: WORKFLOW_STATUS_enum.ERRORED,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.WORKFLOW_ERROR,
        metadata: {
          workflowId,
          runId,
          error,
          context,
          executionPath,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.error(
      `💥 WorkflowDrivenAgent ${agent.name} encountered workflow error`
    );
    logger.error('Error details:', error);
    if (context) {
      logger.error(`Error context: ${context}`);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));

    get().handleTaskBlocked({
      task,
      error: new TaskBlockError(
        error.message,
        error.message,
        agent.name,
        false
      ),
    });
  },

  handleWorkflowAgentTaskCompleted: ({
    agent,
    task,
    workflowId,
    runId,
    result,
    iterations,
    maxAgentIterations,
    executionTime,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.TASK_COMPLETED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentTaskCompletedLog>({
        agent,
        task,
        logDescription: `🏁 WorkflowDrivenAgent ${agent.name} completed task successfully`,
        taskStatus: TASK_STATUS_enum.DONE,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.TASK_COMPLETED,
        metadata: {
          workflowId,
          runId,
          result,
          iterations,
          maxAgentIterations,
          executionTime,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.info(
      `🏁 WorkflowDrivenAgent ${agent.name} completed task successfully`
    );
    logger.info(
      `Completed in ${iterations}/${maxAgentIterations} iterations in ${executionTime}ms`
    );
    logger.debug('Task result:', result);
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    get().handleTaskCompleted({ agent, task, result });
  },

  handleWorkflowAgentTaskAborted: ({
    agent,
    task,
    workflowId,
    runId,
    error,
    reason,
  }) => {
    agent.setStatus(WORKFLOW_AGENT_STATUS_enum.TASK_ABORTED);
    const newLog =
      get().prepareWorkflowAgentStatusUpdateLog<WorkflowAgentTaskAbortedLog>({
        agent,
        task,
        logDescription: `🛑 WorkflowDrivenAgent ${agent.name} aborted task`,
        taskStatus: TASK_STATUS_enum.ABORTED,
        agentStatus: WORKFLOW_AGENT_STATUS_enum.TASK_ABORTED,
        metadata: {
          workflowId,
          runId,
          error,
          reason,
        },
        logType: 'WorkflowAgentStatusUpdate',
      });

    logger.error(`🛑 WorkflowDrivenAgent ${agent.name} aborted task`);
    logger.error('Abort error:', error);
    if (reason) {
      logger.error(`Abort reason: ${reason}`);
    }
    set((state) => ({ workflowLogs: [...state.workflowLogs, newLog] }));

    // Update task state when task is aborted
    const llmError = new LLMInvocationError(
      reason || error.message,
      error,
      'Check workflow configuration and retry'
    );

    get().handleTaskAborted({ task, error: llmError });
  },

  prepareWorkflowAgentStatusUpdateLog: <T extends WorkflowAgentStatusLog>({
    agent,
    task,
    logDescription,
    workflowStatus,
    taskStatus,
    agentStatus,
    metadata,
    logType = 'WorkflowAgentStatusUpdate' as T['logType'],
  }: NewWorkflowAgentStatusUpdateLogParams<T>): T => {
    const timestamp = Date.now();

    let newLog: T = {
      timestamp,
      logDescription,
      metadata,
      logType,
    } as T;

    if (agent && task) {
      newLog = {
        ...newLog,
        task,
        agent,
        agentName: agent.name || 'Unknown Workflow Agent',
        taskTitle: task ? getTaskTitleForLogs(task) : 'Untitled Task',
        taskStatus: taskStatus || task.status,
        agentStatus: agentStatus || agent.status,
      } as T;
    }

    if (workflowStatus) {
      newLog = {
        ...newLog,
        workflowStatus,
      } as T;
    }

    return newLog;
  },
});
