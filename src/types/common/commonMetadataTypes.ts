/**
 * @file commonMetadataTypes.ts
 * @path KaibanJS\src\types\common\commonMetadataTypes.ts
 * @description Strict metadata type definitions with enhanced type safety
 */

import type { IValidationResult, ValidationErrorType, ValidationWarningType } from './commonValidationTypes';
import type { IStatusEntity, IStatusType } from './commonStatusTypes';
import type { IPerformanceMetrics, IResourceMetrics } from './commonMetricTypes';
import type { ILLMUsageMetrics } from '../llm/llmMetricTypes';
import type { ICostDetails } from '../workflow/workflowCostsTypes';
import type { 
    AGENT_STATUS_enum,
    MESSAGE_STATUS_enum,
    TASK_STATUS_enum,
    WORKFLOW_STATUS_enum
} from './commonEnums';

// ─── Base Context Types ─────────────────────────────────────────────────────────

/** Base context interface with required fields */
export interface IBaseContextRequired {
    readonly source: string;
    readonly target: string;
    readonly correlationId: string;
    readonly causationId: string;
}

/** Base context interface with all fields optional for construction */
export interface IBaseContextPartial extends Partial<IBaseContextRequired> {
    [key: string]: unknown;
}

/** Status change context interface */
export interface IStatusChangeContext extends Partial<IBaseContextRequired> {
    readonly taskId: string;
    readonly taskName: string;
    readonly agentId: string;
    readonly agentName: string;
    readonly workflowId: string;
    readonly messageId: string;
    [key: string]: unknown;
}

// ─── Base Metadata Types ─────────────────────────────────────────────────────────

/** Base handler metadata interface with strict typing */
export interface IBaseHandlerMetadata {
    [key: string]: unknown;
    readonly timestamp: number;
    readonly component: string;
    readonly operation: string;
    readonly performance: IPerformanceMetrics;
    readonly context: IBaseContextPartial;
    readonly validation: {
        readonly isValid: boolean;
        readonly errors: ReadonlyArray<ValidationErrorType>;
        readonly warnings: ReadonlyArray<ValidationWarningType>;
    };
}

/** Status change metadata interface */
export interface IStatusChangeMetadata extends IBaseHandlerMetadata {
    readonly entity: {
        readonly type: IStatusEntity;
        readonly id: string;
        readonly name: string;
    };
    readonly transition: {
        readonly from: IStatusType;
        readonly to: IStatusType;
        readonly reason: string;
        readonly triggeredBy: string;
    };
    readonly validation: IValidationResult;
    readonly resources: IResourceMetrics;
    readonly context: IStatusChangeContext;
}

/** Success metadata with strict validation */
export interface ISuccessMetadata extends IBaseHandlerMetadata {
    readonly validation: IValidationResult;
    readonly details: {
        readonly duration: number;
        readonly status: 'success' | 'partial' | 'warning';
        readonly warnings: ReadonlyArray<ValidationWarningType>;
        readonly metrics: {
            readonly executionTime: number;
            readonly memoryUsage: number;
            readonly cpuUsage: number;
        };
    };
}

/** Error metadata with strict tracking */
export interface IErrorMetadata extends IBaseHandlerMetadata {
    readonly error: {
        readonly code: string;
        readonly type: string;
        readonly message: string;
        readonly context: {
            readonly source: string;
            readonly target: string;
            readonly data: unknown;
        };
        readonly severity: 'low' | 'medium' | 'high' | 'critical';
        readonly rootError: Error;
        readonly recommendedAction: string;
        readonly stackTrace: string;
        readonly metrics: {
            readonly occurrenceCount: number;
            readonly lastOccurrence: number;
            readonly meanTimeBetweenFailures: number;
            readonly performance: IPerformanceMetrics;
        };
    };
    readonly debug: {
        readonly lastKnownState: string;
        readonly recoveryAttempts: number;
        readonly diagnostics: {
            readonly memory: number;
            readonly cpu: number;
            readonly network: number;
        };
    };
    readonly validation: IValidationResult;
    readonly transition: {
        readonly from: string;
        readonly to: string;
        readonly entity: string;
        readonly entityId: string;
        readonly timestamp: number;
    };
}

/** Tool execution metadata */
export interface IToolExecutionMetadata extends IBaseHandlerMetadata {
    readonly tool: {
        readonly name: string;
        readonly executionTime: number;
        readonly status: 'success' | 'failed';
        readonly inputSize: number;
        readonly outputSize: number;
        readonly performance: IPerformanceMetrics;
        readonly resources: IResourceMetrics;
        readonly error?: {
            readonly code: string;
            readonly message: string;
            readonly timestamp: number;
        };
    };
}

/** Response metadata */
export interface IResponseMetadata extends IBaseHandlerMetadata {
    readonly response: {
        readonly id: string;
        readonly type: 'text' | 'json' | 'binary' | 'stream';
        readonly size: number;
        readonly processingTime: number;
        readonly compressionRatio: number;
        readonly format: string;
        readonly encoding: string;
        readonly performance: IPerformanceMetrics;
        readonly resources: IResourceMetrics;
    };
}

/** Message metadata */
export interface IMessageMetadata extends IBaseHandlerMetadata {
    readonly message: {
        readonly id: string;
        readonly processingInfo: {
            readonly parseTime: number;
            readonly tokenCount: number;
            readonly compressionRatio: number;
            readonly priority: number;
        };
        readonly context: {
            readonly threadId: string;
            readonly parentMessageId?: string;
            readonly references: ReadonlyArray<string>;
            readonly depth: number;
            readonly path: ReadonlyArray<string>;
        };
        readonly performance: IPerformanceMetrics;
        readonly type: MESSAGE_STATUS_enum;
    };
}

/** Team metadata with strict structure */
export interface ITeamMetadata extends IBaseHandlerMetadata {
    readonly team: {
        readonly name: string;
        readonly agents: Readonly<Record<string, IAgentMetadata>>;
        readonly tasks: Readonly<Record<string, ITaskMetadata>>;
        readonly performance: IPerformanceMetrics;
        readonly llmUsageMetrics: ILLMUsageMetrics;
        readonly costDetails: ICostDetails;
        readonly messageCount: number;
        readonly iterationCount: number;
        readonly metrics: {
            readonly agentUtilization: number;
            readonly taskCompletionRate: number;
            readonly averageTaskTime: number;
            readonly resourceEfficiency: number;
            readonly errorRate: number;
        };
    };
}

/** Workflow metadata with strict metrics */
export interface IWorkflowMetadata extends IBaseHandlerMetadata {
    readonly workflow: {
        readonly id: string;
        readonly performance: IPerformanceMetrics;
        readonly debugInfo: {
            readonly lastCheckpoint: string;
            readonly warnings: ReadonlyArray<ValidationWarningType>;
            readonly errors: ReadonlyArray<{
                readonly code: string;
                readonly message: string;
                readonly timestamp: number;
            }>;
        };
        readonly priority: number;
        readonly retryCount: number;
        readonly taskCount: number;
        readonly agentCount: number;
        readonly costDetails: ICostDetails;
        readonly llmUsageMetrics: ILLMUsageMetrics;
        readonly teamName: string;
        readonly messageCount: number;
        readonly iterationCount: number;
        readonly status: WORKFLOW_STATUS_enum;
    };
}

/** Agent metadata with strict metrics */
export interface IAgentMetadata extends IBaseHandlerMetadata {
    readonly agent: {
        readonly id: string;
        readonly name: string;
        readonly role: string;
        readonly status: AGENT_STATUS_enum;
        readonly metrics: {
            readonly iterations: number;
            readonly executionTime: number;
            readonly llmUsageMetrics: ILLMUsageMetrics;
            readonly performance: IPerformanceMetrics;
            readonly resources: IResourceMetrics;
            readonly successRate: number;
            readonly taskCompletion: number;
            readonly responseTime: number;
        };
        readonly lastActivity: number;
        readonly capabilities: ReadonlyArray<string>;
    };
}

/** Agent creation metadata */
export interface IAgentCreationMetadata extends IBaseHandlerMetadata {
    readonly createdAt: number;
    readonly configHash: string;
    readonly version: string;
    readonly validation: IValidationResult;
    readonly resources: IResourceMetrics;
    readonly initialization: {
        readonly duration: number;
        readonly status: 'success' | 'failed';
        readonly errors: ReadonlyArray<ValidationErrorType>;
    };
}

/** Agent execution metadata */
export interface IAgentExecutionMetadata extends IBaseHandlerMetadata {
    readonly iterations: number;
    readonly executionTime: number;
    readonly llmUsageMetrics: ILLMUsageMetrics;
    readonly performance: IPerformanceMetrics;
    readonly resources: IResourceMetrics;
    readonly status: AGENT_STATUS_enum;
    readonly error?: {
        readonly code: string;
        readonly message: string;
        readonly timestamp: number;
    };
}

/** Task metadata with strict metrics */
export interface ITaskMetadata extends IBaseHandlerMetadata {
    readonly task: {
        readonly id: string;
        readonly type: string;
        readonly priority: number;
        readonly status: TASK_STATUS_enum;
        readonly metrics: {
            readonly iterations: number;
            readonly executionTime: number;
            readonly llmUsageMetrics: ILLMUsageMetrics;
            readonly performance: IPerformanceMetrics;
            readonly resources: IResourceMetrics;
            readonly completionRate: number;
            readonly errorRate: number;
        };
        readonly dependencies: ReadonlyArray<string>;
        readonly assignedAgent?: string;
    };
}

// ─── Type Guards ────────────────────────────────────────────────────────────────

/** Type guard check function type */
export type TypeGuardCheck<T> = (value: unknown) => value is T;

/** Create a type guard with multiple checks */
const createTypeGuard = <T>(checks: Array<(value: unknown) => boolean>): TypeGuardCheck<T> => {
    return (value: unknown): value is T => {
        return checks.every(check => check(value));
    };
};

/** Common metadata checks */
const metadataChecks = {
    isObject: (value: unknown): boolean => 
        typeof value === 'object' && value !== null,
    hasProperty: (prop: string) => 
        (value: unknown): boolean => 
            typeof value === 'object' && 
            value !== null && 
            prop in value,
    isType: (prop: string, type: string) =>
        (value: unknown): boolean =>
            typeof value === 'object' &&
            value !== null &&
            typeof (value as any)[prop] === type,
    hasMetrics: (value: unknown): boolean =>
        typeof value === 'object' &&
        value !== null &&
        'metrics' in value &&
        typeof (value as any).metrics === 'object'
};

/** Metadata type guards interface */
export interface IMetadataTypeGuards {
    isBaseHandlerMetadata: TypeGuardCheck<IBaseHandlerMetadata>;
    isStatusChangeMetadata: TypeGuardCheck<IStatusChangeMetadata>;
    isSuccessMetadata: TypeGuardCheck<ISuccessMetadata>;
    isErrorMetadata: TypeGuardCheck<IErrorMetadata>;
    isToolExecutionMetadata: TypeGuardCheck<IToolExecutionMetadata>;
    isResponseMetadata: TypeGuardCheck<IResponseMetadata>;
    isMessageMetadata: TypeGuardCheck<IMessageMetadata>;
    isTeamMetadata: TypeGuardCheck<ITeamMetadata>;
    isWorkflowMetadata: TypeGuardCheck<IWorkflowMetadata>;
    isAgentMetadata: TypeGuardCheck<IAgentMetadata>;
    isTaskMetadata: TypeGuardCheck<ITaskMetadata>;
    isAgentCreationMetadata: TypeGuardCheck<IAgentCreationMetadata>;
    isAgentExecutionMetadata: TypeGuardCheck<IAgentExecutionMetadata>;
}

/** Metadata type guards implementation */
export const MetadataTypeGuards: IMetadataTypeGuards = {
    isBaseHandlerMetadata: createTypeGuard<IBaseHandlerMetadata>([
        metadataChecks.isObject,
        metadataChecks.isType('timestamp', 'number'),
        metadataChecks.isType('component', 'string'),
        metadataChecks.isType('operation', 'string'),
        metadataChecks.hasProperty('performance')
    ]),

    isStatusChangeMetadata: createTypeGuard<IStatusChangeMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => {
            const metadata = value as Partial<IStatusChangeMetadata>;
            return (
                metadata.entity?.type !== undefined &&
                typeof metadata.entity?.id === 'string' &&
                typeof metadata.entity?.name === 'string' &&
                metadata.transition?.from !== undefined &&
                metadata.transition?.to !== undefined &&
                typeof metadata.transition?.reason === 'string' &&
                typeof metadata.transition?.triggeredBy === 'string' &&
                metadata.validation !== undefined &&
                metadata.resources !== undefined &&
                metadata.context !== undefined &&
                typeof metadata.context.taskId === 'string' &&
                typeof metadata.context.taskName === 'string' &&
                typeof metadata.context.agentId === 'string' &&
                typeof metadata.context.agentName === 'string' &&
                typeof metadata.context.workflowId === 'string' &&
                typeof metadata.context.messageId === 'string'
            );
        }
    ]),

    isSuccessMetadata: createTypeGuard<ISuccessMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        metadataChecks.hasProperty('details'),
        value => typeof (value as any).details?.status === 'string',
        value => typeof (value as any).details?.duration === 'number'
    ]),

    isErrorMetadata: createTypeGuard<IErrorMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).error?.code === 'string',
        value => typeof (value as any).error?.type === 'string',
        value => typeof (value as any).error?.severity === 'string',
        value => metadataChecks.hasMetrics((value as any).error)
    ]),

    isToolExecutionMetadata: createTypeGuard<IToolExecutionMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).tool?.name === 'string',
        value => typeof (value as any).tool?.executionTime === 'number',
        value => typeof (value as any).tool?.status === 'string'
    ]),

    isResponseMetadata: createTypeGuard<IResponseMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).response?.id === 'string',
        value => typeof (value as any).response?.type === 'string',
        value => typeof (value as any).response?.size === 'number'
    ]),

    isMessageMetadata: createTypeGuard<IMessageMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).message?.id === 'string',
        value => metadataChecks.hasProperty('processingInfo')((value as any).message),
        value => metadataChecks.hasProperty('context')((value as any).message)
    ]),

    isTeamMetadata: createTypeGuard<ITeamMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).team?.name === 'string',
        value => metadataChecks.isObject((value as any).team?.agents),
        value => metadataChecks.isObject((value as any).team?.tasks),
        value => metadataChecks.hasMetrics((value as any).team)
    ]),

    isWorkflowMetadata: createTypeGuard<IWorkflowMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).workflow?.id === 'string',
        value => typeof (value as any).workflow?.priority === 'number',
        value => typeof (value as any).workflow?.taskCount === 'number',
        value => typeof (value as any).workflow?.teamName === 'string'
    ]),

    isAgentMetadata: createTypeGuard<IAgentMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).agent?.id === 'string',
        value => typeof (value as any).agent?.name === 'string',
        value => metadataChecks.hasMetrics((value as any).agent),
        value => Array.isArray((value as any).agent?.capabilities)
    ]),

    isTaskMetadata: createTypeGuard<ITaskMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).task?.id === 'string',
        value => typeof (value as any).task?.type === 'string',
        value => metadataChecks.hasMetrics((value as any).task),
        value => Array.isArray((value as any).task?.dependencies)
    ]),

    isAgentCreationMetadata: createTypeGuard<IAgentCreationMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).createdAt === 'number',
        value => typeof (value as any).configHash === 'string',
        value => typeof (value as any).version === 'string',
        value => metadataChecks.isObject((value as any).initialization)
    ]),

    isAgentExecutionMetadata: createTypeGuard<IAgentExecutionMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).iterations === 'number',
        value => typeof (value as any).executionTime === 'number',
        value => metadataChecks.isObject((value as any).llmUsageMetrics),
        value => metadataChecks.isObject((value as any).performance)
    ])
};

// ─── Utility Functions ──────────────────────────────────────────────────────────

/** Create base metadata */
export const createBaseMetadata = (
    component: string,
    operation: string
): IBaseHandlerMetadata => ({
    timestamp: Date.now(),
    component,
    operation,
    performance: {
        executionTime: {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        },
        throughput: {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        },
        errorMetrics: {
            totalErrors: 0,
            errorRate: 0
        },
        resourceUtilization: {
            cpuUsage: 0,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now()
        },
        timestamp: Date.now()
    },
    context: {
        source: component,
        target: operation,
        correlationId: Date.now().toString(),
        causationId: Date.now().toString()
    },
    validation: {
        isValid: true,
        errors: Object.freeze([]) as ReadonlyArray<ValidationErrorType>,
        warnings: Object.freeze([]) as ReadonlyArray<ValidationWarningType>
    }
});
