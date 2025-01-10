import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricTypes';
import { METRIC_DOMAIN_enum, METRIC_TYPE_enum } from '../../../types/metrics/base/metricEnums';
import type { IWorkflowState } from '../../../types/workflow/workflowStateTypes';

export class WorkflowStateManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.STATE;
    private readonly metrics: Map<string, IMetricEvent[]>;
    private readonly states: Map<string, IWorkflowState>;
    private readonly maxMetricsPerWorkflow = 1000;

    private constructor() {
        super();
        this.metrics = new Map();
        this.states = new Map();
    }

    private static instance: WorkflowStateManager | null = null;

    public static getInstance(): WorkflowStateManager {
        if (!WorkflowStateManager.instance) {
            WorkflowStateManager.instance = new WorkflowStateManager();
        }
        return WorkflowStateManager.instance;
    }

    public getState(workflowId: string): IWorkflowState | undefined {
        return this.states.get(workflowId);
    }

    public async updateState(workflowId: string, updates: Partial<IWorkflowState>): Promise<void> {
        const currentState = this.states.get(workflowId);
        if (!currentState) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const newState = {
            ...currentState,
            ...updates,
            metadata: {
                ...currentState.metadata,
                ...updates.metadata,
                lastUpdated: Date.now()
            }
        };

        this.states.set(workflowId, newState);

        // Track state change as a metric
        const metric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.STATE_TRANSITION,
            value: 1,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'state_update',
                previousState: currentState,
                newState
            }
        };

        await this.trackWorkflowMetric(workflowId, metric);
    }

    public initializeState(workflowId: string, initialState: IWorkflowState): void {
        this.states.set(workflowId, {
            ...initialState,
            metadata: {
                ...initialState.metadata,
                lastUpdated: Date.now()
            }
        });
    }

    public clearState(workflowId: string): void {
        this.states.delete(workflowId);
        this.clearMetrics(workflowId);
    }

    public async trackWorkflowMetric(workflowId: string, metric: IMetricEvent): Promise<void> {
        let workflowMetrics = this.metrics.get(workflowId);
        if (!workflowMetrics) {
            workflowMetrics = [];
            this.metrics.set(workflowId, workflowMetrics);
        }

        workflowMetrics.push(metric);
        if (workflowMetrics.length > this.maxMetricsPerWorkflow) {
            workflowMetrics.shift();
        }

        await this.metricsManager.trackMetric(metric);
    }

    public async trackWorkflowError(workflowId: string, error: Error): Promise<void> {
        const errorMetric: IMetricEvent = {
            timestamp: Date.now(),
            domain: METRIC_DOMAIN_enum.WORKFLOW,
            type: METRIC_TYPE_enum.ERROR,
            value: 1,
            metadata: {
                workflowId,
                component: 'workflow',
                operation: 'error',
                error: error.message,
                stack: error.stack
            }
        };

        await this.trackWorkflowMetric(workflowId, errorMetric);
    }

    public getMetrics(workflowId: string): IMetricEvent[] {
        return this.metrics.get(workflowId) || [];
    }

    public clearMetrics(workflowId: string): void {
        this.metrics.delete(workflowId);
    }
}

export default WorkflowStateManager.getInstance();
