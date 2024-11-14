/**
 * @file WorkflowManager.ts
 * @path KaibanJS/src/managers/domain/workflow/WorkflowManager.ts
 * @description Domain manager for workflow orchestration and execution
 */

import CoreManager from '../../core/CoreManager';
import { AgentManager } from '../agent/AgentManager';
import { TaskManager } from '../task/TaskManager';
import { TeamManager } from '../team/TeamManager';
import { LogCreator } from '@/utils/factories/logCreator';
import { MetadataFactory } from '@/utils/factories/metadataFactory';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

// Core utilities
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';

// Import types from canonical locations
import type { 
    AgentType,
    TaskType,
    FeedbackObject
} from '@/utils/types';

import type {
    TeamState,
    TeamStore,
    TeamWorkflow,
    WorkflowConfig,
    WorkflowStats,
    WorkflowStep,
    WorkflowResult
} from '@/utils/types/team';

import type {
    StatusTransitionContext,
    StatusValidationResult
} from '@/utils/types/common/status';

import { WORKFLOW_STATUS_enum } from '@/utils/types/common/enums';

// ─── Workflow Manager Implementation ──────────────────────────────────────────

export class WorkflowManager extends CoreManager {
    private static instance: WorkflowManager;
    private store: TeamStore;
    private teamManager: TeamManager;
    private agentManager: AgentManager;
    private taskManager: TaskManager;
    private workflows: Map<string, TeamWorkflow>;
    private workflowStats: Map<string, WorkflowStats>;
    private executionQueue: WorkflowStep[];

    private constructor(store: TeamStore) {
        super();
        this.store = store;
        this.teamManager = TeamManager.getInstance(store);
        this.agentManager = AgentManager.getInstance(store);
        this.taskManager = TaskManager.getInstance(store);
        this.workflows = new Map();
        this.workflowStats = new Map();
        this.executionQueue = [];
    }

    // ─── Singleton Access ─────────────────────────────────────────────────────

    public static getInstance(store: TeamStore): WorkflowManager {
        if (!WorkflowManager.instance) {
            WorkflowManager.instance = new WorkflowManager(store);
        }
        return WorkflowManager.instance;
    }

    // ─── Workflow Configuration ─────────────────────────────────────────────────

    public async configureWorkflow(config: WorkflowConfig): Promise<TeamWorkflow> {
        try {
            const workflow = DefaultFactory.createWorkflow(config);
            this.workflows.set(workflow.id, workflow);
            this.workflowStats.set(workflow.id, DefaultFactory.createWorkflowStats());

            const log = LogCreator.createWorkflowLog(
                'Workflow configured',
                WORKFLOW_STATUS_enum.INITIAL,
                MetadataFactory.forWorkflow(
                    await this.store.getState(),
                    DefaultFactory.createWorkflowStats(),
                    { workflowId: workflow.id, config }
                )
            );

            this.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));

            return workflow;

        } catch (error) {
            throw new PrettyError({
                message: 'Failed to configure workflow',
                context: { config },
                rootError: error instanceof Error ? error : undefined
            });
        }
    }

    // ─── Workflow Execution ────────────────────────────────────────────────────

    public async startWorkflow(workflowId: string): Promise<void> {
        try {
            const workflow = this.workflows.get(workflowId);
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            await this.teamManager.startWorkflow(workflow);
            this.executionQueue = [...workflow.steps];

            await this.processNextStep(workflowId);

        } catch (error) {
            throw new PrettyError({
                message: 'Failed to start workflow',
                context: { workflowId },
                rootError: error instanceof Error ? error : undefined
            });
        }
    }

    public async stopWorkflow(
        workflowId: string,
        reason: string = 'Manual stop'
    ): Promise<void> {
        try {
            await this.teamManager.stopWorkflow(workflowId);
            this.executionQueue = [];

            const log = LogCreator.createWorkflowLog(
                `Workflow stopped: ${reason}`,
                WORKFLOW_STATUS_enum.STOPPED,
                MetadataFactory.forWorkflow(
                    await this.store.getState(),
                    this.workflowStats.get(workflowId) || DefaultFactory.createWorkflowStats(),
                    { workflowId, reason }
                )
            );

            this.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));

        } catch (error) {
            throw new PrettyError({
                message: 'Failed to stop workflow',
                context: { workflowId, reason },
                rootError: error instanceof Error ? error : undefined
            });
        }
    }

    // ─── Step Processing ──────────────────────────────────────────────────────

    private async processNextStep(workflowId: string): Promise<void> {
        if (this.executionQueue.length === 0) {
            await this.completeWorkflow(workflowId);
            return;
        }

        const step = this.executionQueue.shift();
        if (!step) return;

        try {
            const log = LogCreator.createWorkflowLog(
                `Processing step: ${step.name}`,
                WORKFLOW_STATUS_enum.RUNNING,
                MetadataFactory.forWorkflow(
                    await this.store.getState(),
                    this.workflowStats.get(workflowId) || DefaultFactory.createWorkflowStats(),
                    { workflowId, step }
                )
            );

            this.store.setState(state => ({
                workflowLogs: [...state.workflowLogs, log]
            }));

            const task = await this.taskManager.createTask({
                title: step.name,
                description: step.description,
                priority: step.priority,
                dependencies: step.dependencies
            });

            if (step.assignedAgent) {
                await this.taskManager.assignTask(task, step.assignedAgent);
                await this.taskManager.startTask(task);
            } else {
                this.taskManager.queueTask(task);
            }

            // Continue with next step after task completion
            task.onComplete = () => this.processNextStep(workflowId);

        } catch (error) {
            throw new PrettyError({
                message: 'Failed to process workflow step',
                context: { workflowId, step },
                rootError: error instanceof Error ? error : undefined
            });
        }
    }

    private async completeWorkflow(workflowId: string): Promise<void> {
        try {
            const stats = this.workflowStats.get(workflowId);
            if (!stats) return;

            const result: WorkflowResult = {
                status: 'completed',
                completedAt: Date.now(),
                duration: Date.now() - stats.startTime,
                stats
            };

            const log = LogCreator.createWorkflowLog(
                'Workflow completed',
                WORKFLOW_STATUS_enum.FINISHED,
                MetadataFactory.forWorkflow(
                    await this.store.getState(),
                    stats,
                    { workflowId, result }
                )
            );

            this.store.setState(state => ({
                workflowResult: result,
                workflowLogs: [...state.workflowLogs, log]
            }));

            this.workflows.delete(workflowId);
            this.workflowStats.delete(workflowId);

        } catch (error) {
            throw new PrettyError({
                message: 'Failed to complete workflow',
                context: { workflowId },
                rootError: error instanceof Error ? error : undefined
            });
        }
    }

    // ─── Status Management ─────────────────────────────────────────────────────

    public async transitionStatus(context: StatusTransitionContext): Promise<void> {
        try {
            const validationResult = await this.validateStatus(context);
            if (!validationResult.isValid) {
                throw new Error(validationResult.errors?.join(', '));
            }

            const log = LogCreator.createWorkflowLog(
                `Workflow status changed: ${context.targetStatus}`,
                context.targetStatus as keyof typeof WORKFLOW_STATUS_enum,
                {
                    previousStatus: context.currentStatus,
                    timestamp: Date.now(),
                    ...context.metadata
                }
            );

            this.store.setState(state => ({
                workflowStatus: context.targetStatus as keyof typeof WORKFLOW_STATUS_enum,
                workflowLogs: [...state.workflowLogs, log]
            }));

        } catch (error) {
            throw new PrettyError({
                message: 'Status transition failed',
                context,
                rootError: error instanceof Error ? error : undefined
            });
        }
    }

    // ─── Utility Methods ──────────────────────────────────────────────────────

    public getWorkflow(workflowId: string): TeamWorkflow | undefined {
        return this.workflows.get(workflowId);
    }

    public getWorkflowStats(workflowId: string): WorkflowStats | undefined {
        return this.workflowStats.get(workflowId);
    }

    public getQueueLength(): number {
        return this.executionQueue.length;
    }

    public async getWorkflowState(workflowId: string): Promise<{
        workflow: TeamWorkflow | undefined;
        stats: WorkflowStats | undefined;
        queueLength: number;
    }> {
        return {
            workflow: this.getWorkflow(workflowId),
            stats: this.getWorkflowStats(workflowId),
            queueLength: this.getQueueLength()
        };
    }
}

export default WorkflowManager;