/**
 * @file commonTypeGuards.ts
 * @path KaibanJS\src\types\common\commonTypeGuards.ts
 * @description Type guard implementations for metadata types
 * 
 * @module @types/common
 */

import type {
    IBaseHandlerMetadata,
    IStatusChangeMetadata,
    ISuccessMetadata,
    IErrorMetadata,
    IToolExecutionMetadata,
    IResponseMetadata,
    IMessageMetadata,
    ITeamMetadata,
    IWorkflowMetadata,
    IAgentMetadata,
    ITaskMetadata,
    IAgentCreationMetadata,
    IAgentExecutionMetadata
} from './commonMetadataTypes';

/** Type guard check function type */
export type TypeGuardCheck<T> = (value: unknown) => value is T;

/** Create a type guard with multiple checks */
export const createTypeGuard = <T>(checks: Array<(value: unknown) => boolean>): TypeGuardCheck<T> => {
    return (value: unknown): value is T => {
        return checks.every(check => check(value));
    };
};

/** Common metadata checks */
export const metadataChecks = {
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
        metadataChecks.hasProperty('performance'),
        metadataChecks.hasProperty('context'),
        metadataChecks.hasProperty('validation')
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
        value => typeof (value as any).details?.duration === 'number',
        value => Array.isArray((value as any).details?.warnings),
        value => typeof (value as any).details?.metrics?.executionTime === 'number',
        value => typeof (value as any).details?.metrics?.memoryUsage === 'number',
        value => typeof (value as any).details?.metrics?.cpuUsage === 'number'
    ]),

    isErrorMetadata: createTypeGuard<IErrorMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).error?.code === 'string',
        value => typeof (value as any).error?.type === 'string',
        value => typeof (value as any).error?.severity === 'string',
        value => metadataChecks.hasMetrics((value as any).error),
        value => typeof (value as any).debug?.lastKnownState === 'string',
        value => typeof (value as any).debug?.recoveryAttempts === 'number',
        value => typeof (value as any).debug?.diagnostics?.memory === 'number',
        value => typeof (value as any).debug?.diagnostics?.cpu === 'number',
        value => typeof (value as any).debug?.diagnostics?.network === 'number'
    ]),

    isToolExecutionMetadata: createTypeGuard<IToolExecutionMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).tool?.name === 'string',
        value => typeof (value as any).tool?.executionTime === 'number',
        value => typeof (value as any).tool?.status === 'string',
        value => typeof (value as any).tool?.inputSize === 'number',
        value => typeof (value as any).tool?.outputSize === 'number'
    ]),

    isResponseMetadata: createTypeGuard<IResponseMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).response?.id === 'string',
        value => typeof (value as any).response?.type === 'string',
        value => typeof (value as any).response?.size === 'number',
        value => typeof (value as any).response?.processingTime === 'number'
    ]),

    isMessageMetadata: createTypeGuard<IMessageMetadata>([
        value => MetadataTypeGuards.isBaseHandlerMetadata(value as any),
        value => typeof (value as any).message?.id === 'string',
        value => metadataChecks.hasProperty('processingInfo')((value as any).message),
        value => metadataChecks.hasProperty('context')((value as any).message),
        value => typeof (value as any).message?.type === 'string'
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
        value => metadataChecks.isObject((value as any).llmUsageStats),
        value => metadataChecks.isObject((value as any).performance)
    ])
};
