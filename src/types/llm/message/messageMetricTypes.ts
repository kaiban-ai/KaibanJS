/**
 * @file messageMetricTypes.ts
 * @path KaibanJS/src/types/llm/message/messageMetricTypes.ts
 * @description Message metrics type definitions for LLM domain
 * 
 * @module @types/llm/message
 */

import { IResourceMetrics } from '../../metrics/base/resourceMetrics';
import { IPerformanceMetrics, ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../metrics/base/performanceMetrics';
import { IUsageMetrics, IRateLimitMetrics } from '../../metrics/base/usageMetrics';
import { RESOURCE_STATUS_enum } from '../../common/commonEnums';

// ─── Resource Metrics ────────────────────────────────────────────────────────────

export interface IMessageResourceMetrics extends IResourceMetrics {
  queueMetrics: {
    utilization: number;
    depth: number;
    capacity: number;
    status: RESOURCE_STATUS_enum;
  };
  bufferMetrics: {
    overflowCount: number;
    utilization: number;
    freeSpace: number;
  };
  channelMetrics: {
    status: RESOURCE_STATUS_enum;
    capacity: number;
    utilization: number;
  };
  networkMetrics: {
    bandwidth: {
      incoming: number;
      outgoing: number;
    };
    latency: number;
    packetLoss: number;
  };
}

// ─── Performance Metrics ─────────────────────────────────────────────────────────

export interface IMessagePerformanceMetrics extends IPerformanceMetrics {
  deliveryMetrics: {
    successRate: number;
    attempts: number;
    latency: ITimeMetrics;
    errors: IErrorMetrics;
  };
  processingMetrics: {
    patterns: {
      avgTime: number;
      peakTime: number;
      distribution: Map<string, number>;
    };
    throughput: IThroughputMetrics;
    errors: IErrorMetrics;
  };
  queueMetrics: {
    waitTime: ITimeMetrics;
    clearanceRate: number;
    backlogSize: number;
  };
  recoveryMetrics: {
    attempts: number;
    successRate: number;
    timeToRecover: ITimeMetrics;
  };
}

// ─── Usage Metrics ───────────────────────────────────────────────────────────────

export interface IMessageUsageMetrics extends IUsageMetrics {
  utilizationMetrics: {
    resources: {
      queue: number;
      buffer: number;
      channel: number;
    };
    patterns: {
      timeDistribution: Map<string, number>;
      sizeDistribution: Map<string, number>;
    };
  };
  volumeMetrics: {
    total: number;
    perSecond: number;
    peak: number;
    distribution: {
      hourly: number[];
      daily: number[];
    };
  };
  capacityMetrics: {
    queueUtilization: number;
    channelCapacity: number;
    bufferUsage: number;
  };
  rateLimit: IRateLimitMetrics;
}

// ─── Combined Metrics ─────────────────────────────────────────────────────────────

export interface IMessageMetrics {
  resourceMetrics: IMessageResourceMetrics;
  performanceMetrics: IMessagePerformanceMetrics;
  usageMetrics: IMessageUsageMetrics;
  timestamp: number;
}

// ─── Default Values ──────────────────────────────────────────────────────────────

export const DefaultMessageMetrics = {
  createDefaultTimeMetrics: (value: number = 0): ITimeMetrics => ({
    total: value,
    average: value,
    min: value,
    max: value
  }),

  createDefaultThroughputMetrics: (value: number = 0): IThroughputMetrics => ({
    operationsPerSecond: value,
    dataProcessedPerSecond: value
  }),

  createDefaultErrorMetrics: (): IErrorMetrics => ({
    totalErrors: 0,
    errorRate: 0
  }),

  createDefaultResourceMetrics: (): IMessageResourceMetrics => ({
    cpuUsage: 0,
    memoryUsage: 0,
    diskIO: { read: 0, write: 0 },
    networkUsage: { upload: 0, download: 0 },
    timestamp: Date.now(),
    queueMetrics: {
      utilization: 0,
      depth: 0,
      capacity: 100,
      status: RESOURCE_STATUS_enum.AVAILABLE
    },
    bufferMetrics: {
      overflowCount: 0,
      utilization: 0,
      freeSpace: 100
    },
    channelMetrics: {
      status: RESOURCE_STATUS_enum.AVAILABLE,
      capacity: 100,
      utilization: 0
    },
    networkMetrics: {
      bandwidth: { incoming: 0, outgoing: 0 },
      latency: 0,
      packetLoss: 0
    }
  }),

  createDefaultPerformanceMetrics: (): IMessagePerformanceMetrics => ({
    executionTime: DefaultMessageMetrics.createDefaultTimeMetrics(),
    latency: DefaultMessageMetrics.createDefaultTimeMetrics(),
    throughput: DefaultMessageMetrics.createDefaultThroughputMetrics(),
    responseTime: DefaultMessageMetrics.createDefaultTimeMetrics(),
    queueLength: 0,
    errorRate: 0,
    successRate: 1,
    errorMetrics: DefaultMessageMetrics.createDefaultErrorMetrics(),
    resourceUtilization: DefaultMessageMetrics.createDefaultResourceMetrics(),
    timestamp: Date.now(),
    deliveryMetrics: {
      successRate: 1,
      attempts: 0,
      latency: DefaultMessageMetrics.createDefaultTimeMetrics(),
      errors: DefaultMessageMetrics.createDefaultErrorMetrics()
    },
    processingMetrics: {
      patterns: {
        avgTime: 0,
        peakTime: 0,
        distribution: new Map()
      },
      throughput: DefaultMessageMetrics.createDefaultThroughputMetrics(),
      errors: DefaultMessageMetrics.createDefaultErrorMetrics()
    },
    queueMetrics: {
      waitTime: DefaultMessageMetrics.createDefaultTimeMetrics(),
      clearanceRate: 0,
      backlogSize: 0
    },
    recoveryMetrics: {
      attempts: 0,
      successRate: 1,
      timeToRecover: DefaultMessageMetrics.createDefaultTimeMetrics()
    }
  }),

  createDefaultUsageMetrics: (): IMessageUsageMetrics => ({
    totalRequests: 0,
    activeUsers: 0,
    requestsPerSecond: 0,
    averageResponseSize: 0,
    peakMemoryUsage: 0,
    uptime: 0,
    rateLimit: {
      current: 0,
      limit: 100,
      remaining: 100,
      resetTime: Date.now() + 3600000
    },
    timestamp: Date.now(),
    utilizationMetrics: {
      resources: {
        queue: 0,
        buffer: 0,
        channel: 0
      },
      patterns: {
        timeDistribution: new Map(),
        sizeDistribution: new Map()
      }
    },
    volumeMetrics: {
      total: 0,
      perSecond: 0,
      peak: 0,
      distribution: {
        hourly: Array(24).fill(0),
        daily: Array(7).fill(0)
      }
    },
    capacityMetrics: {
      queueUtilization: 0,
      channelCapacity: 100,
      bufferUsage: 0
    }
  })
};
