/**
 * @file logging.ts
 * @path src/utils/types/common/logging.ts
 * @description Type definitions for logging and log formatting
 */
import { CostDetails } from "@/utils";
import type { LLMUsageStats } from "@/utils/types/llm";

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LoggerConfig {
    level?: LogLevel;
    timestamp?: boolean;
    showLevel?: boolean;
    formatter?: (level: string, message: string) => string;
    serializer?: (obj: unknown) => string;
}

export interface TaskCompletionProps {
    llmUsageStats: LLMUsageStats;
    iterationCount: number;
    duration: number;
    agentName: string;
    agentModel: string;
    taskTitle: string;
    currentTaskNumber: number;
    totalTasks: number;
    costDetails: CostDetails;
}

export interface TaskStatusProps {
    currentTaskNumber: number;
    totalTasks: number;
    taskTitle: string;
    taskStatus: string;
    agentName: string;
}

export interface WorkflowStatusProps {
    status: string;
    message: string;
}

export interface WorkflowResultProps {
    metadata: {
        result: string;
        duration: number;
        llmUsageStats: LLMUsageStats;
        iterationCount: number;
        costDetails: CostDetails;
        teamName: string;
        taskCount: number;
        agentCount: number;
    };
}

export interface LogFormattingOptions {
    colors?: { [key in LogLevel]?: string };
    timestampFormat?: string;
    useEmoji?: boolean;
    formatters?: { [key: string]: (value: unknown) => string };
}

export interface LogDestinationConfig {
    console?: { enabled: boolean; format?: string; level?: LogLevel };
    file?: { enabled: boolean; path?: string; rotationSize?: number; maxFiles?: number };
    custom?: Array<{ handler: (message: string, level: LogLevel) => void; level?: LogLevel }>;
}

export interface LogFilterOptions {
    minLevel?: LogLevel;
    contextOverrides?: Record<string, LogLevel>;
    patterns?: { include?: RegExp[]; exclude?: RegExp[] };
    contextFilters?: { [key: string]: (value: unknown) => boolean };
}

export const LogTypeGuards = {
    isLogLevel: (value: unknown): value is LogLevel => {
        return typeof value === 'string' && 
               ['trace', 'debug', 'info', 'warn', 'error', 'silent'].includes(value);
    },
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
