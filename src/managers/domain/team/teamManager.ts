/**
 * @file teamManager.ts
 * @description Team management implementation providing centralized access to all managers
 */

import { CoreManager } from '../../core/coreManager';
import { TeamEventEmitter } from './teamEventEmitter';
import { TeamMetricsManager } from './teamMetricsManager';
import { TeamStateManager } from './teamStateManager';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum, ERROR_SEVERITY_enum, MANAGER_CATEGORY_enum } from '../../../types/common/enumTypes';
import { ERROR_KINDS, createError, createErrorMetadata } from '../../../types/common/errorTypes';
import type { IErrorContext } from '../../../types/common/errorTypes';

import type { ITeamState } from '../../../types/team/teamBaseTypes';
import type { IHandlerResult } from '../../../types/common/baseTypes';
import type { IBaseHandlerMetadata } from '../../../types/common/baseTypes';
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { IStatusType } from '../../../types/common/statusTypes';
import type { IWorkflowStopped } from '../../../types/workflow/workflowBaseTypes';
import type { IWorkflowStats } from '../../../types/workflow/workflowStatsTypes';

export class TeamManager extends CoreManager {
    private static instance: TeamManager | null = null;
    private readonly teamEventEmitter: TeamEventEmitter;
    private readonly teamMetricsManager: TeamMetricsManager;
    private readonly teamStateManager: TeamStateManager;
    public readonly category = MANAGER_CATEGORY_enum.EXECUTION;

    private constructor() {
        super();
        this.registerDomainManager('TeamManager', this);
        this.teamEventEmitter = TeamEventEmitter.getInstance();
        this.teamMetricsManager = TeamMetricsManager.getInstance();
        this.teamStateManager = TeamStateManager.getInstance();
    }

    public static getInstance(): TeamManager {
        if (!TeamManager.instance) {
            TeamManager.instance = new TeamManager();
        }
        return TeamManager.instance;
    }

    // ─── Workflow Management ─────────────────────────────────────────────────

    public async startWorkflow(
        state: ITeamState,
        inputs?: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            if (state.teamWorkflowStatus !== WORKFLOW_STATUS_enum.INITIAL) {
                throw createError({
                    message: 'Workflow already started',
                    type: ERROR_KINDS.ValidationError,
                    metadata: createErrorMetadata({
                        component: this.constructor.name,
                        operation: 'startWorkflow'
                    })
                });
            }

            // Update state
            await this.teamStateManager.updateState({
                ...state,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING,
                inputs: inputs || {}
            });

            // Emit event
            await this.teamEventEmitter.emitWorkflowStart(state.name, inputs || {});

            return {
                success: true,
                metadata: await this.teamMetricsManager.getTeamPerformance(state.name)
            };
        }, 'startWorkflow');
    }

    public async stopWorkflow(
        reason?: string
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const currentState = this.teamStateManager.getCurrentState();
            const now = Date.now();
            const stats: IWorkflowStats = {
                llmUsageMetrics: {
                    totalRequests: 0,
                    activeUsers: 0,
                    activeInstances: 0,
                    requestsPerSecond: 0,
                    averageResponseSize: 0,
                    peakMemoryUsage: 0,
                    uptime: 0,
                    rateLimit: {
                        current: 0,
                        limit: 0,
                        remaining: 0,
                        resetTime: 0
                    },
                    tokenDistribution: {
                        prompt: 0,
                        completion: 0,
                        total: 0
                    },
                    modelDistribution: {
                        gpt4: 0,
                        gpt35: 0,
                        other: 0
                    },
                    timestamp: now
                },
                iterationCount: 0,
                duration: now - (currentState.workflowResult?.metadata?.duration || now)
            };

            const stoppedState: IWorkflowStopped = {
                status: 'STOPPED',
                reason: reason || 'Manual stop',
                metadata: stats,
                stoppedAt: now
            };

            // Update state
            await this.teamStateManager.updateState({
                ...currentState,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
                workflowResult: stoppedState
            });

            // Emit event
            await this.teamEventEmitter.emitWorkflowStop(currentState.name, stoppedState);

            return {
                success: true,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        }, 'stopWorkflow');
    }

    public async handleWorkflowError(
        error: Error,
        context: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        const currentState = this.teamStateManager.getCurrentState();

        try {
            const now = Date.now();
            
            // Create error context
            const errorContext: IErrorContext = {
                component: this.constructor.name,
                operation: 'handleWorkflowError',
                error,
                severity: ERROR_SEVERITY_enum.ERROR,
                recoverable: true,
                retryCount: 0,
                failureReason: error.message,
                recommendedAction: 'Check workflow configuration',
                details: context,
                timestamp: now
            };

            // Update state
            await this.teamStateManager.updateState({
                ...currentState,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.ERRORED
            });

            // Emit error event
            await this.teamEventEmitter.emitWorkflowError(currentState.name, {
                error: errorContext,
                timestamp: now,
                context
            });

            // Handle error through core manager
            await this.handleError(error, 'Workflow error', ERROR_KINDS.ExecutionError);

            return {
                success: false,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        } catch (handlingError) {
            // If error handling fails, try to restore last good state
            const snapshot = await this.teamStateManager.getLatestSnapshot();
            if (snapshot?.data) {
                await this.teamStateManager.restoreSnapshot(snapshot.data);
            }

            throw handlingError;
        }
    }

    // ─── Task Management ───────────────────────────────────────────────────

    public async handleTaskStatusChange(
        taskId: string,
        status: IStatusType,
        metadata?: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const currentState = this.teamStateManager.getCurrentState();

            await this.handleStatusTransition({
                entity: 'task',
                entityId: taskId,
                currentStatus: status,
                targetStatus: status,
                ...(metadata ? { context: metadata } : {})
            });

            // Emit event
            await this.teamEventEmitter.emitTaskStatusChange(taskId, status, status);

            return {
                success: true,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        }, 'handleTaskStatusChange');
    }

    public async handleTaskError(
        task: ITaskType,
        error: Error,
        context?: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        const currentState = this.teamStateManager.getCurrentState();

        try {
            const now = Date.now();
            
            // Create error context
            const errorContext: IErrorContext = {
                component: this.constructor.name,
                operation: 'handleTaskError',
                error,
                severity: ERROR_SEVERITY_enum.ERROR,
                recoverable: true,
                retryCount: 0,
                failureReason: error.message,
                recommendedAction: 'Check task configuration',
                details: {
                    taskId: task.id,
                    ...context
                },
                timestamp: now
            };

            // Update task status
            await this.handleTaskStatusChange(task.id, TASK_STATUS_enum.ERROR);

            // Emit error event
            await this.teamEventEmitter.emitTaskError(task.id, {
                error: errorContext,
                timestamp: now,
                context
            });

            // Handle error through core manager
            await this.handleError(error, 'Task error', ERROR_KINDS.ExecutionError);

            return {
                success: false,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        } catch (handlingError) {
            // If error handling fails, try to restore last good state
            const snapshot = await this.teamStateManager.getLatestSnapshot();
            if (snapshot?.data) {
                await this.teamStateManager.restoreSnapshot(snapshot.data);
            }

            throw handlingError;
        }
    }

    public async handleTaskBlocked(
        taskId: string,
        reason: string
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const currentState = this.teamStateManager.getCurrentState();

            // Update task status
            await this.handleTaskStatusChange(taskId, TASK_STATUS_enum.BLOCKED);

            // Emit event
            await this.teamEventEmitter.emitTaskBlocked(taskId, reason);

            return {
                success: true,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        }, 'handleTaskBlocked');
    }

    // ─── Agent Management ──────────────────────────────────────────────────

    public async handleAgentStatusChange(
        agent: IAgentType,
        status: IStatusType,
        task?: ITaskType
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const currentState = this.teamStateManager.getCurrentState();

            await this.handleStatusTransition({
                entity: 'agent',
                entityId: agent.id,
                currentStatus: agent.status as IStatusType,
                targetStatus: status,
                ...(task ? { context: { task } } : {})
            });

            // Emit event
            await this.teamEventEmitter.emitAgentStatusChange(
                agent.id,
                agent.status as AGENT_STATUS_enum,
                status as AGENT_STATUS_enum
            );

            return {
                success: true,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        }, 'handleAgentStatusChange');
    }

    public async handleAgentError(
        params: {
            agent: IAgentType;
            task?: ITaskType;
            error: Error;
            context?: Record<string, unknown>;
        }
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        const { agent, task, error, context } = params;
        const currentState = this.teamStateManager.getCurrentState();

        try {
            const now = Date.now();
            
            // Create error context
            const errorContext: IErrorContext = {
                component: this.constructor.name,
                operation: 'handleAgentError',
                error,
                severity: ERROR_SEVERITY_enum.ERROR,
                recoverable: true,
                retryCount: 0,
                failureReason: error.message,
                recommendedAction: 'Check agent configuration',
                details: {
                    agentId: agent.id,
                    taskId: task?.id,
                    ...context
                },
                timestamp: now
            };

            // Update agent status
            await this.handleAgentStatusChange(agent, AGENT_STATUS_enum.AGENTIC_LOOP_ERROR);

            // Emit error event
            await this.teamEventEmitter.emitAgentError(agent.id, {
                error: errorContext,
                timestamp: now,
                context
            });

            // Handle error through core manager
            await this.handleError(error, 'Agent error', ERROR_KINDS.AgentError);

            return {
                success: false,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        } catch (handlingError) {
            // If error handling fails, try to restore last good state
            const snapshot = await this.teamStateManager.getLatestSnapshot();
            if (snapshot?.data) {
                await this.teamStateManager.restoreSnapshot(snapshot.data);
            }

            throw handlingError;
        }
    }

    // ─── Feedback Management ────────────────────────────────────────────────

    public async provideFeedback(
        taskId: string,
        feedback: string,
        _metadata?: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const currentState = this.teamStateManager.getCurrentState();

            // Emit event
            await this.teamEventEmitter.emitFeedbackProvided(taskId, 'task', feedback);

            return {
                success: true,
                metadata: await this.teamMetricsManager.getTeamPerformance(currentState.name)
            };
        }, 'provideFeedback');
    }
}

export default TeamManager.getInstance();
