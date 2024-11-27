/**
 * @file teamEventEmitter.ts
 * @path src/managers/domain/team/teamEventEmitter.ts
 * @description Team event emitter implementation
 */

import { CoreManager } from '../../core/coreManager';
import { BaseEventEmitter } from '../../core/eventEmitter';
import { TeamMetricsManager } from './teamMetricsManager';
import { createValidationResult } from '../../../utils/validation/validationUtils';
import { 
    TeamEventType, 
    type TeamEvent,
    type IWorkflowStartEvent,
    type IWorkflowStopEvent,
    type IWorkflowErrorEvent,
    type IAgentStatusChangeEvent,
    type IAgentErrorEvent,
    type ITaskStatusChangeEvent,
    type ITaskErrorEvent,
    type ITaskBlockedEvent,
    type IFeedbackProvidedEvent
} from '../../../types/team/teamEventTypes';
import type { ITeamState, ITeamHandlerMetadata } from '../../../types/team/teamBaseTypes';
import type { IWorkflowResult } from '../../../types/workflow/workflowBaseTypes';
import type { IErrorMetadata } from '../../../types/common/commonMetadataTypes';
import type { IEventHandler } from '../../../types/common/commonEventTypes';
import type { IValidationResult } from '../../../types/common/commonValidationTypes';
import { WORKFLOW_STATUS_enum, AGENT_STATUS_enum, TASK_STATUS_enum } from '../../../types/common/commonEnums';

export class TeamEventEmitter extends CoreManager {
    protected static _instance: TeamEventEmitter;
    private readonly eventEmitter: BaseEventEmitter;
    private readonly metricsManager: TeamMetricsManager;

    protected constructor() {
        super();
        this.eventEmitter = BaseEventEmitter.getInstance();
        this.metricsManager = TeamMetricsManager.getInstance();
        this.registerDomainManager('TeamEventEmitter', this);
    }

    public static override getInstance(): TeamEventEmitter {
        if (!TeamEventEmitter._instance) {
            TeamEventEmitter._instance = new TeamEventEmitter();
        }
        return TeamEventEmitter._instance;
    }

    // ─── Event Emission Methods ────────────────────────────────────────────────────

    async emitWorkflowStart(workflowId: string, config: Record<string, unknown>): Promise<void> {
        const metadata = await this.createTeamMetadata('workflow_start', workflowId);
        const event: IWorkflowStartEvent = {
            id: workflowId,
            timestamp: Date.now(),
            type: TeamEventType.WORKFLOW_START,
            metadata,
            payload: { workflowId, config }
        };
        await this.emit(event);
    }

    async emitWorkflowStop(workflowId: string, result: IWorkflowResult): Promise<void> {
        const metadata = await this.createTeamMetadata('workflow_stop', workflowId);
        const event: IWorkflowStopEvent = {
            id: workflowId,
            timestamp: Date.now(),
            type: TeamEventType.WORKFLOW_STOP,
            metadata,
            payload: { workflowId, result }
        };
        await this.emit(event);
    }

    async emitWorkflowError(workflowId: string, error: IErrorMetadata): Promise<void> {
        const metadata = await this.createTeamMetadata('workflow_error', workflowId);
        const event: IWorkflowErrorEvent = {
            id: workflowId,
            timestamp: Date.now(),
            type: TeamEventType.WORKFLOW_ERROR,
            metadata,
            payload: { workflowId, error }
        };
        await this.emit(event);
    }

    async emitAgentStatusChange(
        agentId: string,
        previousStatus: AGENT_STATUS_enum,
        newStatus: AGENT_STATUS_enum
    ): Promise<void> {
        const metadata = await this.createTeamMetadata('agent_status_change', agentId);
        const event: IAgentStatusChangeEvent = {
            id: agentId,
            timestamp: Date.now(),
            type: TeamEventType.AGENT_STATUS_CHANGE,
            metadata,
            payload: {
                agentId,
                previousStatus: previousStatus.toString(),
                newStatus: newStatus.toString(),
                timestamp: Date.now()
            }
        };
        await this.emit(event);
    }

    async emitAgentError(agentId: string, error: IErrorMetadata): Promise<void> {
        const metadata = await this.createTeamMetadata('agent_error', agentId);
        const event: IAgentErrorEvent = {
            id: agentId,
            timestamp: Date.now(),
            type: TeamEventType.AGENT_ERROR,
            metadata,
            payload: { agentId, error }
        };
        await this.emit(event);
    }

    async emitTaskStatusChange(
        taskId: string,
        previousStatus: TASK_STATUS_enum,
        newStatus: TASK_STATUS_enum
    ): Promise<void> {
        const metadata = await this.createTeamMetadata('task_status_change', taskId);
        const event: ITaskStatusChangeEvent = {
            id: taskId,
            timestamp: Date.now(),
            type: TeamEventType.TASK_STATUS_CHANGE,
            metadata,
            payload: {
                taskId,
                previousStatus: previousStatus.toString(),
                newStatus: newStatus.toString(),
                timestamp: Date.now()
            }
        };
        await this.emit(event);
    }

    async emitTaskError(taskId: string, error: IErrorMetadata): Promise<void> {
        const metadata = await this.createTeamMetadata('task_error', taskId);
        const event: ITaskErrorEvent = {
            id: taskId,
            timestamp: Date.now(),
            type: TeamEventType.TASK_ERROR,
            metadata,
            payload: { taskId, error }
        };
        await this.emit(event);
    }

    async emitTaskBlocked(taskId: string, reason: string): Promise<void> {
        const metadata = await this.createTeamMetadata('task_blocked', taskId);
        const event: ITaskBlockedEvent = {
            id: taskId,
            timestamp: Date.now(),
            type: TeamEventType.TASK_BLOCKED,
            metadata,
            payload: { taskId, reason }
        };
        await this.emit(event);
    }

    async emitFeedbackProvided(
        targetId: string,
        targetType: 'agent' | 'task' | 'workflow',
        content: string,
        rating?: number
    ): Promise<void> {
        const metadata = await this.createTeamMetadata('feedback_provided', targetId);
        const event: IFeedbackProvidedEvent = {
            id: targetId,
            timestamp: Date.now(),
            type: TeamEventType.FEEDBACK_PROVIDED,
            metadata,
            payload: {
                feedbackId: targetId,
                targetId,
                targetType,
                content,
                rating,
                timestamp: Date.now()
            }
        };
        await this.emit(event);
    }

    // ─── Core Event Methods ─────────────────────────────────────────────────────

    async emit(event: TeamEvent): Promise<void> {
        try {
            const validation = await this.validateEvent(event);
            if (!validation.isValid) {
                const message = `Invalid event: ${validation.errors.join(', ')}`;
                this.logError(message);
                throw new Error(message);
            }

            await this.eventEmitter.emit(event);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error during event emission';
            this.logError(message);
            throw error;
        }
    }

    on<T extends TeamEvent>(eventType: TeamEventType, handler: IEventHandler<T>): void {
        try {
            this.eventEmitter.on(eventType, handler);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error during handler registration';
            this.logError(message);
            throw error;
        }
    }

    off<T extends TeamEvent>(eventType: TeamEventType, handler: IEventHandler<T>): void {
        try {
            this.eventEmitter.off(eventType, handler);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error during handler removal';
            this.logError(message);
            throw error;
        }
    }

    // ─── Helper Methods ─────────────────────────────────────────────────────────

    protected async createTeamMetadata(operation: string, entityId: string): Promise<ITeamHandlerMetadata> {
        const metrics = this.metricsManager.getTeamPerformance(entityId);
        const timestamp = Date.now();

        return {
            source: 'TeamEventEmitter',
            target: operation,
            timestamp,
            correlationId: timestamp.toString(),
            causationId: timestamp.toString(),
            component: 'TeamEventEmitter',
            operation,
            context: {
                teamId: entityId,
                timestamp
            },
            validation: createValidationResult(true, []),
            teamId: entityId,
            teamName: entityId,
            agentCount: Object.keys(metrics?.resourceUtilization?.diskIO || {}).length,
            taskCount: Object.keys(metrics?.resourceUtilization?.networkUsage || {}).length,
            workflowStatus: metrics?.resourceUtilization?.cpuUsage ? 'active' : 'inactive',
            performance: metrics || {
                executionTime: { total: 0, average: 0, min: 0, max: 0 },
                throughput: { operationsPerSecond: 0, dataProcessedPerSecond: 0 },
                errorMetrics: { totalErrors: 0, errorRate: 0 },
                resourceUtilization: {
                    cpuUsage: 0,
                    memoryUsage: 0,
                    diskIO: { read: 0, write: 0 },
                    networkUsage: { upload: 0, download: 0 },
                    timestamp
                },
                timestamp,
                agentUtilization: 0,
                taskCompletion: 0
            }
        };
    }

    protected validateEvent(event: TeamEvent): IValidationResult {
        const errors: string[] = [];

        if (!event.id || typeof event.id !== 'string') {
            errors.push('Invalid event ID');
        }
        if (!event.timestamp || typeof event.timestamp !== 'number') {
            errors.push('Invalid event timestamp');
        }
        if (!event.type || !Object.values(TeamEventType).includes(event.type)) {
            errors.push('Invalid event type');
        }
        if (!event.metadata || typeof event.metadata !== 'object') {
            errors.push('Invalid event metadata');
        }

        return createValidationResult(errors.length === 0, errors);
    }
}

export default TeamEventEmitter.getInstance();
