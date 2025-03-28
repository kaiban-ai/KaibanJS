import { Task } from '../..';
import { BaseAgent } from '../../agents/baseAgent';
import { TaskResult } from '../../stores/taskStore.types';
import { BaseTool, ToolResult } from '../../tools/baseTool';
import {
  AGENT_STATUS_enum,
  TASK_STATUS_enum,
  WORKFLOW_STATUS_enum,
} from '../../utils/enums';
import { ParsedLLMOutput, ThinkingResult } from '../../utils/llm.types';
import { BaseWorkflowLog } from './common';

// Agent status update logs
export interface BaseAgentLog extends BaseWorkflowLog {
  task: Task;
  agent: BaseAgent;
  taskStatus: TASK_STATUS_enum;
  agentStatus: AGENT_STATUS_enum;
  workflowStatus?: WORKFLOW_STATUS_enum;
}

export interface AgentIterationLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    iterations: number;
    maxAgentIterations: number;
  };
}

export interface AgentBlockLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    isAgentDecision: boolean;
    blockReason: string;
    blockedBy: string;
  };
}

export interface AgentActionLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ThinkingResult;
    tool: BaseTool;
    toolName: string;
    thought: string;
  };
}

export interface AgentStartThinkingLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    messages: Array<{
      type: string;
      content: string;
    }>;
  };
}

export interface AgentEndThinkingLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ThinkingResult;
  };
}

export interface AgentFinalAnswerLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ParsedLLMOutput;
  };
}

export interface AgentThoughtLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ParsedLLMOutput;
  };
}

export interface AgentObservationLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ParsedLLMOutput;
  };
}

export interface AgentWeirdLLMOutputLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ParsedLLMOutput;
  };
}

export interface AgentThinkingErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    error: Error;
  };
}

export interface AgentLoopErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    error: Error;
    iterations: number;
    maxAgentIterations: number;
  };
}

export interface AgentIssuesParsingLLMOutputLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ThinkingResult;
    error: Error;
  };
}

export interface AgentToolStartLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    tool: BaseTool;
    input?: string | Record<string, unknown>;
  };
}

export interface AgentToolEndLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    output: ToolResult;
  };
}

export interface AgentToolErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    error: Error;
    tool: string;
  };
}

export interface AgentToolDoesNotExistLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    toolName: string;
  };
}

export interface AgentPausedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    error?: Error;
  };
}

export interface AgentResumedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    error?: Error;
  };
}

export interface AgentTaskAbortedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    error: Error;
  };
}

export interface AgentTaskCompletedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: {
    message?: string;
    result: TaskResult;
    iterations: number;
    maxAgentIterations: number;
  };
}

export type AgentStatusLog =
  | AgentIterationLog
  | AgentStartThinkingLog
  | AgentEndThinkingLog
  | AgentFinalAnswerLog
  | AgentThoughtLog
  | AgentObservationLog
  | AgentWeirdLLMOutputLog
  | AgentThinkingErrorLog
  | AgentToolDoesNotExistLog
  | AgentToolErrorLog
  | AgentToolStartLog
  | AgentToolEndLog
  | AgentBlockLog
  | AgentActionLog
  | AgentPausedLog
  | AgentResumedLog
  | AgentTaskAbortedLog
  | AgentTaskCompletedLog;
