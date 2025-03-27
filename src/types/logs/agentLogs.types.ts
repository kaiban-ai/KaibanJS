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
import { BaseWorkflowLog, WorkflowBaseMetadata } from './common';

// Agent-specific metadata types
export type AgentIterationMetadata = WorkflowBaseMetadata & {
  iterations: number;
  maxAgentIterations: number;
};

export type AgentBlockMetadata = WorkflowBaseMetadata & {
  isAgentDecision: boolean;
  blockReason: string;
  blockedBy: string;
};

export type AgentStartThinkingMetadata = WorkflowBaseMetadata & {
  messages: Array<{
    type: string;
    content: string;
  }>;
};

export type AgentEndThinkingMetadata = WorkflowBaseMetadata & {
  output: ThinkingResult;
};

export type AgentThoughtMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentObservationMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentWeirdLLMOutputMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentFinalAnswerMetadata = WorkflowBaseMetadata & {
  output: ParsedLLMOutput;
};

export type AgentThinkingErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
};

export type AgentLoopErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  iterations: number;
  maxAgentIterations: number;
};

export type AgentIssuesParsingLLMOutputMetadata = WorkflowBaseMetadata & {
  output: ThinkingResult;
  error: Error;
};

export type AgentToolStartMetadata = WorkflowBaseMetadata & {
  tool: BaseTool;
  input?: string | Record<string, unknown>;
};

export type AgentToolEndMetadata = WorkflowBaseMetadata & {
  output: ToolResult;
};

export type AgentToolDoesNotExistMetadata = WorkflowBaseMetadata & {
  toolName: string;
};

export type AgentToolErrorMetadata = WorkflowBaseMetadata & {
  error: Error;
  tool: string;
};

export type AgentActionMetadata = WorkflowBaseMetadata & {
  output: ThinkingResult;
  tool: BaseTool;
  toolName: string;
  thought: string;
};

export type AgentPausedMetadata = WorkflowBaseMetadata & {
  error?: Error;
};

export type AgentResumedMetadata = WorkflowBaseMetadata & {
  error?: Error;
};

export type AgentTaskAbortedMetadata = WorkflowBaseMetadata & {
  error: Error;
};

export type AgentTaskCompletedMetadata = WorkflowBaseMetadata & {
  result: TaskResult;
  iterations: number;
  maxAgentIterations: number;
};

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
  metadata: AgentIterationMetadata;
}

export interface AgentBlockLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentBlockMetadata;
}

export interface AgentActionLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentActionMetadata;
}

export interface AgentStartThinkingLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentStartThinkingMetadata;
}

export interface AgentEndThinkingLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentEndThinkingMetadata;
}

export interface AgentFinalAnswerLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentFinalAnswerMetadata;
}

export interface AgentThoughtLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentThoughtMetadata;
}

export interface AgentObservationLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentObservationMetadata;
}

export interface AgentWeirdLLMOutputLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentWeirdLLMOutputMetadata;
}

export interface AgentThinkingErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentThinkingErrorMetadata;
}

export interface AgentLoopErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentLoopErrorMetadata;
}

export interface AgentIssuesParsingLLMOutputLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentIssuesParsingLLMOutputMetadata;
}

export interface AgentToolStartLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolStartMetadata;
}

export interface AgentToolEndLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolEndMetadata;
}

export interface AgentToolErrorLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolErrorMetadata;
}

export interface AgentToolDoesNotExistLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentToolDoesNotExistMetadata;
}

export interface AgentPausedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentPausedMetadata;
}

export interface AgentResumedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentResumedMetadata;
}

export interface AgentTaskAbortedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentTaskAbortedMetadata;
}

export interface AgentTaskCompletedLog extends BaseAgentLog {
  logType: 'AgentStatusUpdate';
  agentStatus: AGENT_STATUS_enum;
  metadata: AgentTaskCompletedMetadata;
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
