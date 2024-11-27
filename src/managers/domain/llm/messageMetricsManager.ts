/**
 * @file messageMetricsManager.ts
 * @path src/managers/domain/llm/messageMetricsManager.ts
 * @description Message metrics management and monitoring implementation for LLM domain
 */

import CoreManager from '../../core/coreManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';
import type { IStandardCostDetails } from '../../../types/common/commonMetricTypes';
import { MESSAGE_ERROR_TYPE_enum } from '../../../types/common/commonEnums';
import {
    IMessageUsageMetrics,
    IMessageResourceMetrics,
    IMessagePerformanceMetrics,
    DefaultMessageMetrics,
    MessageMetricTypeGuards,
    MessageErrorFactory
} from '../../../types/llm/message';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface IMessageMetricsCollection {
    resources: IMessageResourceMetrics[];
    performance: IMessagePerformanceMetrics[];
    usage: IMessageUsageMetrics[];
    timestamp: number;
}

interface IBatchMetricsOptions {
    startTime: number;
    endTime: number;
    aggregateBy?: 'minute' | 'hour' | 'day';
}

// ─── Manager Implementation ──────────────────────────────────────────────────────

export class MessageMetricsManager extends CoreManager {
    private static instance: MessageMetricsManager;
    private readonly metricsHistory: Map<string, IMessageMetricsCollection>;
    private readonly realtimeMetrics: Map<string, {
        lastUpdate: number;
        metrics: IMessageMetricsCollection;
    }>;
    private readonly batchQueue: Array<{
        messageId: string;
        metrics: IMessageMetricsCollection;
    }>;

    private constructor() {
        super();
        this.metricsHistory = new Map();
        this.realtimeMetrics = new Map();
        this.batchQueue = [];
        this.registerDomainManager('MessageMetricsManager', this);
        this.initializePeriodicTasks();
    }

    public static getInstance(): MessageMetricsManager {
        if (!MessageMetricsManager.instance) {
            MessageMetricsManager.instance = new MessageMetricsManager();
        }
        return MessageMetricsManager.instance;
    }

    private initializePeriodicTasks(): void {
        // Process batch queue every minute
        setInterval(() => this.processBatchQueue(), 60000);
        
        // Aggregate realtime metrics every 5 minutes
        setInterval(() => this.aggregateRealtimeMetrics(), 300000);
    }

    // ─── Collection Methods ────────────────────────────────────────────────────────

    public async collectMetrics(
        messageId: string,
        metrics: {
            resources: IMessageResourceMetrics;
            performance: IMessagePerformanceMetrics;
            usage: IMessageUsageMetrics;
        }
    ): Promise<IValidationResult> {
        try {
            // Pre-validation
            const preValidation = await this.preValidateMetrics(messageId, metrics);
            if (!preValidation.isValid) {
                return preValidation;
            }

            // Store metrics
            const result = await this.storeMetrics(messageId, metrics);
            if (!result.isValid) {
                return result;
            }

            // Post-validation and monitoring
            await this.postValidateAndMonitor(messageId, metrics);

            return createValidationResult(true, [], []);
        } catch (error) {
            const errorDetails = MessageErrorFactory.createError(
                MESSAGE_ERROR_TYPE_enum.PROCESSING_FAILURE,
                `Failed to collect message metrics: ${error instanceof Error ? error.message : String(error)}`,
                { messageId }
            );

            this.log(errorDetails.message, undefined, undefined, 'error', error instanceof Error ? error : undefined);
            return createValidationResult(false, [errorDetails.message]);
        }
    }

    public async collectBatchMetrics(
        messageIds: string[],
        metrics: Map<string, {
            resources: IMessageResourceMetrics;
            performance: IMessagePerformanceMetrics;
            usage: IMessageUsageMetrics;
        }>
    ): Promise<Map<string, IValidationResult>> {
        const results = new Map<string, IValidationResult>();

        for (const messageId of messageIds) {
            const messageMetrics = metrics.get(messageId);
            if (messageMetrics) {
                this.batchQueue.push({
                    messageId,
                    metrics: {
                        resources: [messageMetrics.resources],
                        performance: [messageMetrics.performance],
                        usage: [messageMetrics.usage],
                        timestamp: Date.now()
                    }
                });
            }
        }

        return results;
    }

    // ─── Validation Methods ────────────────────────────────────────────────────────

    private async preValidateMetrics(
        messageId: string,
        metrics: {
            resources: IMessageResourceMetrics;
            performance: IMessagePerformanceMetrics;
            usage: IMessageUsageMetrics;
        }
    ): Promise<IValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Type validation
        if (!MessageMetricTypeGuards.isMessageResourceMetrics(metrics.resources)) {
            errors.push('Invalid resource metrics structure');
        }
        if (!MessageMetricTypeGuards.isMessagePerformanceMetrics(metrics.performance)) {
            errors.push('Invalid performance metrics structure');
        }
        if (!MessageMetricTypeGuards.isMessageUsageMetrics(metrics.usage)) {
            errors.push('Invalid usage metrics structure');
        }

        return createValidationResult(errors.length === 0, errors, warnings);
    }

    private async storeMetrics(
        messageId: string,
        metrics: {
            resources: IMessageResourceMetrics;
            performance: IMessagePerformanceMetrics;
            usage: IMessageUsageMetrics;
        }
    ): Promise<IValidationResult> {
        const messageMetrics = this.metricsHistory.get(messageId) || {
            resources: [],
            performance: [],
            usage: [],
            timestamp: Date.now()
        };

        messageMetrics.resources.push(metrics.resources);
        messageMetrics.performance.push(metrics.performance);
        messageMetrics.usage.push(metrics.usage);
        messageMetrics.timestamp = Date.now();

        this.metricsHistory.set(messageId, messageMetrics);

        // Update realtime metrics
        this.updateRealtimeMetrics(messageId, metrics);

        return createValidationResult(true, [], []);
    }

    private async postValidateAndMonitor(
        messageId: string,
        metrics: {
            resources: IMessageResourceMetrics;
            performance: IMessagePerformanceMetrics;
            usage: IMessageUsageMetrics;
        }
    ): Promise<void> {
        await this.monitorMetrics(messageId, metrics);
        await this.analyzePerformanceTrends(messageId);
    }

    // ─── Monitoring Methods ────────────────────────────────────────────────────────

    private async monitorMetrics(
        messageId: string,
        metrics: {
            resources: IMessageResourceMetrics;
            performance: IMessagePerformanceMetrics;
            usage: IMessageUsageMetrics;
        }
    ): Promise<void> {
        try {
            // Resource monitoring
            if (metrics.resources.queueMetrics.utilization > 80) {
                this.log(
                    `High queue utilization for message ${messageId}: ${metrics.resources.queueMetrics.utilization}%`,
                    undefined,
                    undefined,
                    'warn'
                );
            }

            if (metrics.resources.bufferMetrics.overflowCount > 0) {
                const error = MessageErrorFactory.createBufferOverflowError(
                    metrics.resources.bufferMetrics.utilization
                );
                this.log(error.message, undefined, undefined, 'error');
            }

            // Performance monitoring
            if (metrics.performance.deliveryMetrics.successRate < 0.9) {
                const error = MessageErrorFactory.createDeliveryError(
                    messageId,
                    metrics.performance.deliveryMetrics.attempts
                );
                this.log(error.message, undefined, undefined, 'warn');
            }

            // Usage monitoring
            if (metrics.usage.utilizationMetrics.resources.queue > 90) {
                this.log(
                    `Critical queue usage for message ${messageId}: ${metrics.usage.utilizationMetrics.resources.queue}%`,
                    undefined,
                    undefined,
                    'error'
                );
            }
        } catch (error) {
            this.log(
                `Failed to monitor message metrics: ${error instanceof Error ? error.message : String(error)}`,
                undefined,
                undefined,
                'error',
                error instanceof Error ? error : undefined
            );
        }
    }

    private async analyzePerformanceTrends(messageId: string): Promise<void> {
        const messageMetrics = this.metricsHistory.get(messageId);
        if (messageMetrics) {
            const recentDeliveryRates = messageMetrics.performance
                .slice(-5)
                .reduce((acc, curr) => acc + curr.deliveryMetrics.successRate, 0) / 5;

            if (recentDeliveryRates < 0.95) {
                this.log(
                    `Declining delivery success trend for message ${messageId}: ${recentDeliveryRates * 100}% average`,
                    undefined,
                    undefined,
                    'warn'
                );
            }
        }
    }

    // ─── Batch Processing ─────────────────────────────────────────────────────────

    private async processBatchQueue(): Promise<void> {
        while (this.batchQueue.length > 0) {
            const batch = this.batchQueue.splice(0, 100); // Process in chunks of 100
            for (const item of batch) {
                await this.collectMetrics(item.messageId, {
                    resources: item.metrics.resources[0],
                    performance: item.metrics.performance[0],
                    usage: item.metrics.usage[0]
                });
            }
        }
    }

    // ─── Realtime Processing ───────────────────────────────────────────────────────

    private updateRealtimeMetrics(
        messageId: string,
        metrics: {
            resources: IMessageResourceMetrics;
            performance: IMessagePerformanceMetrics;
            usage: IMessageUsageMetrics;
        }
    ): void {
        const current = this.realtimeMetrics.get(messageId) || {
            lastUpdate: Date.now(),
            metrics: {
                resources: [],
                performance: [],
                usage: [],
                timestamp: Date.now()
            }
        };

        current.metrics.resources.push(metrics.resources);
        current.metrics.performance.push(metrics.performance);
        current.metrics.usage.push(metrics.usage);
        current.lastUpdate = Date.now();

        this.realtimeMetrics.set(messageId, current);
    }

    private async aggregateRealtimeMetrics(): Promise<void> {
        const now = Date.now();
        for (const [messageId, data] of this.realtimeMetrics.entries()) {
            if (now - data.lastUpdate > 300000) { // 5 minutes
                // Aggregate and store
                const aggregated = this.aggregateMetrics(data.metrics);
                await this.storeMetrics(messageId, aggregated);
                this.realtimeMetrics.delete(messageId);
            }
        }
    }

    private aggregateMetrics(metrics: IMessageMetricsCollection): {
        resources: IMessageResourceMetrics;
        performance: IMessagePerformanceMetrics;
        usage: IMessageUsageMetrics;
    } {
        // Create default metrics as base for aggregation
        const aggregated = {
            resources: DefaultMessageMetrics.createDefaultResourceMetrics(),
            performance: DefaultMessageMetrics.createDefaultPerformanceMetrics(),
            usage: DefaultMessageMetrics.createDefaultUsageMetrics()
        };

        // Aggregate logic here...
        // This is a placeholder - actual aggregation would depend on specific requirements

        return aggregated;
    }

    // ─── Utility Methods ──────────────────────────────────────────────────────────

    public getMetrics(messageId: string): IMessageMetricsCollection | undefined {
        return this.metricsHistory.get(messageId);
    }

    public clearMetrics(messageId: string): void {
        this.metricsHistory.delete(messageId);
        this.realtimeMetrics.delete(messageId);
    }

    public getMetricsHistorySize(): number {
        return this.metricsHistory.size;
    }

    public calculateCostDetails(
        messageId: string,
        messageSize: number,
        processingTime: number
    ): IStandardCostDetails {
        return {
            inputCost: messageSize * 0.00001,
            outputCost: processingTime * 0.00002,
            totalCost: (messageSize * 0.00001) + (processingTime * 0.00002),
            currency: 'USD',
            breakdown: {
                promptTokens: { count: messageSize, cost: messageSize * 0.00001 },
                completionTokens: { count: processingTime, cost: processingTime * 0.00002 }
            }
        };
    }
}

export default MessageMetricsManager.getInstance();
