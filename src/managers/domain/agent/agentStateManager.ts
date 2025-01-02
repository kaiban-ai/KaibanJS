/**
 * @file agentStateManager.ts
 * @path src/managers/domain/agent/agentStateManager.ts
 * @description Agent state management and snapshot functionality
 */

import { CoreManager } from '../../core/coreManager';
import { MetricsManager } from '../../core/metricsManager';
import { CircularBuffer } from '../../core/metrics/CircularBuffer';
import { createValidationError, VALIDATION_SCOPE_enum } from '../../../types/common/validationTypes';
import { 
    VALIDATION_ERROR_enum, 
    AGENT_STATUS_enum, 
    MANAGER_CATEGORY_enum 
} from '../../../types/common/enumTypes';
import { createError, ERROR_KINDS } from '../../../types/common/errorTypes';
import { MetricDomain, MetricType } from '../../../types/metrics/base/metricsManagerTypes';

// Type imports
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { IMetricEvent } from '../../../types/metrics/base/metricsManagerTypes';
import type { 
    IAgentExecutionContext, 
    IAgentTaskState, 
    IStateHistoryEntry, 
    IAgentStateSnapshot, 
    IAgentStateValidationResult, 
    STATE_CATEGORY 
} from '../../../types/agent/agentStateTypes';
import type { IAgentStateAccessor } from '../../../types/agent/agentMetricsAccessor';
import type { IAgentStateMetrics } from '../../../types/agent/agentMetricTypes';
import type { IBaseManager } from '../../../types/agent/agentManagerTypes';

interface IStateContainer {
    agents: Map<string, IAgentType>;
    activeAgents: Set<string>;
    taskState: Map<string, IAgentTaskState>;
    metrics: CircularBuffer<IMetricEvent>;
}

export class AgentStateManager extends CoreManager implements IAgentStateAccessor {
    private static instance: AgentStateManager;
    private readonly stateContainer: IStateContainer;
    private readonly snapshots: Map<number, IAgentStateSnapshot>;
    private readonly MAX_SNAPSHOTS = 10;
    private isInitialized = false;

    protected readonly metricsManager: MetricsManager;

    public readonly category = MANAGER_CATEGORY_enum.AGENT;

    protected constructor() {
        super();
        this.stateContainer = this.createEmptyState();
        this.snapshots = new Map();
        this.metricsManager = this.getDomainManager<MetricsManager>('MetricsManager');
        this.registerDomainManager('AgentStateManager', this);
    }

    public static getInstance(): AgentStateManager {
        if (!AgentStateManager.instance) {
            AgentStateManager.instance = new AgentStateManager();
        }
        return AgentStateManager.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await this.handleStatusTransition({
                entity: 'agent',
                entityId: 'AgentStateManager',
                currentStatus: AGENT_STATUS_enum.INITIAL,
                targetStatus: AGENT_STATUS_enum.IDLE,
                context: { 
                    operation: 'initialize',
                    component: this.constructor.name
                }
            });

            await this.trackStateMetric(MetricType.SYSTEM_HEALTH, 1);
            this.isInitialized = true;
            this.logInfo('Agent state manager initialized');
        } catch (error) {
            await this.handleError(error, 'Failed to initialize agent state manager', ERROR_KINDS.InitializationError);
            throw error;
        }
    }

    private createEmptyState(): IStateContainer {
        return {
            agents: new Map<string, IAgentType>(),
            activeAgents: new Set<string>(),
            taskState: new Map<string, IAgentTaskState>(),
            metrics: new CircularBuffer<IMetricEvent>(1000)
        };
    }

    private async trackStateMetric(
        type: MetricType, 
        value: number, 
        context?: Record<string, unknown>
    ): Promise<void> {
        await this.metricsManager.trackMetric({
            domain: MetricDomain.AGENT,
            type,
            value,
            timestamp: Date.now(),
            metadata: {
                component: this.constructor.name,
                operation: 'state_management',
                ...context
            }
        });
    }

    public getAgent(agentId: string): IAgentType | undefined {
        return this.stateContainer.agents.get(agentId);
    }

    public getAllAgents(): IAgentType[] {
        return Array.from(this.stateContainer.agents.values());
    }

    public getActiveAgents(): IAgentType[] {
        return Array.from(this.stateContainer.activeAgents)
            .map(id => this.stateContainer.agents.get(id))
            .filter((agent): agent is IAgentType => agent !== undefined);
    }

    public async addAgent(agent: IAgentType): Promise<IAgentType> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const validationResult = await this.validateAgent(agent);
            if (!validationResult.isValid) {
                throw createError({
                    message: `Invalid agent: ${validationResult.errors.join(', ')}`,
                    type: ERROR_KINDS.ValidationError,
                    context: { agent }
                });
            }

            await this.trackStateMetric(MetricType.USAGE, 1, { 
                agentId: agent.id,
                operation: 'addAgent'
            });

            this.stateContainer.agents.set(agent.id, agent);
            await this.createSnapshot();
            
            return agent;
        } catch (error) {
            await this.handleError(error, 'Failed to add agent', ERROR_KINDS.StateError);
            throw error;
        }
    }

    public async updateAgent(agentId: string, update: Partial<IAgentType>): Promise<void> {
        const agent = this.stateContainer.agents.get(agentId);
        if (!agent) {
            throw createError({
                message: `Agent not found: ${agentId}`,
                type: ERROR_KINDS.StateError,
                context: { agentId }
            });
        }

        const updatedAgent = { ...agent, ...update };
        const validationResult = await this.validateAgent(updatedAgent);
        
        if (!validationResult.isValid) {
            throw createError({
                message: `Invalid agent update: ${validationResult.errors.join(', ')}`,
                type: ERROR_KINDS.ValidationError,
                context: { agent: updatedAgent }
            });
        }

        this.stateContainer.agents.set(agentId, updatedAgent);
        await this.createSnapshot();
    }

    public async updateExecutionContext(
        agentId: string, 
        context: IAgentExecutionContext
    ): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const validationResult = await this.validateExecutionContext(context);
            if (!validationResult.isValid) {
                throw createError({
                    message: `Invalid execution context: ${validationResult.errors.join(', ')}`,
                    type: ERROR_KINDS.ValidationError,
                    context: { agentId, executionContext: context }
                });
            }

            const agent = this.stateContainer.agents.get(agentId);
            if (!agent) {
                throw createError({
                    message: `Agent not found: ${agentId}`,
                    type: ERROR_KINDS.StateError,
                    context: { agentId }
                });
            }

            await this.trackStateMetric(MetricType.STATE_TRANSITION, 1, {
                agentId,
                fromStatus: agent.status,
                toStatus: context.state.status
            });

            const updatedAgent = {
                ...agent,
                status: context.state.status,
                executionState: {
                    ...agent.executionState,
                    status: context.state.status,
                    lastUpdate: new Date()
                }
            };

            await this.updateAgent(agentId, updatedAgent);
            this.stateContainer.taskState.set(agentId, context.taskState);
            await this.createSnapshot();

        } catch (error) {
            await this.handleError(error, 'Failed to update execution context', ERROR_KINDS.StateError);
            throw error;
        }
    }

    public async createSnapshot(): Promise<void> {
        const snapshot: IAgentStateSnapshot = {
            timestamp: Date.now(),
            agents: new Map(this.stateContainer.agents),
            activeAgents: new Set(this.stateContainer.activeAgents),
            taskState: new Map(this.stateContainer.taskState),
            metadata: {}
        };

        this.snapshots.set(snapshot.timestamp, snapshot);
        
        const timestamps = Array.from(this.snapshots.keys()).sort();
        while (timestamps.length > this.MAX_SNAPSHOTS) {
            this.snapshots.delete(timestamps.shift()!);
        }
    }

    public getLatestSnapshot(): IAgentStateSnapshot {
        const timestamps = Array.from(this.snapshots.keys()).sort();
        const latestTimestamp = timestamps[timestamps.length - 1];
        return this.snapshots.get(latestTimestamp) || this.createEmptyState();
    }

    public async getStateMetrics(agentId: string): Promise<IAgentStateMetrics> {
        const agent = this.getAgent(agentId);
        const taskState = this.stateContainer.taskState.get(agentId);
        
        const completedCount = taskState?.completedTasks.length || 0;
        const failedCount = taskState?.failedTasks.length || 0;
        const totalTasks = completedCount + failedCount;
        
        return {
            currentState: agent?.status || AGENT_STATUS_enum.IDLE,
            stateTime: 0,
            transitionCount: 0,
            failedTransitions: 0,
            blockedTaskCount: taskState?.blockedTasks.length || 0,
            historyEntryCount: taskState?.history.length || 0,
            lastHistoryUpdate: Date.now(),
            taskStats: {
                completedCount,
                failedCount,
                averageDuration: 0,
                successRate: totalTasks > 0 ? completedCount / totalTasks : 0,
                averageIterations: 0
            },
            timestamp: Date.now(),
            component: this.constructor.name,
            category: this.category,
            version: '1.0.0'
        };
    }

    private isValidHistoryEntry(entry: IStateHistoryEntry): boolean {
        return (
            entry.timestamp instanceof Date &&
            typeof entry.action === 'string' &&
            typeof entry.category === 'string' &&
            Object.values(STATE_CATEGORY).includes(entry.category) &&
            typeof entry.details === 'object' &&
            entry.details !== null
        );
    }

    private async validateAgent(agent: IAgentType): Promise<IAgentStateValidationResult> {
        const errors: string[] = [];

        if (!agent.id) errors.push('Agent ID is required');
        if (!agent.name) errors.push('Agent name is required');
        if (!agent.role) errors.push('Agent role is required');
        if (!Object.values(AGENT_STATUS_enum).includes(agent.status as AGENT_STATUS_enum)) {
            errors.push('Invalid agent status');
        }

        const taskState = this.stateContainer.taskState.get(agent.id);
        if (taskState) {
            if (!Array.isArray(taskState.assignedTasks)) {
                errors.push('assignedTasks must be an array');
            }
            if (!Array.isArray(taskState.completedTasks)) {
                errors.push('completedTasks must be an array');
            }
            if (!Array.isArray(taskState.failedTasks)) {
                errors.push('failedTasks must be an array');
            }
            if (!Array.isArray(taskState.blockedTasks)) {
                errors.push('blockedTasks must be an array');
            }
            if (!Array.isArray(taskState.history)) {
                errors.push('history must be an array');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                validatedFields: ['id', 'name', 'role', 'status', 'taskState']
            },
            context: {
                taskId: '',
                taskStatus: 'PENDING',
                validationTime: 0
            }
        };
    }

    private async validateExecutionContext(context: IAgentExecutionContext): Promise<IAgentStateValidationResult> {
        const errors: string[] = [];

        if (!context.operation) {
            errors.push(createValidationError({
                code: VALIDATION_ERROR_enum.FIELD_MISSING,
                message: 'Operation is required',
                scope: VALIDATION_SCOPE_enum.EXECUTION
            }).message);
        }

        if (!context.state?.id || !context.state?.status) {
            errors.push(createValidationError({
                code: VALIDATION_ERROR_enum.FIELD_MISSING,
                message: 'State ID and status are required',
                scope: VALIDATION_SCOPE_enum.EXECUTION
            }).message);
        }

        if (!context.taskState) {
            errors.push(createValidationError({
                code: VALIDATION_ERROR_enum.FIELD_MISSING,
                message: 'Task state is required',
                scope: VALIDATION_SCOPE_enum.EXECUTION
            }).message);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings: [],
            metadata: {
                timestamp: Date.now(),
                validatedFields: ['operation', 'state', 'taskState']
            },
            context: {
                taskId: context.state?.id || '',
                taskStatus: 'PENDING',
                validationTime: 0
            }
        };
    }

    public cleanup(): void {
        this.stateContainer.agents.clear();
        this.stateContainer.activeAgents.clear();
        this.stateContainer.taskState.clear();
        this.snapshots.clear();
    }
}

export default AgentStateManager.getInstance();