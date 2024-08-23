/**
 * State Management Store.
 *
 * This file defines the Zustand store used across the library to manage and maintain state. The store
 * facilitates reactive and efficient updates to the state of agents, tasks, and team workflows, ensuring
 * that the application remains responsive and data-driven. It provides a centralized location for state.
 *
 * Usage:
 * The store is designed to be imported and used directly in components or services where state management
 * is required, offering straightforward access to state properties and actions to modify them.
 */
import { create, UseBoundStore } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { useAgentStore } from "./agentStore";
import { useTaskStore } from "./taskStore";
import {
  ENUM_TASK_STATUS,
  ENUM_AGENT_STATUS,
  ENUM_WORKFLOW_STATUS,
} from "../utils/enums";
import {
  getTaskTitleForLogs,
  interpolateTaskDescription,
} from "../utils/tasks";
import { logger, setLogLevel } from "../utils/logger";
import { calculateTotalWorkflowCost } from "../utils/llmCostCalculator";
import { subscribeWorkflowStatusUpdates } from "../subscribers/teamSubscriber";
import { subscribeTaskStatusUpdates } from "../subscribers/taskSubscriber";
import { setupWorkflowController } from "./workflowController";
import { TEnv } from "../utils/types";

export type TTeamStoreState = {
  teamWorkflowStatus?: ENUM_WORKFLOW_STATUS;
  workflowResult?: any;
  name?: string;
  agents?: any[];
  tasks?: any[];
  workflowLogs?: any[];
  inputs?: Record<string, any>;
  workflowContext?: string;
  env?: Record<string, any>;
  logLevel?: string;
};

export type TTeamStore = {
  setInputs: (inputs: string[]) => void;
  getWorkflowStats: () => any;
  updateTaskStatus: (taskId: string, status: ENUM_TASK_STATUS) => void;
  resetWorkflowStateAction: () => void;
  prepareNewLog: (params: any) => any;
} & TTeamStoreState;

/**
 * --- Store Factory for Multiple Teams ---
 *
 * Implements a store factory instead of a standard Zustand store to manage state for multiple teams.
 *
 * This design supports isolated state management for each team's agents and workflows, allowing multiple teams to operate concurrently with their own tasks and statuses.
 *
 * ------------------------------
 */
const createTeamStore = (
  initialState: TTeamStoreState = {}
): UseBoundStore<any> => {
  // console.log("Initial state:", initialState); // Log the initial state
  // Define the store with centralized state management and actions
  if (initialState.logLevel) {
    setLogLevel(initialState.logLevel); // Update logger level if provided
  }
  const useTeamStore = create<
    TTeamStore,
    [
      ["zustand/devtools", TTeamStore],
      ["zustand/subscribeWithSelector", TTeamStore]
    ]
  >(
    devtools(
      subscribeWithSelector((set, get) => ({
        ...useAgentStore(set, get),
        ...useTaskStore(set, get),

        teamWorkflowStatus:
          initialState.teamWorkflowStatus || ENUM_WORKFLOW_STATUS.INITIAL,
        workflowResult: initialState.workflowResult || null,
        name: initialState.name || "",
        agents: initialState.agents || [],
        tasks: initialState.tasks || [],
        workflowLogs: initialState.workflowLogs || [],
        inputs: initialState.inputs || {},
        workflowContext: initialState.workflowContext || "",
        env: initialState.env || {},
        logLevel: initialState.logLevel,

        setInputs: (inputs: string[]) => set({ inputs }), // Add a new action to update inputs
        setName: (name: string) => set({ name }), // Add a new action to update inputs
        setEnv: (env: TEnv) => set({ env }), // Add a new action to update inputs

        addAgents: (agents: any[]) => {
          const { env } = get();
          agents.forEach((agent) => {
            agent.setStore(useTeamStore);
            agent.setEnv(env);
          });
          set((state) => ({ agents: [...state.agents, ...agents] }));
        },

        addTasks: (tasks: any[]) => {
          tasks.forEach((task) => task.setStore(useTeamStore));
          set((state) => ({
            tasks: [
              ...state.tasks,
              ...tasks.map((task: { agent: any }) => ({
                ...task,
                agent: task.agent,
              })),
            ],
          }));
        },

        updateTaskStatus: (taskId, status) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === taskId ? { ...task, status } : task
            ),
          })),

        startWorkflow: async (inputs: string[]) => {
          // Start the first task or set all to 'TODO' initially
          logger.info(`🚀 Team *${get().name}* is starting to work.`);
          get().resetWorkflowStateAction();

          if (inputs) {
            get().setInputs(inputs);
          }

          // Create a log entry to mark the initiation of the workflow
          const initialLog = {
            task: null,
            agent: null,
            timestamp: Date.now(),
            logDescription: `Workflow initiated for team *${get().name}*.`,
            workflowStatus: ENUM_WORKFLOW_STATUS.RUNNING, // Using RUNNING as the initial status
            metadata: {
              message: "Workflow has been initialized with input settings.",
              inputs: inputs, // Assuming you want to log the inputs used to start the workflow
            },
            logType: "WorkflowStatusUpdate",
          };

          // Update state with the new log
          set((state) => ({
            ...state,
            workflowLogs: [...state.workflowLogs, initialLog],
            teamWorkflowStatus: ENUM_WORKFLOW_STATUS.RUNNING,
          }));

          const tasks = get().tasks;
          if (tasks.length > 0 && tasks[0].status === ENUM_TASK_STATUS.TODO) {
            get().updateTaskStatus(tasks[0].id, ENUM_TASK_STATUS.DOING);
          }
        },

        resetWorkflowStateAction: () => {
          set((state) => {
            // Cloning tasks and agents to ensure there are no direct mutations
            const resetTasks = state.tasks.map((task) => ({
              ...task,
              status: "TODO",
              // Ensure to reset or clear any other task-specific states if needed
            }));

            get().agents.forEach((agent) => {
              agent.setStatus("INITIAL"); // Update status using agent's method
            });

            const resetAgents = [...state.agents];

            return {
              ...state,
              tasks: resetTasks,
              agents: resetAgents,
              workflowLogs: [],
              workflowContext: "",
              workflowResult: null,
              teamWorkflowStatus: ENUM_WORKFLOW_STATUS.INITIAL,
            };
          });
          logger.debug("Workflow state has been reset.");
        },

        // New function to handle finishing workflow
        finishWorkflowAction: () => {
          const stats = get().getWorkflowStats();
          const tasks = get().tasks;
          const deliverableTask = tasks
            .slice()
            .reverse()
            .find((task) => task.isDeliverable);
          const lastTaskResult = tasks[tasks.length - 1].result;

          // Detailed console logging
          logger.debug(
            `Workflow Result:`,
            deliverableTask ? deliverableTask.result : lastTaskResult
          );

          // Prepare the log entry for finishing the workflow
          const newLog = {
            task: null,
            agent: null,
            timestamp: Date.now(),
            logDescription: `Workflow finished with result: ${
              deliverableTask ? deliverableTask.result : lastTaskResult
            }`,
            workflowStatus: ENUM_WORKFLOW_STATUS.FINISHED,
            metadata: {
              result: deliverableTask ? deliverableTask.result : lastTaskResult,
              ...stats,
              teamName: get().name,
              taskCount: tasks.length,
              agentCount: get().agents.length,
            },
            logType: "WorkflowStatusUpdate",
          };

          // Update state with the final results and set workflow status
          set((state) => ({
            ...state,
            workflowResult: deliverableTask
              ? deliverableTask.result
              : lastTaskResult, // Set the final result
            teamWorkflowStatus: ENUM_WORKFLOW_STATUS.FINISHED, // Set status to indicate a finished workflow
            workflowLogs: [...state.workflowLogs, newLog], // Append new log to the logs array
          }));
        },
        // Add a new action to update teamWorkflowStatus
        setTeamWorkflowStatus: (status: any) =>
          set({ teamWorkflowStatus: status }),
        // Function to handle errors during workflow execution
        // Adjusted method to handle workflow errors
        handleWorkflowError: (
          task: { agent: any },
          error: { message: any }
        ) => {
          // Detailed console error logging
          logger.error(`Workflow Error:`, error.message);
          // Prepare the error log with specific workflow context
          const newLog = {
            task,
            agent: task.agent,
            timestamp: Date.now(),
            logDescription: `Workflow error encountered: ${error.message}`,
            workflowStatus: ENUM_WORKFLOW_STATUS.ERRORED,
            metadata: {
              error,
            },
            logType: "WorkflowStatusUpdate",
          };

          // Update state with error details and add new log entry
          set((state) => ({
            ...state,
            teamWorkflowStatus: ENUM_WORKFLOW_STATUS.ERRORED, // Set status to indicate an error
            workflowLogs: [...state.workflowLogs, newLog], // Append new log to the logs array
          }));
        },

        handleWorkflowBlocked: ({ task, error }) => {
          // Detailed console error logging
          logger.warn(`WORKFLOW BLOCKED:`, error.message);
          // Prepare the error log with specific workflow context
          const newLog = {
            task,
            agent: task.agent,
            timestamp: Date.now(),
            logDescription: `Workflow blocked encountered: ${error.message}`,
            workflowStatus: ENUM_WORKFLOW_STATUS.BLOCKED,
            metadata: {
              error,
            },
            logType: "WorkflowStatusUpdate",
          };

          // Update state with error details and add new log entry
          set((state) => ({
            ...state,
            teamWorkflowStatus: ENUM_WORKFLOW_STATUS.BLOCKED, // Set status to indicate a blocked workflow
            workflowLogs: [...state.workflowLogs, newLog], // Append new log to the logs array
          }));
        },

        performTask: async (
          agent: {
            executeTask: (
              arg0: any,
              arg1: Record<string, any>,
              arg2: string
            ) => any;
          },
          task: {
            status?: any;
            inputs?: any;
            description: any;
            interpolatedTaskDescription?: any;
            title?: string;
          }
        ) => {
          if (task && agent) {
            // Log the start of the task
            logger.debug(`Task: ${getTaskTitleForLogs(task)} starting...`);
            task.status = ENUM_TASK_STATUS.DOING;
            // Add a log entry for the task starting
            set((state) => {
              const newLog = get().prepareNewLog({
                agent,
                task,
                logDescription: `Task: ${getTaskTitleForLogs(task)} started.`,
                metadata: {}, // Initial metadata can be empty or include the start time
                logType: "TaskStatusUpdate",
              });
              return {
                ...state,
                workflowLogs: [...state.workflowLogs, newLog],
              };
            });

            try {
              // Execute the task and let the agent report completion
              task.inputs = get().inputs; // Pass the inputs to the task
              const interpolatedTaskDescription = interpolateTaskDescription(
                task.description,
                get().inputs
              );
              task.interpolatedTaskDescription = interpolatedTaskDescription;
              await agent.executeTask(
                task,
                get().inputs,
                get().workflowContext
              );
              // Once the task is completed, the handleAgentTaskCompleted will be triggered automatically
            } catch (error) {
              // We are let it propagate to the task execution and captured later on
              throw error; // Re-throw the error to be caught by the task execution
            }
          }
        },

        /**
         * Prepares a new log entry to the centralized activity logs.
         *
         * @param {Object} params - The parameters for the log entry.
         * @param {string} params.agentId - Identifier for the agent performing the action.
         * @param {string} params.taskId - Identifier of the task associated with this log entry.
         * @param {string} params.logDescription - Descriptive text detailing what the log entry is about.
         * @param {Object} params.metadata - Additional structured data providing more context about the action.
         * @param {string} params.logType - Categorization of the log entry to facilitate filtering and analysis.
         *
         */
        prepareNewLog: ({ agent, task, logDescription, metadata, logType }) => {
          const timestamp = Date.now(); // Current time in milliseconds since Unix Epoch

          // Construct the new log entry
          const newLog = {
            timestamp,
            task,
            agent,
            agentName: agent ? agent.name : "Unknown Agent",
            taskTitle: task ? getTaskTitleForLogs(task) : "Untitled Task",
            logDescription,
            taskStatus: task ? task.status : "Unknown",
            agentStatus: agent ? agent.status : "Unknown",
            metadata,
            logType,
          };

          return newLog;
        },
        clearAll: () =>
          set({
            agents: [],
            tasks: [],
            inputs: {},
            workflowLogs: [],
            workflowContext: "",
            workflowResult: null,
            teamWorkflowStatus: ENUM_WORKFLOW_STATUS.INITIAL,
          }),
        getWorkflowStats() {
          const endTime = Date.now(); // Consider the current time as the end time
          const workflowLogs = get().workflowLogs;
          const lastWorkflowRunningLog = workflowLogs
            .slice()
            .reverse()
            .find(
              (log) =>
                log.logType === "WorkflowStatusUpdate" &&
                log.workflowStatus === "RUNNING"
            );

          const startTime = lastWorkflowRunningLog
            ? lastWorkflowRunningLog.timestamp
            : Date.now();
          const duration = (endTime - startTime) / 1000; // Calculate duration in seconds
          let modelUsageStats = {};

          let llmUsageStats = {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0,
          };
          let iterationCount = 0;

          // Iterate over logs for usage stats, starting from the found 'INITIAL' timestamp
          workflowLogs.forEach((log) => {
            if (
              log.logType === "AgentStatusUpdate" &&
              log.timestamp >= startTime
            ) {
              if (log.agentStatus === ENUM_AGENT_STATUS.THINKING_END) {
                const modelCode = log.agent.llmConfig.model;
                if (!modelUsageStats[modelCode]) {
                  modelUsageStats[modelCode] = {
                    inputTokens: 0,
                    outputTokens: 0,
                    callsCount: 0,
                  };
                }
                modelUsageStats[modelCode].inputTokens +=
                  log.metadata.output.llmUsageStats.inputTokens;
                modelUsageStats[modelCode].outputTokens +=
                  log.metadata.output.llmUsageStats.outputTokens;
                modelUsageStats[modelCode].callsCount += 1; // Each log entry counts as a call
                llmUsageStats.inputTokens +=
                  log.metadata.output.llmUsageStats.inputTokens;
                llmUsageStats.outputTokens +=
                  log.metadata.output.llmUsageStats.outputTokens;
                llmUsageStats.callsCount += 1;
              } else if (log.agentStatus === ENUM_AGENT_STATUS.THINKING_ERROR) {
                llmUsageStats.callsErrorCount += 1;
              } else if (
                log.agentStatus === ENUM_AGENT_STATUS.ISSUES_PARSING_LLM_OUTPUT
              ) {
                llmUsageStats.parsingErrors += 1;
              } else if (log.agentStatus === ENUM_AGENT_STATUS.ITERATION_END) {
                iterationCount += 1;
              }
            }
          });

          // Calculate total costs based on the model usage stats
          const costDetails = calculateTotalWorkflowCost(modelUsageStats);

          return {
            startTime,
            endTime,
            duration,
            llmUsageStats,
            iterationCount,
            costDetails,
          };
        },
        getCleanedState() {
          // Function to clean individual agent data
          const cleanAgent = (agent: {
            llmConfig: any;
            agentInstance: { llmConfig: any };
          }) => ({
            ...agent,
            id: "[REDACTED]", // Clean sensitive ID at the root level
            env: "[REDACTED]", // Clean sensitive Env in agent
            llmConfig: agent.llmConfig
              ? {
                  ...agent.llmConfig,
                  apiKey: "[REDACTED]", // Clean API key at the root level
                }
              : {}, // Provide an empty object if llmConfig is undefined at the root level
            agentInstance: agent.agentInstance
              ? {
                  ...agent.agentInstance,
                  id: "[REDACTED]", // Clean sensitive ID in agentInstance
                  env: "[REDACTED]", // Clean sensitive Env in agentInstance
                  llmConfig: agent.agentInstance.llmConfig
                    ? {
                        ...agent.agentInstance.llmConfig,
                        apiKey: "[REDACTED]", // Clean API key in agentInstance llmConfig
                      }
                    : {}, // Provide an empty object if llmConfig is undefined in agentInstance
                }
              : {}, // Provide an empty object if agentInstance is undefined
          });

          // Function to clean individual task data
          const cleanTask = (task: { agent: any }) => ({
            ...task,
            id: "[REDACTED]", // Clean sensitive ID
            agent: task.agent ? cleanAgent(task.agent) : null, // Clean the nested agent if exists
            duration: "[REDACTED]",
            endTime: "[REDACTED]",
            startTime: "[REDACTED]",
          });

          // Function to clean log metadata
          const cleanMetadata = (metadata: {
            duration: any;
            endTime: any;
            startTime: any;
          }) => ({
            ...metadata,
            duration: metadata.duration ? "[REDACTED]" : metadata.duration,
            endTime: metadata.endTime ? "[REDACTED]" : metadata.endTime,
            startTime: metadata.startTime ? "[REDACTED]" : metadata.startTime,
          });

          // Clone and clean agents
          const cleanedAgents = get().agents.map((agent) => cleanAgent(agent));

          // Clone and clean tasks, including the nested agents
          const cleanedTasks = get().tasks.map((task) => cleanTask(task));

          // Clone and clean workflowLogs, including the potential agents and tasks
          const cleanedWorkflowLogs = get().workflowLogs.map((log) => ({
            ...log,
            agent: log.agent ? cleanAgent(log.agent) : null, // Clean the agent if exists
            task: log.task ? cleanTask(log.task) : null, // Clean the task if exists
            timestamp: "[REDACTED]",
            metadata: log.metadata ? cleanMetadata(log.metadata) : {}, // Clean metadata if exists
          }));

          // Return only the parts of the state necessary for the snapshot or further processing
          return {
            teamWorkflowStatus: get().teamWorkflowStatus,
            workflowResult: get().workflowResult,
            name: get().name,
            agents: cleanedAgents,
            tasks: cleanedTasks,
            workflowLogs: cleanedWorkflowLogs,
            inputs: get().inputs,
            workflowContext: get().workflowContext,
            logLevel: get().logLevel,
            // Include other state parts as necessary, cleaned as needed
          };
        },
      }))
    )
  );

  /**
   * --- Workflow Controller Initialization ---
   *
   * Activates the workflow controller to monitor and manage task transitions and overall workflow states:
   * - Monitors changes in task statuses, handling transitions from TODO to DONE.
   * - Ensures tasks proceed seamlessly through their lifecycle stages within the application.
   *
   * ------------------------------
   */
  setupWorkflowController(useTeamStore);

  /**
   * Subscribe to task updates: Used mainly for logging purposes
   */
  subscribeTaskStatusUpdates(useTeamStore);

  /**
   * Subscribe to WorkflowStatus updates: Used mainly for loggin purposes
   */
  subscribeWorkflowStatusUpdates(useTeamStore);

  return useTeamStore;
};

export { createTeamStore };
