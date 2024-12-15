/**
 * @file baseTypes.ts
 * @description Base type definitions shared across the system
 */

import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IErrorType, IBaseError } from './errorTypes';
import type { IValidationResult } from './validationTypes';
import type { IAgentType } from '../agent/agentBaseTypes';
import type { ITaskType } from '../task/taskBaseTypes';

// ================ Base Context Types ================

export interface IBaseContextRequired {
    readonly source: string;
    readonly target: string;
    readonly correlationId: string;
    readonly causationId: string;
}

export interface IBaseContextPartial extends Partial<IBaseContextRequired> {
    [key: string]: unknown;
}

// ================ Memory Types ================

export interface IMemoryMetrics {
    totalMessages: number;
    totalTokens: number;
    memoryUsage: number;
    lastCleanup?: {
        timestamp: number;
        messagesRemoved: number;
        tokensFreed: number;
    };
    modelSpecificStats?: {
        [model: string]: {
            messageCount: number;
            tokenCount: number;
            averageTokensPerMessage: number;
        };
    };
}

// ================ Parser Types ================

export interface IParsedJSON {
    thought?: string;
    action?: string;
    actionInput?: Record<string, unknown> | null;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
    [key: string]: unknown;
}

export interface IParserConfig {
    attemptRecovery?: boolean;
    maxDepth?: number;
    allowNonStringProps?: boolean;
    sanitizers?: Array<(input: string) => string>;
}

export interface IParserResult<T> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        position?: number;
        context?: string;
    };
    recoveryAttempted?: boolean;
    originalInput?: string;
}

// ================ Version Types ================

export interface ISemanticVersion {
    readonly major: number;
    readonly minor: number;
    readonly patch: number;
    readonly prerelease?: string;
    readonly build?: string;
}

export type VersionOperator = '=' | '>' | '<' | '>=' | '<=' | '^' | '~';

export interface IVersionConstraint {
    readonly operator: VersionOperator;
    readonly version: ISemanticVersion;
}

export interface IVersionRange {
    readonly min?: IVersionConstraint;
    readonly max?: IVersionConstraint;
}

export interface IDependencySpec {
    readonly name: string;
    readonly version: string;
    readonly constraints: IVersionConstraint[];
    readonly optional: boolean;
}

export interface IDependencyResolution {
    readonly name: string;
    readonly version: ISemanticVersion;
    readonly satisfied: boolean;
    readonly error?: string;
    readonly alternatives?: ISemanticVersion[];
}

export interface IDependencyNode {
    readonly name: string;
    readonly version: ISemanticVersion;
    readonly dependencies: IDependencySpec[];
    readonly dependents: string[];
    readonly optional: boolean;
    readonly resolved: boolean;
}

export enum DEPENDENCY_ERROR_TYPE {
    VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
    VERSION_MISMATCH = 'VERSION_MISMATCH',
    CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
    MISSING_DEPENDENCY = 'MISSING_DEPENDENCY',
    CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION'
}

// Version Utility Functions
export const parseVersion = (version: string): ISemanticVersion => {
    const match = version.match(
        /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
    );

    if (!match) {
        throw new Error(`Invalid version string: ${version}`);
    }

    const [, major, minor, patch, prerelease, build] = match;

    return {
        major: parseInt(major, 10),
        minor: parseInt(minor, 10),
        patch: parseInt(patch, 10),
        prerelease,
        build
    };
};

export const compareVersions = (v1: ISemanticVersion, v2: ISemanticVersion): number => {
    if (v1.major !== v2.major) {
        return v1.major < v2.major ? -1 : 1;
    }
    if (v1.minor !== v2.minor) {
        return v1.minor < v2.minor ? -1 : 1;
    }
    if (v1.patch !== v2.patch) {
        return v1.patch < v2.patch ? -1 : 1;
    }
    if (v1.prerelease !== v2.prerelease) {
        if (!v1.prerelease) return 1;
        if (!v2.prerelease) return -1;
        return v1.prerelease < v2.prerelease ? -1 : 1;
    }
    return 0;
};

export const parseConstraint = (constraint: string): IVersionConstraint => {
    const match = constraint.match(/^([=<>~^]|>=|<=)?\s*(.+)$/);
    if (!match) {
        throw new Error(`Invalid version constraint: ${constraint}`);
    }

    const [, operator = '=', version] = match;
    return {
        operator: operator as VersionOperator,
        version: parseVersion(version)
    };
};

export const satisfiesConstraint = (
    version: ISemanticVersion,
    constraint: IVersionConstraint
): boolean => {
    const comparison = compareVersions(version, constraint.version);

    switch (constraint.operator) {
        case '=':
            return comparison === 0;
        case '>':
            return comparison > 0;
        case '<':
            return comparison < 0;
        case '>=':
            return comparison >= 0;
        case '<=':
            return comparison <= 0;
        case '^':
            if (constraint.version.major !== 0) {
                return version.major === constraint.version.major &&
                    compareVersions(version, constraint.version) >= 0;
            }
            if (constraint.version.minor !== 0) {
                return version.major === 0 &&
                    version.minor === constraint.version.minor &&
                    compareVersions(version, constraint.version) >= 0;
            }
            return version.major === 0 &&
                version.minor === 0 &&
                version.patch === constraint.version.patch;
        case '~':
            return version.major === constraint.version.major &&
                version.minor === constraint.version.minor &&
                compareVersions(version, constraint.version) >= 0;
        default:
            return false;
    }
};

export const satisfiesRange = (version: ISemanticVersion, range: IVersionRange): boolean => {
    if (range.min && !satisfiesConstraint(version, range.min)) {
        return false;
    }
    if (range.max && !satisfiesConstraint(version, range.max)) {
        return false;
    }
    return true;
};

// Version Type Guards
export const isSemanticVersion = (value: unknown): value is ISemanticVersion => {
    if (typeof value !== 'object' || value === null) return false;
    const version = value as Partial<ISemanticVersion>;
    return (
        typeof version.major === 'number' &&
        typeof version.minor === 'number' &&
        typeof version.patch === 'number' &&
        (version.prerelease === undefined || typeof version.prerelease === 'string') &&
        (version.build === undefined || typeof version.build === 'string')
    );
};

export const isVersionConstraint = (value: unknown): value is IVersionConstraint => {
    if (typeof value !== 'object' || value === null) return false;
    const constraint = value as Partial<IVersionConstraint>;
    return (
        typeof constraint.operator === 'string' &&
        ['=', '>', '<', '>=', '<=', '^', '~'].includes(constraint.operator) &&
        isSemanticVersion(constraint.version)
    );
};

// ================ Metrics Types ================

export interface ITokenCostBreakdown {
    count: number;
    cost: number;
}

export interface IStandardCostDetails {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    breakdown: {
        promptTokens: ITokenCostBreakdown;
        completionTokens: ITokenCostBreakdown;
    };
}

export interface IModelPricingConfig {
    modelCode: string;
    provider: string;
    inputPricePerMillionTokens: number;
    outputPricePerMillionTokens: number;
    currency?: string;
}

export interface ICostTrackingOptions {
    enableDetailedTracking: boolean;
    costPrecision?: number;
    budgetThreshold?: number;
}

export type ICostAggregate = {
    [key: string]: IStandardCostDetails;
};

export interface IResourceMetrics {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: {
        read: number;
        write: number;
    };
    networkUsage: {
        upload: number;
        download: number;
    };
    timestamp: number;
}

export interface IUsageMetrics {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    costDetails: IStandardCostDetails;
    timestamp: number;
}

// ================ Base Handler Types ================

export interface IBaseHandlerMetadata {
    [key: string]: unknown;
    readonly timestamp: number;
    readonly component: string;
    readonly operation: string;
    readonly performance: IPerformanceMetrics;
    readonly context: IBaseContextPartial;
    readonly validation: IValidationResult;
}

export interface IBaseHandler {
    validate(): Promise<boolean>;
    execute(): Promise<void>;
    handleError(error: Error): Promise<void>;
}

export interface IHandlerResult<T = unknown, M extends IBaseHandlerMetadata = IBaseHandlerMetadata> {
    success: boolean;
    error?: IErrorType;
    data?: T;
    metadata: M;
}

export interface IBaseHandlerParams {
    agent: IAgentType;
    task: ITaskType;
    metadata: IBaseHandlerMetadata;
    context?: IBaseContextPartial;
}

export interface IBaseExecutionOptions {
    timeout?: number;
    retries?: number;
    signal?: AbortSignal;
    strict?: boolean;
    customValidators?: ((value: unknown) => boolean)[];
}

// ================ Base Event Types ================

export interface IBaseEvent {
    id: string;
    timestamp: number;
    type: string;
    metadata: IBaseHandlerMetadata;
}

export interface IStateChangeEvent<T> extends IBaseEvent {
    previousState: T;
    newState: T;
    validationResult: IValidationResult;
}

// ================ Event Handler Types ================

export interface IEventHandler<T extends IBaseEvent> {
    handle(event: T): Promise<void>;
    validate(event: T): Promise<IValidationResult>;
}

export interface IEventEmitter {
    emit<T extends IBaseEvent>(event: T): Promise<void>;
    on<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void;
    off<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void;
}

// ================ Event Bus Types ================

export interface IEventSubscription {
    unsubscribe(): void;
}

export interface IEventBus {
    publish<T extends IBaseEvent>(event: T): Promise<void>;
    subscribe<T extends IBaseEvent>(
        eventType: string,
        handler: IEventHandler<T>
    ): IEventSubscription;
}

// ================ Event Registry Types ================

export interface IEventRegistry {
    registerHandler<T extends IBaseEvent>(
        eventType: string,
        handler: IEventHandler<T>
    ): void;
    unregisterHandler<T extends IBaseEvent>(
        eventType: string,
        handler: IEventHandler<T>
    ): void;
    getHandlers<T extends IBaseEvent>(eventType: string): IEventHandler<T>[];
}

// ================ Event Validation Types ================

export interface IEventValidationMetadata {
    timestamp: number;
    duration: number;
    validatorName: string;
}

export interface IEventValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: IEventValidationMetadata;
}

// ================ Type Guards ================

export type TypeGuardCheck<T> = (value: unknown) => value is T;

export const createTypeGuard = <T>(checks: Array<(value: unknown) => boolean>): TypeGuardCheck<T> => {
    return (value: unknown): value is T => {
        return checks.every(check => check(value));
    };
};

export const commonChecks = {
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

// ================ Utility Functions ================

export const createSuccessResult = <T, M extends IBaseHandlerMetadata>(
    data: T,
    metadata: M
): IHandlerResult<T, M> => ({
    success: true,
    data,
    metadata
});

export const createErrorResult = <M extends IBaseHandlerMetadata>(
    error: IErrorType,
    metadata: M
): IHandlerResult<never, M> => ({
    success: false,
    error,
    metadata
});

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
        latency: {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        },
        responseTime: {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        },
        throughput: {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        },
        queueLength: 0,
        errorRate: 0,
        successRate: 1,
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
        errors: [],
        warnings: []
    }
});
