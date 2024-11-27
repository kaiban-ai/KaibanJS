/**
 * @file agentEventEmitter.ts
 * @path src/managers/domain/agent/agentEventEmitter.ts
 * @description Agent-specific event emitter implementation
 *
 * @module @managers/domain/agent
 */

import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';
import { AgentMetricsManager } from './agentMetricsManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import { AGENT_EVENT_TYPE } from '../../../types/agent/agentEventTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import type { 
    AgentEvent,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangedEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentValidationCompletedEvent,
    IAgentErrorOccurredEvent,
    IAgentErrorHandledEvent,
    IAgentErrorRecoveryStartedEvent,
    IAgentErrorRecoveryCompletedEvent,
    IAgentErrorRecoveryFailedEvent,
    IAgentEventMetadata
} from '../../../types/agent/agentEventTypes';
import type { IEventHandler } from '../../../types/common/commonEventTypes';
import type { 
    IPerformanceMetrics, 
    ITimeMetrics, 
    IThroughputMetrics, 
    IErrorMetrics 
} from '../../../types/metrics/base/performanceMetrics';

export class AgentEventEmitter extends CoreManager {
    protected static _instance: AgentEventEmitter;
    private readonly eventEmitter: BaseEventEmitter;
    private readonly metricsManager: AgentMetricsManager;
    private readonly registeredHandlers: Map<AGENT_EVENT_TYPE, Set<IEventHandler<AgentEvent>>> = new Map();

    protected constructor() {
        super();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.metricsManager = AgentMetricsManager.getInstance();
        this.registerDomainManager('AgentEventEmitter', this);
    }

    public static override getInstance(): AgentEventEmitter {
        if (!AgentEventEmitter._instance) {
            AgentEventEmitter._instance = new AgentEventEmitter();
        }
        return AgentEventEmitter._instance;
    }

    // ─── Event Registration Methods ────────────────────────────────────────────

    public on<T extends AgentEvent>(eventType: AGENT_EVENT_TYPE, handler: IEventHandler<T>): void {
        if (!this.registeredHandlers.has(eventType)) {
            this.registeredHandlers.set(eventType, new Set());
        }
        this.registeredHandlers.get(eventType)!.add(handler as IEventHandler<AgentEvent>);
        this.eventEmitter.on(eventType, handler);
    }

    public off<T extends AgentEvent>(eventType: AGENT_EVENT_TYPE, handler: IEventHandler<T>): void {
        const handlers = this.registeredHandlers.get(eventType);
        if (handlers) {
            handlers.delete(handler as IEventHandler<AgentEvent>);
            if (handlers.size === 0) {
                this.registeredHandlers.delete(eventType);
            }
        }
        this.eventEmitter.off(eventType, handler);
    }

    // ─── Event Emission Methods ──────────────────────────────────────────────────

    public async emitAgentCreated(params: Omit<IAgentCreatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_created', params.agentId);
        const event: IAgentCreatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_CREATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentUpdated(params: Omit<IAgentUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_updated', params.agentId);
        const event: IAgentUpdatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_UPDATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentDeleted(params: Omit<IAgentDeletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_deleted', params.agentId);
        const event: IAgentDeletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_DELETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentStatusChanged(params: Omit<IAgentStatusChangedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_status_changed', params.agentId);
        const event: IAgentStatusChangedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentIterationStarted(params: Omit<IAgentIterationStartedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_started', params.agentId);
        const event: IAgentIterationStartedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentIterationCompleted(params: Omit<IAgentIterationCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_completed', params.agentId);
        const event: IAgentIterationCompletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentIterationFailed(params: Omit<IAgentIterationFailedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_failed', params.agentId);
        const event: IAgentIterationFailedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentMetricsUpdated(params: Omit<IAgentMetricsUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_metrics_updated', params.agentId);
        const event: IAgentMetricsUpdatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentConfigUpdated(params: Omit<IAgentConfigUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_config_updated', params.agentId);
        const event: IAgentConfigUpdatedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentValidationCompleted(params: Omit<IAgentValidationCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_validation_completed', params.agentId);
        const event: IAgentValidationCompletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentErrorOccurred(params: Omit<IAgentErrorOccurredEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_occurred', params.agentId);
        const event: IAgentErrorOccurredEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentErrorHandled(params: Omit<IAgentErrorHandledEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_handled', params.agentId);
        const event: IAgentErrorHandledEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentErrorRecoveryStarted(params: Omit<IAgentErrorRecoveryStartedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_recovery_started', params.agentId);
        const event: IAgentErrorRecoveryStartedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_STARTED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentErrorRecoveryCompleted(params: Omit<IAgentErrorRecoveryCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_recovery_completed', params.agentId);
        const event: IAgentErrorRecoveryCompletedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_COMPLETED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    public async emitAgentErrorRecoveryFailed(params: Omit<IAgentErrorRecoveryFailedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_recovery_failed', params.agentId);
        const event: IAgentErrorRecoveryFailedEvent = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_FAILED,
            ...params,
            metadata
        };
        await this.eventEmitter.emit(event);
    }

    // ─── Helper Methods ─────────────────────────────────────────────────────────

    protected async createAgentMetadata(operation: string, agentId: string): Promise<IAgentEventMetadata> {
        const metrics = await this.metricsManager.getCurrentMetrics();
        const timestamp = Date.now();

        const timeMetrics: ITimeMetrics = {
            total: 0,
            average: 0,
            min: 0,
            max: 0
        };

        const throughputMetrics: IThroughputMetrics = {
            operationsPerSecond: 0,
            dataProcessedPerSecond: 0
        };

        const errorMetrics: IErrorMetrics = {
            totalErrors: 0,
            errorRate: 0
        };

        const performance: IPerformanceMetrics = {
            executionTime: timeMetrics,
            latency: timeMetrics,
            throughput: throughputMetrics,
            responseTime: timeMetrics,
            queueLength: 0,
            errorRate: 0,
            successRate: 0,
            errorMetrics,
            resourceUtilization: {
                cpuUsage: 0,
                memoryUsage: 0,
                diskIO: { read: 0, write: 0 },
                networkUsage: { upload: 0, download: 0 },
                timestamp
            },
            timestamp
        };

        return {
            source: 'AgentEventEmitter',
            target: operation,
            timestamp,
            correlationId: timestamp.toString(),
            causationId: timestamp.toString(),
            component: 'AgentEventEmitter',
            operation,
            context: {
                agentId,
                timestamp
            },
            validation: createValidationResult(true, []),
            performance,
            agent: {
                id: agentId,
                name: '',  // Will be populated by agent manager
                role: '',  // Will be populated by agent manager
                status: AGENT_STATUS_enum.INITIAL,  // Initial status for new agents
                metrics: metrics
            }
        };
    }

    public cleanup(): void {
        // Unregister all event handlers
        for (const [eventType, handlers] of this.registeredHandlers.entries()) {
            for (const handler of handlers) {
                this.off(eventType, handler);
            }
        }
        this.registeredHandlers.clear();

        // Stop metrics collection
        this.metricsManager.stopCollection(this.constructor.name);
    }
}

export default AgentEventEmitter.getInstance();
