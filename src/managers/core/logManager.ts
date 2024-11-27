/**
* @file logManager.ts
* @path src/managers/core/logManager.ts
* @description Core logging implementation with event-based log management
*
* @module @managers/core
*/

import type { 
    ILog,
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IAgentLogMetadata
} from '../../types/team/teamLogsTypes';

import type {
    ILoggerConfig,
    ILogFormattingOptions,
    ILogDestinationConfig
} from '../../types/common/commonLoggingTypes';

import type { ILogLevel } from '../../types/common/commonEnums';
import type { IEventHandler, IValidationResult } from '../../types/common/commonEventTypes';
import type {
    LogEvent,
    ILogCreatedEvent,
    ILogUpdatedEvent,
    ILogClearedEvent,
    ITaskLogAddedEvent,
    IWorkflowLogAddedEvent,
    IAgentLogAddedEvent
} from '../../types/common/commonLoggingEventTypes';
import { LogEventEmitter } from './logEventEmitter';

/**
 * Core logging manager implementation
 */
export class LogManager {
    private static instance: LogManager;
    private config: Required<ILoggerConfig>;
    private eventEmitter: LogEventEmitter;

    private constructor(config: ILoggerConfig = {}) {
        this.config = {
            level: config.level || 'info',
            timestamp: config.timestamp ?? true,
            showLevel: config.showLevel ?? true,
            formatter: config.formatter || this.defaultFormatter,
            serializer: config.serializer || this.defaultSerializer
        };
        this.eventEmitter = LogEventEmitter.getInstance();
        this.setupEventHandlers();
    }

    public static getInstance(): LogManager {
        if (!LogManager.instance) {
            LogManager.instance = new LogManager();
        }
        return LogManager.instance;
    }

    // ─── Core Logging Methods ───────────────────────────────────────────────────

    public async log(
        message: string, 
        agentName: string | null | undefined = undefined, 
        taskId: string | undefined = undefined, 
        level: ILogLevel = 'info',
        error?: Error
    ): Promise<void> {
        await this.eventEmitter[level](message, agentName, taskId, error);
    }

    public async debug(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        await this.eventEmitter.debug(message, agentName, taskId);
    }

    public async info(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        await this.eventEmitter.info(message, agentName, taskId);
    }

    public async warn(message: string, agentName?: string | null, taskId?: string): Promise<void> {
        await this.eventEmitter.warn(message, agentName, taskId);
    }

    public async error(message: string, agentName?: string | null, taskId?: string, error?: Error): Promise<void> {
        await this.eventEmitter.error(message, agentName, taskId, error);
    }

    // ─── Log Validation ───────────────────────────────────────────────────────

    public validateLogMetadata(metadata: unknown): boolean {
        if (!metadata || typeof metadata !== 'object') {
            return false;
        }

        const m = metadata as Record<string, unknown>;
        return (
            'timestamp' in m &&
            ('llmUsageStats' in m || 'output' in m || 'error' in m)
        );
    }

    public validateTaskMetadata(metadata: unknown): metadata is ITaskLogMetadata {
        if (!this.validateLogMetadata(metadata)) {
            return false;
        }

        const m = metadata as ITaskLogMetadata;
        return (
            'llmUsageStats' in m &&
            'iterationCount' in m &&
            'duration' in m &&
            'costDetails' in m &&
            typeof m.iterationCount === 'number' &&
            typeof m.duration === 'number'
        );
    }

    public validateWorkflowMetadata(metadata: unknown): metadata is IWorkflowLogMetadata {
        if (!this.validateLogMetadata(metadata)) {
            return false;
        }

        const m = metadata as IWorkflowLogMetadata;
        return (
            'duration' in m &&
            'llmUsageStats' in m &&
            'iterationCount' in m &&
            'costDetails' in m &&
            'teamName' in m &&
            'taskCount' in m &&
            'agentCount' in m
        );
    }

    public validateAgentMetadata(metadata: unknown): metadata is IAgentLogMetadata {
        if (!this.validateLogMetadata(metadata)) {
            return false;
        }

        const m = metadata as IAgentLogMetadata;
        return (
            'output' in m &&
            typeof m.output === 'object' &&
            m.output !== null &&
            'llmUsageStats' in m.output
        );
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private setupEventHandlers(): void {
        const logHandler: IEventHandler<LogEvent> = {
            handle: async (event: LogEvent): Promise<void> => {
                const log = this.getLogFromEvent(event);
                if (!log) return;

                const formattedMessage = this.config.formatter(log.level, log.message);
                if (this.config.timestamp) {
                    console.log(`[${new Date(log.timestamp).toISOString()}] ${formattedMessage}`);
                } else {
                    console.log(formattedMessage);
                }
            },
            validate: async (event: LogEvent): Promise<IValidationResult> => {
                const log = this.getLogFromEvent(event);
                if (!log) {
                    return {
                        isValid: false,
                        errors: ['Log object is required'],
                        warnings: [],
                        metadata: {
                            timestamp: Date.now(),
                            duration: 0,
                            validatorName: 'LogManager'
                        }
                    };
                }
                if (!log.message) {
                    return {
                        isValid: false,
                        errors: ['Log message is required'],
                        warnings: [],
                        metadata: {
                            timestamp: Date.now(),
                            duration: 0,
                            validatorName: 'LogManager'
                        }
                    };
                }
                if (!log.level) {
                    return {
                        isValid: false,
                        errors: ['Log level is required'],
                        warnings: [],
                        metadata: {
                            timestamp: Date.now(),
                            duration: 0,
                            validatorName: 'LogManager'
                        }
                    };
                }
                return {
                    isValid: true,
                    errors: [],
                    warnings: [],
                    metadata: {
                        timestamp: Date.now(),
                        duration: 0,
                        validatorName: 'LogManager'
                    }
                };
            }
        };

        this.eventEmitter.on('log.created', logHandler);
        this.eventEmitter.on('log.updated', logHandler);
        this.eventEmitter.on('log.task.added', logHandler);
        this.eventEmitter.on('log.workflow.added', logHandler);
        this.eventEmitter.on('log.agent.added', logHandler);
    }

    private getLogFromEvent(event: LogEvent): ILog | undefined {
        switch (event.type) {
            case 'log.created':
                return (event as ILogCreatedEvent).log;
            case 'log.updated':
                return (event as ILogUpdatedEvent).newLog;
            case 'log.task.added':
                return (event as ITaskLogAddedEvent).log;
            case 'log.workflow.added':
                return (event as IWorkflowLogAddedEvent).log;
            case 'log.agent.added':
                return (event as IAgentLogAddedEvent).log;
            default:
                return undefined;
        }
    }

    private defaultFormatter(level: string, message: string): string {
        return `[${level.toUpperCase()}] ${message}`;
    }

    private defaultSerializer(obj: unknown): string {
        return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj);
    }
}

export default LogManager.getInstance();
