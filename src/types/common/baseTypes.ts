/**
 * @file baseTypes.ts
 * @description Base type definitions shared across the system
 */

import type { IPerformanceMetrics } from '../metrics/base/performanceMetrics';
import type { IBaseMetrics } from '../metrics/base/baseMetrics';
import type { IErrorType } from './errorTypes';
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

// ================ Base Handler Types ================

export interface IBaseHandlerMetadata {
    readonly timestamp: number;
    readonly component: string;
    readonly operation: string;
    readonly status?: string;
    readonly duration?: number;
    readonly agent?: {
        id: string;
        name: string;
        role: string;
        status: string;
    };
    readonly category?: string;
    readonly performance?: IPerformanceMetrics;
    readonly validation?: IValidationResult;
    readonly metrics?: IBaseMetrics;
    readonly error?: Error;
    readonly message?: string;
    [key: string]: unknown;
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

// ================ Cost Types ================

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

export const createTypeGuard = <T>(
    checks: Array<(value: unknown) => boolean>,
    metricsCheck?: boolean
): TypeGuardCheck<T> => {
    return (value: unknown): value is T => {
        if (!checks.every(check => check(value))) {
            return false;
        }
        if (metricsCheck && !commonChecks.hasMetrics(value)) {
            return false;
        }
        return true;
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
    hasMetrics: (value: unknown): boolean => {
        if (typeof value !== 'object' || value === null || !('metrics' in value)) {
            return false;
        }
        return isBaseMetrics((value as any).metrics);
    }
};

// ================ Version Utility Functions ================

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

// Dependency Type Guards
export const isDependencySpec = (value: unknown): value is IDependencySpec => {
    if (typeof value !== 'object' || value === null) return false;
    const spec = value as Partial<IDependencySpec>;
    return (
        typeof spec.name === 'string' &&
        typeof spec.version === 'string' &&
        Array.isArray(spec.constraints) &&
        spec.constraints.every(isVersionConstraint) &&
        typeof spec.optional === 'boolean'
    );
};

export const isDependencyResolution = (value: unknown): value is IDependencyResolution => {
    if (typeof value !== 'object' || value === null) return false;
    const resolution = value as Partial<IDependencyResolution>;
    return (
        typeof resolution.name === 'string' &&
        isSemanticVersion(resolution.version) &&
        typeof resolution.satisfied === 'boolean' &&
        (resolution.error === undefined || typeof resolution.error === 'string') &&
        (resolution.alternatives === undefined || (
            Array.isArray(resolution.alternatives) &&
            resolution.alternatives.every(isSemanticVersion)
        ))
    );
};

export const isDependencyNode = (value: unknown): value is IDependencyNode => {
    if (typeof value !== 'object' || value === null) return false;
    const node = value as Partial<IDependencyNode>;
    return (
        typeof node.name === 'string' &&
        isSemanticVersion(node.version) &&
        Array.isArray(node.dependencies) &&
        node.dependencies.every(isDependencySpec) &&
        Array.isArray(node.dependents) &&
        node.dependents.every(dependent => typeof dependent === 'string') &&
        typeof node.optional === 'boolean' &&
        typeof node.resolved === 'boolean'
    );
};

// Parser Type Guards
export const isParsedJSON = (value: unknown): value is IParsedJSON => {
    if (typeof value !== 'object' || value === null) return false;
    const json = value as Partial<IParsedJSON>;
    return (
        (json.thought === undefined || typeof json.thought === 'string') &&
        (json.action === undefined || typeof json.action === 'string') &&
        (json.actionInput === undefined || json.actionInput === null || (
            typeof json.actionInput === 'object' &&
            json.actionInput !== null
        )) &&
        (json.observation === undefined || typeof json.observation === 'string') &&
        (json.isFinalAnswerReady === undefined || typeof json.isFinalAnswerReady === 'boolean') &&
        (json.finalAnswer === undefined || typeof json.finalAnswer === 'string')
    );
};

export const isParserConfig = (value: unknown): value is IParserConfig => {
    if (typeof value !== 'object' || value === null) return false;
    const config = value as Partial<IParserConfig>;
    return (
        (config.attemptRecovery === undefined || typeof config.attemptRecovery === 'boolean') &&
        (config.maxDepth === undefined || typeof config.maxDepth === 'number') &&
        (config.allowNonStringProps === undefined || typeof config.allowNonStringProps === 'boolean') &&
        (config.sanitizers === undefined || (
            Array.isArray(config.sanitizers) &&
            config.sanitizers.every(sanitizer => typeof sanitizer === 'function')
        ))
    );
};

export const isParserResult = <T>(value: unknown): value is IParserResult<T> => {
    if (typeof value !== 'object' || value === null) return false;
    const result = value as Partial<IParserResult<T>>;
    return (
        typeof result.success === 'boolean' &&
        (result.data === undefined || result.data !== null) &&
        (result.error === undefined || (
            typeof result.error === 'object' &&
            result.error !== null &&
            typeof result.error.message === 'string' &&
            (result.error.position === undefined || typeof result.error.position === 'number') &&
            (result.error.context === undefined || typeof result.error.context === 'string')
        )) &&
        (result.recoveryAttempted === undefined || typeof result.recoveryAttempted === 'boolean') &&
        (result.originalInput === undefined || typeof result.originalInput === 'string')
    );
};

// Memory Type Guards
export const isMemoryMetrics = (value: unknown): value is IMemoryMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IMemoryMetrics>;
    return (
        typeof metrics.totalMessages === 'number' &&
        typeof metrics.totalTokens === 'number' &&
        typeof metrics.memoryUsage === 'number' &&
        (metrics.lastCleanup === undefined || (
            typeof metrics.lastCleanup === 'object' &&
            metrics.lastCleanup !== null &&
            typeof metrics.lastCleanup.timestamp === 'number' &&
            typeof metrics.lastCleanup.messagesRemoved === 'number' &&
            typeof metrics.lastCleanup.tokensFreed === 'number'
        )) &&
        (metrics.modelSpecificStats === undefined || (
            typeof metrics.modelSpecificStats === 'object' &&
            metrics.modelSpecificStats !== null &&
            Object.values(metrics.modelSpecificStats).every(stats => 
                typeof stats === 'object' &&
                stats !== null &&
                typeof stats.messageCount === 'number' &&
                typeof stats.tokenCount === 'number' &&
                typeof stats.averageTokensPerMessage === 'number'
            )
        ))
    );
};

// Cost Type Guards
export const isCostAggregate = (value: unknown): value is ICostAggregate => {
    if (typeof value !== 'object' || value === null) return false;
    return Object.values(value as Record<string, unknown>).every(isStandardCostDetails);
};

export const isModelPricingConfig = (value: unknown): value is IModelPricingConfig => {
    if (typeof value !== 'object' || value === null) return false;
    const config = value as Partial<IModelPricingConfig>;
    return (
        typeof config.modelCode === 'string' &&
        typeof config.provider === 'string' &&
        typeof config.inputPricePerMillionTokens === 'number' &&
        typeof config.outputPricePerMillionTokens === 'number' &&
        (config.currency === undefined || typeof config.currency === 'string')
    );
};

export const isCostTrackingOptions = (value: unknown): value is ICostTrackingOptions => {
    if (typeof value !== 'object' || value === null) return false;
    const options = value as Partial<ICostTrackingOptions>;
    return (
        typeof options.enableDetailedTracking === 'boolean' &&
        (options.costPrecision === undefined || typeof options.costPrecision === 'number') &&
        (options.budgetThreshold === undefined || typeof options.budgetThreshold === 'number')
    );
};

export const isTokenCostBreakdown = (value: unknown): value is ITokenCostBreakdown => {
    if (typeof value !== 'object' || value === null) return false;
    const breakdown = value as Partial<ITokenCostBreakdown>;
    return (
        typeof breakdown.count === 'number' &&
        typeof breakdown.cost === 'number'
    );
};

export const isStandardCostDetails = (value: unknown): value is IStandardCostDetails => {
    if (typeof value !== 'object' || value === null) return false;
    const details = value as Partial<IStandardCostDetails>;
    return (
        typeof details.inputCost === 'number' &&
        typeof details.outputCost === 'number' &&
        typeof details.totalCost === 'number' &&
        typeof details.currency === 'string' &&
        typeof details.breakdown === 'object' &&
        details.breakdown !== null &&
        isTokenCostBreakdown(details.breakdown.promptTokens) &&
        isTokenCostBreakdown(details.breakdown.completionTokens)
    );
};

// Event Type Guards
export const isEventValidationResult = (value: unknown): value is IEventValidationResult => {
    if (typeof value !== 'object' || value === null) return false;
    const result = value as Partial<IEventValidationResult>;
    return (
        typeof result.isValid === 'boolean' &&
        Array.isArray(result.errors) &&
        result.errors.every(error => typeof error === 'string') &&
        Array.isArray(result.warnings) &&
        result.warnings.every(warning => typeof warning === 'string') &&
        isEventValidationMetadata(result.metadata)
    );
};

export const isEventValidationMetadata = (value: unknown): value is IEventValidationMetadata => {
    if (typeof value !== 'object' || value === null) return false;
    const metadata = value as Partial<IEventValidationMetadata>;
    return (
        typeof metadata.timestamp === 'number' &&
        typeof metadata.duration === 'number' &&
        typeof metadata.validatorName === 'string'
    );
};

export const isStateChangeEvent = <T>(value: unknown): value is IStateChangeEvent<T> => {
    if (!isBaseEvent(value)) return false;
    const event = value as Partial<IStateChangeEvent<T>>;
    return (
        event.previousState !== undefined &&
        event.newState !== undefined &&
        isValidationResult(event.validationResult)
    );
};

export const isBaseEvent = (value: unknown): value is IBaseEvent => {
    if (typeof value !== 'object' || value === null) return false;
    const event = value as Partial<IBaseEvent>;
    return (
        typeof event.id === 'string' &&
        typeof event.timestamp === 'number' &&
        typeof event.type === 'string' &&
        isBaseHandlerMetadata(event.metadata)
    );
};

// Context Type Guards
export const isBaseContextRequired = (value: unknown): value is IBaseContextRequired => {
    if (typeof value !== 'object' || value === null) return false;
    const context = value as Partial<IBaseContextRequired>;
    return (
        typeof context.source === 'string' &&
        typeof context.target === 'string' &&
        typeof context.correlationId === 'string' &&
        typeof context.causationId === 'string'
    );
};

// Validation Type Guards
export const isValidationResult = (value: unknown): value is IValidationResult => {
    if (typeof value !== 'object' || value === null) return false;
    const validation = value as Partial<IValidationResult>;
    return (
        typeof validation.isValid === 'boolean' &&
        Array.isArray(validation.errors) &&
        validation.errors.every(error => typeof error === 'string') &&
        Array.isArray(validation.warnings) &&
        validation.warnings.every(warning => typeof warning === 'string')
    );
};

// Handler Type Guards
export const isBaseHandlerMetadata = (value: unknown): value is IBaseHandlerMetadata => {
    if (typeof value !== 'object' || value === null) return false;
    const metadata = value as Partial<IBaseHandlerMetadata>;
    return (
        typeof metadata.timestamp === 'number' &&
        typeof metadata.component === 'string' &&
        typeof metadata.operation === 'string' &&
        (metadata.status === undefined || typeof metadata.status === 'string') &&
        (metadata.duration === undefined || typeof metadata.duration === 'number') &&
        (metadata.metrics === undefined || isBaseMetrics(metadata.metrics)) &&
        (metadata.performance === undefined || isPerformanceMetrics(metadata.performance)) &&
        (metadata.validation === undefined || isValidationResult(metadata.validation)) &&
        (metadata.agent === undefined || (
            typeof metadata.agent === 'object' &&
            metadata.agent !== null &&
            typeof metadata.agent.id === 'string' &&
            typeof metadata.agent.name === 'string' &&
            typeof metadata.agent.role === 'string' &&
            typeof metadata.agent.status === 'string'
        )) &&
        (metadata.error === undefined || metadata.error instanceof Error) &&
        (metadata.message === undefined || typeof metadata.message === 'string')
    );
};

// Metrics Type Guards
export const isPerformanceMetrics = (value: unknown): value is IPerformanceMetrics => {
    if (!isBaseMetrics(value)) return false;
    const metrics = value as Partial<IPerformanceMetrics>;
    return (
        typeof metrics.responseTime === 'object' &&
        metrics.responseTime !== null &&
        typeof metrics.responseTime.average === 'number' &&
        typeof metrics.responseTime.min === 'number' &&
        typeof metrics.responseTime.max === 'number' &&
        typeof metrics.throughput === 'object' &&
        metrics.throughput !== null &&
        typeof metrics.throughput.requestsPerSecond === 'number' &&
        typeof metrics.throughput.bytesPerSecond === 'number'
    );
};

export const isBaseMetrics = (value: unknown): value is IBaseMetrics => {
    if (typeof value !== 'object' || value === null) return false;
    const metrics = value as Partial<IBaseMetrics>;
    return (
        typeof metrics.timestamp === 'number' &&
        typeof metrics.component === 'string' &&
        typeof metrics.category === 'string' &&
        typeof metrics.version === 'string'
    );
};

// Version Type Guards
export const isVersionRange = (value: unknown): value is IVersionRange => {
    if (typeof value !== 'object' || value === null) return false;
    const range = value as Partial<IVersionRange>;
    return (
        (range.min === undefined || isVersionConstraint(range.min)) &&
        (range.max === undefined || isVersionConstraint(range.max))
    );
};

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
    duration: 0,
    status: 'success',
    metrics: {
        timestamp: Date.now(),
        component,
        category: 'base',
        version: '1.0.0'
    }
});
