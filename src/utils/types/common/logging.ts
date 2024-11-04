/**
 * @file logging.ts
 * @path src/utils/types/common/logging.ts
 * @description Type definitions for logging and log formatting
 */
import { CostDetails } from "@/utils";
import type { LLMUsageStats } from "@/utils/types/llm";


/**
 * Available log levels
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

/**
 * Logger configuration options
 */
export interface LoggerConfig {
    /** Log level */
    level?: LogLevel;
    
    /** Whether to include timestamps */
    timestamp?: boolean;
    
    /** Whether to show log level in output */
    showLevel?: boolean;
    
    /** Custom message formatter */
    formatter?: (level: string, message: string) => string;
    
    /** Custom object serializer */
    serializer?: (obj: unknown) => string;
}

/**
 * Task completion log properties
 */
export interface TaskCompletionProps {
    /** Usage statistics from LLM */
    llmUsageStats: LLMUsageStats;
    
    /** Number of iterations performed */
    iterationCount: number;
    
    /** Task duration in seconds */
    duration: number;
    
    /** Agent name */
    agentName: string;
    
    /** Model used by agent */
    agentModel: string;
    
    /** Task title */
    taskTitle: string;
    
    /** Current task number */
    currentTaskNumber: number;
    
    /** Total number of tasks */
    totalTasks: number;
    
    /** Cost details for the task */
    costDetails: CostDetails;
}

/**
 * Task status log properties
 */
export interface TaskStatusProps {
    /** Current task number */
    currentTaskNumber: number;
    
    /** Total number of tasks */
    totalTasks: number;
    
    /** Task title */
    taskTitle: string;
    
    /** Current task status */
    taskStatus: string;
    
    /** Agent name */
    agentName: string;
}

/**
 * Workflow status log properties
 */
export interface WorkflowStatusProps {
    /** Current workflow status */
    status: string;
    
    /** Status message */
    message: string;
}

/**
 * Workflow result log properties
 */
export interface WorkflowResultProps {
    /** Result metadata */
    metadata: {
        /** Result message */
        result: string;
        
        /** Total duration */
        duration: number;
        
        /** LLM usage stats */
        llmUsageStats: LLMUsageStats;
        
        /** Number of iterations */
        iterationCount: number;
        
        /** Cost details */
        costDetails: CostDetails;
        
        /** Team name */
        teamName: string;
        
        /** Number of tasks */
        taskCount: number;
        
        /** Number of agents */
        agentCount: number;
    };
}

/**
 * Log formatting configuration
 */
export interface LogFormattingOptions {
    /** Color options */
    colors?: {
        [key in LogLevel]?: string;
    };
    
    /** Timestamp format */
    timestampFormat?: string;
    
    /** Whether to use emojis */
    useEmoji?: boolean;
    
    /** Custom formatters */
    formatters?: {
        [key: string]: (value: unknown) => string;
    };
}

/**
 * Log output destination configuration
 */
export interface LogDestinationConfig {
    /** Console output configuration */
    console?: {
        enabled: boolean;
        format?: string;
        level?: LogLevel;
    };
    
    /** File output configuration */
    file?: {
        enabled: boolean;
        path?: string;
        rotationSize?: number;
        maxFiles?: number;
    };
    
    /** Custom output handlers */
    custom?: Array<{
        handler: (message: string, level: LogLevel) => void;
        level?: LogLevel;
    }>;
}

/**
 * Log filtering options
 */
export interface LogFilterOptions {
    /** Minimum log level to output */
    minLevel?: LogLevel;
    
    /** Log level overrides by context */
    contextOverrides?: Record<string, LogLevel>;
    
    /** Pattern matching filters */
    patterns?: {
        include?: RegExp[];
        exclude?: RegExp[];
    };
    
    /** Context-based filters */
    contextFilters?: {
        [key: string]: (value: unknown) => boolean;
    };
}

/**
 * Type guard utilities for logging
 */
export const LogTypeGuards = {
    /**
     * Check if value is a valid log level
     */
    isLogLevel: (value: unknown): value is LogLevel => {
        return typeof value === 'string' && 
               ['trace', 'debug', 'info', 'warn', 'error', 'silent'].includes(value);
    },

    /**
     * Check if value is a task completion props object
     */
    isTaskCompletionProps: (value: unknown): value is TaskCompletionProps => {
        if (!value || typeof value !== 'object') return false;
        const props = value as Partial<TaskCompletionProps>;
        return (
            'llmUsageStats' in props &&
            'iterationCount' in props &&
            'duration' in props &&
            'agentName' in props &&
            'agentModel' in props &&
            'taskTitle' in props &&
            'currentTaskNumber' in props &&
            'totalTasks' in props &&
            'costDetails' in props
        );
    },

    /**
     * Check if value is a workflow result props object
     */
    isWorkflowResultProps: (value: unknown): value is WorkflowResultProps => {
        if (!value || typeof value !== 'object') return false;
        const props = value as Partial<WorkflowResultProps>;
        return (
            'metadata' in props &&
            props.metadata !== undefined &&
            typeof props.metadata === 'object' &&
            'result' in props.metadata &&
            'duration' in props.metadata &&
            'llmUsageStats' in props.metadata &&
            'costDetails' in props.metadata
        );
    }
};