/**
 * @file LogManager.ts
 * @path src/managers/core/LogManager.ts
 * @description Centralized logging implementation
 * 
 * @module @core
 */

import { logger } from '../../core/logger';

import { 
    LogLevel, 
    LoggerConfig, 
    LogFormattingOptions 
} from '../../types/common/logging';

import type { 
    Log,
    TaskLogMetadata,
    WorkflowLogMetadata,
    AgentLogMetadata 
} from '../../types/team/logs';

/**
 * Core logging manager
 */
export class LogManager {
    private static instance: LogManager;
    private state: unknown;
    private config: Required<LoggerConfig>;

    private constructor(config: LoggerConfig = {}) {
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
        level: LogLevel = 'info',
        error?: Error
    ): void {
        const log: Log = {
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

        logger.log(log);
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
    public validateTaskMetadata(metadata: unknown): metadata is TaskLogMetadata {
        if (!this.validateLogMetadata(metadata)) {
            return false;
        }

        const m = metadata as TaskLogMetadata;
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
    public validateWorkflowMetadata(metadata: unknown): metadata is WorkflowLogMetadata {
        if (!this.validateLogMetadata(metadata)) {
            return false;
        }

        const m = metadata as WorkflowLogMetadata;
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
    public validateAgentMetadata(metadata: unknown): metadata is AgentLogMetadata {
        if (!this.validateLogMetadata(metadata)) {
            return false;
        }

        const m = metadata as AgentLogMetadata;
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

    private defaultFormatter(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }

    private defaultSerializer(obj: unknown): string {
        return typeof obj === 'object' ? JSON.stringify(obj, null, 2) : String(obj);
    }
}

export default LogManager.getInstance();
