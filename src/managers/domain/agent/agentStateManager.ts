/**
 * @file agentStateManager.ts
 * @path src/managers/domain/agent/agentStateManager.ts
 * @description Agent state management and snapshot functionality
 *
 * @module @managers/domain/agent
 */

import { CoreManager } from '../../core/coreManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import { createError } from '../../../types/common/commonErrorTypes';
import { AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import type { IAgentType, IAgentMetrics } from '../../../types/agent/agentBaseTypes';
import type { IAgentExecutionState } from '../../../types/agent/agentStateTypes';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';

interface IAgentStateSnapshot {
    timestamp: number;
    agents: Map<string, IAgentType>;
    activeAgents: Set<string>;
    executionState: Map<string, IAgentExecutionState>;
    metrics: Map<string, IAgentMetrics>;
    metadata: Record<string, unknown>;
}

interface IAgentStateValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
        timestamp: number;
        validatedFields: string[];
    };
}

export class AgentStateManager extends CoreManager {
    private static instance: AgentStateManager;
    private state: IAgentStateSnapshot;
    private snapshots: Map<number, IAgentStateSnapshot> = new Map();
    private readonly MAX_SNAPSHOTS = 10;

    protected constructor() {
        super();
        this.state = this.createEmptyState();
        this.registerDomainManager('AgentStateManager', this);
    }

    public static getInstance(): AgentStateManager {
        if (!AgentStateManager.instance) {
            AgentStateManager.instance = new AgentStateManager();
        }
        return AgentStateManager.instance;
    }

    // ─── State Management Methods ───────────────────────────────────────────────

    private createEmptyState(): IAgentStateSnapshot {
        return {
            timestamp: Date.now(),
            agents: new Map(),
            activeAgents: new Set(),
            executionState: new Map(),
            metrics: new Map(),
            metadata: {}
        };
    }

    public getAgent(agentId: string): IAgentType | undefined {
        return this.state.agents.get(agentId);
    }

    public getAllAgents(): IAgentType[] {
        return Array.from(this.state.agents.values());
    }

    public getActiveAgents(): IAgentType[] {
        return Array.from(this.state.activeAgents)
            .map(id => this.state.agents.get(id))
            .filter((agent): agent is IAgentType => agent !== undefined);
    }

    public async addAgent(agent: IAgentType): Promise<void> {
        const validationResult = await this.validateAgent(agent);
        if (!validationResult.isValid) {
            throw createError({
                message: `Invalid agent: ${validationResult.errors.join(', ')}`,
                type: 'ValidationError',
                context: {
                    agent,
                    errors: validationResult.errors
                }
            });
        }

        this.state.agents.set(agent.id, agent);
        await this.createSnapshot();
    }

    public async updateAgent(agentId: string, update: Partial<IAgentType>): Promise<void> {
        const agent = this.state.agents.get(agentId);
        if (!agent) {
            throw createError({
                message: `Agent not found: ${agentId}`,
                type: 'StateError',
                context: { agentId }
            });
        }

        const updatedAgent = { ...agent, ...update };
        const validationResult = await this.validateAgent(updatedAgent);
        if (!validationResult.isValid) {
            throw createError({
                message: `Invalid agent update: ${validationResult.errors.join(', ')}`,
                type: 'ValidationError',
                context: {
                    agent: updatedAgent,
                    errors: validationResult.errors
                }
            });
        }

        this.state.agents.set(agentId, updatedAgent);
        await this.createSnapshot();
    }

    public async removeAgent(agentId: string): Promise<void> {
        if (!this.state.agents.has(agentId)) {
            throw createError({
                message: `Agent not found: ${agentId}`,
                type: 'StateError',
                context: { agentId }
            });
        }

        this.state.agents.delete(agentId);
        this.state.activeAgents.delete(agentId);
        this.state.executionState.delete(agentId);
        this.state.metrics.delete(agentId);
        await this.createSnapshot();
    }

    public async setAgentActive(agentId: string, active: boolean): Promise<void> {
        if (!this.state.agents.has(agentId)) {
            throw createError({
                message: `Agent not found: ${agentId}`,
                type: 'StateError',
                context: { agentId }
            });
        }

        if (active) {
            this.state.activeAgents.add(agentId);
        } else {
            this.state.activeAgents.delete(agentId);
        }
        await this.createSnapshot();
    }

    // ─── Snapshot Management ─────────────────────────────────────────────────────

    public async createSnapshot(): Promise<void> {
        const snapshot: IAgentStateSnapshot = {
            timestamp: Date.now(),
            agents: new Map(this.state.agents),
            activeAgents: new Set(this.state.activeAgents),
            executionState: new Map(this.state.executionState),
            metrics: new Map(this.state.metrics),
            metadata: { ...this.state.metadata }
        };

        this.snapshots.set(snapshot.timestamp, snapshot);

        // Remove oldest snapshots if exceeding MAX_SNAPSHOTS
        const timestamps = Array.from(this.snapshots.keys()).sort();
        while (timestamps.length > this.MAX_SNAPSHOTS) {
            this.snapshots.delete(timestamps.shift()!);
        }
    }

    public getSnapshot(timestamp: number): IAgentStateSnapshot | undefined {
        return this.snapshots.get(timestamp);
    }

    public getLatestSnapshot(): IAgentStateSnapshot {
        const timestamps = Array.from(this.snapshots.keys()).sort();
        const latestTimestamp = timestamps[timestamps.length - 1];
        return this.snapshots.get(latestTimestamp) || this.createEmptyState();
    }

    public async restoreSnapshot(timestamp: number): Promise<void> {
        const snapshot = this.snapshots.get(timestamp);
        if (!snapshot) {
            throw createError({
                message: `Snapshot not found: ${timestamp}`,
                type: 'StateError',
                context: { timestamp }
            });
        }

        const validationResult = await this.validateSnapshot(snapshot);
        if (!validationResult.isValid) {
            throw createError({
                message: `Invalid snapshot: ${validationResult.errors.join(', ')}`,
                type: 'ValidationError',
                context: {
                    timestamp,
                    errors: validationResult.errors
                }
            });
        }

        this.state = {
            timestamp: snapshot.timestamp,
            agents: new Map(snapshot.agents),
            activeAgents: new Set(snapshot.activeAgents),
            executionState: new Map(snapshot.executionState),
            metrics: new Map(snapshot.metrics),
            metadata: { ...snapshot.metadata }
        };
    }

    // ─── Validation Methods ─────────────────────────────────────────────────────

    private async validateAgent(agent: IAgentType): Promise<IValidationResult> {
        const errors: string[] = [];

        if (!agent.id) errors.push('Agent ID is required');
        if (!agent.name) errors.push('Agent name is required');
        if (!agent.role) errors.push('Agent role is required');
        if (!Object.values(AGENT_STATUS_enum).includes(agent.status as AGENT_STATUS_enum)) {
            errors.push('Invalid agent status');
        }

        if (agent.executionState) {
            if (!Array.isArray(agent.executionState.assignedTasks)) {
                errors.push('assignedTasks must be an array');
            }
            if (!Array.isArray(agent.executionState.completedTasks)) {
                errors.push('completedTasks must be an array');
            }
            if (!Array.isArray(agent.executionState.failedTasks)) {
                errors.push('failedTasks must be an array');
            }
            if (!Array.isArray(agent.executionState.blockedTasks)) {
                errors.push('blockedTasks must be an array');
            }
            if (!Array.isArray(agent.executionState.history)) {
                errors.push('history must be an array');
            }

            // Validate history entries
            if (agent.executionState.history) {
                agent.executionState.history.forEach((entry, index) => {
                    if (!(entry.timestamp instanceof Date)) {
                        errors.push(`history[${index}].timestamp must be a Date`);
                    }
                    if (typeof entry.action !== 'string') {
                        errors.push(`history[${index}].action must be a string`);
                    }
                    if (typeof entry.details !== 'object') {
                        errors.push(`history[${index}].details must be an object`);
                    }
                });
            }
        }

        return createValidationResult(errors.length === 0, errors);
    }

    private async validateSnapshot(snapshot: IAgentStateSnapshot): Promise<IAgentStateValidation> {
        const startTime = Date.now();
        const errors: string[] = [];
        const warnings: string[] = [];
        const validatedFields: string[] = [];

        // Validate timestamp
        if (!snapshot.timestamp || snapshot.timestamp > Date.now()) {
            errors.push('Invalid snapshot timestamp');
        }
        validatedFields.push('timestamp');

        // Validate agents
        for (const [id, agent] of snapshot.agents) {
            const agentValidation = await this.validateAgent(agent);
            if (!agentValidation.isValid) {
                errors.push(`Invalid agent ${id}: ${agentValidation.errors.join(', ')}`);
            }
        }
        validatedFields.push('agents');

        // Validate active agents
        for (const agentId of snapshot.activeAgents) {
            if (!snapshot.agents.has(agentId)) {
                errors.push(`Active agent ${agentId} not found in agents map`);
            }
        }
        validatedFields.push('activeAgents');

        // Validate execution state
        for (const [agentId, state] of snapshot.executionState) {
            if (!snapshot.agents.has(agentId)) {
                errors.push(`Execution state found for non-existent agent ${agentId}`);
            }
            if (!Array.isArray(state.blockedTasks)) {
                errors.push(`Invalid blockedTasks for agent ${agentId}`);
            }
            if (!Array.isArray(state.history)) {
                errors.push(`Invalid history for agent ${agentId}`);
            }
        }
        validatedFields.push('executionState');

        // Validate metrics
        for (const [agentId, metrics] of snapshot.metrics) {
            if (!snapshot.agents.has(agentId)) {
                errors.push(`Metrics found for non-existent agent ${agentId}`);
            }
        }
        validatedFields.push('metrics');

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            metadata: {
                timestamp: startTime,
                validatedFields
            }
        };
    }

    public cleanup(): void {
        this.state = this.createEmptyState();
        this.snapshots.clear();
    }
}

export default AgentStateManager.getInstance();
