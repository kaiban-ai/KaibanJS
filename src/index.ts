/**
 * API module for the Library.
 *
 * This module defines the primary classes used throughout the library, encapsulating
 * the core functionalities of agents, tasks, and team coordination. It serves as the
 * public interface for the library, allowing external applications to interact with
 * and utilize the main features provided.
 *
 * Classes:
 * - Agent: Represents an entity capable of performing tasks using specific AI models.
 *   Agents have properties such as name, role, and the tools they use, and are capable
 *   of executing tasks based on these properties.
 * - Task: Defines a specific activity or job that an agent can perform. Tasks are
 *   characterized by descriptions, expected outcomes, and their deliverability status.
 * - Team: Manages a group of agents and orchestrates the execution of tasks. It is
 *   responsible for coordinating the agents to achieve collective goals effectively.
 */

import { v4 as uuidv4 } from 'uuid';
import { BaseAgent, Env, ReactChampionAgent } from './agents';
import { subscribeTaskStatusUpdates } from './subscribers/taskSubscriber';
import { subscribeWorkflowStatusUpdates } from './subscribers/teamSubscriber';
import {
  AGENT_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
} from './utils/enums';
import { subscribeDeterministicExecution } from './subscribers/deterministicExecutionSubscriber';
import { CombinedStoresState, TeamStore } from './stores/teamStore.types';
import { createTeamStore } from './stores';
import { ZodSchema } from 'zod';
import { oget } from './utils/objectUtils';
import {
  WorkflowBlockedLog,
  WorkflowFinishedLog,
  WorkflowResult,
  WorkflowStats,
} from './types/logs';
import { BaseTool } from './tools/baseTool';
import { LangChainChatModel, LLMConfig } from './utils/agents';
import { DefaultPrompts } from './utils/prompts';
import { TaskFeedback, TaskResult, TaskStats } from './stores/taskStore.types';
import { AgentLoopResult } from './utils/llm.types';

/**
 * Interface for Agent configuration
 */
interface AgentConfig {
  type?: string;
  name: string;
  role: string;
  goal: string;
  background: string;
  tools?: BaseTool[];
  llmConfig?: LLMConfig;
  maxIterations?: number;
  forceFinalAnswer?: boolean;
  promptTemplates?: DefaultPrompts;
  llmInstance?: LangChainChatModel;
}

/**
 * Interface for Task configuration
 */
interface TaskConfig {
  title?: string;
  id?: string;
  description: string;
  expectedOutput: string;
  agent: Agent;
  dependencies?: string[];
  isDeliverable?: boolean;
  externalValidationRequired?: boolean;
  outputSchema?: ZodSchema | null;
  allowParallelExecution?: boolean;
  referenceId?: string;
}

/**
 * Interface for Team configuration
 */
interface TeamConfig {
  name: string;
  agents: Agent[];
  tasks: Task[];
  logLevel?: string;
  inputs?: Record<string, unknown>;
  env?: Env;
  insights?: string;
  memory?: boolean;
}

export class Agent {
  agentInstance: BaseAgent;
  type: string;

  constructor({ type, ...config }: AgentConfig) {
    this.agentInstance = this.createAgent(type, config);
    this.type = type || 'ReactChampionAgent';
  }

  createAgent(type: string | undefined, config: AgentConfig): BaseAgent {
    switch (type) {
      case 'ReactChampionAgent':
        return new ReactChampionAgent(config);
      default:
        return new ReactChampionAgent(config);
    }
  }

  workOnTask(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): Promise<AgentLoopResult> {
    return this.agentInstance.workOnTask(task, inputs, context);
  }

  workOnTaskResume(task: Task): Promise<void> {
    return this.agentInstance.workOnTaskResume(task);
  }

  workOnFeedback(
    task: Task,
    feedbackList: Array<{ content: string }>,
    context: string
  ): Promise<AgentLoopResult> {
    return this.agentInstance.workOnFeedback(task, feedbackList, context);
  }

  setStatus(status: AGENT_STATUS_enum): void {
    this.agentInstance.setStatus(status);
  }

  initialize(store: TeamStore, env: Env): void {
    this.agentInstance.initialize(store, env);
  }

  updateEnv(env: Env): void {
    this.agentInstance.updateEnv(env);
  }

  reset(): void {
    this.agentInstance.reset();
  }

  // Proxy property access to the underlying agent instance
  get id(): string {
    return this.agentInstance.id;
  }

  get name(): string {
    return this.agentInstance.name;
  }

  get role(): string {
    return this.agentInstance.role;
  }

  get goal(): string {
    return this.agentInstance.goal;
  }

  get background(): string {
    return this.agentInstance.background;
  }

  get tools(): BaseTool[] {
    return this.agentInstance.tools;
  }

  get status(): string {
    return this.agentInstance.status;
  }

  set status(status: AGENT_STATUS_enum) {
    this.agentInstance.setStatus(status);
  }

  get llmConfig(): LLMConfig {
    return this.agentInstance.llmConfig;
  }

  get llmSystemMessage(): string | null {
    return this.agentInstance.llmSystemMessage;
  }

  get forceFinalAnswer(): boolean {
    return this.agentInstance.forceFinalAnswer;
  }

  get promptTemplates(): DefaultPrompts {
    return this.agentInstance.promptTemplates;
  }
}

export class Task {
  id: string;
  title: string;
  description: string;
  isDeliverable: boolean;
  agent: Agent;
  status: TASK_STATUS_enum;
  result: TaskResult | null;
  stats: TaskStats | null;
  duration: number | null;
  dependencies: string[];
  interpolatedTaskDescription: string | null;
  feedbackHistory: TaskFeedback[];
  externalValidationRequired: boolean;
  outputSchema: ZodSchema | null;
  expectedOutput: string;
  allowParallelExecution: boolean;
  referenceId?: string;
  inputs?: Record<string, unknown>;
  store?: TeamStore;

  constructor({
    title = '',
    id = uuidv4(),
    description,
    expectedOutput,
    agent,
    dependencies = [],
    isDeliverable = false,
    externalValidationRequired = false,
    outputSchema = null,
    allowParallelExecution = false,
    referenceId = undefined,
  }: TaskConfig) {
    this.id = id;
    this.title = title; // Title is now optional with a default empty string
    this.description = description;
    this.isDeliverable = isDeliverable;
    this.agent = agent;
    this.status = TASK_STATUS_enum.TODO;
    this.result = null;
    this.stats = null;
    this.duration = null;
    this.dependencies = dependencies;
    this.interpolatedTaskDescription = null;
    this.feedbackHistory = []; // Initialize feedbackHistory as an empty array
    this.externalValidationRequired = externalValidationRequired;
    this.outputSchema = outputSchema; // Zod Schema
    this.expectedOutput = expectedOutput;
    this.allowParallelExecution = allowParallelExecution;
    this.referenceId = referenceId;
  }
}

/**
 * Represents a team of AI agents working on a set of tasks.
 * This class provides methods to control the workflow, interact with tasks,
 * and observe the state of the team's operations.
 */
export class Team {
  store: TeamStore;

  /**
   * Creates a new Team instance.
   *
   * @param config - The configuration object for the team.
   */
  constructor({
    name,
    agents,
    tasks,
    logLevel,
    inputs = {},
    env = {},
    insights = '',
    memory = true,
  }: TeamConfig) {
    this.store = createTeamStore({
      name,
      agents: [],
      tasks: [],
      inputs,
      env,
      logLevel,
      insights,
      memory,
    });

    // Add agents and tasks to the store, they will be set with the store automatically
    this.store.getState().addAgents(agents);
    this.store.getState().addTasks(tasks);

    // Subscribe to task updates: Used mainly for logging purposes
    subscribeTaskStatusUpdates(this.store);

    // Subscribe to WorkflowStatus updates: Used mainly for loggin purposes
    subscribeWorkflowStatusUpdates(this.store);

    // Subscribe to Deterministic Execution: Used to execute tasks in a deterministic order
    subscribeDeterministicExecution(this.store);
  }

  /**
   * Pauses the team's workflow.
   * This method temporarily halts the workflow, allowing for manual intervention or adjustments.
   */
  pause(): Promise<void> {
    return this.store.getState().pauseWorkflow();
  }

  /**
   * Resumes the team's workflow.
   * This method continues the workflow after it has been paused.
   */
  resume(): Promise<void> {
    return this.store.getState().resumeWorkflow();
  }

  /**
   * Stops the team's workflow.
   * This method stops the workflow, preventing unknown further task execution.
   */
  stop(): Promise<void> {
    return this.store.getState().stopWorkflow();
  }

  /**
   * Starts the team's workflow.
   * This method initiates the process of agents working on tasks.
   *
   * @param inputs - Optional inputs to override or supplement the initial inputs.
   * @returns A promise that resolves when the workflow completes or rejects on error.
   */
  async start(inputs: Record<string, unknown> = {}): Promise<WorkflowResult> {
    return new Promise((resolve, reject) => {
      const unsubscribe = this.store.subscribe(
        (state: CombinedStoresState) => state.teamWorkflowStatus,
        // @ts-expect-error: Zustand subscribe overload is not properly typed
        (status: WORKFLOW_STATUS_enum) => {
          const state = this.store.getState();
          switch (status) {
            case WORKFLOW_STATUS_enum.FINISHED:
              unsubscribe();
              resolve({
                status,
                result: state.workflowResult,
                stats: this.getWorkflowStats(),
              });
              break;
            case WORKFLOW_STATUS_enum.ERRORED:
              unsubscribe();
              reject(new Error('Workflow encountered an error'));
              break;
            case WORKFLOW_STATUS_enum.BLOCKED:
              unsubscribe();
              resolve({
                status,
                result: null,
                stats: this.getWorkflowStats(),
              });
              break;
            default:
              // For other statuses (like RUNNING), we don't resolve yet
              break;
          }
        }
      );

      try {
        // Trigger the workflow
        this.store.getState().startWorkflow(inputs);
      } catch (error) {
        reject(error);
        // Unsubscribe to prevent memory leaks in case of an error
        unsubscribe();
      }
    });
  }

  /**
   * Provides direct access to the underlying store.
   * This method is intended for advanced users who need more control over the state.
   * More DX friendly for NodeJS Developers
   *
   * @returns The store object.
   */
  getStore(): TeamStore {
    return this.store;
  }

  /**
   * Provides direct access to the underlying store.
   * This method is intended for advanced users who need more control over the state.
   * More DX friendly for React Developers
   *
   * @returns The store object.
   */
  useStore(): TeamStore {
    return this.store;
  }

  /**
   * Enhanced subscribeToChanges to listen for specific properties
   *
   * @param listener - Function to call when properties change
   * @param properties - Array of property names to monitor
   * @returns Unsubscribe function
   */
  subscribeToChanges(
    listener: (changes: Record<string, unknown>) => void,
    properties: string[] = []
  ): () => void {
    if (properties.length === 0) {
      // No specific properties, return global subscription
      return this.store.subscribe((_state: CombinedStoresState) =>
        listener({})
      );
    }

    let currentValues = properties.reduce(
      (acc, prop) => ({
        ...acc,
        [prop]: oget(
          this.store.getState() as unknown as Record<string, unknown>,
          prop
        ),
      }),
      {} as Record<string, unknown>
    );

    return this.store.subscribe(() => {
      const state = this.store.getState();
      let hasChanged = false;
      const newValues: Record<string, unknown> = {};

      properties.forEach((prop) => {
        const newValue = oget(
          state as unknown as Record<string, unknown>,
          prop
        );
        if (newValue !== currentValues[prop]) {
          hasChanged = true;
          newValues[prop] = newValue;
        }
      });

      if (hasChanged) {
        currentValues = { ...currentValues, ...newValues };
        listener(newValues);
      }
    });
  }

  /**
   * Provides feedback on a specific task.
   * This method is crucial for the Human-in-the-Loop (HITL) functionality,
   * allowing for human intervention and guidance in the AI workflow.
   *
   * @param taskId - The ID of the task to provide feedback on.
   * @param feedbackContent - The feedback to be incorporated into the task.
   */
  provideFeedback(taskId: string, feedbackContent: string): void {
    this.store.getState().provideFeedback(taskId, feedbackContent);
  }

  /**
   * Marks a task as validated.
   * This method is used in the HITL process to approve a task that required validation.
   *
   * @param taskId - The ID of the task to be marked as validated.
   */
  validateTask(taskId: string): void {
    this.store.getState().validateTask(taskId);
  }

  /**
   * Subscribes to changes in the workflow status.
   * This method allows real-time monitoring of the overall workflow progress.
   *
   * @param callback - A function to be called when the workflow status changes.
   * @returns A function to unsubscribe from the status changes.
   */
  onWorkflowStatusChange(callback: (status: string) => void): () => void {
    return this.store.subscribe(
      (state: CombinedStoresState) => state.teamWorkflowStatus,
      // @ts-expect-error: Zustand subscribe overload is not properly typed
      callback
    );
  }

  /**
   * Retrieves tasks filtered by a specific status.
   *
   * @param status - The status to filter tasks by. Should be one of TASK_STATUS_enum values.
   * @returns An array of tasks with the specified status.
   */
  getTasksByStatus(status: string): Task[] {
    return this.store
      .getState()
      .tasks.filter((task: Task) => task.status === status);
  }

  /**
   * Retrieves the current status of the workflow.
   * This method provides a snapshot of the workflow's current state.
   *
   * @returns The current workflow status.
   */
  getWorkflowStatus(): string {
    return this.store.getState().teamWorkflowStatus;
  }

  /**
   * Retrieves the final result of the workflow.
   * This method should be called only after the workflow has finished.
   *
   * @returns The workflow result if finished, null otherwise.
   */
  getWorkflowResult(): unknown {
    const state = this.store.getState();
    if (state.teamWorkflowStatus === WORKFLOW_STATUS_enum.FINISHED) {
      return state.workflowResult;
    }
    return null;
  }

  /**
   * Retrieves all tasks in the team's workflow.
   * This method provides a comprehensive view of all tasks and their current states.
   *
   * @returns An array of all tasks.
   */
  getTasks(): Task[] {
    return this.store.getState().tasks;
  }

  /**
   * Retrieves the workflow completion statistics.
   * This method finds the completion log in the workflow logs and returns the associated statistics.
   *
   * @returns The workflow completion statistics, or null if no completion log is found.
   */
  getWorkflowStats(): WorkflowStats | null {
    const state = this.store.getState();
    const logs = state.workflowLogs;

    // Find the log entry for when the workflow was marked as finished or blocked
    const completionLog = logs.find(
      (log) =>
        log.logType === 'WorkflowStatusUpdate' &&
        (log.workflowStatus === 'FINISHED' || log.workflowStatus === 'BLOCKED')
    ) as WorkflowFinishedLog | WorkflowBlockedLog | null;

    // Check if a completion log exists and return the specified statistics
    if (completionLog) {
      const {
        startTime,
        endTime,
        duration,
        llmUsageStats,
        iterationCount,
        costDetails,
        teamName,
        taskCount,
        agentCount,
      } = (completionLog as WorkflowFinishedLog).metadata ?? {};

      return {
        startTime,
        endTime,
        duration,
        llmUsageStats,
        iterationCount,
        costDetails,
        teamName,
        taskCount,
        agentCount,
      };
    } else {
      return null;
    }
  }
}
