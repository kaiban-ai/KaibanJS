/**
 * @file teamManager.ts
 * @description Team management implementation providing centralized access to all managers
 */

import { CoreManager } from '../../core/coreManager';
import { MetadataFactory } from '../../../utils/factories/metadataFactory';
import { WORKFLOW_STATUS_enum, TASK_STATUS_enum, AGENT_STATUS_enum } from '../../../types/common/commonEnums';
import { createError, toErrorType } from '../../../types/common/commonErrorTypes';

import type { ITeamState, ITeamInputs } from '../../../types/team/teamBaseTypes';
import type { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import type { IBaseHandlerMetadata } from '../../../types/common/commonMetadataTypes';
import type { IAgentType } from '../../../types/agent/agentBaseTypes';
import type { ITaskType } from '../../../types/task/taskBaseTypes';
import type { AgentManager } from '../agent/agentManager';
import type { TaskManager } from '../task/taskManager';
import type { IStatusType, IStatusTransitionContext } from '../../../types/common/commonStatusTypes';

export class TeamManager extends CoreManager {
    private static instance: TeamManager | null = null;
    private readonly agentManager: AgentManager;
    private readonly taskManager: TaskManager;

    private constructor() {
        super();
        this.registerDomainManager('TeamManager', this);
        this.agentManager = this.getDomainManager<AgentManager>('AgentManager');
        this.taskManager = this.getDomainManager<TaskManager>('TaskManager');
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
        inputs?: ITeamInputs
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            if (state.teamWorkflowStatus !== WORKFLOW_STATUS_enum.INITIAL) {
                throw createError({
                    message: 'Workflow already started',
                    type: 'WorkflowError'
                });
            }

            return MetadataFactory.createSuccessResult({
                status: WORKFLOW_STATUS_enum.RUNNING,
                inputs
            });
        }, 'startWorkflow');
    }

    public async stopWorkflow(
        reason?: string
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            return MetadataFactory.createSuccessResult({
                status: WORKFLOW_STATUS_enum.STOPPED,
                reason
            });
        }, 'stopWorkflow');
    }

    public async handleWorkflowError(
        error: Error,
        context: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const kaibanError = createError({
                message: error.message,
                type: 'WorkflowError',
                context
            });

            return {
                success: false,
                error: toErrorType(kaibanError),
                metadata: MetadataFactory.createErrorMetadata(error)
            };
        }, 'handleWorkflowError');
    }

    // ─── Task Management ───────────────────────────────────────────────────

    public async handleTaskStatusChange(
        taskId: string,
        status: IStatusType,
        metadata?: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const transitionContext: IStatusTransitionContext = {
                currentStatus: status,
                targetStatus: status,
                entity: 'task',
                entityId: taskId,
                metadata: this.prepareMetadata(metadata)
            };

            await this.handleStatusTransition(transitionContext);

            return MetadataFactory.createSuccessResult({
                taskId,
                status,
                metadata
            });
        }, 'handleTaskStatusChange');
    }

    public async handleTaskError(
        task: ITaskType,
        error: Error,
        context?: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            await this.handleInternalTaskError(task, error);
            
            const agent = task.agent;
            if (agent) {
                await this.handleInternalAgentError(agent, error, 'Task execution error');
            }

            return MetadataFactory.createErrorResult(error);
        }, 'handleTaskError');
    }

    protected async handleInternalTaskError(task: ITaskType, error: Error): Promise<void> {
        const transitionContext: IStatusTransitionContext = {
            currentStatus: task.status as IStatusType,
            targetStatus: TASK_STATUS_enum.ERROR,
            entity: 'task',
            entityId: task.id,
            task,
            metadata: this.prepareMetadata({ error })
        };

        await this.handleStatusTransition(transitionContext);
    }

    public async handleTaskBlocked(
        taskId: string,
        reason: string
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const transitionContext: IStatusTransitionContext = {
                currentStatus: TASK_STATUS_enum.DOING,
                targetStatus: TASK_STATUS_enum.BLOCKED,
                entity: 'task',
                entityId: taskId,
                metadata: this.prepareMetadata({ reason })
            };

            await this.handleStatusTransition(transitionContext);

            return MetadataFactory.createSuccessResult({
                taskId,
                reason
            });
        }, 'handleTaskBlocked');
    }

    // ─── Agent Management ──────────────────────────────────────────────────

    public async handleAgentStatusChange(
        agent: IAgentType,
        status: IStatusType,
        task?: ITaskType
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const transitionContext: IStatusTransitionContext = {
                currentStatus: agent.status as IStatusType,
                targetStatus: status,
                entity: 'agent',
                entityId: agent.id,
                agent,
                task,
                metadata: this.prepareMetadata({ task })
            };

            await this.handleStatusTransition(transitionContext);

            return MetadataFactory.createSuccessResult({
                agentId: agent.id,
                status,
                task: task?.id
            });
        }, 'handleAgentStatusChange');
    }

    protected async handleInternalAgentError(
        agent: IAgentType,
        error: Error,
        context: string
    ): Promise<void> {
        const transitionContext: IStatusTransitionContext = {
            currentStatus: agent.status as IStatusType,
            targetStatus: AGENT_STATUS_enum.AGENTIC_LOOP_ERROR,
            entity: 'agent',
            entityId: agent.id,
            agent,
            metadata: this.prepareMetadata({ error, context })
        };

        await this.handleStatusTransition(transitionContext);
    }

    public async handleAgentError(
        params: {
            agent: IAgentType;
            task?: ITaskType;
            error: Error;
            context?: Record<string, unknown>;
        }
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            const { agent, error } = params;
            await this.handleInternalAgentError(
                agent,
                error,
                'Agent execution error'
            );

            return MetadataFactory.createErrorResult(error);
        }, 'handleAgentError');
    }

    // ─── Feedback Management ────────────────────────────────────────────────

    public async provideFeedback(
        taskId: string,
        feedback: string,
        metadata?: Record<string, unknown>
    ): Promise<IHandlerResult<unknown, IBaseHandlerMetadata>> {
        return await this.safeExecute(async () => {
            return MetadataFactory.createSuccessResult({
                taskId,
                feedback,
                metadata: this.prepareMetadata(metadata)
            });
        }, 'provideFeedback');
    }
}

export default TeamManager;
