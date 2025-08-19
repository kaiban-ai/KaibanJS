/**
 * Workflow Driven Agent Implementation.
 *
 * This file implements the WorkflowDrivenAgent, a specialized agent that executes workflows
 * instead of using traditional LLM-based reasoning. The agent maintains workflow state and
 * can handle suspend/resume operations for long-running workflows.
 *
 * @packageDocumentation
 */

import { Task } from '..';
import { TeamStore } from '../stores';
import { TaskResult } from '../stores/taskStore.types';
import { AGENT_STATUS_enum } from '../utils/enums';
import { AgentLoopResult } from '../utils/llm.types';
import { logger } from '../utils/logger';
import { BaseAgent, BaseAgentParams, Env } from './baseAgent';

// Import workflow types from packages/workflow
import type {
  Workflow,
  WorkflowResult,
  RuntimeContext,
} from '@kaibanjs/workflow';

/**
 * Interface for WorkflowDrivenAgent parameters
 */
export interface WorkflowDrivenAgentParams {
  /** The workflow to be executed by this agent */
  name: string;
  /** The workflow to be executed by this agent */
  workflow: Workflow<any, any, any>;
  type?: 'WorkflowDrivenAgent';
}

/**
 * Store state for workflow-driven agent
 */
export interface WorkflowAgentState {
  /** Current run ID */
  currentRunId: string | null;
  /** Current workflow status */
  workflowStatus: 'idle' | 'running' | 'suspended' | 'completed' | 'failed';
  /** Last workflow result */
  lastResult: WorkflowResult<any> | null;
  /** Last error */
  lastError: Error | null;
  /** Execution metadata */
  metadata: {
    iterations: number;
    maxIterations: number;
    startTime: number | null;
    endTime: number | null;
  };
}

/**
 * WorkflowDrivenAgent class that extends BaseAgent to execute workflows
 */
export class WorkflowDrivenAgent extends BaseAgent {
  /** The workflow to be executed */
  readonly workflow: Workflow<any, any, any>;

  /** Internal state for workflow management */
  private workflowState: WorkflowAgentState;

  constructor(config: WorkflowDrivenAgentParams) {
    const baseConfig: BaseAgentParams = {
      ...(config as unknown as BaseAgentParams),
      name: config.name,
    };

    super(baseConfig);

    this.workflow = config.workflow;

    // Initialize workflow state
    this.workflowState = {
      currentRunId: null,
      workflowStatus: 'idle',
      lastResult: null,
      lastError: null,
      metadata: {
        iterations: 0,
        maxIterations: 10,
        startTime: null,
        endTime: null,
      },
    };
  }

  /**
   * Initializes the agent with store and environment configuration
   * @param store - The agent store instance
   * @param env - Environment configuration
   */
  initialize(store: TeamStore, env: Env): void {
    super.initialize(store, env);
    this.resetWorkflowState();
  }

  /**
   * Process a task by executing the assigned workflow
   * @param task - The task to process
   * @param inputs - Task inputs
   * @param context - Task context
   */
  async workOnTask(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): Promise<AgentLoopResult> {
    try {
      this.setStatus(AGENT_STATUS_enum.THINKING);
      this.workflowState.metadata.startTime = Date.now();
      this.workflowState.workflowStatus = 'running';

      // Log the start of workflow execution
      this.logWorkflowStart(task, inputs);

      // Create runtime context with task data
      const runtimeContext: RuntimeContext = this.createRuntimeContext(
        task,
        inputs,
        context
      );

      // Commit the workflow if not already committed
      if (!this.workflow.committed) {
        this.workflow.commit();
      }

      // Create a new run
      const run = this.workflow.createRun();
      this.workflowState.currentRunId = run.runId;

      // Subscribe to workflow events for monitoring
      const unsubscribe = run.watch((event) => {
        this.handleWorkflowEvent(event, task);
      });

      try {
        // Execute the workflow
        const result = await run.start({
          inputData: inputs,
          runtimeContext,
        });

        this.workflowState.lastResult = result;
        this.workflowState.metadata.endTime = Date.now();

        // Handle different result statuses
        switch (result.status) {
          case 'completed':
            return this.handleWorkflowCompleted(task, result);

          case 'failed':
            return this.handleWorkflowFailed(task, result);

          case 'suspended':
            return this.handleWorkflowSuspended(task, result);

          default:
            throw new Error(
              `Unknown workflow status: ${(result as any).status}`
            );
        }
      } finally {
        unsubscribe();
      }
    } catch (error) {
      return this.handleWorkflowError(task, error as Error);
    }
  }

  /**
   * Process feedback for a task (not applicable for workflow-driven agent)
   * @param task - The task to process feedback for
   * @param feedbackList - List of feedback items
   */
  async workOnFeedback(
    _task: Task,
    _feedbackList: Array<{ content: string }>,
    _context: string
  ): Promise<AgentLoopResult> {
    // For workflow-driven agents, feedback is not applicable
    // We could potentially use feedback to modify workflow parameters
    logger.warn(
      `WorkflowDrivenAgent ${this.name} received feedback, but feedback processing is not implemented for workflow agents`
    );

    return {
      error:
        'Feedback processing is not implemented for workflow-driven agents',
      metadata: {
        iterations: this.workflowState.metadata.iterations,
        maxAgentIterations: 10,
      },
    };
  }

  /**
   * Resume work on a suspended workflow
   * @param task - The task to resume
   */
  async workOnTaskResume(task: Task): Promise<void> {
    if (!this.workflowState.currentRunId) {
      throw new Error('No active workflow run to resume');
    }

    if (this.workflowState.workflowStatus !== 'suspended') {
      throw new Error('Workflow is not in suspended state');
    }

    try {
      this.setStatus(AGENT_STATUS_enum.RESUMED);
      this.workflowState.workflowStatus = 'running';

      // Get the current run
      const run = this.workflow.runs.get(this.workflowState.currentRunId);
      if (!run) {
        throw new Error('Workflow run not found');
      }

      // Resume the workflow
      const result = await run.resume({
        step: task.id, // Resume the specific step
        resumeData: task.inputs || {},
      });

      this.workflowState.lastResult = result;

      // Handle the resumed result
      switch (result.status) {
        case 'completed':
          this.handleWorkflowCompleted(task, result);
          break;

        case 'failed':
          this.handleWorkflowFailed(task, result);
          break;

        case 'suspended':
          this.handleWorkflowSuspended(task, result);
          break;

        default:
          throw new Error(
            `Unknown workflow status after resume: ${(result as any).status}`
          );
      }
    } catch (error) {
      this.handleWorkflowError(task, error as Error);
    }
  }

  /**
   * Reset the agent and workflow state
   */
  reset(): void {
    super.reset();
    this.resetWorkflowState();
  }

  /**
   * Get cleaned agent data (without sensitive information)
   */
  getCleanedAgent(): Partial<BaseAgent> {
    return {
      id: '[REDACTED]',
      env: '[REDACTED]',
      // Add workflow-specific data
      workflow: {
        id: this.workflow.id,
        committed: this.workflow.committed,
      },
      workflowState: {
        ...this.workflowState,
        currentRunId: '[REDACTED]',
        lastResult: '[REDACTED]',
        lastError: '[REDACTED]',
      },
    } as Partial<BaseAgent> & {
      workflow: any;
      workflowState: any;
    };
  }

  /**
   * Create runtime context with task data
   */
  private createRuntimeContext(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): RuntimeContext {
    const contextData = new Map<string, any>();

    // Add task data
    contextData.set('task.id', task.id);
    contextData.set('task.description', task.description);
    contextData.set('task.status', task.status);
    contextData.set('task.inputs', inputs);
    contextData.set('task.context', context);

    return {
      get: (path: string) => contextData.get(path),
      set: (path: string, value: any) => contextData.set(path, value),
      has: (path: string) => contextData.has(path),
      delete: (path: string) => contextData.delete(path),
      clear: () => contextData.clear(),
    };
  }

  /**
   * Handle workflow events for monitoring and logging
   */
  private handleWorkflowEvent(event: any, task: Task): void {
    logger.debug(`Workflow event for agent ${this.name}:`, {
      type: event.type,
      stepId: event.payload?.stepId,
      stepStatus: event.payload?.stepStatus,
      workflowStatus: event.payload?.workflowState?.status,
    });

    const workflowId = this.workflow.id;
    const runId = this.workflowState.currentRunId || 'unknown';

    // Map workflow events to store handlers
    switch (event.type) {
      case 'WorkflowStatusUpdate':
        this.handleWorkflowStatusUpdate(event, task, workflowId, runId);
        break;
      case 'StepStatusUpdate':
        this.handleStepStatusUpdate(event, task, workflowId, runId);
        break;
      default:
        logger.debug(`Unhandled workflow event type: ${event.type}`);
    }
  }

  /**
   * Handle workflow status updates
   */
  private handleWorkflowStatusUpdate(
    event: any,
    task: Task,
    workflowId: string,
    runId: string
  ): void {
    const workflowState = event.payload?.workflowState;
    if (!workflowState) return;

    const status = workflowState.status;
    const metadata = event.metadata || {};

    switch (status) {
      case 'running':
        this.store?.getState()?.handleWorkflowRunning({
          agent: this,
          task,
          workflowId,
          runId,
          currentStepId: metadata.currentStepId,
          executionPath: metadata.executionPath,
        });
        break;
      case 'completed':
        this.store?.getState()?.handleWorkflowCompleted({
          agent: this,
          task,
          workflowId,
          runId,
          result: workflowState.result,
          totalSteps: metadata.totalSteps || 0,
          completedSteps: metadata.completedSteps || 0,
          executionTime: this.workflowState.metadata.endTime
            ? this.workflowState.metadata.endTime -
              (this.workflowState.metadata.startTime || 0)
            : 0,
        });
        break;
      case 'failed':
        this.store?.getState()?.handleWorkflowFailed({
          agent: this,
          task,
          workflowId,
          runId,
          error: workflowState.error,
          failedStepId: metadata.failedStepId,
          executionPath: metadata.executionPath,
        });
        break;
      case 'suspended':
        this.store?.getState()?.handleWorkflowSuspended({
          agent: this,
          task,
          workflowId,
          runId,
          suspendReason: metadata.suspendReason,
          suspendedSteps: metadata.suspendedSteps,
          executionPath: metadata.executionPath,
        });
        break;
    }
  }

  /**
   * Handle step status updates
   */
  private handleStepStatusUpdate(
    event: any,
    task: Task,
    workflowId: string,
    runId: string
  ): void {
    const stepId = event.payload?.stepId;
    const stepStatus = event.payload?.stepStatus;
    const stepResult = event.payload?.stepResult;
    const metadata = event.metadata || {};

    if (!stepId || !stepStatus) return;

    switch (stepStatus) {
      case 'running':
        this.store?.getState()?.handleWorkflowStepStarted({
          agent: this,
          task,
          workflowId,
          runId,
          stepId,
          stepDescription: metadata.stepDescription,
          stepInput: metadata.stepInput,
        });
        break;
      case 'completed':
        this.store?.getState()?.handleWorkflowStepCompleted({
          agent: this,
          task,
          workflowId,
          runId,
          stepId,
          stepDescription: metadata.stepDescription,
          stepOutput: stepResult?.output,
          stepDuration: metadata.stepDuration,
        });
        break;
      case 'failed':
        this.store?.getState()?.handleWorkflowStepFailed({
          agent: this,
          task,
          workflowId,
          runId,
          stepId,
          stepDescription: metadata.stepDescription,
          error: stepResult?.error,
          stepInput: metadata.stepInput,
        });
        break;
      case 'suspended':
        this.store?.getState()?.handleWorkflowStepSuspended({
          agent: this,
          task,
          workflowId,
          runId,
          stepId,
          stepDescription: metadata.stepDescription,
          suspendReason: metadata.suspendReason,
          suspendData: metadata.suspendData,
        });
        break;
    }
  }

  /**
   * Handle completed workflow
   */
  private handleWorkflowCompleted(
    task: Task,
    result: WorkflowResult<any>
  ): AgentLoopResult {
    this.setStatus(AGENT_STATUS_enum.TASK_COMPLETED);
    this.workflowState.workflowStatus = 'completed';
    this.workflowState.metadata.iterations++;

    // Log completion
    this.logWorkflowCompleted(task, result);

    const executionTime = this.workflowState.metadata.endTime
      ? this.workflowState.metadata.endTime -
        (this.workflowState.metadata.startTime || 0)
      : 0;

    // Update task store
    this.store?.getState()?.handleWorkflowAgentTaskCompleted({
      agent: this,
      task,
      workflowId: this.workflow.id,
      runId: this.workflowState.currentRunId || 'unknown',
      result: (result as any).result as TaskResult,
      iterations: this.workflowState.metadata.iterations,
      maxAgentIterations: 10,
      executionTime,
    });

    return {
      result: (result as any).result,
      metadata: {
        iterations: this.workflowState.metadata.iterations,
        maxAgentIterations: 10,
      },
    };
  }

  /**
   * Handle failed workflow
   */
  private handleWorkflowFailed(
    task: Task,
    result: WorkflowResult<any>
  ): AgentLoopResult {
    this.setStatus(AGENT_STATUS_enum.AGENTIC_LOOP_ERROR);
    this.workflowState.workflowStatus = 'failed';
    this.workflowState.lastError = (result as any).error as Error;
    this.workflowState.metadata.iterations++;

    // Log failure
    this.logWorkflowFailed(task, result);

    // Update task store
    this.store?.getState()?.handleWorkflowAgentTaskAborted({
      agent: this,
      task,
      workflowId: this.workflow.id,
      runId: this.workflowState.currentRunId || 'unknown',
      error: (result as any).error,
      reason: 'Workflow execution failed',
    });

    return {
      error: `Workflow execution failed: ${(result as any).error.message}`,
      metadata: {
        iterations: this.workflowState.metadata.iterations,
        maxAgentIterations: 10,
      },
    };
  }

  /**
   * Handle suspended workflow
   */
  private handleWorkflowSuspended(
    task: Task,
    result: WorkflowResult<any>
  ): AgentLoopResult {
    this.setStatus(AGENT_STATUS_enum.PAUSED);
    this.workflowState.workflowStatus = 'suspended';
    this.workflowState.metadata.iterations++;

    // Log suspension
    this.logWorkflowSuspended(task, result);

    // Update task store
    this.store?.getState()?.handleAgentTaskPaused({ task });

    return {
      error: 'Workflow suspended - requires manual intervention',
      metadata: {
        iterations: this.workflowState.metadata.iterations,
        maxAgentIterations: 10,
      },
    };
  }

  /**
   * Handle workflow errors
   */
  private handleWorkflowError(task: Task, error: Error): AgentLoopResult {
    this.setStatus(AGENT_STATUS_enum.AGENTIC_LOOP_ERROR);
    this.workflowState.workflowStatus = 'failed';
    this.workflowState.lastError = error;
    this.workflowState.metadata.iterations++;

    // Log error
    this.logWorkflowError(task, error);

    // Update task store
    this.store?.getState()?.handleWorkflowAgentError({
      agent: this,
      task,
      workflowId: this.workflow.id,
      runId: this.workflowState.currentRunId || 'unknown',
      error,
      context: 'Workflow execution error',
    });

    return {
      error: `Workflow execution error: ${error.message}`,
      metadata: {
        iterations: this.workflowState.metadata.iterations,
        maxAgentIterations: 10,
      },
    };
  }

  /**
   * Reset workflow state
   */
  private resetWorkflowState(): void {
    this.workflowState = {
      currentRunId: null,
      workflowStatus: 'idle',
      lastResult: null,
      lastError: null,
      metadata: {
        iterations: 0,
        maxIterations: 10,
        startTime: null,
        endTime: null,
      },
    };
  }

  /**
   * Log workflow start
   */
  private logWorkflowStart(task: Task, inputs: Record<string, unknown>): void {
    logger.info(
      `🚀 WorkflowDrivenAgent ${this.name} starting workflow execution for task: ${task.id}`
    );
    logger.debug('Workflow inputs:', inputs);
  }

  /**
   * Log workflow completion
   */
  private logWorkflowCompleted(task: Task, result: WorkflowResult<any>): void {
    logger.info(
      `✅ WorkflowDrivenAgent ${this.name} completed workflow execution for task: ${task.id}`
    );
    logger.debug('Workflow result:', (result as any).result);
  }

  /**
   * Log workflow failure
   */
  private logWorkflowFailed(task: Task, result: WorkflowResult<any>): void {
    logger.error(
      `❌ WorkflowDrivenAgent ${this.name} failed workflow execution for task: ${task.id}`
    );
    logger.error('Workflow error:', (result as any).error);
  }

  /**
   * Log workflow suspension
   */
  private logWorkflowSuspended(task: Task, result: WorkflowResult<any>): void {
    logger.warn(
      `⏸️ WorkflowDrivenAgent ${this.name} suspended workflow execution for task: ${task.id}`
    );
    logger.debug('Suspended steps:', (result as any).suspended);
  }

  /**
   * Log workflow error
   */
  private logWorkflowError(task: Task, error: Error): void {
    logger.error(
      `💥 WorkflowDrivenAgent ${this.name} encountered error during workflow execution for task: ${task.id}`
    );
    logger.error('Error details:', error);
  }
}
