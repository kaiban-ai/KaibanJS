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
    this.workflowState = this.createInitialState();
  }

  /**
   * Initializes the agent with store and environment configuration
   */
  initialize(store: TeamStore, env: Env): void {
    super.initialize(store, env);
    this.resetWorkflowState();
  }

  /**
   * Process a task by executing the assigned workflow
   */
  async workOnTask(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): Promise<AgentLoopResult> {
    try {
      this.initializeWorkflowExecution(task, inputs);

      const runtimeContext = this.createRuntimeContext(task, inputs, context);
      const run = this.setupWorkflowRun();

      const unsubscribe = this.subscribeToWorkflowEvents(run, task);

      try {
        const result = await this.executeWorkflow(run, inputs, runtimeContext);

        return this.handleWorkflowResult(task, result);
      } finally {
        unsubscribe();
      }
    } catch (error) {
      return this.handleWorkflowError(task, error as Error);
    }
  }

  /**
   * Process feedback for a task (not applicable for workflow-driven agent)
   */
  async workOnFeedback(
    _task: Task,
    _feedbackList: Array<{ content: string }>,
    _context: string
  ): Promise<AgentLoopResult> {
    logger.warn(
      `WorkflowDrivenAgent ${this.name} received feedback, but feedback processing is not implemented for workflow agents`
    );

    return {
      error:
        'Feedback processing is not implemented for workflow-driven agents',
      metadata: this.getMetadata(),
    };
  }

  /**
   * Resume work on a suspended workflow
   */
  async workOnTaskResume(task: Task): Promise<void> {
    this.validateResumeConditions();

    try {
      this.setStatus(AGENT_STATUS_enum.RESUMED);
      this.workflowState.workflowStatus = 'running';

      const run = this.getCurrentRun();
      const result = await run.resume({
        step: task.id,
        resumeData: task.inputs || {},
      });

      this.workflowState.lastResult = result;
      this.handleWorkflowResult(task, result);
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

  // ===== PRIVATE METHODS =====

  /**
   * Create initial workflow state
   */
  private createInitialState(): WorkflowAgentState {
    return {
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
   * Initialize workflow execution
   */
  private initializeWorkflowExecution(
    task: Task,
    inputs: Record<string, unknown>
  ): void {
    this.setStatus(AGENT_STATUS_enum.THINKING);
    this.workflowState.metadata.startTime = Date.now();
    this.workflowState.workflowStatus = 'running';
    this.logWorkflowStart(task, inputs);
  }

  /**
   * Create runtime context with task data
   */
  private createRuntimeContext(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): RuntimeContext {
    const contextData = new Map<string, any>([
      ['task.id', task.id],
      ['task.description', task.description],
      ['task.status', task.status],
      ['task.inputs', inputs],
      ['task.context', context],
    ]);

    return {
      get: (path: string) => contextData.get(path),
      set: (path: string, value: any) => contextData.set(path, value),
      has: (path: string) => contextData.has(path),
      delete: (path: string) => contextData.delete(path),
      clear: () => contextData.clear(),
    };
  }

  /**
   * Setup workflow run
   */
  private setupWorkflowRun() {
    if (!this.workflow.committed) {
      this.workflow.commit();
    }

    const run = this.workflow.createRun();
    this.workflowState.currentRunId = run.runId;
    return run;
  }

  /**
   * Subscribe to workflow events
   */
  private subscribeToWorkflowEvents(run: any, task: Task) {
    return run.watch((event: any) => {
      this.handleWorkflowEvent(event, task);
    });
  }

  /**
   * Execute workflow
   */
  private async executeWorkflow(
    run: any,
    inputs: Record<string, unknown>,
    runtimeContext: RuntimeContext
  ) {
    const result = await run.start({
      inputData: inputs,
      runtimeContext,
    });

    this.workflowState.lastResult = result;
    this.workflowState.metadata.endTime = Date.now();

    return result;
  }

  /**
   * Handle workflow result based on status
   */
  private handleWorkflowResult(
    task: Task,
    result: WorkflowResult<any>
  ): AgentLoopResult {
    switch (result.status) {
      case 'completed':
        return this.handleWorkflowCompleted(task, result);
      case 'failed':
        return this.handleWorkflowFailed(task, result);
      case 'suspended':
        return this.handleWorkflowSuspended(task, result);
      default:
        throw new Error(`Unknown workflow status: ${(result as any).status}`);
    }
  }

  /**
   * Validate resume conditions
   */
  private validateResumeConditions(): void {
    if (!this.workflowState.currentRunId) {
      throw new Error('No active workflow run to resume');
    }

    if (this.workflowState.workflowStatus !== 'suspended') {
      throw new Error('Workflow is not in suspended state');
    }
  }

  /**
   * Get current workflow run
   */
  private getCurrentRun() {
    const run = this.workflow.runs.get(this.workflowState.currentRunId!);
    if (!run) {
      throw new Error('Workflow run not found');
    }
    return run;
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
    const executionTime = this.calculateExecutionTime();

    const commonParams = {
      agent: this,
      task,
      workflowId,
      runId,
      executionPath: metadata.executionPath,
    };

    switch (status) {
      case 'running':
        this.store?.getState()?.handleWorkflowRunning({
          ...commonParams,
          currentStepId: metadata.currentStepId,
        });
        break;
      case 'completed':
        this.store?.getState()?.handleWorkflowCompleted({
          ...commonParams,
          result: workflowState.result,
          totalSteps: metadata.totalSteps || 0,
          completedSteps: metadata.completedSteps || 0,
          executionTime,
        });
        break;
      case 'failed':
        this.store?.getState()?.handleWorkflowFailed({
          ...commonParams,
          error: workflowState.error,
          failedStepId: metadata.failedStepId,
        });
        break;
      case 'suspended':
        this.store?.getState()?.handleWorkflowSuspended({
          ...commonParams,
          suspendReason: metadata.suspendReason,
          suspendedSteps: metadata.suspendedSteps,
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

    const commonParams = {
      agent: this,
      task,
      workflowId,
      runId,
      stepId,
      stepDescription: metadata.stepDescription,
    };

    switch (stepStatus) {
      case 'running':
        this.store?.getState()?.handleWorkflowStepStarted({
          ...commonParams,
          stepInput: metadata.stepInput,
        });
        break;
      case 'completed':
        this.store?.getState()?.handleWorkflowStepCompleted({
          ...commonParams,
          stepOutput: stepResult?.output,
          stepDuration: metadata.stepDuration,
        });
        break;
      case 'failed':
        this.store?.getState()?.handleWorkflowStepFailed({
          ...commonParams,
          error: stepResult?.error,
          stepInput: metadata.stepInput,
        });
        break;
      case 'suspended':
        this.store?.getState()?.handleWorkflowStepSuspended({
          ...commonParams,
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

    this.logWorkflowCompleted(task, result);
    this.updateTaskStoreForCompletion(task, result);

    return {
      result: (result as any).result,
      metadata: this.getMetadata(),
    };
  }

  /**
   * Handle failed workflow
   */
  private handleWorkflowFailed(
    task: Task,
    result: WorkflowResult<any>
  ): AgentLoopResult {
    this.setStatus(AGENT_STATUS_enum.TASK_ABORTED);
    this.workflowState.workflowStatus = 'failed';
    this.workflowState.lastError = (result as any).error as Error;
    this.workflowState.metadata.iterations++;

    this.logWorkflowFailed(task, result);

    // CRITICAL FIX: Set workflow status to ERRORED first
    this.store?.getState()?.handleWorkflowError((result as any).error);

    // Then update task-specific error handling
    this.updateTaskStoreForFailure(task, result);

    return {
      error: `Workflow execution failed: ${(result as any).error.message}`,
      metadata: this.getMetadata(),
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

    this.logWorkflowSuspended(task, result);
    this.store?.getState()?.handleAgentTaskPaused({ task });

    return {
      error: 'Workflow suspended - requires manual intervention',
      metadata: this.getMetadata(),
    };
  }

  /**
   * Handle workflow errors - FIXED: Now properly sets ERRORED status
   */
  private handleWorkflowError(task: Task, error: Error): AgentLoopResult {
    this.setStatus(AGENT_STATUS_enum.TASK_ABORTED);
    this.workflowState.workflowStatus = 'failed';
    this.workflowState.lastError = error;
    this.workflowState.metadata.iterations++;

    this.logWorkflowError(task, error);

    // CRITICAL FIX: Call handleWorkflowError first to set ERRORED status
    this.store?.getState()?.handleWorkflowError(error);

    // Then update agent-specific error handling
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
      metadata: this.getMetadata(),
    };
  }

  /**
   * Update task store for completion
   */
  private updateTaskStoreForCompletion(
    task: Task,
    result: WorkflowResult<any>
  ): void {
    const executionTime = this.calculateExecutionTime();

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
  }

  /**
   * Update task store for failure
   */
  private updateTaskStoreForFailure(
    task: Task,
    result: WorkflowResult<any>
  ): void {
    this.store?.getState()?.handleWorkflowAgentTaskAborted({
      agent: this,
      task,
      workflowId: this.workflow.id,
      runId: this.workflowState.currentRunId || 'unknown',
      error: (result as any).error,
      reason: 'Workflow execution failed',
    });
  }

  /**
   * Calculate execution time
   */
  private calculateExecutionTime(): number {
    return this.workflowState.metadata.endTime &&
      this.workflowState.metadata.startTime
      ? this.workflowState.metadata.endTime -
          this.workflowState.metadata.startTime
      : 0;
  }

  /**
   * Get metadata for agent loop result
   */
  private getMetadata() {
    return {
      iterations: this.workflowState.metadata.iterations,
      maxAgentIterations: 10,
    };
  }

  /**
   * Reset workflow state
   */
  private resetWorkflowState(): void {
    this.workflowState = this.createInitialState();
  }

  // ===== LOGGING METHODS =====

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
