/**
 * @file coreManager.ts
 * @description Core management implementation providing base functionality and service 
 * directory registration for domain managers.
 */

import { LogManager } from './logManager';
import { ErrorManager } from './errorManager';
import { StatusManager } from './statusManager';
import { MetricsManager } from './metricsManager';
import { MemoryManager } from './metrics/MemoryManager';
import { MetricsBenchmark } from './metrics/MetricsBenchmark';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../types/common/enumTypes';
import { createError, ERROR_KINDS } from '../../types/common/errorTypes';
import { createBaseMetadata } from '../../types/common/baseTypes';
import { MetricDomain, MetricType } from '../../types/metrics/base/metricsManagerTypes';
import type { IBaseManagerMetadata } from '../../types/agent/agentManagerTypes';

import type { IBaseEvent } from '../../types/common/baseTypes';
import type { IBaseManager } from '../../types/agent/agentManagerTypes';
import type { IMetricEvent } from '../../types/metrics/base/metricsManagerTypes';

export abstract class CoreManager implements IBaseManager {
    protected static _instance: CoreManager;
    protected readonly logManager: LogManager;
    protected readonly errorManager: ErrorManager;
    protected readonly statusManager: StatusManager;
    protected readonly metricsManager: MetricsManager;
    protected readonly memoryManager: MemoryManager;
    protected readonly benchmark: MetricsBenchmark;
    protected readonly domainManagers: Map<string, IBaseManager>;

    public abstract readonly category: MANAGER_CATEGORY_enum;

    protected constructor() {
        // Initialize core services
        this.logManager = LogManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        this.memoryManager = new MemoryManager();
        this.benchmark = new MetricsBenchmark();
        this.domainManagers = new Map();

        // Register core services
        this.registerCoreServices();
    }

    private registerCoreServices(): void {
        // Register essential services
        this.registerDomainManager('LogManager', this.logManager);
        this.registerDomainManager('ErrorManager', this.errorManager);
        this.registerDomainManager('StatusManager', this.statusManager);
        this.registerDomainManager('MetricsManager', this.metricsManager);
        this.registerDomainManager('MemoryManager', this.memoryManager);
        this.registerDomainManager('MetricsBenchmark', this.benchmark);
    }

    public static getInstance(): CoreManager {
        if (!this._instance) {
            throw createError({
                message: 'Core manager instance not initialized',
                type: ERROR_KINDS.InitializationError
            });
        }
        return this._instance;
    }

    protected registerDomainManager<T extends IBaseManager>(name: string, manager: T): void {
        if (this.domainManagers.has(name)) {
            throw createError({
                message: `Manager already registered: ${name}`,
                type: ERROR_KINDS.ConfigurationError,
                context: { name, category: manager.category }
            });
        }
        this.domainManagers.set(name, manager);
        this.logInfo(`Registered domain manager: ${name}`, { category: manager.category });
    }

    protected getDomainManager<T extends IBaseManager>(name: string): T {
        const manager = this.domainManagers.get(name);
        if (!manager) {
            throw createError({
                message: `Manager not found: ${name}`,
                type: ERROR_KINDS.ConfigurationError,
                context: {
                    name,
                    availableManagers: Array.from(this.domainManagers.keys())
                }
            });
        }
        return manager as T;
    }

    public async initialize(): Promise<void> {
        const startTime = Date.now();
        this.benchmark.start('initialize');

        try {
            // Initialize metrics tracking
            await this.trackMetric({
            domain: MetricDomain.SYSTEM,
            type: MetricType.INITIALIZATION,
                value: 1,
                timestamp: startTime,
                metadata: createBaseMetadata(this.constructor.name, 'initialize')
            });

            this.benchmark.end('initialize');
        } catch (error) {
            await this.handleError(
                error,
                'Failed to initialize core manager',
                ERROR_KINDS.InitializationError
            );
            throw error;
        }
    }

    public async validate(): Promise<boolean> {
        return true;
    }

    protected async handleError(
        error: unknown,
        context: string,
        errorType: keyof typeof ERROR_KINDS = 'SystemError'
    ): Promise<void> {
        await this.errorManager.handleError(error, context, ERROR_KINDS[errorType]);
    }

    protected async trackMetric(event: IMetricEvent): Promise<void> {
        if (this.memoryManager.shouldCollectMetric()) {
            await this.metricsManager.trackMetric(event);
        }
    }

    protected async emitEvent<T extends IBaseEvent>(event: T): Promise<void> {
        const startTime = Date.now();
        this.benchmark.start('emitEvent');

        try {
            await this.statusManager.handleStatusChange({
                ...event,
                metadata: {
                    ...event.metadata,
                    emitter: this.constructor.name,
                    timestamp: startTime
                }
            });

            // Track event metric
            await this.trackMetric({
                domain: MetricDomain.SYSTEM,
                type: MetricType.EVENT,
                value: 1,
                timestamp: startTime,
                metadata: {
                    eventType: event.type,
                    component: this.constructor.name
                }
            });

            this.benchmark.end('emitEvent');
        } catch (error) {
            await this.handleError(
                error,
                `Failed to emit event: ${event.type}`,
                ERROR_KINDS.ExecutionError
            );
            throw error;
        }
    }

    protected logInfo(message: string, context?: Record<string, unknown>): void {
        this.logManager.log(message, 'info', {
            component: this.constructor.name,
            ...context
        });
    }

    protected logError(message: string, error?: Error, context?: Record<string, unknown>): void {
        this.logManager.log(message, 'error', {
            component: this.constructor.name,
            error,
            ...context
        });
    }

    protected logWarning(message: string, context?: Record<string, unknown>): void {
        this.logManager.log(message, 'warn', {
            component: this.constructor.name,
            ...context
        });
    }

    protected logDebug(message: string, context?: Record<string, unknown>): void {
        this.logManager.log(message, 'debug', {
            component: this.constructor.name,
            ...context
        });
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            timestamp: Date.now(),
            component: this.constructor.name,
            operation: 'getMetadata',
            category: this.category,
            duration: 0,
            status: 'success',
            agent: {
                id: `${this.constructor.name}_${Date.now()}`,
                name: this.constructor.name,
                role: 'system',
                status: AGENT_STATUS_enum.IDLE
            },
            context: {
                component: this.constructor.name,
                operation: 'getMetadata',
                timestamp: Date.now()
            },
            validation: {
                isValid: true,
                errors: [],
                warnings: [],
                metadata: {
                    component: this.constructor.name,
                    validatedFields: ['metadata'],
                    timestamp: Date.now(),
                    operation: 'getMetadata'
                }
            },
            metrics: {
                timestamp: Date.now(),
                component: this.constructor.name,
                category: 'core',
                version: '1.0.0'
            }
        };
    }
}
