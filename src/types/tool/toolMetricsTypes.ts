import { IAgentMetrics } from '../metrics/agent/agentMetricsTypes';

interface IBaseResourceMetrics {
    usage: number;
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkUsage: number;
}

interface IBasePerformanceMetrics {
    duration: number;
    responseTime: number;
    throughput: { requestsPerSecond: number, bytesPerSecond: number };
}

interface IBaseUsageState {
    transitionCount: number;
    currentState: string;
    stateTime: number;
    taskStats: {
        completed: number;
        failed: number;
        pending: number;
    };
}

export interface IToolResourceMetrics extends IBaseResourceMetrics {
    toolMemoryUsage: number;
    toolCpuUsage: number;
    toolNetworkUsage: { sent: number, received: number };
    toolStorageUsage: { read: number, write: number };
    usage: number;
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkUsage: number;
}

export interface IToolPerformanceMetrics extends IBasePerformanceMetrics {
    throughput: { requestsPerSecond: number, bytesPerSecond: number };
    avgResponseTime: { average: number, min: number, max: number };
    toolLatency: { average: number, min: number, max: number };
    executionTime: { average: number, min: number, max: number };
    successRate: number;
    errorRate: number;
}

export interface IToolUsageMetrics extends IBaseUsageState {
    executionCount: number;
    executionFrequency: Record<string, number>;
    avgExecutionDuration: number;
    successRate: number;
    errorRate: number;
    throughput: number;
    latency: number;
    peakUsageTimes: string[];
    errorFrequency: Record<string, number>;
    component: string;
    category: string;
    version: string;
    timestamp: number;
    iterations: number;
    resourceUsage: {
        cpu: number;
        memory: number;
    };
    errorCount: number;
    successCount: number;
    averageLatency: number;
    maxLatency: number;
    minLatency: number;
    metadata?: Record<string, unknown>;
    dependencies?: string[];
    status?: string;
    lastExecutionTime?: number;
    lastError?: Error;
}
