import { CoreManager } from '../../core/coreManager';
import { WorkflowEventHandler } from './workflowEventHandler';
import { 
    IWorkflowStepEvent, 
    IWorkflowControlEvent, 
    IWorkflowAgentEvent, 
    IWorkflowTaskEvent,
    WorkflowEventType
} from '../../../types/workflow/workflowEventTypes';
import { IValidationResult } from '../../../types/common/commonValidationTypes';
import { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import { createBaseMetadata } from '../../../types/common/commonMetadataTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

/**
 * Workflow Event Emitter
 * Emits and handles workflow domain events
 */
export class WorkflowEventEmitter extends CoreManager {
    private static instance: WorkflowEventEmitter;
    private readonly eventHandler: WorkflowEventHandler;
    private readonly subscribers: Map<string, Set<Function>>;

    private constructor() {
        super();
        this.eventHandler = WorkflowEventHandler.getInstance();
        this.subscribers = new Map();
        this.registerDomainManager('WorkflowEventEmitter', this);
    }

    public static getInstance(): WorkflowEventEmitter {
        if (!WorkflowEventEmitter.instance) {
            WorkflowEventEmitter.instance = new WorkflowEventEmitter();
        }
        return WorkflowEventEmitter.instance;
    }

    /**
     * Subscribe to workflow events
     */
    public subscribe(eventType: string, callback: Function): void {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType)?.add(callback);
        this.logDebug(`Subscribed to workflow event: ${eventType}`);
    }

    /**
     * Unsubscribe from workflow events
     */
    public unsubscribe(eventType: string, callback: Function): void {
        this.subscribers.get(eventType)?.delete(callback);
        this.logDebug(`Unsubscribed from workflow event: ${eventType}`);
    }

    /**
     * Emit workflow step event
     */
    public async emitStepEvent(event: IWorkflowStepEvent): Promise<IHandlerResult<IValidationResult>> {
        const handlerResult = await this.eventHandler.handleStepEvent(event);
        
        if (handlerResult.success && handlerResult.data?.isValid) {
            await this.notifySubscribers('workflow:step', event);
            await this.trackEventMetrics('step', event);
        }

        return handlerResult;
    }

    /**
     * Emit workflow control event
     */
    public async emitControlEvent(event: IWorkflowControlEvent): Promise<IHandlerResult<IValidationResult>> {
        const handlerResult = await this.eventHandler.handleControlEvent(event);
        
        if (handlerResult.success && handlerResult.data?.isValid) {
            await this.notifySubscribers('workflow:control', event);
            await this.trackEventMetrics('control', event);
        }

        return handlerResult;
    }

    /**
     * Emit workflow agent event
     */
    public async emitAgentEvent(event: IWorkflowAgentEvent): Promise<IHandlerResult<IValidationResult>> {
        const handlerResult = await this.eventHandler.handleAgentEvent(event);
        
        if (handlerResult.success && handlerResult.data?.isValid) {
            await this.notifySubscribers('workflow:agent', event);
            await this.trackEventMetrics('agent', event);
        }

        return handlerResult;
    }

    /**
     * Emit workflow task event
     */
    public async emitTaskEvent(event: IWorkflowTaskEvent): Promise<IHandlerResult<IValidationResult>> {
        const handlerResult = await this.eventHandler.handleTaskEvent(event);
        
        if (handlerResult.success && handlerResult.data?.isValid) {
            await this.notifySubscribers('workflow:task', event);
            await this.trackEventMetrics('task', event);
        }

        return handlerResult;
    }

    /**
     * Emit any workflow event
     */
    public async emit(event: WorkflowEventType): Promise<IHandlerResult<IValidationResult>> {
        const handlerResult = await this.eventHandler.handleEvent(event);
        
        if (handlerResult.success && handlerResult.data?.isValid) {
            const eventType = this.getEventType(event);
            await this.notifySubscribers(eventType, event);
            await this.trackEventMetrics(eventType.split(':')[1], event);
        }

        return handlerResult;
    }

    /**
     * Notify event subscribers
     */
    private async notifySubscribers(eventType: string, event: WorkflowEventType): Promise<void> {
        const subscribers = this.subscribers.get(eventType);
        if (subscribers) {
            const metadata = createBaseMetadata('workflow', 'event_notification');
            for (const callback of subscribers) {
                try {
                    await callback(event, metadata);
                } catch (error) {
                    this.handleError(error, `Failed to notify subscriber for ${eventType}`);
                }
            }
        }
    }

    /**
     * Track event metrics
     */
    private async trackEventMetrics(category: string, event: WorkflowEventType): Promise<void> {
        const metricsManager = this.getMetricsManager();
        await metricsManager.trackMetric({
            domain: MetricDomain.WORKFLOW,
            type: MetricType.PERFORMANCE,
            value: event.metadata.performance.executionTime.total,
            timestamp: Date.now(),
            metadata: {
                category,
                type: event.type,
                component: event.metadata.component
            }
        });
    }

    /**
     * Get event type string
     */
    private getEventType(event: WorkflowEventType): string {
        switch (true) {
            case ['start', 'complete', 'fail', 'skip'].includes(event.type):
                return 'workflow:step';
            case ['start', 'pause', 'resume', 'stop', 'reset'].includes(event.type):
                return 'workflow:control';
            case ['assign', 'unassign'].includes(event.type):
                return 'workflow:agent';
            case ['add', 'remove', 'update'].includes(event.type):
                return 'workflow:task';
            default:
                throw new Error(`Unknown workflow event type: ${event.type}`);
        }
    }
}

export default WorkflowEventEmitter.getInstance();
