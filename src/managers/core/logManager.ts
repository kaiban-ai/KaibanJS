/**
 * @file logManager.ts
 * @path src/managers/core/logManager.ts
 * @description Core logging implementation with centralized log management
 * 
 * @module @core
 */

// Import types from canonical locations
import type { 
    ILog,
    ITaskLogMetadata,
    IWorkflowLogMetadata,
    IAgentLogMetadata,
    IBaseLogMetadata
} from '../../types/team/teamLogsTypes';

import type {
    ILoggerConfig,
    ILogFormattingOptions,
    ILogDestinationConfig
} from '../../types/common/commonLoggingTypes';

import type { ILogLevel } from '../../types/common/commonEnums';
import type { ILLMUsageStats } from '../../types/llm/llmResponseTypes';
import type { ICostDetails } from '../../types/workflow/workflowCostsTypes';

/**
 * Core logging manager implementation
 */
export class LogManager {
    private static instance: LogManager;
    private state: unknown;
    private config: Required<ILoggerConfig>;

    private constructor(config: ILoggerConfig = {}) {
        this.state = {};
        this.config = {
            level: config.level || 'info',
            timestamp: config.timestamp ?? true,
            showLevel: config.showLevel ?? true,
            formatter: config.formatter || this.defaultFormatter,
            serializer: config.serializer || this.defaultSerializer
        };
    }

    public static getInstance(): LogManager {
        if (!LogManager.instance) {
            LogManager.instance = new LogManager();
        }
        return LogManager.instance;
    }

    // ─── Core Logging Methods ───────────────────────────────────────────────────

    /**
     * Log a message with flexible parameters
     */
    public log(
        message: string, 
        agentName: string | null | undefined = undefined, 
        taskId: string | undefined = undefined, 
        level: ILogLevel = 'info',
        error?: Error
    ): void {
        const log: ILog = {
            id: crypto.randomUUID(),
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

        this.processLog(log);
    }

    public debug(message: string, agentName?: string | null, taskId?: string): void {
        this.log(message, agentName, taskId, 'debug');
    }

    public info(message: string, agentName?: string | null, taskId?: string): void {
        this.log(message, agentName, taskId, 'info');
    }

    public warn(message: string, agentName?: string | null, taskId?: string): void {
        this.log(message, agentName, taskId, 'warn');
    }

    public error(message: string, agentName?: string | null, taskId?: string, error?: Error): void {
        this.log(message, agentName, taskId, 'error', error);
    }

    // ─── Log Validation ───────────────────────────────────────────────────────

    /**
     * Validate log metadata
     */
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

    /**
     * Validate task log metadata
     */
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

    /**
     * Validate workflow log metadata
     */
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

    /**
     * Validate agent log metadata
     */
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

    // ─── State Management ─────────────────────────────────────────────────────

    public getState(): unknown {
        return this.state;
    }

    public setState(fn: (state: unknown) => unknown): void {
        this.state = fn(this.state);
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private processLog(log: ILog): void {
        const formattedMessage = this.config.formatter(log.level, log.message);
        if (this.config.timestamp) {
            console.log(`[${new Date(log.timestamp).toISOString()}] ${formattedMessage}`);
        } else {
            console.log(formattedMessage);
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
