import { WorkflowManager } from '../managers/domain/workflow/workflowManager';
import { WorkflowEventEmitter } from '../managers/domain/workflow/workflowEventEmitter';
import { 
    IWorkflowState,
    IWorkflowStateSnapshot,
    IWorkflowStateRecoveryOptions,
    IWorkflowStateRecoveryResult
} from '../types/workflow/workflowStateTypes';
import {
    IWorkflowStepEvent,
    IWorkflowControlEvent,
    IWorkflowAgentEvent,
    IWorkflowTaskEvent,
    WorkflowEventType
} from '../types/workflow/workflowEventTypes';
import { IAgentType } from '../types/agent/agentBaseTypes';
import { ITaskType } from '../types/task/taskBaseTypes';
import { IHandlerResult } from '../types/common/commonHandlerTypes';
import { IEventValidationResult } from '../types/common/commonEventTypes';
import { createBaseMetadata } from '../types/common/commonMetadataTypes';

/**
 * WorkflowComponent
 * Example component demonstrating usage of WorkflowManager
 * 
 * This component shows how to:
 * 1. Get workflow state
 * 2. Control workflow execution (start, pause, resume, stop)
 * 3. Manage workflow agents and tasks
 * 4. Handle state snapshots and recovery
 * 5. Subscribe to workflow events
 */
export class WorkflowComponent {
    private readonly workflowManager: WorkflowManager;
    private readonly eventEmitter: WorkflowEventEmitter;
    private readonly workflowId: string;
    private readonly eventHandlers: Map<string, Function>;

    constructor(workflowId: string) {
        this.workflowManager = WorkflowManager.getInstance();
        this.eventEmitter = WorkflowEventEmitter.getInstance();
        this.workflowId = workflowId;
        this.eventHandlers = new Map();

        // Subscribe to workflow events
        this.subscribeToEvents();
    }

    /**
     * Get current workflow state
     */
    public getState(): IWorkflowState | undefined {
        return this.workflowManager.getState(this.workflowId);
    }

    /**
     * Start workflow execution
     */
    public async startWorkflow(): Promise<IHandlerResult<void>> {
        return this.workflowManager.startWorkflow(this.workflowId);
    }

    /**
     * Pause workflow execution
     */
    public async pauseWorkflow(): Promise<IHandlerResult<void>> {
        return this.workflowManager.pauseWorkflow(this.workflowId);
    }

    /**
     * Resume workflow execution
     */
    public async resumeWorkflow(): Promise<IHandlerResult<void>> {
        return this.workflowManager.resumeWorkflow(this.workflowId);
    }

    /**
     * Stop workflow execution
     */
    public async stopWorkflow(): Promise<IHandlerResult<void>> {
        return this.workflowManager.stopWorkflow(this.workflowId);
    }

    /**
     * Assign agent to workflow step
     */
    public async assignAgent(stepId: string, agent: IAgentType): Promise<IHandlerResult<void>> {
        return this.workflowManager.assignAgent(this.workflowId, stepId, agent);
    }

    /**
     * Add task to workflow
     */
    public async addTask(task: ITaskType): Promise<IHandlerResult<void>> {
        return this.workflowManager.addTask(this.workflowId, task);
    }

    /**
     * Create workflow state snapshot
     */
    public async createSnapshot(reason: string): Promise<IHandlerResult<IWorkflowStateSnapshot>> {
        return this.workflowManager.createSnapshot(this.workflowId, reason);
    }

    /**
     * Restore workflow state from snapshot
     */
    public async restoreState(options: IWorkflowStateRecoveryOptions): Promise<IHandlerResult<IWorkflowStateRecoveryResult>> {
        return this.workflowManager.restoreState(this.workflowId, options);
    }

    /**
     * Subscribe to workflow events
     */
    private subscribeToEvents(): void {
        // Subscribe to step events
        const stepHandler = async (event: IWorkflowStepEvent) => {
            if (event.metadata.context?.correlationId === this.workflowId) {
                switch (event.type) {
                    case 'start':
                        await this.handleStepStart(event);
                        break;
                    case 'complete':
                        await this.handleStepComplete(event);
                        break;
                    case 'fail':
                        await this.handleStepFail(event);
                        break;
                    case 'skip':
                        await this.handleStepSkip(event);
                        break;
                }
            }
        };
        this.eventHandlers.set('workflow:step', stepHandler);
        this.eventEmitter.subscribe('workflow:step', stepHandler);

        // Subscribe to control events
        const controlHandler = async (event: IWorkflowControlEvent) => {
            if (event.metadata.context?.correlationId === this.workflowId) {
                switch (event.type) {
                    case 'start':
                        await this.handleWorkflowStart(event);
                        break;
                    case 'pause':
                        await this.handleWorkflowPause(event);
                        break;
                    case 'resume':
                        await this.handleWorkflowResume(event);
                        break;
                    case 'stop':
                        await this.handleWorkflowStop(event);
                        break;
                }
            }
        };
        this.eventHandlers.set('workflow:control', controlHandler);
        this.eventEmitter.subscribe('workflow:control', controlHandler);

        // Subscribe to agent events
        const agentHandler = async (event: IWorkflowAgentEvent) => {
            if (event.metadata.context?.correlationId === this.workflowId) {
                switch (event.type) {
                    case 'assign':
                        await this.handleAgentAssign(event);
                        break;
                    case 'unassign':
                        await this.handleAgentUnassign(event);
                        break;
                }
            }
        };
        this.eventHandlers.set('workflow:agent', agentHandler);
        this.eventEmitter.subscribe('workflow:agent', agentHandler);

        // Subscribe to task events
        const taskHandler = async (event: IWorkflowTaskEvent) => {
            if (event.metadata.context?.correlationId === this.workflowId) {
                switch (event.type) {
                    case 'add':
                        await this.handleTaskAdd(event);
                        break;
                    case 'remove':
                        await this.handleTaskRemove(event);
                        break;
                    case 'update':
                        await this.handleTaskUpdate(event);
                        break;
                }
            }
        };
        this.eventHandlers.set('workflow:task', taskHandler);
        this.eventEmitter.subscribe('workflow:task', taskHandler);
    }

    /**
     * Event handlers
     */
    private async handleStepStart(event: IWorkflowStepEvent): Promise<void> {
        console.log(`Step ${event.stepId} started`);
    }

    private async handleStepComplete(event: IWorkflowStepEvent): Promise<void> {
        console.log(`Step ${event.stepId} completed`);
    }

    private async handleStepFail(event: IWorkflowStepEvent): Promise<void> {
        console.error(`Step ${event.stepId} failed:`, event.error);
    }

    private async handleStepSkip(event: IWorkflowStepEvent): Promise<void> {
        console.log(`Step ${event.stepId} skipped`);
    }

    private async handleWorkflowStart(event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow started');
    }

    private async handleWorkflowPause(event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow paused');
    }

    private async handleWorkflowResume(event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow resumed');
    }

    private async handleWorkflowStop(event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow stopped');
    }

    private async handleAgentAssign(event: IWorkflowAgentEvent): Promise<void> {
        console.log(`Agent assigned to step ${event.stepId}`);
    }

    private async handleAgentUnassign(event: IWorkflowAgentEvent): Promise<void> {
        console.log(`Agent unassigned from step ${event.stepId}`);
    }

    private async handleTaskAdd(event: IWorkflowTaskEvent): Promise<void> {
        console.log('Task added:', event.task.id);
    }

    private async handleTaskRemove(event: IWorkflowTaskEvent): Promise<void> {
        console.log('Task removed:', event.task.id);
    }

    private async handleTaskUpdate(event: IWorkflowTaskEvent): Promise<void> {
        console.log('Task updated:', event.task.id);
    }

    /**
     * Cleanup
     */
    public dispose(): void {
        // Unsubscribe from all events
        for (const [eventType, handler] of this.eventHandlers) {
            this.eventEmitter.unsubscribe(eventType, handler);
        }
        this.eventHandlers.clear();
    }
}
