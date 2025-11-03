import { AgentStatusLog } from './agentLogs.types';
import { TaskStatusLog } from './taskLogs.types';
import { WorkflowStatusLog } from './workflowLogs.types';
import { WorkflowAgentStatusLog } from './workflowAgentLogs.types';

export * from './common';
export * from './workflowLogs.types';
export * from './agentLogs.types';
export * from './taskLogs.types';
export * from './workflowAgentLogs.types';

// Union type for all logs
export type WorkflowLog =
  | WorkflowStatusLog
  | AgentStatusLog
  | TaskStatusLog
  | WorkflowAgentStatusLog;
