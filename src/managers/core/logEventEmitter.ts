/**
* @file logEventEmitter.ts
* @path src/managers/core/logEventEmitter.ts
* @description Log event emitter implementation
*
* @module @managers/core
*/

import { v4 as uuidv4 } from 'uuid';
import { BaseEventEmitter } from './eventEmitter';
import type { 
    ILog,
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IAgentLogMetadata
} from '../../types/team/teamLogsTypes';
import type { ILogLevel } from '../../types/common/commonEnums';
import {
    LOG_EVENT_TYPE,
    type LogEvent,
    type ILogCreatedEvent,
    type ILogUpdatedEvent,
    type ILogClearedEvent,
    type ITaskLogAddedEvent,
    type IWorkflowLogAddedEvent,
    type IAgentLogAddedEvent
} from '../../types/common/commonLoggingEventTypes';

/**
 * Log event emitter implementation
 */
export class LogEventEmitter extends BaseEventEmitter {
    private static logInstance: LogEventEmitter;

    protected constructor() {
        super();
    }

    public static override getInstance(): LogEventEmitter {
        if (!LogEventEmitter.logInstance) {
            LogEventEmitter.logInstance = new LogEventEmitter();
        }
        return LogEventEmitter.logInstance;
    }

    async emitLogCreated(log: ILog): Promise<void> {
        const event: ILogCreatedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.LOG_CREATED),
            log
        };
        await this.emit<LogEvent>(event);
    }

    async emitLogUpdated(previousLog: ILog, newLog: ILog): Promise<void> {
        const event: ILogUpdatedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.LOG_UPDATED),
            previousLog,
            newLog
        };
        await this.emit<LogEvent>(event);
    }

    async emitLogCleared(): Promise<void> {
        const event: ILogClearedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.LOG_CLEARED)
        };
        await this.emit<LogEvent>(event);
    }

    async emitTaskLogAdded(
        log: ILog,
        taskId: string,
        metadata: ITaskLogMetadata
    ): Promise<void> {
        const event: ITaskLogAddedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.TASK_LOG_ADDED),
            log,
            taskId,
            metadata
        };
        await this.emit<LogEvent>(event);
    }

    async emitWorkflowLogAdded(
        log: ILog,
        workflowId: string,
        metadata: IWorkflowLogMetadata
    ): Promise<void> {
        const event: IWorkflowLogAddedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.WORKFLOW_LOG_ADDED),
            log,
            workflowId,
            metadata
        };
        await this.emit<LogEvent>(event);
    }

    async emitAgentLogAdded(
        log: ILog,
        agentId: string,
        metadata: IAgentLogMetadata
    ): Promise<void> {
        const event: IAgentLogAddedEvent = {
            ...this.createBaseEvent(LOG_EVENT_TYPE.AGENT_LOG_ADDED),
            log,
            agentId,
            metadata
        };
        await this.emit<LogEvent>(event);
    }

    // ─── Helper Methods ─────────────────────────────────────────────────────────

    private createLog(
        message: string,
        level: ILogLevel,
        agentName?: string | null,
        taskId?: string,
        error?: Error
    ): ILog {
        return {
            id: uuidv4(),
            timestamp: Date.now(),
            level,
            message,
            agentName: agentName || 'Unknown Agent',
            taskId: taskId || 'unknown',
            meta: error ? {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                }
            } : undefined,
        };
    }

    // ─── Public Logging Methods ───────────────────────────────────────────────────

    async debug(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        const log = this.createLog(message, 'debug', agentName, taskId);
        await this.emitLogCreated(log);
    }

    async info(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        const log = this.createLog(message, 'info', agentName, taskId);
        await this.emitLogCreated(log);
    }

    async warn(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        const log = this.createLog(message, 'warn', agentName, taskId);
        await this.emitLogCreated(log);
    }

    async error(message: string, agentName?: string | null, taskId?: string, error?: Error): Promise<void> {
        const log = this.createLog(message, 'error', agentName, taskId, error);
        await this.emitLogCreated(log);
    }
}

export default LogEventEmitter.getInstance();
