/**
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\stores\agentStore.ts
 * 
 * Agent Store Configuration.
 */

import { AGENT_STATUS_enum, TASK_STATUS_enum } from "../utils/enums";
import { logger } from "../utils/logger";
import type { 
    AgentType, 
    TaskType, 
    Output, 
    ErrorType, 
    AgentStoreState, 
    PrepareNewLogParams, 
    Log,
    TaskStats,
    FeedbackObject
} from '../../types/types';

export const useAgentStore = (
    set: (fn: (state: AgentStoreState) => Partial<AgentStoreState>) => void,
    get: () => AgentStoreState
): AgentStoreState => ({
    // BaseStoreState properties
    name: '',
    agents: [],
    tasks: [],
    workflowLogs: [],

    // TaskStoreState properties
    tasksInitialized: false,
    
    getTaskStats: (task: TaskType): TaskStats => {
        const endTime = Date.now();
        const lastDoingLog = get().workflowLogs.slice().reverse().find(log =>
            log.task && log.task.id === task.id && log.logType === "TaskStatusUpdate" && log.taskStatus === 'DOING'
        );
        const startTime = lastDoingLog ? lastDoingLog.timestamp : endTime;
        const duration = (endTime - startTime) / 1000;
    
        let llmUsageStats = {
            inputTokens: 0,
            outputTokens: 0,
            callsCount: 0,
            callsErrorCount: 0,
            parsingErrors: 0
        };
        let iterationCount = 0;
    
        get().workflowLogs.forEach(log => {
            if (log.task && log.task.id === task.id && log.timestamp >= startTime && log.logType === 'AgentStatusUpdate') {
                if (log.agentStatus === 'THINKING_END') {
                    llmUsageStats.inputTokens += log.metadata.output.llmUsageStats.inputTokens;
                    llmUsageStats.outputTokens += log.metadata.output.llmUsageStats.outputTokens;
                    llmUsageStats.callsCount += 1;
                }
                if (log.agentStatus === 'THINKING_ERROR') {
                    llmUsageStats.callsErrorCount += 1;
                }
                if (log.agentStatus === 'ISSUES_PARSING_LLM_OUTPUT') {
                    llmUsageStats.parsingErrors += 1;
                }
                if (log.agentStatus === 'ITERATION_END') {
                    iterationCount += 1;
                }
            }
        });
    
        return {
            startTime,
            endTime,
            duration,
            llmUsageStats,
            iterationCount
        };
    },

    provideFeedback: async (taskId: string, feedbackContent: string): Promise<void> => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
            logger.error("Task not found for feedback");
            return;
        }

        const newFeedback: FeedbackObject = {
            id: `feedback-${Date.now()}`,
            content: feedbackContent,
            status: 'PENDING',
            timestamp: new Date(),
            userId: 'system'
        };

        set(state => ({
            tasks: state.tasks.map(t => t.id === taskId ? {
                ...t,
                feedbackHistory: [...(t.feedbackHistory || []), newFeedback],
                status: 'REVISE' as keyof typeof TASK_STATUS_enum
            } : t)
        }));
    },

    handleTaskError: (params: { task: TaskType; error: ErrorType }): void => {
        const { task, error } = params;
        logger.error(`Task error for ${task.id}: ${error.message}`);
        const stats = get().getTaskStats(task);
        
        set(state => ({
            tasks: state.tasks.map(t => 
                t.id === task.id ? { 
                    ...t, 
                    status: 'BLOCKED' as keyof typeof TASK_STATUS_enum,
                    error: error.message,
                    ...stats
                } : t
            )
        }));
    },

    handleTaskBlocked: (params: { task: TaskType; error: ErrorType }): void => {
        const { task, error } = params;
        logger.warn(`Task blocked: ${task.id}, Error: ${error.message}`);
        const stats = get().getTaskStats(task);
        
        set(state => ({
            tasks: state.tasks.map(t => 
                t.id === task.id ? { 
                    ...t, 
                    status: 'BLOCKED' as keyof typeof TASK_STATUS_enum,
                    ...stats
                } : t
            )
        }));
    },

    handleTaskCompleted: ({ agent, task, result }: { agent: AgentType; task: TaskType; result: any }): void => {
        logger.debug(`Task completed: ${task.id}, Result: ${result}`);
        const stats = get().getTaskStats(task);
        
        set(state => ({
            tasks: state.tasks.map(t => 
                t.id === task.id ? { 
                    ...t, 
                    status: 'DONE' as keyof typeof TASK_STATUS_enum, 
                    result,
                    ...stats
                } : t
            )
        }));
    },

    getWorkflowStats: (): Record<string, any> => {
        const tasks = get().tasks;
        return {
            taskCount: tasks.length,
            completedTasks: tasks.filter(t => t.status === 'DONE').length,
            blockedTasks: tasks.filter(t => t.status === 'BLOCKED').length,
            taskStats: tasks.map(task => get().getTaskStats(task))
        };
    },

    finishWorkflowAction: (): void => {
        logger.info('Workflow finished');
        const stats = get().getWorkflowStats();
        set(state => ({
            workflowLogs: [
                ...state.workflowLogs,
                {
                    timestamp: Date.now(),
                    task: null,
                    agent: null,
                    agentName: 'System',
                    taskTitle: 'Workflow Completion',
                    logDescription: 'Workflow completed successfully',
                    taskStatus: 'DONE' as keyof typeof TASK_STATUS_enum,
                    agentStatus: 'TASK_COMPLETED' as keyof typeof AGENT_STATUS_enum,
                    metadata: { stats },
                    logType: 'WorkflowStatusUpdate'
                }
            ]
        }));
    },

    // Agent-specific methods
    handleAgentIterationStart: ({ agent, task, iterations, maxAgentIterations }: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }) => {
        agent.status = 'ITERATION_START' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🏁 Agent ${agent.name} - ${AGENT_STATUS_enum.ITERATION_START} (${iterations+1}/${maxAgentIterations})`,
            metadata: { iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status
        });
        logger.trace(`🏁 ${AGENT_STATUS_enum.ITERATION_START}: Agent ${agent.name} -  (${iterations+1}/${maxAgentIterations})`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));        
    },
    
    handleAgentIterationEnd: ({ agent, task, iterations, maxAgentIterations }: { agent: AgentType; task: TaskType; iterations: number; maxAgentIterations: number }) => {
        agent.status = 'ITERATION_END' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🔄 Agent ${agent.name} - ${AGENT_STATUS_enum.ITERATION_END}`,
            metadata: { iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        }); 
        logger.trace(`🔄 ${AGENT_STATUS_enum.ITERATION_END}: Agent ${agent.name} ended another iteration.`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));     
    },

    handleAgentThinkingStart: ({ agent, task, messages }: { agent: AgentType; task: TaskType; messages: any[] }) => {
        agent.status = 'THINKING' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🤔 Agent ${agent.name} starts thinking...`,
            metadata: { messages },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🤔 ${AGENT_STATUS_enum.THINKING}: Agent ${agent.name} starts thinking...`);
        logger.debug('System Message:', messages[0]);
        logger.debug('Feedback Message:', messages[messages.length - 1].content);
        logger.debug('All Messages', messages);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentThinkingEnd: ({ agent, task, output }: { agent: AgentType; task: TaskType; output: Output }) => {
        agent.status = 'THINKING_END' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🤔 Agent ${agent.name} finished thinking.`,
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`💡 ${AGENT_STATUS_enum.THINKING_END}: Agent ${agent.name} finished thinking.`);
        logger.trace(`Output:`, output.parsedLLMOutput);
        logger.trace(`Usage:`, output.llmUsageStats);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentThinkingError: ({ agent, task, error }: { agent: AgentType; task: TaskType; error: ErrorType }) => {
        const errorToLog = error.originalError || error;
        agent.status = 'THINKING_ERROR' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🛑 Agent ${agent.name} encountered an error during ${AGENT_STATUS_enum.THINKING}.`,
            metadata: { error: errorToLog },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.error(`🛑 ${AGENT_STATUS_enum.THINKING_ERROR}: Agent ${agent.name} encountered an error thinking. Further details: ${error.name ? error.name : 'No additional error details'}`, errorToLog.message);
        set(state => ({ 
            workflowLogs: [...state.workflowLogs, newLog]
        }));
        get().handleTaskBlocked({ task, error });
    },

    handleAgentIssuesParsingLLMOutput: ({ agent, task, output, error }: { agent: AgentType; task: TaskType; output: Output; error: ErrorType }) => {
        agent.status = 'ISSUES_PARSING_LLM_OUTPUT' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `😡 Agent ${agent.name} found some ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}. ${error.message}`,
            metadata: { output, error },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });        
        logger.debug(`😡 ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}: Agent ${agent.name} found issues parsing the LLM output. ${error.message}`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentActionStart: ({ agent, task, action, runId }: { agent: AgentType; task: TaskType; action: any; runId: string }) => {
        agent.status = 'EXECUTING_ACTION' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `Agent action started: ${action}`,
            metadata: { action, runId },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status
        });
        logger.info(`▶️ EXECUTE_ACTION: Agent ${agent.name} use tool ${action.tool} with the following input: ${action.toolInput}`, action);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentToolStart: ({ agent, task, tool, input }: { agent: AgentType; task: TaskType; tool: any; input: any }) => {
        agent.status = 'USING_TOOL' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🛠️⏳ Agent ${agent.name} is ${AGENT_STATUS_enum.USING_TOOL} ${tool.name}...`,
            metadata: { tool, input },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🛠️⏳ ${AGENT_STATUS_enum.USING_TOOL}: Agent ${agent.name} is using ${tool.name}...`);
        logger.debug(`Tool Input:`, input);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentToolEnd: ({ agent, task, output, tool }: { agent: AgentType; task: TaskType; output: any; tool: any }) => {
        agent.status = 'USING_TOOL_END' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${agent.name} - got results from tool:${tool.name}`,
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${agent.name} - got results from tool:${tool.name}`);
        logger.debug(`Tool Output:`, output);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentToolError: ({ agent, task, tool, error }: { agent: AgentType; task: TaskType; tool: any; error: ErrorType }) => {
        agent.status = 'USING_TOOL_ERROR' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Error during tool use',
            metadata: { error },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.error(`🛠️🛑 ${AGENT_STATUS_enum.USING_TOOL_ERROR}: Agent ${agent.name} found an error using the tool: ${tool.name}`);
        logger.error(error);        
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },    

    handleAgentToolDoesNotExist: ({ agent, task, toolName }: { agent: AgentType; task: TaskType; toolName: string }) => {
        agent.status = 'TOOL_DOES_NOT_EXIST' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🛠️🚫 Agent ${agent.name} - Oops... it seems that the tool:${toolName} ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}.`,
            metadata: { toolName },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.warn(`🛠️🚫 ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}: Agent ${agent.name} - is trying to use a tool that does not exist. Tool Name:${toolName}.`);  
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },    

    handleAgentFinalAnswer: ({ agent, task, output }: { agent: AgentType; task: TaskType; output: Output }) => {
        agent.status = 'FINAL_ANSWER' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🥳 Agent ${agent.name} got the ${AGENT_STATUS_enum.FINAL_ANSWER}`,
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🥳 ${AGENT_STATUS_enum.FINAL_ANSWER}: Agent ${agent.name} arrived to the Final Answer.`);
        logger.debug(`${output.finalAnswer}`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentThought: ({ agent, task, output }: { agent: AgentType; task: TaskType; output: Output }) => {
        agent.status = 'THOUGHT' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `💭 Agent ${agent.name} ${AGENT_STATUS_enum.THOUGHT}.`,
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`💭 ${AGENT_STATUS_enum.THOUGHT}: Agent ${agent.name} has a cool thought.`);
        logger.info(`${output.thought}`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },
    
    handleAgentSelfQuestion: ({ agent, task, output }: { agent: AgentType; task: TaskType; output: Output }) => {
        agent.status = 'SELF_QUESTION' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `❓Agent ${agent.name} have a ${AGENT_STATUS_enum.SELF_QUESTION}`,
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`❓${AGENT_STATUS_enum.SELF_QUESTION}: Agent ${agent.name} have a self question.`);
        logger.debug(output);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },
    
    handleAgentObservation: ({ agent, task, output }: { agent: AgentType; task: TaskType; output: Output }) => {
        agent.status = 'OBSERVATION' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🔍 Agent ${agent.name} - ${AGENT_STATUS_enum.OBSERVATION}`,
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🔍 ${AGENT_STATUS_enum.OBSERVATION}: Agent ${agent.name} made an observation.`);
        logger.debug(`${output.observation}`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },
    
    handleWeirdOutput: ({ agent, task, output }: { agent: AgentType; task: TaskType; output: Output }) => {
        agent.status = 'WEIRD_LLM_OUTPUT' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🤔 Agent ${agent.name} - ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT}`,
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.warn(`🤔 ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT} - Agent: ${agent.name}`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleWorkflowBlocked: ({ task, error }: { task: TaskType; error: ErrorType }): void => {
        logger.warn(`Workflow blocked due to task ${task.id}: ${error.message}`);
        const stats = get().getTaskStats(task);
        
        // Create a workflow blocked log
        const newLog = get().prepareNewLog({
            agent: task.agent,
            task,
            logDescription: `Workflow blocked: ${error.message}`,
            metadata: {
                error: error.message,
                ...stats,
                teamName: get().name,
                taskCount: get().tasks.length,
                agentCount: get().agents.length,
            },
            logType: 'WorkflowStatusUpdate',
            agentStatus: task.agent.status,
        });

        set(state => ({
            workflowLogs: [...state.workflowLogs, newLog],
            tasks: state.tasks.map(t => 
                t.id === task.id ? {
                    ...t,
                    status: 'BLOCKED' as keyof typeof TASK_STATUS_enum,
                    error: error.message,
                    ...stats
                } : t
            )
        }));
    },
    
    handleAgentLoopError: ({ agent, task, error, iterations, maxAgentIterations }: { agent: AgentType; task: TaskType; error: ErrorType; iterations: number; maxAgentIterations: number }) => {
        agent.status = 'AGENTIC_LOOP_ERROR' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🚨 Agent ${agent.name} - ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR} | Iterations: ${iterations}/${maxAgentIterations}`,
            metadata: { error, iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.error(`🚨 ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR}  - Agent: ${agent.name} | Iterations: ${iterations}/${maxAgentIterations}`, error.message);   
        set(state => ({ 
            workflowLogs: [...state.workflowLogs, newLog],
        }));
        get().handleTaskBlocked({ task, error });
    },    

    handleAgentMaxIterationsError: ({ agent, task, error, iterations = -1, maxAgentIterations = -1 }: { agent: AgentType; task: TaskType; error: ErrorType; iterations?: number; maxAgentIterations?: number }) => {
        agent.status = 'MAX_ITERATIONS_ERROR' as keyof typeof AGENT_STATUS_enum;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🛑 Agent ${agent.name} - ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} | Iterations: ${iterations}`,
            metadata: { error, iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.error(`🛑 ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} - Agent ${agent.name} | Iterations: ${iterations}/${maxAgentIterations}. You can adjust the maxAgentIterations property in the agent initialization. Current value is ${maxAgentIterations}`);
        set(state => ({ 
            workflowLogs: [...state.workflowLogs, newLog],
        }));
        get().handleTaskBlocked({ task, error });
    },

    handleAgentTaskCompleted: ({ agent, task, result }: { agent: AgentType; task: TaskType; result: any }) => {
        agent.status = 'TASK_COMPLETED' as keyof typeof AGENT_STATUS_enum;
        const agentLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `🏁 Agent ${agent.name} - ${AGENT_STATUS_enum.TASK_COMPLETED}`,
            metadata: { result },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🏁 ${AGENT_STATUS_enum.TASK_COMPLETED}: Agent ${agent.name} finished the given task.`);
        set(state => ({
            workflowLogs: [...state.workflowLogs, agentLog],
        }));
        get().handleTaskCompleted({ agent, task, result });
    },

    prepareNewLog: (params: PrepareNewLogParams): Log => {
        const { agent, task, logDescription, metadata, logType, agentStatus } = params;
        const timestamp = Date.now();

        return {
            timestamp,
            task,
            agent,
            agentName: agent ? agent.name : 'Unknown Agent',
            taskTitle: task ? task.title : 'Untitled Task',
            logDescription,
            taskStatus: (task?.status || TASK_STATUS_enum.TODO) as keyof typeof TASK_STATUS_enum,
            agentStatus: agentStatus as keyof typeof AGENT_STATUS_enum,
            metadata,
            logType,
        };
    },
});