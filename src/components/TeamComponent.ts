/**
 * @file TeamComponent.ts
 * @description Team component implementation using manager-based architecture
 */

import { TeamManager } from '../managers/domain/team/teamManager';
import { TeamEventEmitter } from '../managers/domain/team/teamEventEmitter';
import { TeamEventType, type TeamEvent } from '../types/team/teamEventTypes';
import { createError } from '../types/common/commonErrorTypes';
import { createValidationResult } from '../utils/validation/validationUtils';
import type { ITeamState, ITeamStoreMethods } from '../types/team/teamBaseTypes';
import type { IEventHandler } from '../types/common/commonEventTypes';
import type { IValidationResult } from '../types/common/commonValidationTypes';
import { WORKFLOW_STATUS_enum } from '../types/common/commonEnums';

export class TeamComponent {
    private readonly teamManager: TeamManager & ITeamStoreMethods;
    private readonly eventEmitter: TeamEventEmitter;
    private state: ITeamState;
    private readonly eventHandlers: Map<TeamEventType, Set<IEventHandler<TeamEvent>>>;

    constructor() {
        this.teamManager = TeamManager.getInstance() as TeamManager & ITeamStoreMethods;
        this.eventEmitter = TeamEventEmitter.getInstance();
        this.state = this.teamManager.getState();
        this.eventHandlers = new Map();
        this.initializeEventHandlers();
    }

    // ─── Event Subscription ─────────────────────────────────────────────────

    private initializeEventHandlers(): void {
        // Create event handlers
        const handlers = new Map<TeamEventType, IEventHandler<TeamEvent>>([
            [TeamEventType.WORKFLOW_START, this.createEventHandler(this.handleWorkflowStart.bind(this))],
            [TeamEventType.WORKFLOW_STOP, this.createEventHandler(this.handleWorkflowStop.bind(this))],
            [TeamEventType.WORKFLOW_ERROR, this.createEventHandler(this.handleWorkflowError.bind(this))],
            [TeamEventType.AGENT_STATUS_CHANGE, this.createEventHandler(this.handleAgentStatusChange.bind(this))],
            [TeamEventType.AGENT_ERROR, this.createEventHandler(this.handleAgentError.bind(this))],
            [TeamEventType.TASK_STATUS_CHANGE, this.createEventHandler(this.handleTaskStatusChange.bind(this))],
            [TeamEventType.TASK_ERROR, this.createEventHandler(this.handleTaskError.bind(this))],
            [TeamEventType.TASK_BLOCKED, this.createEventHandler(this.handleTaskBlocked.bind(this))],
            [TeamEventType.FEEDBACK_PROVIDED, this.createEventHandler(this.handleFeedbackProvided.bind(this))]
        ]);

        // Subscribe handlers
        handlers.forEach((handler, eventType) => {
            this.eventEmitter.on(eventType, handler);
        });
    }

    private createEventHandler(
        handleFn: (event: TeamEvent) => Promise<void>
    ): IEventHandler<TeamEvent> {
        return {
            handle: handleFn,
            validate: async (event: TeamEvent): Promise<IValidationResult> => {
                return createValidationResult(true, []);
            }
        };
    }

    public subscribe(eventType: TeamEventType, handler: IEventHandler<TeamEvent>): () => void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.eventHandlers.get(eventType);
            if (handlers) {
                handlers.delete(handler);
            }
        };
    }

    private notifyHandlers(eventType: TeamEventType, event: TeamEvent): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.forEach(handler => handler.handle(event));
        }
    }

    // ─── Workflow Event Handlers ────────────────────────────────────────────

    private async handleWorkflowStart(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.WORKFLOW_START) return;

        try {
            await this.teamManager.startWorkflow();
            this.notifyHandlers(TeamEventType.WORKFLOW_START, event);
        } catch (error) {
            this.handleError('Failed to start workflow', error);
        }
    }

    private async handleWorkflowStop(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.WORKFLOW_STOP) return;

        try {
            await this.teamManager.stopWorkflow();
            this.notifyHandlers(TeamEventType.WORKFLOW_STOP, event);
        } catch (error) {
            this.handleError('Failed to stop workflow', error);
        }
    }

    private async handleWorkflowError(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.WORKFLOW_ERROR) return;

        try {
            await this.teamManager.handleWorkflowError();
            this.notifyHandlers(TeamEventType.WORKFLOW_ERROR, event);
        } catch (error) {
            this.handleError('Failed to handle workflow error', error);
        }
    }

    // ─── Agent Event Handlers ──────────────────────────────────────────────

    private async handleAgentStatusChange(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.AGENT_STATUS_CHANGE) return;

        try {
            await this.teamManager.handleAgentStatusChange();
            this.notifyHandlers(TeamEventType.AGENT_STATUS_CHANGE, event);
        } catch (error) {
            this.handleError('Failed to handle agent status change', error);
        }
    }

    private async handleAgentError(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.AGENT_ERROR) return;

        try {
            await this.teamManager.handleAgentError();
            this.notifyHandlers(TeamEventType.AGENT_ERROR, event);
        } catch (error) {
            this.handleError('Failed to handle agent error', error);
        }
    }

    // ─── Task Event Handlers ───────────────────────────────────────────────

    private async handleTaskStatusChange(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.TASK_STATUS_CHANGE) return;

        try {
            await this.teamManager.handleTaskStatusChange();
            this.notifyHandlers(TeamEventType.TASK_STATUS_CHANGE, event);
        } catch (error) {
            this.handleError('Failed to handle task status change', error);
        }
    }

    private async handleTaskError(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.TASK_ERROR) return;

        try {
            await this.teamManager.handleTaskError();
            this.notifyHandlers(TeamEventType.TASK_ERROR, event);
        } catch (error) {
            this.handleError('Failed to handle task error', error);
        }
    }

    private async handleTaskBlocked(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.TASK_BLOCKED) return;

        try {
            await this.teamManager.handleTaskBlocked();
            this.notifyHandlers(TeamEventType.TASK_BLOCKED, event);
        } catch (error) {
            this.handleError('Failed to handle task blocked', error);
        }
    }

    // ─── Feedback Event Handlers ────────────────────────────────────────────

    private async handleFeedbackProvided(event: TeamEvent): Promise<void> {
        if (event.type !== TeamEventType.FEEDBACK_PROVIDED) return;

        try {
            await this.teamManager.provideFeedback();
            this.notifyHandlers(TeamEventType.FEEDBACK_PROVIDED, event);
        } catch (error) {
            this.handleError('Failed to handle feedback', error);
        }
    }

    // ─── Error Handling ────────────────────────────────────────────────────

    private handleError(message: string, error: unknown): void {
        const kaibanError = createError({
            message,
            type: 'SystemError',
            context: {
                component: 'TeamComponent',
                originalError: error instanceof Error ? error : undefined
            }
        });
        throw kaibanError;
    }

    // ─── Cleanup ───────────────────────────────────────────────────────────

    public dispose(): void {
        // Clear all event handlers
        this.eventHandlers.clear();

        // Get all handlers
        const handlers = new Map<TeamEventType, IEventHandler<TeamEvent>>([
            [TeamEventType.WORKFLOW_START, this.createEventHandler(this.handleWorkflowStart.bind(this))],
            [TeamEventType.WORKFLOW_STOP, this.createEventHandler(this.handleWorkflowStop.bind(this))],
            [TeamEventType.WORKFLOW_ERROR, this.createEventHandler(this.handleWorkflowError.bind(this))],
            [TeamEventType.AGENT_STATUS_CHANGE, this.createEventHandler(this.handleAgentStatusChange.bind(this))],
            [TeamEventType.AGENT_ERROR, this.createEventHandler(this.handleAgentError.bind(this))],
            [TeamEventType.TASK_STATUS_CHANGE, this.createEventHandler(this.handleTaskStatusChange.bind(this))],
            [TeamEventType.TASK_ERROR, this.createEventHandler(this.handleTaskError.bind(this))],
            [TeamEventType.TASK_BLOCKED, this.createEventHandler(this.handleTaskBlocked.bind(this))],
            [TeamEventType.FEEDBACK_PROVIDED, this.createEventHandler(this.handleFeedbackProvided.bind(this))]
        ]);

        // Unsubscribe handlers
        handlers.forEach((handler, eventType) => {
            this.eventEmitter.off(eventType, handler);
        });
    }
}

export default TeamComponent;
