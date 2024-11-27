import { CoreManager } from '../../core/coreManager';
import { WorkflowStateManager } from './workflowStateManager';
import { WorkflowEventEmitter } from './workflowEventEmitter';
import { 
    IWorkflowState,
    IWorkflowStateUpdate,
    IWorkflowStateSnapshot,
    IWorkflowStateRecoveryOptions,
    IWorkflowStateRecoveryResult
} from '../../../types/workflow/workflowStateTypes';
import { IHandlerResult } from '../../../types/common/commonHandlerTypes';
import { IBaseHandlerMetadata } from '../../../types/common/commonMetadataTypes';
import { IAgentType } from '../../../types/agent/agentBaseTypes';
import { ITaskType } from '../../../types/task/taskBaseTypes';

/**
 * Workflow Manager
 * Manages workflow execution and state using CoreManager services
 */
export class WorkflowManager extends CoreManager {
    private static instance: WorkflowManager;
    private readonly stateManager: WorkflowStateManager;
    private readonly eventEmitter: WorkflowEventEmitter;

    private constructor() {
        super();
        this.stateManager = WorkflowStateManager.getInstance();
        this.eventEmitter = WorkflowEventEmitter.getInstance();
        this.registerDomainManager('WorkflowManager', this);
    }

    public static getInstance(): WorkflowManager {
        if (!WorkflowManager.instance) {
            WorkflowManager.instance = new WorkflowManager();
        }
        return WorkflowManager.instance;
    }

    /**
     * Get workflow state
     */
    public getState(workflowId: string): IWorkflowState | undefined {
        return this.stateManager.getState(workflowId);
    }

    /**
     * Start workflow
     */
    public async startWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitControlEvent(workflowId, 'start', 'startWorkflow');
            await this.updateWorkflowState(workflowId, {
                status: 'running',
                metadata: { startTime: Date.now() }
            });
            this.logInfo(`Started workflow: ${workflowId}`, null, workflowId);
        }, 'Start workflow');
    }

    /**
     * Pause workflow
     */
    public async pauseWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitControlEvent(workflowId, 'pause', 'pauseWorkflow');
            await this.updateWorkflowState(workflowId, {
                status: 'paused',
                metadata: { pauseTime: Date.now() }
            });
            this.logInfo(`Paused workflow: ${workflowId}`, null, workflowId);
        }, 'Pause workflow');
    }

    /**
     * Resume workflow
     */
    public async resumeWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitControlEvent(workflowId, 'resume', 'resumeWorkflow');
            await this.updateWorkflowState(workflowId, {
                status: 'running',
                metadata: { resumeTime: Date.now() }
            });
            this.logInfo(`Resumed workflow: ${workflowId}`, null, workflowId);
        }, 'Resume workflow');
    }

    /**
     * Stop workflow
     */
    public async stopWorkflow(workflowId: string): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitControlEvent(workflowId, 'stop', 'stopWorkflow');
            await this.updateWorkflowState(workflowId, {
                status: 'completed',
                metadata: { endTime: Date.now() }
            });
            this.logInfo(`Stopped workflow: ${workflowId}`, null, workflowId);
        }, 'Stop workflow');
    }

    /**
     * Assign agent to step
     */
    public async assignAgent(workflowId: string, stepId: string, agent: IAgentType): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitAgentEvent(workflowId, stepId, 'assign', 'assignAgent', agent);
            await this.updateWorkflowState(workflowId, {
                assignedAgents: {
                    ...(await this.getRequiredState(workflowId)).assignedAgents,
                    [stepId]: agent
                }
            });
            this.logInfo(`Assigned agent ${agent.id} to step ${stepId}`, agent.id, workflowId);
        }, 'Assign agent to step');
    }

    /**
     * Add task to workflow
     */
    public async addTask(workflowId: string, task: ITaskType): Promise<IHandlerResult<void>> {
        return this.safeExecute(async () => {
            await this.emitTaskEvent(workflowId, task, 'add', 'addTask');
            const state = await this.getRequiredState(workflowId);
            await this.updateWorkflowState(workflowId, {
                tasks: [...state.tasks, task],
                pendingTasks: [...state.pendingTasks, task]
            });
            this.logInfo(`Added task ${task.id} to workflow`, null, workflowId);
        }, 'Add task to workflow');
    }

    /**
     * Create state snapshot
     */
    public async createSnapshot(workflowId: string, reason: string): Promise<IHandlerResult<IWorkflowStateSnapshot>> {
        return this.stateManager.createSnapshot(workflowId, reason);
    }

    /**
     * Restore state from snapshot
     */
    public async restoreState(workflowId: string, options: IWorkflowStateRecoveryOptions): Promise<IHandlerResult<IWorkflowStateRecoveryResult>> {
        return this.stateManager.restoreState(workflowId, options);
    }

    /**
     * Helper methods
     */
    private async getRequiredState(workflowId: string): Promise<IWorkflowState> {
        const state = this.stateManager.getState(workflowId);
        if (!state) {
            throw new Error(`Workflow state not found: ${workflowId}`);
        }
        return state;
    }

    private async updateWorkflowState(workflowId: string, update: IWorkflowStateUpdate): Promise<void> {
        await this.stateManager.updateState(workflowId, update);
    }

    private async createEventMetadata(operation: string, workflowId: string): Promise<IBaseHandlerMetadata> {
        const timestamp = Date.now();
        return {
            timestamp,
            component: this.constructor.name,
            operation,
            performance: await this.getMetricsManager().getInitialPerformanceMetrics(),
            context: {
                source: this.constructor.name,
                target: 'workflow',
                correlationId: workflowId,
                causationId: timestamp.toString()
            },
            validation: {
                isValid: true,
                errors: [],
                warnings: []
            }
        };
    }

    private async emitControlEvent(workflowId: string, type: 'start' | 'pause' | 'resume' | 'stop' | 'reset', operation: string): Promise<void> {
        const timestamp = Date.now();
        await this.eventEmitter.emitControlEvent({
            id: `workflow_control_${workflowId}_${timestamp}`,
            timestamp,
            type,
            metadata: await this.createEventMetadata(operation, workflowId)
        });
    }

    private async emitAgentEvent(workflowId: string, stepId: string, type: 'assign' | 'unassign', operation: string, agent?: IAgentType): Promise<void> {
        const timestamp = Date.now();
        await this.eventEmitter.emitAgentEvent({
            id: `workflow_agent_${workflowId}_${stepId}_${timestamp}`,
            timestamp,
            type,
            stepId,
            agent,
            metadata: await this.createEventMetadata(operation, workflowId)
        });
    }

    private async emitTaskEvent(workflowId: string, task: ITaskType, type: 'add' | 'remove' | 'update', operation: string): Promise<void> {
        const timestamp = Date.now();
        await this.eventEmitter.emitTaskEvent({
            id: `workflow_task_${workflowId}_${task.id}_${timestamp}`,
            timestamp,
            type,
            task,
            metadata: await this.createEventMetadata(operation, workflowId)
        });
    }
}

export default WorkflowManager.getInstance();
