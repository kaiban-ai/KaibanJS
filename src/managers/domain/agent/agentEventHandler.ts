/**
 * @file agentEventHandler.ts
 * @path src/managers/domain/agent/agentEventHandler.ts
 * @description Agent event handler implementation
 */

import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';
import { MetricsManager } from '../../core/metricsManager';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { MANAGER_CATEGORY_enum, AGENT_STATUS_enum } from '../../../types/common/enumTypes';

import { AgentStateManager } from './agentStateManager';
import { AgentEventEmitter } from './agentEventEmitter';

import { AGENT_EVENT_TYPE } from '../../../types/agent/agentEventTypes';
import type { IBaseManager, IBaseManagerMetadata } from '../../../types/agent/agentManagerTypes';
import type { IAgentError } from '../../../types/agent/agentBaseTypes';
import type { 
    IAgentEventHandler,
    IAgentCreatedEvent,
    IAgentUpdatedEvent,
    IAgentDeletedEvent,
    IAgentStatusChangeEvent,
    IAgentIterationStartedEvent,
    IAgentIterationCompletedEvent,
    IAgentIterationFailedEvent,
    IAgentMetricsUpdatedEvent,
    IAgentConfigUpdatedEvent,
    IAgentValidationEvent,
    IAgentErrorEvent,
    IAgentExecutionEvent,
    AgentEvent
} from '../../../types/agent/agentEventTypes';

export class AgentEventHandler extends CoreManager implements IAgentEventHandler, IBaseManager {
    protected static _instance: AgentEventHandler;
    private readonly stateManager: AgentStateManager;
    protected readonly eventEmitter: BaseEventEmitter;
    public readonly category: MANAGER_CATEGORY_enum = MANAGER_CATEGORY_enum.SERVICE;

    protected constructor() {
        super();
        this.stateManager = AgentStateManager.getInstance();
        this.eventEmitter = AgentEventEmitter.getInstance() as unknown as BaseEventEmitter;
        this.registerDomainManager('AgentEventHandler', this);
    }

    public static override getInstance(): AgentEventHandler {
        if (!AgentEventHandler._instance) {
            AgentEventHandler._instance = new AgentEventHandler();
        }
        return AgentEventHandler._instance;
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
                status: AGENT_STATUS_enum.INITIAL
            },
            timestamp: Date.now(),
            component: this.constructor.name
        };
    }

    protected async safeExecute<T>(fn: () => Promise<T>, operation: string): Promise<T> {
        try {
            return await fn();
        } catch (error) {
            await this.trackError(operation, error as Error);
            throw error;
        }
    }

    public async initialize(): Promise<void> {
        await this.safeExecute(async () => {
            this.logInfo('Initializing AgentEventHandler');
        }, 'initialize');
    }

    public async validate(): Promise<boolean> {
        return true;
    }

    public createBaseError(message: string, type: keyof typeof ERROR_KINDS = 'StateError'): IAgentError {
        const baseError = new Error(message);
        return {
            name: type,
            message: baseError.message,
            stack: baseError.stack,
            type: ERROR_KINDS[type],
            errorCount: 1,
            errorHistory: [{
                timestamp: new Date(),
                error: baseError,
                context: {
                    component: this.constructor.name,
                    timestamp: Date.now()
                }
            }],
            context: {
                component: this.constructor.name,
                timestamp: Date.now()
            }
        };
    }

    protected async trackPerformance(operation: string, duration: number): Promise<void> {
        const metricsManager = await this.getDomainManager<MetricsManager>('MetricsManager');
        await metricsManager.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.PERFORMANCE,
            value: duration,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation
            }
        });
    }

    protected async trackError(operation: string, error: Error): Promise<void> {
        const metricsManager = await this.getDomainManager<MetricsManager>('MetricsManager');
        await metricsManager.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.PERFORMANCE,
            value: 1,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation,
                error: error.message
            }
        });
    }

    protected async trackResourceUsage(operation: string): Promise<void> {
        const metricsManager = await this.getDomainManager<MetricsManager>('MetricsManager');
        await metricsManager.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.RESOURCE,
            value: process.memoryUsage().heapUsed,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation,
                cpuUsage: process.cpuUsage()
            }
        });
    }

    public async handleEvent(event: AgentEvent): Promise<void> {
        await this.safeExecute(async () => {
            if (!await this.validateEvent(event)) {
                throw this.createBaseError(`Invalid event: ${event.type}`);
            }

            switch (event.type) {
                case AGENT_EVENT_TYPE.AGENT_CREATED:
                    await this.onAgentCreated(event as IAgentCreatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_UPDATED:
                    await this.onAgentUpdated(event as IAgentUpdatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_DELETED:
                    await this.onAgentDeleted(event as IAgentDeletedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_STATUS_CHANGED:
                    await this.onAgentStatusChanged(event as IAgentStatusChangeEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ITERATION_STARTED:
                    await this.onAgentIterationStarted(event as IAgentIterationStartedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ITERATION_COMPLETED:
                    await this.onAgentIterationCompleted(event as IAgentIterationCompletedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ITERATION_FAILED:
                    await this.onAgentIterationFailed(event as IAgentIterationFailedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_METRICS_UPDATED:
                    await this.onAgentMetricsUpdated(event as IAgentMetricsUpdatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_CONFIG_UPDATED:
                    await this.onAgentConfigUpdated(event as IAgentConfigUpdatedEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_ERROR:
                    await this.onAgentError(event as IAgentErrorEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_EXECUTION:
                    await this.onAgentExecution(event as IAgentExecutionEvent);
                    break;
                case AGENT_EVENT_TYPE.AGENT_VALIDATION:
                    await this.onAgentValidation(event as IAgentValidationEvent);
                    break;
                default:
                    throw this.createBaseError(`Unhandled event type: ${event.type}`);
            }
        }, 'handleEvent');
    }

    public async validateEvent(event: AgentEvent): Promise<boolean> {
        return !!event.agentId && !!event.type && !!this.stateManager.getAgent(event.agentId);
    }

    private async onAgentCreated(event: IAgentCreatedEvent): Promise<void> {
        await this.stateManager.addAgent(event.agentType);
        await this.trackPerformance('agentCreated', 0);
    }

    private async onAgentUpdated(event: IAgentUpdatedEvent): Promise<void> {
        const agent = this.stateManager.getAgent(event.agentId);
        if (!agent) {
            throw this.createBaseError(`Agent not found: ${event.agentId}`);
        }
        await this.stateManager.updateAgent(event.agentId, {
            ...agent,
            ...event.newState
        });
        await this.trackPerformance('agentUpdated', 0);
    }

    private async onAgentDeleted(event: IAgentDeletedEvent): Promise<void> {
        await this.stateManager.removeAgent(event.agentId);
        await this.trackPerformance('agentDeleted', 0);
    }

    private async onAgentStatusChanged(event: IAgentStatusChangeEvent): Promise<void> {
        const agent = this.stateManager.getAgent(event.agentId);
        if (!agent) {
            throw this.createBaseError(`Agent not found: ${event.agentId}`);
        }
        await this.stateManager.updateAgent(event.agentId, {
            ...agent,
            executionState: {
                ...agent.executionState,
                status: event.newStatus
            }
        });
        await this.trackPerformance('agentStatusChanged', 0);
    }

    private async onAgentIterationStarted(event: IAgentIterationStartedEvent): Promise<void> {
        const agent = this.stateManager.getAgent(event.agentId);
        if (!agent) {
            throw this.createBaseError(`Agent not found: ${event.agentId}`);
        }
        await this.stateManager.updateAgent(event.agentId, {
            ...agent,
            executionState: {
                ...agent.executionState,
                currentStep: agent.executionState.currentStep + 1
            }
        });
        await this.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation: 'agentIterationStarted',
                agentId: event.agentId
            }
        });
    }

    private async onAgentIterationCompleted(event: IAgentIterationCompletedEvent): Promise<void> {
        await this.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation: 'agentIterationCompleted',
                agentId: event.agentId
            }
        });
    }

    private async onAgentIterationFailed(event: IAgentIterationFailedEvent): Promise<void> {
        await this.trackError('agentIterationFailed', event.error);
    }

    private async onAgentMetricsUpdated(event: IAgentMetricsUpdatedEvent): Promise<void> {
        await this.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation: 'agentMetricsUpdated',
                agentId: event.agentId
            }
        });
    }

    private async onAgentConfigUpdated(event: IAgentConfigUpdatedEvent): Promise<void> {
        const agent = this.stateManager.getAgent(event.agentId);
        if (!agent) {
            throw this.createBaseError(`Agent not found: ${event.agentId}`);
        }
        await this.stateManager.updateAgent(event.agentId, {
            ...agent,
            ...event.changes
        });
        await this.trackPerformance('agentConfigUpdated', 0);
    }

    private async onAgentError(event: IAgentErrorEvent): Promise<void> {
        await this.trackError('agentError', event.error);
    }

    private async onAgentExecution(event: IAgentExecutionEvent): Promise<void> {
        await this.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation: 'agentExecution',
                agentId: event.agentId
            }
        });
    }

    private async onAgentValidation(event: IAgentValidationEvent): Promise<void> {
        await this.trackMetric({
            domain: METRIC_DOMAIN_enum.AGENT,
            type: METRIC_TYPE_enum.PERFORMANCE,
            value: 0,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation: 'agentValidation',
                agentId: event.agentId
            }
        });
    }
}

export default AgentEventHandler.getInstance();
