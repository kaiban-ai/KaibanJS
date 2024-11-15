/**
 * @file logs.ts
 * @path KaibanJS/src/utils/types/team/logs.ts
 * @description Defines types related to logging for teams
 */

import { LogLevel } from '../common/logging';
import { MESSAGE_LOG_TYPE_enum, STATUS_LOG_TYPE_enum } from '../common/enums';

// ─── Log Interfaces ─────────────────────────────────────────────────────────

export interface Log {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: number;
  agentName: string;
  taskId: string;
  meta?: Record<string, unknown>;
}

export interface StatusLog extends Log {
  type: STATUS_LOG_TYPE_enum;
  status: string;
  entity: string;
}

export interface MessageLog extends Log {
  type: MESSAGE_LOG_TYPE_enum;
  role: string;
  content: string;
}

// ─── Metadata Interfaces ────────────────────────────────────────────────────

export interface BaseLogMetadata {
  timestamp: number;
  llmUsageStats?: Record<string, unknown>;
}

export interface TaskLogMetadata extends BaseLogMetadata {
  llmUsageStats: Record<string, unknown>;
  iterationCount: number;
  duration: number;
  costDetails: Record<string, unknown>;
}

export interface WorkflowLogMetadata extends BaseLogMetadata {
  duration: number;
  llmUsageStats: Record<string, unknown>;
  iterationCount: number;
  costDetails: Record<string, unknown>;
  teamName: string;
  taskCount: number;
  agentCount: number;
}

export interface AgentLogMetadata extends BaseLogMetadata {
  output: {
    llmUsageStats: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// ─── Log Type Guards ────────────────────────────────────────────────────────

export const LogTypeGuards = {
  isLog: (value: unknown): value is Log => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'level' in value &&
      'message' in value &&
      'timestamp' in value &&
      'taskId' in value
    );
  },

  isStatusLog: (value: unknown): value is StatusLog => {
    return (
      LogTypeGuards.isLog(value) &&
      'type' in value &&
      value.type !== undefined &&
      Object.values(STATUS_LOG_TYPE_enum).includes(value.type as STATUS_LOG_TYPE_enum) &&
      'status' in value &&
      'entity' in value
    );
  },

  isMessageLog: (value: unknown): value is MessageLog => {
    return (
      LogTypeGuards.isLog(value) &&
      'type' in value &&
      value.type !== undefined &&
      Object.values(MESSAGE_LOG_TYPE_enum).includes(value.type as MESSAGE_LOG_TYPE_enum) &&
      'role' in value &&
      'content' in value
    );
  },

  isTaskLogMetadata: (value: unknown): value is TaskLogMetadata => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'timestamp' in value &&
      'llmUsageStats' in value &&
      'iterationCount' in value &&
      'duration' in value &&
      'costDetails' in value &&
      typeof (value as TaskLogMetadata).iterationCount === 'number' &&
      typeof (value as TaskLogMetadata).duration === 'number'
    );
  },

  isWorkflowLogMetadata: (value: unknown): value is WorkflowLogMetadata => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'timestamp' in value &&
      'duration' in value &&
      'llmUsageStats' in value &&
      'iterationCount' in value &&
      'costDetails' in value &&
      'teamName' in value &&
      'taskCount' in value &&
      'agentCount' in value &&
      typeof (value as WorkflowLogMetadata).duration === 'number' &&
      typeof (value as WorkflowLogMetadata).iterationCount === 'number' &&
      typeof (value as WorkflowLogMetadata).taskCount === 'number' &&
      typeof (value as WorkflowLogMetadata).agentCount === 'number'
    );
  },

  isAgentLogMetadata: (value: unknown): value is AgentLogMetadata => {
    return (
      typeof value === 'object' &&
      value !== null &&
      'timestamp' in value &&
      'output' in value &&
      typeof (value as AgentLogMetadata).output === 'object' &&
      (value as AgentLogMetadata).output !== null &&
      'llmUsageStats' in (value as AgentLogMetadata).output
    );
  },
};
