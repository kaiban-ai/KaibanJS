/**
 * @file toolManager.ts
 * @path KaibanJS/src/managers/domain/agent/toolManager.ts
 * @description Tool execution and metrics management implementation
 * 
 * @module @managers/domain/agent
 */

import { Tool } from 'langchain/tools';
import CoreManager from '../../core/coreManager';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { AGENT_STATUS_enum, RESOURCE_STATUS_enum } from '../../../types/common/commonEnums';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ITaskType } from '../../../types/task/taskBaseTypes';
import { 
    IToolHandlerParams,
    IToolHandlerResult,
    IToolHandlerMetadata,
    createToolHandlerResult
} from '../../../types/tool/toolHandlerTypes';
import { 
    createError, 
    IToolError, 
    ToolError, 
    ErrorTypeGuards 
} from '../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import type { ITimeMetrics, IThroughputMetrics, IErrorMetrics } from '../../../types/metrics';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';
import {
    IToolUsageMetrics,
    IToolResourceMetrics,
    IToolPerformanceMetrics,
    ToolMetricsTypeGuards,
    ToolMetricsValidation,
    DefaultToolMetrics
} from '../../../types/tool/toolMetricTypes';
import ToolMetricsManager from '../tool/toolMetricsManager';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 300000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ─── Tool Manager ───────────────────────────────────────────────────────────────

export class ToolManager extends CoreManager {
    private static instance: ToolManager;
    private readonly activeTools: Map<string, { 
        startTime: number; 
        timeout: NodeJS.Timeout;
        retryCount: number;
    }>;
    private readonly metricsManager: typeof ToolMetricsManager;

    private constructor() {
        super();
        this.activeTools = new Map();
        this.metricsManager = ToolMetricsManager;
        this.registerDomainManager('ToolManager', this);
    }

    public static getInstance(): ToolManager {
        if (!ToolManager.instance) {
            ToolManager.instance = new ToolManager();
        }
        return ToolManager.instance;
    }

    // ─── Private Methods ────────────────────────────────────────────────────────

    private async executeOperation(
        tool: Tool, 
        input: unknown, 
        toolKey: string,
        phase: 'pre' | 'execute' | 'post' = 'execute'
    ): Promise<string> {
        try {
            const result = await tool.call(
                typeof input === 'string' ? input : JSON.stringify(input)
            );
            if (typeof result !== 'string') {
                throw new ToolError({
                    message: 'Tool must return a string result',
                    toolName: tool.name,
                    type: 'ToolExecutionError',
                    executionId: toolKey,
                    phase,
                    retryable: false
                });
            }
            return result;
        } catch (error) {
            const toolInfo = this.activeTools.get(toolKey);
            const elapsedTime = toolInfo ? Date.now() - toolInfo.startTime : 0;
            
            throw new ToolError({
                message: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
                toolName: tool.name,
                type: 'ToolExecutionError',
                executionId: toolKey,
                phase,
                elapsedTime,
                retryable: true,
                context: {
                    retryCount: toolInfo?.retryCount || 0,
                    originalError: error
                }
            });
        }
    }

    private setupToolTimeout(toolKey: string, timeout: number = DEFAULT_TIMEOUT): void {
        const timeoutTimer = setTimeout(() => {
            this.handleToolTimeout(toolKey);
        }, timeout);

        this.activeTools.set(toolKey, {
            startTime: Date.now(),
            timeout: timeoutTimer,
            retryCount: 0
        });
    }

    private handleToolTimeout(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            const elapsedTime = Date.now() - toolInfo.startTime;
            
            const error = new ToolError({
                message: `Tool execution timed out after ${elapsedTime}ms`,
                toolName: 'unknown',
                type: 'ToolTimeoutError',
                executionId: toolKey,
                elapsedTime,
                timeout: DEFAULT_TIMEOUT,
                retryable: false
            });

            this.log(error.message, undefined, undefined, 'warn');
            this.cleanupTool(toolKey);
        }
    }

    private cleanupTool(toolKey: string): void {
        const toolInfo = this.activeTools.get(toolKey);
        if (toolInfo) {
            clearTimeout(toolInfo.timeout);
            this.activeTools.delete(toolKey);
        }
    }

    private async handleRetry(
        tool: Tool,
        input: unknown,
        toolKey: string,
        error: unknown,
        phase: 'pre' | 'execute' | 'post'
    ): Promise<string> {
        const toolInfo = this.activeTools.get(toolKey);
        if (!toolInfo) {
            throw new ToolError({
                message: 'Tool info not found',
                toolName: tool.name,
                type: 'ToolError',
                executionId: toolKey,
                phase,
                retryable: false
            });
        }

        const toolError = ErrorTypeGuards.isToolError(error) ? error : new ToolError({
            message: error instanceof Error ? error.message : String(error),
            toolName: tool.name,
            type: 'ToolExecutionError',
            executionId: toolKey,
            phase,
            retryable: true,
            context: { originalError: error }
        });

        if (toolError.retryable && toolInfo.retryCount < MAX_RETRIES) {
            toolInfo.retryCount++;
            this.log(
                `Retrying tool execution (attempt ${toolInfo.retryCount}/${MAX_RETRIES})`,
                undefined,
                undefined,
                'warn'
            );

            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * toolInfo.retryCount));
            return this.executeOperation(tool, input, toolKey, phase);
        }

        throw toolError;
    }

    private async createToolMetadata(
        toolName: string,
        status: 'success' | 'failed',
        executionTime: number,
        inputSize: number,
        outputSize: number,
        phase: 'pre' | 'execute' | 'post',
        error?: Error
    ): Promise<IToolHandlerMetadata> {
        const resourceMetrics: IToolResourceMetrics = {
            cpuUsage: process.cpuUsage().user / 1000000,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: Date.now(),
            apiRateLimits: {
                current: 1,
                limit: 100,
                resetIn: 3600000
            },
            serviceQuotas: {
                usagePercent: 1,
                remaining: 99,
                total: 100
            },
            connectionPool: {
                active: 1,
                idle: 0,
                maxSize: 10
            },
            integrationHealth: {
                availability: 100,
                responseTime: executionTime,
                connectionStatus: 1
            },
            healthStatus: DefaultToolMetrics.createDefaultHealthStatus(
                error ? RESOURCE_STATUS_enum.FAILED : RESOURCE_STATUS_enum.AVAILABLE
            ),
            recoveryState: error ? {
                inRecovery: true,
                lastRecoveryTime: new Date(),
                recoveryAttempts: this.activeTools.get(toolName)?.retryCount || 0
            } : DefaultToolMetrics.createDefaultRecoveryState()
        };

        const timeMetrics = DefaultToolMetrics.createDefaultTimeMetrics(executionTime);
        const throughputMetrics = DefaultToolMetrics.createDefaultThroughputMetrics(
            1000 / executionTime
        );

        const errorMetrics: IErrorMetrics = {
            totalErrors: error ? 1 : 0,
            errorRate: error ? 1 : 0
        };

        const performanceMetrics: IToolPerformanceMetrics = {
            executionTime: timeMetrics,
            latency: { ...timeMetrics, average: timeMetrics.average / 2 },
            throughput: throughputMetrics,
            responseTime: timeMetrics,
            queueLength: this.activeTools.size,
            errorRate: error ? 1 : 0,
            successRate: error ? 0 : 1,
            errorMetrics,
            resourceUtilization: resourceMetrics,
            timestamp: Date.now(),
            executionMetrics: {
                latency: timeMetrics,
                successRate: error ? 0 : 1,
                throughput: throughputMetrics
            },
            reliabilityMetrics: {
                errors: errorMetrics,
                recoveryTime: timeMetrics,
                failurePatterns: {
                    types: error ? { [error.name]: 1 } : {},
                    frequency: error ? 1 : 0,
                    mtbf: error ? 0 : executionTime
                }
            },
            responseMetrics: {
                time: timeMetrics,
                dataVolume: {
                    total: inputSize + outputSize,
                    average: (inputSize + outputSize) / 2,
                    peak: Math.max(inputSize, outputSize)
                },
                processingRate: throughputMetrics
            }
        };

        const usageMetrics: IToolUsageMetrics = {
            totalRequests: 1,
            activeUsers: 1,
            requestsPerSecond: 1000 / executionTime,
            averageResponseSize: outputSize,
            peakMemoryUsage: process.memoryUsage().heapUsed,
            uptime: process.uptime(),
            rateLimit: {
                current: 1,
                limit: 100,
                remaining: 99,
                resetTime: Date.now() + 3600000
            },
            timestamp: Date.now(),
            utilizationMetrics: {
                callFrequency: 1,
                resourceConsumption: {
                    cpu: process.cpuUsage().user / 1000000,
                    memory: process.memoryUsage().heapUsed,
                    bandwidth: inputSize + outputSize
                },
                peakUsage: {
                    times: [Date.now()],
                    values: [process.memoryUsage().heapUsed],
                    duration: [executionTime]
                }
            },
            accessPatterns: {
                distribution: { [phase]: 1 },
                frequency: { [toolName]: 1 },
                operationTypes: { [phase]: 1 }
            },
            dependencies: {
                services: [toolName],
                resources: ['cpu', 'memory', 'network'],
                versions: { [toolName]: '1.0.0' }
            }
        };

        const toolId = `${toolName}_${Date.now()}`;
        const metricsValidation = await this.metricsManager.collectMetrics(toolId, {
            resources: resourceMetrics,
            performance: performanceMetrics,
            usage: usageMetrics
        });

        if (!metricsValidation.isValid) {
            this.log(
                `Tool metrics validation failed: ${metricsValidation.errors.join(', ')}`,
                undefined,
                undefined,
                'error'
            );
        }

        if (metricsValidation.warnings.length > 0) {
            this.log(
                `Tool metrics warnings: ${metricsValidation.warnings.join(', ')}`,
                undefined,
                undefined,
                'warn'
            );
        }

        const costDetails = this.metricsManager.calculateCostDetails(toolId, inputSize, outputSize);
        const baseMetadata = createBaseMetadata('tool', 'execution');

        return {
            ...baseMetadata,
            tool: {
                name: toolName,
                executionTime,
                status,
                inputSize,
                outputSize,
                performance: performanceMetrics,
                resources: resourceMetrics,
                ...(error && {
                    error: {
                        code: error.name,
                        message: error.message,
                        timestamp: Date.now()
                    }
                }),
                environment: process.env.NODE_ENV || 'development',
                parameters: {},
                version: '1.0.0'
            },
            toolId,
            executionPhase: phase,
            metrics: {
                resources: resourceMetrics,
                usage: usageMetrics,
                performance: performanceMetrics
            },
            costDetails,
            usageStats: undefined
        };
    }

    // ─── Public Methods ─────────────────────────────────────────────────────────

    public async executeTool(params: IToolHandlerParams): Promise<IToolHandlerResult> {
        const { agent, task, tool, input } = params;
        const toolKey = `${agent.id}:${tool.name}:${Date.now()}`;
        const startTime = Date.now();
        const inputSize = input ? JSON.stringify(input).length : 0;

        try {
            this.log(`Starting tool execution: ${tool.name}`, agent.name, task.id);
            const preMetadata = await this.createToolMetadata(
                tool.name, 'success', 0, inputSize, 0, 'pre'
            );

            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.USING_TOOL,
                entity: 'agent',
                entityId: agent.id,
                context: {
                    phase: 'pre-execution',
                    operation: 'tool-execution',
                    metadata: preMetadata,
                    toolName: tool.name,
                    toolKey,
                    agentId: agent.id,
                    agentName: agent.name,
                    taskId: task.id,
                    taskTitle: task.title
                }
            });

            this.setupToolTimeout(toolKey);
            let result: string;
            try {
                result = await this.executeOperation(tool, input, toolKey, 'execute');
            } catch (error) {
                result = await this.handleRetry(tool, input, toolKey, error, 'execute');
            }
            
            this.cleanupTool(toolKey);

            const executionTime = Date.now() - startTime;
            const outputSize = result.length;

            const postMetadata = await this.createToolMetadata(
                tool.name, 'success', executionTime, inputSize, outputSize, 'post'
            );

            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.USING_TOOL_END,
                entity: 'agent',
                entityId: agent.id,
                context: {
                    phase: 'post-execution',
                    operation: 'tool-execution',
                    metadata: postMetadata,
                    toolName: tool.name,
                    toolKey,
                    result,
                    agentId: agent.id,
                    agentName: agent.name,
                    taskId: task.id,
                    taskTitle: task.title
                }
            });

            this.log(`Tool ${tool.name} executed successfully`, agent.name, task.id);

            return createToolHandlerResult(true, postMetadata, {
                result,
                feedbackMessage: `Tool ${tool.name} executed successfully`
            });

        } catch (error) {
            const elapsedTime = Date.now() - startTime;
            
            const errorMetadata = await this.createToolMetadata(
                tool.name,
                'failed',
                elapsedTime,
                inputSize,
                0,
                'execute',
                error instanceof Error ? error : new Error(String(error))
            );

            this.log(
                `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
                agent.name,
                task.id,
                'error',
                error instanceof Error ? error : undefined
            );

            return createToolHandlerResult(false, errorMetadata, {
                error: error instanceof Error ? error : new Error(String(error)),
                feedbackMessage: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    public getActiveToolCount(): number {
        return this.activeTools.size;
    }

    public getToolMetrics(toolId: string): {
        resources: IToolResourceMetrics[];
        performance: IToolPerformanceMetrics[];
        usage: IToolUsageMetrics[];
        timestamp: number;
    } | undefined {
        return this.metricsManager.getMetrics(toolId);
    }

    public clearToolMetrics(toolId: string): void {
        this.metricsManager.clearMetrics(toolId);
    }
}

export default ToolManager.getInstance();
