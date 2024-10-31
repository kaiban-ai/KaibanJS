/**
 * @file logCreator.ts
 * @path src/utils/factories/logCreator.ts
 * @description Factory for creating log entries throughout the application
 * 
 * @packageDocumentation
 * @module @factories/log
 */

import { 
    AgentType, 
    TaskType, 
    Log, 
    LogType, 
    AgentLogMetadata, 
    TaskLogMetadata, 
    WorkflowLogMetadata,
    TASK_STATUS_enum,
    AGENT_STATUS_enum,
    WORKFLOW_STATUS_enum
} from '@/utils/types';
import { getTaskTitleForLogs } from '@/utils/tasks';
import DefaultFactory from './defaultFactory';

export class LogCreator {
    static createAgentLog(params: {
        agent: AgentType;
        task: TaskType;
        description: string;
        metadata: AgentLogMetadata;
        agentStatus: keyof typeof AGENT_STATUS_enum;
        logType?: LogType;
    }): Log {
        const { 
            agent, 
            task, 
            description, 
            metadata, 
            agentStatus, 
            logType = 'AgentStatusUpdate' 
        } = params;
        
        return {
            timestamp: Date.now(),
            task,
            agent,
            agentName: agent.name,
            taskTitle: task.title,
            logDescription: description,
            taskStatus: task.status,
            agentStatus,
            workflowStatus: 'RUNNING',
            metadata: {
                ...metadata,
                output: {
                    llmUsageStats: DefaultFactory.createLLMUsageStats(),
                    ...metadata.output
                }
            },
            logType
        };
    }

    static createTaskLog(params: {
        task: TaskType;
        description: string;
        status: keyof typeof TASK_STATUS_enum;
        metadata: TaskLogMetadata;
    }): Log {
        const { task, description, status, metadata } = params;
        
        return {
            timestamp: Date.now(),
            task,
            agent: task.agent,
            agentName: task.agent?.name || '',
            taskTitle: getTaskTitleForLogs(task),
            logDescription: description,
            taskStatus: status,
            agentStatus: task.agent?.status || 'IDLE',
            workflowStatus: 'RUNNING',
            metadata: {
                ...metadata,
                llmUsageStats: metadata.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                costDetails: metadata.costDetails || DefaultFactory.createCostDetails()
            },
            logType: 'TaskStatusUpdate'
        };
    }

    static createWorkflowLog(
        description: string,
        status: keyof typeof WORKFLOW_STATUS_enum,
        metadata: WorkflowLogMetadata
    ): Log {
        return {
            timestamp: Date.now(),
            task: null,
            agent: null,
            agentName: '',
            taskTitle: '',
            logDescription: description,
            taskStatus: 'TODO',
            agentStatus: 'INITIAL',
            workflowStatus: status,
            metadata: {
                ...metadata,
                llmUsageStats: metadata.llmUsageStats || DefaultFactory.createLLMUsageStats(),
                costDetails: metadata.costDetails || DefaultFactory.createCostDetails()
            },
            logType: 'WorkflowStatusUpdate'
        };
    }

    static createMessageLog(params: {
        role: string;
        content: string;
        metadata?: Record<string, unknown>;
    }): Log {
        const { role, content, metadata = {} } = params;
        
        return {
            timestamp: Date.now(),
            task: null,
            agent: null,
            agentName: 'System',
            taskTitle: '',
            logDescription: content,
            taskStatus: 'TODO',
            agentStatus: 'INITIAL',
            workflowStatus: 'RUNNING',
            metadata: {
                role,
                content,
                ...metadata,
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                costDetails: DefaultFactory.createCostDetails()
            },
            logType: role === 'system' ? 'SystemMessage' : 
                    role === 'user' ? 'UserMessage' : 
                    role === 'assistant' ? 'AIMessage' : 'FunctionMessage'
        };
    }
}

export default LogCreator;