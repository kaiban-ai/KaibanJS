/**
 * @file workflowEventEmitter.ts
 * @description Workflow-specific event emitter implementation
 */

import { CoreManager } from '../../core/coreManager';
import { WorkflowEventHandler } from './workflowEventHandler';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';
import { MANAGER_CATEGORY_enum, ERROR_SEVERITY_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS } from '../../../types/common/errorTypes';
import { RecoveryStrategyType } from '../../../types/common/recoveryTypes';
import { v4 as uuidv4 } from 'uuid';

import type { 
    IWorkflowStepEvent, 
    IWorkflowControlEvent, 
    IWorkflowAgentEvent, 
    IWorkflowTaskEvent,
    WorkflowEventType,
    IWorkflowEventBase
} from '../../../types/workflow/workflowEventTypes';
import type { IValidationResult } from '../../../types/common/validationTypes';
import type { IHandlerResult } from '../../../types/common/baseTypes';

type WorkflowEventBaseFields = 'id' | 'timestamp' | 'metadata';

/**
 * Workflow Event Registry
 */
class WorkflowEventRegistry {
    private stepHandlers = new Set<(event: IWorkflowStepEvent) => Promise<void>>();
    private controlHandlers = new Set<(event: IWorkflowControlEvent) => Promise<void>>();
    private agentHandlers = new Set<(event: IWorkflowAgentEvent) => Promise<void>>();
    private taskHandlers = new Set<(event: IWorkflowTaskEvent) => Promise<void>>();

    onStep(handler: (event: IWorkflowStepEvent) => Promise<void>): void {
        this.stepHandlers.add(handler);
    }

    onControl(handler: (event: IWorkflowControlEvent) => Promise<void>): void {
        this.controlHandlers.add(handler);
    }

    onAgent(handler: (event: IWorkflowAgentEvent) => Promise<void>): void {
        this.agentHandlers.add(handler);
    }

    onTask(handler: (event: IWorkflowTaskEvent) => Promise<void>): void {
        this.taskHandlers.add(handler);
    }

    offStep(handler: (event: IWorkflowStepEvent) => Promise<void>): void {
        this.stepHandlers.delete(handler);
    }

    offControl(handler: (event: IWorkflowControlEvent) => Promise<void>): void {
        this.controlHandlers.delete(handler);
    }

    offAgent(handler: (event: IWorkflowAgentEvent) => Promise<void>): void {
        this.agentHandlers.delete(handler);
    }

    offTask(handler: (event: IWorkflowTaskEvent) => Promise<void>): void {
        this.taskHandlers.delete(handler);
    }

    async emitStep(event: IWorkflowStepEvent): Promise<void> {
        await Promise.all(Array.from(this.stepHandlers).map(handler => handler(event)));
    }

    async emitControl(event: IWorkflowControlEvent): Promise<void> {
        await Promise.all(Array.from(this.controlHandlers).map(handler => handler(event)));
    }

    async emitAgent(event: IWorkflowAgentEvent): Promise<void> {
        await Promise.all(Array.from(this.agentHandlers).map(handler => handler(event)));
    }

    async emitTask(event: IWorkflowTaskEvent): Promise<void> {
        await Promise.all(Array.from(this.taskHandlers).map(handler => handler(event)));
    }
}

/**
 * Workflow Event Emitter
 * Emits and handles workflow domain events
 */
export class WorkflowEventEmitter extends CoreManager {
    protected static override _instance: WorkflowEventEmitter | null = null;
    private readonly eventHandler: WorkflowEventHandler;
    private readonly registry: WorkflowEventRegistry;
    public readonly category = MANAGER_CATEGORY_enum.STATE;

    protected constructor() {
        super();
        this.eventHandler = WorkflowEventHandler.getInstance();
        this.registry = new WorkflowEventRegistry();
        this.registerDomainManager('WorkflowEventEmitter', this);
    }

    public static override getInstance(): WorkflowEventEmitter {
        if (!WorkflowEventEmitter._instance) {
            WorkflowEventEmitter._instance = new WorkflowEventEmitter();
        }
        return WorkflowEventEmitter._instance;
    }

    /**
     * Create base workflow event
     */
    private async createBaseWorkflowEvent(operation: string): Promise<IWorkflowEventBase> {
        const now = Date.now();
        const errorContext = await this.createErrorContext(operation);

        // Initialize error distribution
        const errorDistribution = Object.values(ERROR_KINDS).reduce(
            (acc, kind) => ({ ...acc, [kind]: 0 }),
            {} as Record<string, number>
        );

        // Initialize severity distribution
        const severityDistribution = Object.values(ERROR_SEVERITY_enum).reduce(
            (acc, severity) => ({ ...acc, [severity]: 0 }),
            {} as Record<string, number>
        );

        // Initialize strategy distribution
        const strategyDistribution = Object.values(RecoveryStrategyType).reduce(
            (acc, strategy) => ({ ...acc, [strategy]: 0 }),
            {} as Record<string, number>
        );

        return {
            id: uuidv4(),
            timestamp: now,
            type: '',
            metadata: {
                timestamp: now,
                component: this.constructor.name,
                operation,
                performance: {
                    executionTime: { total: 0, average: 0, min: 0, max: 0 },
                    latency: { total: 0, average: 0, min: 0, max: 0 },
                    responseTime: { total: 0, average: 0, min: 0, max: 0 },
                    throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                    queueLength: 0,
                    errorRate: 0,
                    successRate: 1,
                    errorMetrics: {
                        totalErrors: 0,
                        errorRate: 0,
                        errorDistribution,
                        severityDistribution,
                        patterns: [],
                        impact: {
                            severity: ERROR_SEVERITY_enum.ERROR,
                            businessImpact: 0,
                            userExperienceImpact: 0,
                            systemStabilityImpact: 0,
                            resourceImpact: {
                                cpu: 0,
                                memory: 0,
                                io: 0
                            }
                        },
                        recovery: {
                            meanTimeToRecover: 0,
                            recoverySuccessRate: 0,
                            strategyDistribution,
                            failedRecoveries: 0
                        },
                        prevention: {
                            preventedCount: 0,
                            preventionRate: 0,
                            earlyWarnings: 0
                        },
                        trends: {
                            dailyRates: [],
                            weeklyRates: [],
                            monthlyRates: []
                        }
                    },
                    resourceUtilization: {
                        cpuUsage: 0,
                        memoryUsage: 0,
                        diskIO: {
                            read: 0,
                            write: 0
                        },
                        networkUsage: {
                            upload: 0,
                            download: 0
                        },
                        timestamp: now
                    },
                    timestamp: now
                },
                context: {
                    source: this.constructor.name,
                    target: operation,
                    correlationId: uuidv4(),
                    causationId: uuidv4()
                },
                validation: {
                    isValid: true,
                    errors: [],
                    warnings: []
                },
                error: {
                    code: '',
                    message: '',
                    timestamp: now,
                    stack: ''
                }
            }
        };
    }

    /**
     * Event registration methods
     */
    public onStepEvent(handler: (event: IWorkflowStepEvent) => Promise<void>): void {
        this.registry.onStep(handler);
    }

    public onControlEvent(handler: (event: IWorkflowControlEvent) => Promise<void>): void {
        this.registry.onControl(handler);
    }

    public onAgentEvent(handler: (event: IWorkflowAgentEvent) => Promise<void>): void {
        this.registry.onAgent(handler);
    }

    public onTaskEvent(handler: (event: IWorkflowTaskEvent) => Promise<void>): void {
        this.registry.onTask(handler);
    }

    public offStepEvent(handler: (event: IWorkflowStepEvent) => Promise<void>): void {
        this.registry.offStep(handler);
    }

    public offControlEvent(handler: (event: IWorkflowControlEvent) => Promise<void>): void {
        this.registry.offControl(handler);
    }

    public offAgentEvent(handler: (event: IWorkflowAgentEvent) => Promise<void>): void {
        this.registry.offAgent(handler);
    }

    public offTaskEvent(handler: (event: IWorkflowTaskEvent) => Promise<void>): void {
        this.registry.offTask(handler);
    }

    /**
     * Event emission methods
     */
    public async emitStepEvent(params: Pick<IWorkflowStepEvent, Exclude<keyof IWorkflowStepEvent, WorkflowEventBaseFields>>): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            const base = await this.createBaseWorkflowEvent('emitStepEvent');
            const fullEvent: IWorkflowStepEvent = {
                ...base,
                ...params
            };

            const handlerResult = await this.eventHandler.handleStepEvent(fullEvent);
            
            if (handlerResult.success && handlerResult.data?.isValid) {
                await this.registry.emitStep(fullEvent);
                await this.trackEventMetrics('step', fullEvent);
            }

            return handlerResult;
        }, 'emit step event');
    }

    public async emitControlEvent(params: Pick<IWorkflowControlEvent, Exclude<keyof IWorkflowControlEvent, WorkflowEventBaseFields>>): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            const base = await this.createBaseWorkflowEvent('emitControlEvent');
            const fullEvent: IWorkflowControlEvent = {
                ...base,
                ...params
            };

            const handlerResult = await this.eventHandler.handleControlEvent(fullEvent);
            
            if (handlerResult.success && handlerResult.data?.isValid) {
                await this.registry.emitControl(fullEvent);
                await this.trackEventMetrics('control', fullEvent);
            }

            return handlerResult;
        }, 'emit control event');
    }

    public async emitAgentEvent(params: Pick<IWorkflowAgentEvent, Exclude<keyof IWorkflowAgentEvent, WorkflowEventBaseFields>>): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            const base = await this.createBaseWorkflowEvent('emitAgentEvent');
            const fullEvent: IWorkflowAgentEvent = {
                ...base,
                ...params
            };

            const handlerResult = await this.eventHandler.handleAgentEvent(fullEvent);
            
            if (handlerResult.success && handlerResult.data?.isValid) {
                await this.registry.emitAgent(fullEvent);
                await this.trackEventMetrics('agent', fullEvent);
            }

            return handlerResult;
        }, 'emit agent event');
    }

    public async emitTaskEvent(params: Pick<IWorkflowTaskEvent, Exclude<keyof IWorkflowTaskEvent, WorkflowEventBaseFields>>): Promise<IHandlerResult<IValidationResult>> {
        return this.safeExecute(async () => {
            const base = await this.createBaseWorkflowEvent('emitTaskEvent');
            const fullEvent: IWorkflowTaskEvent = {
                ...base,
                ...params
            };

            const handlerResult = await this.eventHandler.handleTaskEvent(fullEvent);
            
            if (handlerResult.success && handlerResult.data?.isValid) {
                await this.registry.emitTask(fullEvent);
                await this.trackEventMetrics('task', fullEvent);
            }

            return handlerResult;
        }, 'emit task event');
    }

    /**
     * Helper methods
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
}

export default WorkflowEventEmitter.getInstance();
