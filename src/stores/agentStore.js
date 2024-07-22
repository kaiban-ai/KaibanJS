import { AGENT_STATUS_enum, TASK_STATUS_enum } from "../utils/enums";
import { logger } from "../utils/logger";

const useAgentStore = (set, get) => ({

    handleAgentThinkingStart: ({ agent, task, messages }) => {
        agent.status = AGENT_STATUS_enum.THINKING;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Agent starts thinking',
            metadata: { messages },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🤔 Agent ${agent.name} is ${agent.status}:`, task.interpolatedTaskDescription);
        // logger.info(messages[0]);
        // logger.info(messages[0]);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentThinkingEnd: ({ agent, task, output }) => {
        agent.status = AGENT_STATUS_enum.THOUGHT;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Thoughts obtained',
            metadata: { output },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        if (/^(I now know the final answer|Final Answer: [a-zA-Z]+)$/i.test(output?.generations[0][0].text)) {
            logger.info(`💡 Agent ${agent.name} - ${agent.status} is getting excited...`);
        } else {
            logger.info(`💡 Agent ${agent.name} - ${agent.status}:`, output?.generations[0][0].text);
        }
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentThinkingError: ({ agent, task, err }) => {
        agent.status = AGENT_STATUS_enum.ERROR;
        task.status = TASK_STATUS_enum.BLOCKED;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Error encountered during processing',
            metadata: { err },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentActionStart: ({ agent, task, action, runId }) => {
        agent.status = AGENT_STATUS_enum.EXECUTING_ACTION;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `Agent action started: ${action}`,
            metadata: { action, runId },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status
        });
        logger.info(`▶️ Agent ${agent.name} will EXECUTE_ACTION: Use tool ${action.tool} with the following input:  ${action.toolInput}` , action);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentToolStart: ({ agent, task, tool, input, runId }) => {
        agent.status = AGENT_STATUS_enum.USING_TOOL;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `Tool use started: ${tool}`,
            metadata: { tool, input, runId },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🛠️⏳ Agent ${agent.name} is WAITING to get results from tool.`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentToolEnd: ({ agent, task, output, runId }) => {
        agent.status = AGENT_STATUS_enum.OBSERVATION;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Tool use completed',
            metadata: { output, runId },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🛠️✅ Agent ${agent.name} - got results from the tool:` , output);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentToolError: ({ agent, task, err }) => {
        agent.status = AGENT_STATUS_enum.USING_TOOL_ERROR;
        task.status = TASK_STATUS_enum.BLOCKED;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Error during tool use',
            metadata: { err },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentFinalAnswer: ({ agent, task, result, runId }) => {
        agent.status = AGENT_STATUS_enum.FINAL_ANSWER;
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Final answer provided by agent',
            metadata: { result, runId },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        logger.info(`🥳 Agent ${agent.name} - got the final answer: ${result.log}`);
        set(state => ({ workflowLogs: [...state.workflowLogs, newLog] }));
    },

    handleAgentMaxIterationsError: ({ agent, task, error }) => {
        agent.status = AGENT_STATUS_enum.MAX_ITERATIONS_ERROR;
        task.status = 'BLOCKED'; // Update task status to 'blocked'
        const newLog = get().prepareNewLog({
            agent,
            task,
            logDescription: 'Agent stopped due to max iterations',
            metadata: { error },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
        set(state => ({ 
            workflowLogs: [...state.workflowLogs, newLog],
            tasks: state.tasks.map(t => t.id === task.id ? { ...t, status: 'BLOCKED' } : t)
        }));
    },

    

    handleAgentTaskCompleted: ({ agent, task, result }) => {
        // Update the agent's status and log this change
        agent.status = AGENT_STATUS_enum.TASK_COMPLETED;
        const agentLog = get().prepareNewLog({
            agent,
            task,
            logDescription: `Agent completed the task: ${task.title}`,
            metadata: { result },
            logType: 'AgentStatusUpdate',
            agentStatus: agent.status,
        });
    
        set(state => ({
            workflowLogs: [...state.workflowLogs, agentLog],
            // Additional state updates if necessary
        }));
    
        // Call handleTaskCompleted or trigger a listener for the log entry
        get().handleTaskCompleted({ agent, task, result });
    }
});

export { useAgentStore };