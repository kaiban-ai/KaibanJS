/**
 * @file batchManager.ts
 * @path src/managers/domain/agent/batch/batchManager.ts
 * @description Manages batch processing operations for loop execution
 */

import { createError, ERROR_KINDS } from '../../../../types/common/errorTypes';
import { 
    BATCH_STATUS_enum,
    BATCH_PRIORITY_enum,
    MANAGER_CATEGORY_enum,
    AGENT_STATUS_enum
} from '../../../../types/common/enumTypes';
import { CoreManager } from '../../../core/coreManager';
import type { IBaseManager, IBaseManagerMetadata } from '../../../../types/agent/agentManagerTypes';
import { DEFAULT_BATCH_CONFIG } from '../../../../types/agent';
import type {
    IBatchOperation,
    IBatchMetrics,
    IBatchConfig
} from '../../../../types/agent';
import type { ILoopContext } from '../../../../types/agent/agentExecutionFlow';

export class BatchManager extends CoreManager implements IBaseManager {
    protected static _instance: BatchManager;
    private readonly operationQueues: Map<BATCH_PRIORITY_enum, IBatchOperation[]>;
    private readonly metrics: IBatchMetrics;
    private readonly config: IBatchConfig;
    private processingBatch: boolean;
    private isInitialized = false;
    public readonly category = MANAGER_CATEGORY_enum.SERVICE;

    protected constructor() {
        super();
        this.registerDomainManager('BatchManager', this);
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
        if (!BatchManager._instance) {
            BatchManager._instance = new BatchManager();
        }
        return BatchManager._instance;
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
                component: 'BatchManager',
                category: 'System',
                version: '1.0',
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
            component: 'BatchManager',
            category: 'System',
            version: '1.0',
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
                this.logError('Batch processing error', error instanceof Error ? error : new Error(String(error)));
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
                this.logError(`Operation ${operation.id} failed`, error instanceof Error ? error : new Error(String(error)));
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
        console.log(`Processing operation with ID: ${operation.id}`);
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Start batch processing loop
            this.startProcessingLoop();
            this.isInitialized = true;
            this.logInfo('BatchManager initialized successfully');
        } catch (error) {
            await this.handleError(error, 'Failed to initialize batch manager', ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    public async validate(): Promise<boolean> {
        return this.isInitialized;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'batch-processing',
            duration: 0,
            status: 'success',
            agent: {
                id: 'system',
                name: 'BatchManager',
                role: 'system',
                status: AGENT_STATUS_enum.IDLE
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }

}

export default BatchManager.getInstance();
