/**
 * @file logs.ts
 * @path KaibanJS/src/utils/types/team/logs.ts
 * @description Defines types related to logging for teams
 */

import { LogLevel, MESSAGE_LOG_TYPE_enum, STATUS_LOG_TYPE_enum } from '../common/enums';

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
      Object.values(STATUS_LOG_TYPE_enum).includes(value.type) &&
      'status' in value &&
      'entity' in value
    );
  },

  isMessageLog: (value: unknown): value is MessageLog => {
    return (
      LogTypeGuards.isLog(value) &&
      'type' in value &&
      Object.values(MESSAGE_LOG_TYPE_enum).includes(value.type) &&
      'role' in value &&
      'content' in value
    );
  },
};
