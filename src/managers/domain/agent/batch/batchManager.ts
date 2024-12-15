/**
 * @file batchManager.ts
 * @path src/managers/domain/agent/batch/batchManager.ts
 * @description Manages batch processing operations for loop execution
 */

import { MetricsManager } from '../../../core/metricsManager';
import { createError, ERROR_KINDS, BATCH_PRIORITY_enum,BATCH_STATUS_enum  } from '../../../../types/common/commonErrorTypes';
import {
    IBatchOperation,
    IBatchMetrics,
    IBatchConfig,
    DEFAULT_BATCH_CONFIG
} from '../../../../types/agent';
import type { ILoopContext } from '../../../../types/agent/agentLoopTypes';

/**
 * Manages batch processing operations
 */
export class BatchManager {
    private static instance: BatchManager;
    private readonly metricsManager: MetricsManager;
    private readonly operationQueues: Map<BATCH_PRIORITY_enum, IBatchOperation[]>;
    private readonly metrics: IBatchMetrics;
    private readonly config: IBatchConfig;
    private processingBatch: boolean;

    private constructor() {
        this.metricsManager = MetricsManager.getInstance();
        this.operationQueues = new Map();
        this.config = { ...DEFAULT_BATCH_CONFIG };
        this.metrics = this.createInitialMetrics();
        this.processingBatch = false;

        // Initialize queues for each priority level
        for (const priority of this.config.priorityLevels) {
            this.operationQueues.set(priority, []);
        }

        // Start batch processing loop
        this.startProcessingLoop();
    }

    public static getInstance(): BatchManager {
        if (!BatchManager.instance) {
            BatchManager.instance = new BatchManager();
        }
        return BatchManager.instance;
    }

    /**
     * Add operation to batch queue
     */
    public async addOperation(
        context: ILoopContext,
        priority: BATCH_PRIORITY_enum= BATCH_PRIORITY_enum.MEDIUM
    ): Promise<string> {
        const queue = this.operationQueues.get(priority);
        if (!queue) {
            throw createError({
                message: `Invalid priority level: ${priority}`,
                type: ERROR_KINDS.ValidationError
            });
        }

        if (this.getTotalQueueSize() >= this.config.maxQueueSize) {
            throw createError({
                message: 'Batch queue is full',
                type: ERROR_KINDS.ResourceError
            });
        }

        const operation: IBatchOperation = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            priority,
            timestamp: Date.now(),
            timeout: Date.now() + this.config.processingTimeout,
            status: BATCH_STATUS_enum.PENDING,
            context,
            retryCount: 0,
            maxRetries: this.config.maxRetries
        };

        queue.push(operation);
        this.updateMetrics();

        return operation.id;
    }

    /**
     * Get operation status
     */
    public getOperationStatus(operationId: string): BATCH_STATUS_enum | null {
        for (const queue of this.operationQueues.values()) {
            const operation = queue.find(op => op.id === operationId);
            if (operation) {
                return operation.status;
            }
        }
        return null;
    }

    /**
     * Get current batch metrics
     */
    public getMetrics(): IBatchMetrics {
        return { ...this.metrics };
    }

    /**
     * Update batch configuration
     */
    public updateConfig(config: Partial<IBatchConfig>): void {
        Object.assign(this.config, config);
    }

    /**
     * Get total size of all queues
     */
    private getTotalQueueSize(): number {
        let total = 0;
        for (const queue of this.operationQueues.values()) {
            total += queue.length;
        }
        return total;
    }

    /**
     * Create initial metrics object
     */
    private createInitialMetrics(): IBatchMetrics {
        return {
            totalOperations: 0,
            completedOperations: 0,
            failedOperations: 0,
            averageProcessingTime: 0,
            queueLength: 0,
            resourceUsage: {
                cpuUsage: 0,
                memoryUsage: process.memoryUsage().heapUsed,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp: Date.now()
            },
            timestamp: Date.now()
        };
    }

    /**
     * Update batch metrics
     */
    private updateMetrics(): void {
        const now = Date.now();
        this.metrics.queueLength = this.getTotalQueueSize();
        this.metrics.resourceUsage = {
            cpuUsage: process.cpuUsage().user / 1000000,
            memoryUsage: process.memoryUsage().heapUsed,
            diskIO: { read: 0, write: 0 },
            networkUsage: { upload: 0, download: 0 },
            timestamp: now
        };
        this.metrics.timestamp = now;
    }

    /**
     * Start batch processing loop
     */
    private startProcessingLoop(): void {
        setInterval(async () => {
            if (this.processingBatch) {
                return;
            }

            try {
                this.processingBatch = true;
                await this.processBatch();
            } catch (error) {
                this.logError('Batch processing error', error);
            } finally {
                this.processingBatch = false;
            }
        }, 1000); // Process batch every second
    }

    /**
     * Process current batch of operations
     */
    private async processBatch(): Promise<void> {
        const now = Date.now();
        const batch: IBatchOperation[] = [];

        // Collect operations for batch processing
        for (const priority of this.config.priorityLevels) {
            const queue = this.operationQueues.get(priority);
            if (!queue?.length) continue;

            // Get operations that haven't timed out
            const validOperations = queue.filter(op => 
                op.status === BATCH_STATUS_enum.PENDING && 
                op.timeout > now &&
                op.retryCount < op.maxRetries
            );

            batch.push(...validOperations.slice(0, this.config.maxBatchSize - batch.length));
            if (batch.length >= this.config.maxBatchSize) break;
        }

        if (!batch.length) return;

        // Process batch operations
        for (const operation of batch) {
            try {
                operation.status = BATCH_STATUS_enum.PROCESSING;
                // Process operation (implementation depends on specific use case)
                await this.processOperation(operation);
                operation.status = BATCH_STATUS_enum.COMPLETED;
                this.metrics.completedOperations++;
            } catch (error) {
                operation.retryCount++;
                if (operation.retryCount >= operation.maxRetries) {
                    operation.status = BATCH_STATUS_enum.FAILED;
                    this.metrics.failedOperations++;
                } else {
                    operation.status = BATCH_STATUS_enum.PENDING;
                    operation.timeout = Date.now() + this.config.processingTimeout;
                }
                this.logError(`Operation ${operation.id} failed`, error);
            }
        }

        // Clean up completed and failed operations
        for (const [priority, queue] of this.operationQueues.entries()) {
            this.operationQueues.set(
                priority,
                queue.filter(op => 
                    op.status !== BATCH_STATUS_enum.COMPLETED && 
                    op.status !== BATCH_STATUS_enum.FAILED
                )
            );
        }

        this.updateMetrics();
    }

    /**
     * Process individual operation
     */
    private async processOperation(operation: IBatchOperation): Promise<void> {
        // Implementation would depend on specific use cases
        // This is a placeholder for the actual implementation
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    private logError(message: string, error?: unknown): void {
        console.error(`BatchManager Error: ${message}`, error);
    }
}

export default BatchManager.getInstance();
