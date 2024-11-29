/**
 * @file logManager.ts
 * @path src/managers/core/logManager.ts
 * @description Core logging functionality implementation with centralized logging, validation, and metadata management
 */

import { createError } from '../../types/common/commonErrorTypes';
import { createValidationResult, createValidationMetadata } from '../../types/common/commonValidationTypes';
import { createBaseMetadata } from '../../types/common/commonMetadataTypes';
import { ILogLevel } from '../../types/common/commonEnums';

import type { IBaseHandlerMetadata } from '../../types/common/commonMetadataTypes';
import type { IValidationResult } from '../../types/common/commonValidationTypes';

/**
 * Centralized logging manager that handles log creation, validation, and storage
 * Implements the Singleton pattern to ensure a single logging instance
 */
export class LogManager {
    private static instance: LogManager;
    private readonly logs: Map<string, IBaseHandlerMetadata[]>;
    private logLevel: ILogLevel;

    private constructor() {
        this.logs = new Map();
        this.logLevel = 'info'; // Default log level
    }

    /**
     * Gets the singleton instance of LogManager
     * @returns The LogManager instance
     */
    public static getInstance(): LogManager {
        if (!LogManager.instance) {
            LogManager.instance = new LogManager();
        }
        return LogManager.instance;
    }

    /**
     * Sets the logging level
     * @param level - The log level to set
     */
    public setLogLevel(level: ILogLevel): void {
        this.logLevel = level;
    }

    /**
     * Logs a debug message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    public debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            console.debug(`🔍 [DEBUG] ${message}`, ...args);
        }
    }

    /**
     * Logs an informational message
     * @param message - The message to log
     * @param args - Additional arguments to log
     */
    public info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            console.log(`ℹ️ [INFO] ${message}`, ...args);
        }
    }

    /**
     * Logs a warning message
     * @param message - The warning message
     * @param args - Additional arguments to log
     */
    public warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            console.warn(`⚠️ [WARN] ${message}`, ...args);
        }
    }

    /**
     * Logs an error message
     * @param message - The error message
     * @param error - Optional error object
     */
    public error(message: string, error?: any): void {
        if (this.shouldLog('error')) {
            console.error(`🔴 [ERROR] ${message}`, error);
        }
    }

    /**
     * Determines if a message at the given level should be logged
     * @param level - The log level to check
     * @returns Whether the message should be logged
     */
    private shouldLog(level: ILogLevel): boolean {
        const levels: ILogLevel[] = ['error', 'warn', 'info', 'debug'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }

    /**
     * Creates a log entry with metadata
     * @param params - Log creation parameters
     * @returns A log entry with metadata
     */
    private createLog(params: {
        component: string;
        operation: string;
        message: string;
        metadata?: Record<string, unknown>;
    }): IBaseHandlerMetadata {
        return {
            ...createBaseMetadata(params.component, params.operation),
            message: params.message,
            metadata: {
                ...params.metadata,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Logs a message with component, operation, and optional metadata
     * @param component - The component generating the log
     * @param operation - The operation being performed
     * @param message - The log message
     * @param metadata - Optional metadata to attach to the log
     */
    public async log(
        component: string,
        operation: string,
        message: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        try {
            const logEntry = this.createLog({
                component,
                operation,
                message,
                metadata
            });

            const componentLogs = this.logs.get(component) || [];
            componentLogs.push(logEntry);
            this.logs.set(component, componentLogs);

            this.info(`[${component}] ${operation}: ${message}`);
        } catch (error) {
            this.error('Error logging message:', error);
            throw error;
        }
    }

    /**
     * Validates log metadata
     * @param component - The component to validate
     * @param operation - The operation to validate
     * @param metadata - The metadata to validate
     * @returns Validation result
     */
    public async validateLog(
        component: string,
        operation: string,
        metadata: IBaseHandlerMetadata
    ): Promise<IValidationResult> {
        try {
            const validationMetadata = createValidationMetadata({
                component,
                operation,
                validatedFields: ['component', 'operation', 'message', 'metadata']
            });

            const isValid = this.isValidMetadata(metadata);

            if (!isValid) {
                throw createError({
                    message: 'Invalid log metadata',
                    type: 'ValidationError',
                    context: {
                        component,
                        operation,
                        metadata
                    }
                });
            }

            return createValidationResult({
                isValid: true,
                errors: [],
                warnings: [],
                metadata: validationMetadata
            });
        } catch (error) {
            this.error('Error validating log:', error);
            throw error;
        }
    }

    /**
     * Gets all logs for a component
     * @param component - The component to get logs for
     * @returns Array of logs for the component
     */
    public getLogs(component: string): IBaseHandlerMetadata[] {
        return this.logs.get(component) || [];
    }

    /**
     * Clears logs for a component or all logs if no component specified
     * @param component - Optional component to clear logs for
     */
    public clearLogs(component?: string): void {
        if (component) {
            this.logs.delete(component);
        } else {
            this.logs.clear();
        }
    }

    /**
     * Type guard for validating metadata structure
     * @param metadata - The metadata to validate
     * @returns True if metadata is valid
     */
    private isValidMetadata(metadata: unknown): metadata is IBaseHandlerMetadata {
        if (!metadata || typeof metadata !== 'object') return false;
        const m = metadata as Partial<IBaseHandlerMetadata>;
        return (
            typeof m.timestamp === 'number' &&
            typeof m.component === 'string' &&
            typeof m.operation === 'string' &&
            typeof m.message === 'string' &&
            m.performance !== undefined &&
            typeof m.performance === 'object' &&
            m.validation !== undefined &&
            typeof m.validation === 'object'
        );
    }

    /**
     * Type guard for validating task metadata
     * @param metadata - The metadata to validate
     * @returns True if metadata is valid task metadata
     */
    private isValidTaskMetadata(metadata: unknown): boolean {
        if (!this.isValidMetadata(metadata)) return false;
        const m = metadata as any;
        return (
            'llmUsageMetrics' in m &&
            'iterationCount' in m &&
            'duration' in m &&
            typeof m.iterationCount === 'number' &&
            typeof m.duration === 'number'
        );
    }

    /**
     * Type guard for validating workflow metadata
     * @param metadata - The metadata to validate
     * @returns True if metadata is valid workflow metadata
     */
    private isValidWorkflowMetadata(metadata: unknown): boolean {
        if (!this.isValidMetadata(metadata)) return false;
        const m = metadata as any;
        return (
            'llmUsageMetrics' in m &&
            'iterationCount' in m &&
            m.output !== null &&
            typeof m.output === 'object' &&
            'llmUsageMetrics' in m.output
        );
    }
}
