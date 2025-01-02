import { MetricDomain, MetricType } from './metricTypes';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../common/enumTypes';
import { IAgentStateMetrics } from '../../agent/agentStateTypes';

export interface ITimeMetrics {
    start: Date;
    end: Date;
    duration: number;
    average: number;
    min: number;
    max: number;
}

export interface IThroughputMetrics {
    requests: number;
    responses: number;
    rate: number;
    successRate: number;
    errorRate: number;
    timestamp: number;
    requestsPerSecond: number;
    bytesPerSecond: number;
}

export interface IRateLimitMetrics {
    limit: number;
    remaining: number;
    reset: number;
    current: number;
    resetTime: number;
}

export interface ITokenCostBreakdown {
    count: number;
    cost: number;
}

export interface ICostBreakdown {
    promptTokens: ITokenCostBreakdown;
    completionTokens: ITokenCostBreakdown;
    [key: string]: ITokenCostBreakdown;
}

export interface ICostDetails {
    inputCost: number;
    outputCost: number;
    totalCost: number;
    currency: string;
    breakdown: ICostBreakdown;
}

export interface IBaseManagerMetadata {
    version: string;
    initializedAt: Date;
    lastValidatedAt: Date;
    dependencies: string[];
    category: MANAGER_CATEGORY_enum;
    operation: string;
    duration: number;
    status: 'success' | 'failure' | 'partial';
    startTime: Date;
    endTime: Date;
    agent: {
        id: string;
        name: string;
        role: string;
        status: AGENT_STATUS_enum;
        metrics?: {
            iterations?: number;
            executionTime?: number;
            llmMetrics?: string;
        };
    };
    timestamp: number;
    component: string;
    [key: string]: unknown;
}

export interface IBaseManager<T extends IBaseManagerMetadata> {
    category: MANAGER_CATEGORY_enum;
    initialize(): Promise<void>;
    validate(): Promise<boolean>;
    getMetadata(): T;
}

export interface IError {
    message: string;
    type: string;
    context?: Record<string, unknown>;
}

export interface IResourceMetrics {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    timestamp: number;
    usage: {
        cpu: number;
        memory: number;
        disk: number;
        network: number;
    };
    limit: {
        cpu: number;
        memory: number;
        disk: number;
        network: number;
    };
    available: {
        cpu: number;
        memory: number;
        disk: number;
        network: number;
    };
}

export interface IMetricsManager extends IBaseManager<IBaseManagerMetadata> {
    trackError(params: {
        domain: MetricDomain;
        type: MetricType;
        error: Error;
        metadata: Record<string, unknown>;
    }): Promise<void>;

    trackPerformance(params: {
        domain: MetricDomain;
        type: MetricType;
        duration: number;
        metadata: Record<string, unknown>;
    }): Promise<void>;

    getCognitiveMetrics(agentId?: string): Promise<ICognitiveResourceMetrics>;
    getOperationMetrics(agentId?: string): Promise<IThinkingOperationMetrics>;
    getPerformanceMetrics(agentId?: string): Promise<IAgentPerformanceMetrics>;
    getResourceMetrics(agentId?: string): Promise<IResourceMetrics>;
    getUsageMetrics(agentId?: string): Promise<IAgentUsageMetrics>;
}

export interface ICognitiveResourceMetrics {
    component: string;
    category: string;
    version: string;
    iterations: number;
    executionTime: number;
    llmMetrics: Record<string, unknown>;
    reasoningTime: ITimeMetrics;
    planningTime: ITimeMetrics;
    learningTime: ITimeMetrics;
    decisionConfidence: number;
    memoryUsage: number;
    cpuUsage: number;
    networkUsage: number;
    diskUsage: number;
}

export interface IThinkingOperationMetrics {
    component: string;
    category: string;
    version: string;
    iterations: number;
    executionTime: number;
    llmMetrics: Record<string, unknown>;
    reasoningTime: ITimeMetrics;
    planningTime: ITimeMetrics;
    learningTime: ITimeMetrics;
    decisionConfidence: number;
    memoryUsage: number;
    cpuUsage: number;
    networkUsage: number;
    diskUsage: number;
    learningEfficiency: number;
    duration: number;
    success: boolean;
    errorCount: number;
    timestamp: number;
}

export interface IAgentPerformanceMetrics {
    component: string;
    category: string;
    version: string;
    duration: number;
    success: boolean;
    errorCount: number;
    timestamp: number;
    taskSuccessRate: number;
    goalAchievementRate: number;
    responseTime: ITimeMetrics;
    throughput: IThroughputMetrics;
    errorRate: number;
    availability: number;
    reliability: number;
    latency: number;
    thinking: IThinkingOperationMetrics;
    taskExecution: {
        successRate: number;
        averageTime: number;
        errorRate: number;
    };
}

export interface IAgentResourceMetrics extends IResourceMetrics {
    component: string;
    category: string;
    version: string;
    cognitive: ICognitiveResourceMetrics;
    cpuUsage: number;
    memoryUsage: number;
    diskIO: {
        read: number;
        write: number;
    };
    networkUsage: number;
    diskUsage: number;
}

export interface IAgentUsageMetrics {
    component: string;
    category: string;
    version: string;
    timestamp: number;
    state: IAgentStateMetrics;
    toolUsageFrequency: Record<string, number>;
    taskCompletionCount: number;
    averageTaskTime: number;
    errorCount: number;
    successCount: number;
    totalRuntime: number;
    activeTime: number;
    idleTime: number;
    resourceUtilization: IResourceMetrics;
    costs: ICostDetails;
    totalRequests: number;
    activeUsers: number;
    requestsPerSecond: number;
    errorRate: number;
    successRate: number;
    availability: number;
    reliability: number;
    averageResponseSize: number;
    peakMemoryUsage: number;
    uptime: number;
    rateLimit: IRateLimitMetrics;
    timeoutCount: number;
}
