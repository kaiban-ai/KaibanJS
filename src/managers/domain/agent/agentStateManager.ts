import { CoreManager } from '../../core/coreManager';
import { MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import type { IAgentState, IAgentTaskState } from '../../../types/agent/agentStateTypes';
import type { IMetricEvent, IBaseMetrics } from '../../../types/metrics/base/metricTypes';

interface IStateContainer extends Omit<IAgentState, 'metrics'> {
    taskState: Map<string, IAgentTaskState>;
    metrics: IMetricEvent[];
    baseMetrics: IBaseMetrics;
}

export class AgentStateManager extends CoreManager {
    public readonly category = MANAGER_CATEGORY_enum.STATE;
    private readonly states: Map<string, IStateContainer>;

    private constructor() {
        super();
        this.states = new Map();
    }

    private static instance: AgentStateManager | null = null;

    public static getInstance(): AgentStateManager {
        if (!AgentStateManager.instance) {
            AgentStateManager.instance = new AgentStateManager();
        }
        return AgentStateManager.instance;
    }

    public initializeState(agentId: string, initialState: IAgentState): void {
        const stateContainer: IStateContainer = {
            ...initialState,
            taskState: new Map<string, IAgentTaskState>(),
            metrics: [],
            baseMetrics: {
                startTime: Date.now(),
                success: true
            }
        };
        this.states.set(agentId, stateContainer);
    }

    public getState(agentId: string): Omit<IStateContainer, 'metrics' | 'baseMetrics'> & { metrics: IBaseMetrics } | undefined {
        const state = this.states.get(agentId);
        if (!state) return undefined;

        return {
            ...state,
            metrics: state.baseMetrics
        };
    }

    public addMetric(agentId: string, metric: IMetricEvent): void {
        const state = this.states.get(agentId);
        if (state) {
            state.metrics.push(metric);
            // Keep only last 1000 metrics
            if (state.metrics.length > 1000) {
                state.metrics.shift();
            }
        }
    }

    public getMetrics(agentId: string): IMetricEvent[] {
        return this.states.get(agentId)?.metrics || [];
    }

    public clearState(agentId: string): void {
        this.states.delete(agentId);
    }
}

export default AgentStateManager.getInstance();
