/**
 * @file teamStateManager.ts
 * @description Team state management implementation with snapshot and recovery capabilities
 */

import { CoreManager } from '../../core/coreManager';
import { WORKFLOW_STATUS_enum } from '../../../types/common/commonEnums';
import { createError } from '../../../types/common/commonErrorTypes';
import { createBaseMetadata } from '../../../types/common/commonHandlerTypes';
import { z } from 'zod';

import type { ITeamState } from '../../../types/team/teamBaseTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../../../types/common/commonMetadataTypes';

// ─── State Validation Schemas ────────────────────────────────────────────────

const teamStateSchema = z.object({
    name: z.string(),
    agents: z.array(z.string()),
    tasks: z.array(z.string()),
    workflowLogs: z.array(z.string()),
    teamWorkflowStatus: z.string(),
    workflowContext: z.record(z.unknown()),
    inputs: z.record(z.unknown()),
    env: z.record(z.string()),
    tasksInitialized: z.boolean(),
    workflowResult: z.any().optional()
});

// ─── State Snapshot Type ───────────────────────────────────────────────────

export interface ITeamStateSnapshot {
    timestamp: number;
    state: ITeamState;
    metadata: {
        version: string;
        checksum: string;
        agentCount: number;
        taskCount: number;
        workflowStatus: string;
    };
}

export class TeamStateManager extends CoreManager {
    private static instance: TeamStateManager | null = null;
    private currentState: ITeamState;
    private stateHistory: ITeamStateSnapshot[] = [];
    private readonly maxHistorySize = 10;

    private constructor() {
        super();
        this.registerDomainManager('TeamStateManager', this);
        this.currentState = this.createInitialState();
    }

    public static getInstance(): TeamStateManager {
        if (!TeamStateManager.instance) {
            TeamStateManager.instance = new TeamStateManager();
        }
        return TeamStateManager.instance;
    }

    // ─── State Management ───────────────────────────────────────────────────

    private createInitialState(): ITeamState {
        return {
            name: '',
            agents: [],
            tasks: [],
            workflowLogs: [],
            teamWorkflowStatus: WORKFLOW_STATUS_enum.INITIAL,
            workflowContext: {},
            inputs: {},
            env: {},
            tasksInitialized: false
        };
    }

    public getCurrentState(): ITeamState {
        return { ...this.currentState };
    }

    public async updateState(
        update: Partial<ITeamState>
    ): Promise<IHandlerResult<ITeamState, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            // Create snapshot before update
            await this.createSnapshot();

            // Update state
            const newState = {
                ...this.currentState,
                ...update
            };

            // Validate new state
            await this.validateState(newState);

            // Apply update
            this.currentState = newState;

            return this.currentState;
        }, 'updateState');
    }

    // ─── Snapshot Management ─────────────────────────────────────────────────

    public async createSnapshot(): Promise<IHandlerResult<ITeamStateSnapshot, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const snapshot: ITeamStateSnapshot = {
                timestamp: Date.now(),
                state: { ...this.currentState },
                metadata: {
                    version: '1.0.0',
                    checksum: await this.calculateStateChecksum(this.currentState),
                    agentCount: this.currentState.agents.length,
                    taskCount: this.currentState.tasks.length,
                    workflowStatus: this.currentState.teamWorkflowStatus
                }
            };

            // Add to history and maintain max size
            this.stateHistory.push(snapshot);
            if (this.stateHistory.length > this.maxHistorySize) {
                this.stateHistory.shift();
            }

            return snapshot;
        }, 'createSnapshot');
    }

    public async restoreSnapshot(
        snapshot: ITeamStateSnapshot
    ): Promise<IHandlerResult<ITeamState, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            // Validate snapshot
            const currentChecksum = await this.calculateStateChecksum(snapshot.state);
            if (currentChecksum !== snapshot.metadata.checksum) {
                throw createError({
                    message: 'Invalid snapshot checksum',
                    type: 'StateError'
                });
            }

            // Validate state before restoration
            await this.validateState(snapshot.state);

            // Restore state
            this.currentState = { ...snapshot.state };

            return this.currentState;
        }, 'restoreSnapshot');
    }

    public async getLatestSnapshot(): Promise<IHandlerResult<ITeamStateSnapshot | null, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const latestSnapshot = this.stateHistory[this.stateHistory.length - 1] || null;
            return latestSnapshot;
        }, 'getLatestSnapshot');
    }

    // ─── State Validation ───────────────────────────────────────────────────

    private async validateState(state: ITeamState): Promise<void> {
        try {
            // Validate basic structure
            teamStateSchema.parse(state);

            // Validate workflow status transitions
            await this.validateWorkflowStatus(state.teamWorkflowStatus);

        } catch (error) {
            throw createError({
                message: `State validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'ValidationError'
            });
        }
    }

    private async validateWorkflowStatus(status: string): Promise<void> {
        // Validate workflow status transitions
        const validTransitions: Record<string, string[]> = {
            [WORKFLOW_STATUS_enum.INITIAL]: [WORKFLOW_STATUS_enum.RUNNING],
            [WORKFLOW_STATUS_enum.RUNNING]: [WORKFLOW_STATUS_enum.STOPPED, WORKFLOW_STATUS_enum.ERRORED],
            [WORKFLOW_STATUS_enum.STOPPED]: [WORKFLOW_STATUS_enum.RUNNING],
            [WORKFLOW_STATUS_enum.ERRORED]: [WORKFLOW_STATUS_enum.INITIAL]
        };

        const currentStatus = this.currentState.teamWorkflowStatus;
        const allowedTransitions = validTransitions[currentStatus];
        
        if (!allowedTransitions?.includes(status)) {
            throw createError({
                message: `Invalid workflow status transition from ${currentStatus} to ${status}`,
                type: 'ValidationError'
            });
        }
    }

    // ─── Helper Methods ─────────────────────────────────────────────────────

    private async calculateStateChecksum(state: ITeamState): Promise<string> {
        const stateString = JSON.stringify(state);
        const encoder = new TextEncoder();
        const data = encoder.encode(stateString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

export default TeamStateManager.getInstance();
