import { WorkflowManager } from '../managers/domain/workflow/workflowManager';
import { WorkflowEventEmitter } from '../managers/domain/workflow/workflowEventEmitter';
import { IWorkflowState } from '../types/workflow/workflowStateTypes';
import { 
    IWorkflowStepEvent,
    IWorkflowControlEvent,
    IWorkflowAgentEvent,
    IWorkflowTaskEvent
} from '../types/workflow/workflowEventTypes';
import { IAgentType } from '../types/agent/agentBaseTypes';
import { ITaskType } from '../types/task/taskBaseTypes';
import { IHandlerResult, IBaseContextRequired } from '../types/common/baseTypes';

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
     * Subscribe to workflow events
     */
    private subscribeToEvents(): void {
        // Subscribe to step events
        const stepHandler = async (event: IWorkflowStepEvent) => {
            const context = event.metadata.context as IBaseContextRequired;
            if (context?.correlationId === this.workflowId) {
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
        this.eventEmitter.onStepEvent(stepHandler);

        // Subscribe to control events
        const controlHandler = async (event: IWorkflowControlEvent) => {
            const context = event.metadata.context as IBaseContextRequired;
            if (context?.correlationId === this.workflowId) {
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
        this.eventEmitter.onControlEvent(controlHandler);

        // Subscribe to agent events
        const agentHandler = async (event: IWorkflowAgentEvent) => {
            const context = event.metadata.context as IBaseContextRequired;
            if (context?.correlationId === this.workflowId) {
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
        this.eventEmitter.onAgentEvent(agentHandler);

        // Subscribe to task events
        const taskHandler = async (event: IWorkflowTaskEvent) => {
            const context = event.metadata.context as IBaseContextRequired;
            if (context?.correlationId === this.workflowId) {
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
        this.eventEmitter.onTaskEvent(taskHandler);
    }

    /**
     * Event handlers
     */
    private async handleStepStart({ stepId }: IWorkflowStepEvent): Promise<void> {
        console.log(`Step ${stepId} started`);
    }

    private async handleStepComplete({ stepId }: IWorkflowStepEvent): Promise<void> {
        console.log(`Step ${stepId} completed`);
    }

    private async handleStepFail({ stepId, error }: IWorkflowStepEvent): Promise<void> {
        console.error(`Step ${stepId} failed:`, error);
    }

    private async handleStepSkip({ stepId }: IWorkflowStepEvent): Promise<void> {
        console.log(`Step ${stepId} skipped`);
    }

    private async handleWorkflowStart(_event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow started');
    }

    private async handleWorkflowPause(_event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow paused');
    }

    private async handleWorkflowResume(_event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow resumed');
    }

    private async handleWorkflowStop(_event: IWorkflowControlEvent): Promise<void> {
        console.log('Workflow stopped');
    }

    private async handleAgentAssign({ stepId }: IWorkflowAgentEvent): Promise<void> {
        console.log(`Agent assigned to step ${stepId}`);
    }

    private async handleAgentUnassign({ stepId }: IWorkflowAgentEvent): Promise<void> {
        console.log(`Agent unassigned from step ${stepId}`);
    }

    private async handleTaskAdd({ task }: IWorkflowTaskEvent): Promise<void> {
        console.log('Task added:', task.id);
    }

    private async handleTaskRemove({ task }: IWorkflowTaskEvent): Promise<void> {
        console.log('Task removed:', task.id);
    }

    private async handleTaskUpdate({ task }: IWorkflowTaskEvent): Promise<void> {
        console.log('Task updated:', task.id);
    }

    /**
     * Cleanup
     */
    public dispose(): void {
        // Unsubscribe from all events
        for (const [eventType, handler] of this.eventHandlers) {
            switch (eventType) {
                case 'workflow:step':
                    this.eventEmitter.offStepEvent(handler as (event: IWorkflowStepEvent) => Promise<void>);
                    break;
                case 'workflow:control':
                    this.eventEmitter.offControlEvent(handler as (event: IWorkflowControlEvent) => Promise<void>);
                    break;
                case 'workflow:agent':
                    this.eventEmitter.offAgentEvent(handler as (event: IWorkflowAgentEvent) => Promise<void>);
                    break;
                case 'workflow:task':
                    this.eventEmitter.offTaskEvent(handler as (event: IWorkflowTaskEvent) => Promise<void>);
                    break;
            }
        }
        this.eventHandlers.clear();
    }
}
