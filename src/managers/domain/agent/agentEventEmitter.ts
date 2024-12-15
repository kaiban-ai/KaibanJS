/**
 * @file agentEventEmitter.ts
 * @path src/managers/domain/agent/agentEventEmitter.ts
 * @description Agent-specific event emitter implementation
 */

// Runtime imports
import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';
import { v4 as uuidv4 } from 'uuid';
import { createBaseMetadata } from '../../../types/common/baseTypes';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { AGENT_EVENT_TYPE, AGENT_EVENT_CATEGORY } from '../../../types/agent/agentEventTypes';
import { AGENT_STATUS_enum } from '../../../types/common/enumTypes';

// Single declaration for all runtime-needed imports and types
declare interface _RuntimeImports {
    core: {
        managers: {
            CoreManager: typeof CoreManager;
            BaseEventEmitter: typeof BaseEventEmitter;
        };
    };
    external: {
        uuid: typeof uuidv4;
    };
    utils: {
        metadata: typeof createBaseMetadata;
    };
    enums: {
        manager: typeof MANAGER_CATEGORY_enum;
        agent: {
            event: typeof AGENT_EVENT_TYPE & typeof AGENT_EVENT_CATEGORY;
            status: typeof AGENT_STATUS_enum;
        };
    };
    types: {
        common: {
            IEventEmitter: IEventEmitter;
            IEventHandler: IEventHandler<IBaseEvent>;
            IBaseEvent: IBaseEvent;
        };
        agent: {
            events: {
                IAgentCreatedEvent: IAgentCreatedEvent;
                IAgentUpdatedEvent: IAgentUpdatedEvent;
                IAgentDeletedEvent: IAgentDeletedEvent;
                IAgentStatusChangedEvent: IAgentStatusChangedEvent;
                IAgentIterationStartedEvent: IAgentIterationStartedEvent;
                IAgentIterationCompletedEvent: IAgentIterationCompletedEvent;
                IAgentIterationFailedEvent: IAgentIterationFailedEvent;
                IAgentMetricsUpdatedEvent: IAgentMetricsUpdatedEvent;
                IAgentConfigUpdatedEvent: IAgentConfigUpdatedEvent;
                IAgentValidationCompletedEvent: IAgentValidationCompletedEvent;
                IAgentErrorOccurredEvent: IAgentErrorOccurredEvent;
                IAgentErrorHandledEvent: IAgentErrorHandledEvent;
                IAgentErrorRecoveryStartedEvent: IAgentErrorRecoveryStartedEvent;
                IAgentErrorRecoveryCompletedEvent: IAgentErrorRecoveryCompletedEvent;
                IAgentErrorRecoveryFailedEvent: IAgentErrorRecoveryFailedEvent;
                IAgentEventMetadata: IAgentEventMetadata;
            };
            managers: {
                IBaseManager: IBaseManager;
                IBaseManagerMetadata: IBaseManagerMetadata;
            };
            metrics: {
                AgentMetricsManager: typeof AgentMetricsManager;
            };
        };
    };
}

// Type-only imports from common domain
import type {
    IEventEmitter,
    IEventHandler,
    IBaseEvent
} from '../../../types/common/baseTypes';

// Type-only imports from agent domain
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import type { AgentMetricsManager } from './agentMetricsManager';
import type {
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

export class AgentEventEmitter extends CoreManager implements IEventEmitter {
    protected static _instance: AgentEventEmitter;
    protected override readonly eventEmitter: BaseEventEmitter;
    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.SERVICE;

    protected constructor() {
        super();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.registerDomainManager('AgentEventEmitter', this);
    }

    public static override getInstance(): AgentEventEmitter {
        if (!AgentEventEmitter._instance) {
            AgentEventEmitter._instance = new AgentEventEmitter();
        }
        return AgentEventEmitter._instance;
    }

    // ─── IEventEmitter Implementation ────────────────────────────────────────────

    public async emit<T extends IBaseEvent>(event: T): Promise<void> {
        await this.eventEmitter.emit(event);
    }

    public on<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
        this.eventEmitter.on(eventType, handler);
    }

    public off<T extends IBaseEvent>(eventType: string, handler: IEventHandler<T>): void {
        this.eventEmitter.off(eventType, handler);
    }

    // ─── Agent-specific Event Methods ──────────────────────────────────────────────

    protected async createAgentMetadata<T extends AGENT_EVENT_CATEGORY>(
        operation: string,
        agentId: string,
        category: T
    ): Promise<IAgentEventMetadata & { category: T }> {
        const baseMetadata = createBaseMetadata('AgentEventEmitter', operation);
        const metricsManager = this.getDomainManager<AgentMetricsManager & IBaseManager<unknown>>('AgentMetricsManager');
        const metrics = await metricsManager.getCurrentMetrics(agentId);

        return {
            ...baseMetadata,
            category,
            source: this.constructor.name,
            correlationId: uuidv4(),
            agent: {
                name: '', // Will be populated by agent manager
                role: '', // Will be populated by agent manager
                status: AGENT_STATUS_enum.INITIAL,
                metrics: {
                    performance: metrics.performance,
                    resources: metrics.resources,
                    usage: metrics.usage
                }
            }
        };
    }

    public async emitAgentCreated(params: Omit<IAgentCreatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_created', params.agentId, AGENT_EVENT_CATEGORY.LIFECYCLE);
        const event: IAgentCreatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_CREATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentUpdated(params: Omit<IAgentUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_updated', params.agentId, AGENT_EVENT_CATEGORY.LIFECYCLE);
        const event: IAgentUpdatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_UPDATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentDeleted(params: Omit<IAgentDeletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_deleted', params.agentId, AGENT_EVENT_CATEGORY.LIFECYCLE);
        const event: IAgentDeletedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_DELETED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentStatusChanged(params: Omit<IAgentStatusChangedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_status_changed', params.agentId, AGENT_EVENT_CATEGORY.STATE);
        const event: IAgentStatusChangedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentIterationStarted(params: Omit<IAgentIterationStartedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_started', params.agentId, AGENT_EVENT_CATEGORY.ITERATION);
        const event: IAgentIterationStartedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentIterationCompleted(params: Omit<IAgentIterationCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_completed', params.agentId, AGENT_EVENT_CATEGORY.ITERATION);
        const event: IAgentIterationCompletedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentIterationFailed(params: Omit<IAgentIterationFailedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_iteration_failed', params.agentId, AGENT_EVENT_CATEGORY.ITERATION);
        const event: IAgentIterationFailedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentMetricsUpdated(params: Omit<IAgentMetricsUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_metrics_updated', params.agentId, AGENT_EVENT_CATEGORY.METRICS);
        const event: IAgentMetricsUpdatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentConfigUpdated(params: Omit<IAgentConfigUpdatedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_config_updated', params.agentId, AGENT_EVENT_CATEGORY.CONFIG);
        const event: IAgentConfigUpdatedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentValidationCompleted(params: Omit<IAgentValidationCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_validation_completed', params.agentId, AGENT_EVENT_CATEGORY.VALIDATION);
        const event: IAgentValidationCompletedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_VALIDATION_COMPLETED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentErrorOccurred(params: Omit<IAgentErrorOccurredEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_occurred', params.agentId, AGENT_EVENT_CATEGORY.ERROR);
        const event: IAgentErrorOccurredEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_OCCURRED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentErrorHandled(params: Omit<IAgentErrorHandledEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_handled', params.agentId, AGENT_EVENT_CATEGORY.ERROR);
        const event: IAgentErrorHandledEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_HANDLED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentErrorRecoveryStarted(params: Omit<IAgentErrorRecoveryStartedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_recovery_started', params.agentId, AGENT_EVENT_CATEGORY.ERROR);
        const event: IAgentErrorRecoveryStartedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_STARTED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentErrorRecoveryCompleted(params: Omit<IAgentErrorRecoveryCompletedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_recovery_completed', params.agentId, AGENT_EVENT_CATEGORY.ERROR);
        const event: IAgentErrorRecoveryCompletedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_COMPLETED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public async emitAgentErrorRecoveryFailed(params: Omit<IAgentErrorRecoveryFailedEvent, 'id' | 'type' | 'timestamp' | 'metadata'>): Promise<void> {
        const metadata = await this.createAgentMetadata('agent_error_recovery_failed', params.agentId, AGENT_EVENT_CATEGORY.ERROR);
        const event: IAgentErrorRecoveryFailedEvent = {
            id: uuidv4(),
            timestamp: Date.now(),
            type: AGENT_EVENT_TYPE.AGENT_ERROR_RECOVERY_FAILED,
            ...params,
            metadata
        };
        await this.emit(event);
    }

    public cleanup(): void {
        // No cleanup needed
    }

    // ─── IBaseManager Implementation ────────────────────────────────────────────

    public async initialize(): Promise<void> {
        // No initialization needed
    }

    public async validate(): Promise<boolean> {
        return true;
    }

    public getMetadata(): IBaseManagerMetadata {
        return {
            category: this.category,
            operation: 'event_handling',
            duration: 0,
            status: 'success',
            agent: {
                id: '',
                name: '',
                role: '',
                status: ''
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }
}

export default AgentEventEmitter.getInstance();
