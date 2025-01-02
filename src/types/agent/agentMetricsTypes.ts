import { MANAGER_CATEGORY_enum } from '../common/enumTypes';

export interface ICognitiveResourceMetrics {
    timestamp: number;
    component: string;
    category: MANAGER_CATEGORY_enum;
    version: string;
    usage: number;
    limit: number;
    available: number;
    memoryAllocation: number;
    cognitiveLoad: number;
    processingCapacity: number;
    contextUtilization: number;
}

export interface IThinkingOperationMetrics {
    timestamp: number;
    component: string;
    category: MANAGER_CATEGORY_enum;
    version: string;
    duration: number;
    success: boolean;
    errorCount: number;
    reasoningTime: {
        total: number;
        average: number;
        min: number;
        max: number;
    };
    planningTime: {
        total: number;
        average: number;
        min: number;
        max: number;
    };
    learningTime: {
        total: number;
        average: number;
        min: number;
        max: number;
    };
    decisionConfidence: number;
    learningEfficiency: number;
}

export interface IAgentPerformanceMetrics {
    timestamp: number;
    component: string;
    category: MANAGER_CATEGORY_enum;
    version: string;
    duration: number;
    success: boolean;
    errorCount: number;
    thinking: {
        iterations: number;
        processingTime: number;
    };
    taskSuccessRate: number;
    goalAchievementRate: number;
    responseTime: number;
    throughput: number;
    latency: number;
    errorRate: number;
    availability: number;
}

export interface IAgentResourceMetrics {
    timestamp: number;
    component: string;
    category: MANAGER_CATEGORY_enum;
    version: string;
    memoryUsage: number;
    cpuUsage: number;
    networkUsage: number;
    diskUsage: number;
}

export interface IAgentUsageMetrics {
    timestamp: number;
    component: string;
    category: MANAGER_CATEGORY_enum;
    version: string;
    tokenCount: number;
    messageCount: number;
    requestCount: number;
    responseCount: number;
}
