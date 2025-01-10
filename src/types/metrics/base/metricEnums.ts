/**
 * @file metricEnums.ts
 * @path src/types/metrics/base/metricEnums.ts
 * @description Metric enums for the simplified metrics system
 */

export enum METRIC_DOMAIN_enum {
    SYSTEM = 'SYSTEM',
    AGENT = 'AGENT',
    TASK = 'TASK',
    WORKFLOW = 'WORKFLOW',
    TEAM = 'TEAM',
    LLM = 'LLM'
}

export enum METRIC_TYPE_enum {
    // Performance metrics
    PERFORMANCE = 'PERFORMANCE',
    LATENCY = 'LATENCY',
    THROUGHPUT = 'THROUGHPUT',
    
    // Resource metrics
    RESOURCE = 'RESOURCE',
    CPU = 'CPU',
    MEMORY = 'MEMORY',
    NETWORK = 'NETWORK',
    
    // State metrics
    STATE_TRANSITION = 'STATE_TRANSITION',
    INITIALIZATION = 'INITIALIZATION',
    
    // Operation metrics
    SUCCESS = 'SUCCESS',
    ERROR = 'ERROR',
    USAGE = 'USAGE',
    
    // System metrics
    SYSTEM_HEALTH = 'SYSTEM_HEALTH'
}
