/**
 * @file workflowManager.ts
 * @path src/utils/managers/domain/workflow/workflowManager.ts
 * @description Core workflow management implementation using service registry pattern
 *
 * @module @managers/domain/workflow
 */

import CoreManager from '../../core/coreManager';
import type { 
    WorkflowResult,
    WorkflowStats,
    WorkflowStartResult,
    CostDetails,
    WorkflowError,
    StepResult,
    StepConfig
} from '@/utils/types/workflow';

import type { 
    AgentType,
    TaskType,
    TeamStore,
    HandlerResult,
    ErrorType
} from '@/utils/types';

import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core workflow management implementation
 */
export class WorkflowManager extends CoreManager {
    private static instance: WorkflowManager;
    private readonly activeWorkflows: Map<string, {
        steps: StepConfig[];
        stepResults: Record<string, StepResult>;
        currentStepIndex: number;
        startTime: number;
        status: keyof typeof WORKFLOW_STATUS_enum;
    }>;
    private readonly workflowStats: Map<string, WorkflowStats>;

    private constructor() {
        super();
        this.activeWorkflows = new Map();
        this.workflowStats = new Map();
        this.registerDomainManager('WorkflowManager', this);
    }

    public static getInstance(): WorkflowManager {
        if (!WorkflowManager.instance) {
            WorkflowManager.instance = new WorkflowManager();
        }
        return WorkflowManager.instance;
    }

    // ─── Workflow Configuration ────────────────────────────────────────────────────

    /**
     * Configure new workflow
     */
    public async configureWorkflow(config: {
        name: string;
        workflowId: string;
        steps: StepConfig[];
    }): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const { workflowId, steps } = config;

            // Validate steps
            await this.validateWorkflowSteps(steps);

            this.activeWorkflows.set(workflowId, {
                steps,
                stepResults: {},
                currentStepIndex: 0,
                startTime: Date.now(),
                status: WORKFLOW_STATUS_enum.INITIAL
            });

            this.workflowStats.set(workflowId, this.createDefaultStats());

            return {
                success: true,
                data: { workflowId }
            };

        }, 'Workflow configuration failed');
    }

    // ─── Workflow Execution ──────────────────────────────────────────────────────

    /**
     * Start workflow execution
     */
    public async startWorkflow(workflowId: string): Promise<HandlerResult<WorkflowStartResult>> {
        return await this.safeExecute(async () => {
            const workflow = this.activeWorkflows.get(workflowId);
            if (!workflow) {
                throw new Error(`Workflow not found: ${workflowId}`);
            }

            await this.handleStatusTransition({
                currentStatus: workflow.status,
                targetStatus: WORKFLOW_STATUS_enum.RUNNING,
                entity: 'workflow',
                entityId: workflowId,
                metadata: this.prepareMetadata({ workflowId })
            });

            workflow.status = WORKFLOW_STATUS_enum.RUNNING;
            await this.processNextStep(workflowId);

            const stats = this.workflowStats.get(workflowId);
            return {
                success: true,
                data: {
                    status: workflow.status,
                    result: null,
                    stats: stats || this.createDefaultStats()
                }
            };

        }, 'Workflow start failed');
    }

    /**
     * Process next workflow step
     */
    private async processNextStep(workflowId: string): Promise<void> {
        return await this.safeExecute(async () => {
            const workflow = this.activeWorkflows.get(workflowId);
            if (!workflow) return;

            // Check if workflow is complete
            if (workflow.currentStepIndex >= workflow.steps.length) {
                await this.completeWorkflow(workflowId);
                return;
            }

            const currentStep = workflow.steps[workflow.currentStepIndex];
            const taskManager = this.getDomainManager<TaskManager>('TaskManager');
            const agentManager = this.getDomainManager<AgentManager>('AgentManager');

            // Create and assign task for step
            const task = await taskManager.createTask({
                title: currentStep.name,
                description: currentStep.description,
                priority: currentStep.priority || 1,
                agent: currentStep.assignedAgent
            });

            if (currentStep.assignedAgent) {
                await agentManager.assignTask({
                    agent: currentStep.assignedAgent,
                    task,
                    metadata: { stepId: currentStep.id }
                });
            }

            const stepResult = await this.executeStep(workflowId, currentStep, task);
            workflow.stepResults[currentStep.id] = stepResult;
            workflow.currentStepIndex++;

            await this.processNextStep(workflowId);

        }, 'Step processing failed');
    }

    /**
     * Execute workflow step
     */
    private async executeStep(
        workflowId: string,
        step: StepConfig,
        task: TaskType
    ): Promise<StepResult> {
        const taskManager = this.getDomainManager<TaskManager>('TaskManager');
        
        try {
            const result = await taskManager.executeTask({
                task,
                agent: step.assignedAgent,
                metadata: { stepId: step.id }
            });

            return {
                success: true,
                taskId: task.id,
                result: task.result,
                stats: result
            };

        } catch (error) {
            // Handle step failure
            await this.handleStepError(workflowId, step, error as Error);
            return {
                success: false,
                taskId: task.id,
                error: error as Error
            };
        }
    }

    // ─── Error Handling ───────────────────────────────────────────────────────

    /**
     * Handle step execution error
     */
    private async handleStepError(
        workflowId: string,
        step: StepConfig,
        error: Error
    ): Promise<void> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) return;

        const workflowError: WorkflowError = {
            message: `Step ${step.name} failed: ${error.message}`,
            type: 'step_failure',
            context: { step, error },
            timestamp: Date.now()
        };

        if (!step.optional) {
            await this.handleStatusTransition({
                currentStatus: workflow.status,
                targetStatus: WORKFLOW_STATUS_enum.ERRORED,
                entity: 'workflow',
                entityId: workflowId,
                metadata: {
                    error: workflowError,
                    step
                }
            });

            workflow.status = WORKFLOW_STATUS_enum.ERRORED;
        }
    }

    // ─── Workflow Completion ─────────────────────────────────────────────────

    /**
     * Complete workflow execution
     */
    private async completeWorkflow(workflowId: string): Promise<void> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) return;

        const stats = this.workflowStats.get(workflowId);
        if (stats) {
            stats.endTime = Date.now();
            stats.duration = stats.endTime - workflow.startTime;
        }

        await this.handleStatusTransition({
            currentStatus: workflow.status,
            targetStatus: WORKFLOW_STATUS_enum.FINISHED,
            entity: 'workflow',
            entityId: workflowId,
            metadata: {
                stats,
                completedAt: Date.now()
            }
        });

        workflow.status = WORKFLOW_STATUS_enum.FINISHED;
    }

    // ─── Stats and Metrics ──────────────────────────────────────────────────

    /**
     * Get workflow statistics
     */
    public async getWorkflowStats(workflowId: string): Promise<WorkflowStats | null> {
        return this.workflowStats.get(workflowId) || null;
    }

    /**
     * Update workflow resource usage
     */
    public async updateResourceUsage(
        workflowId: string,
        modelUsage: Record<string, number>,
        costDetails: CostDetails
    ): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const stats = this.workflowStats.get(workflowId);
            if (!stats) {
                throw new Error('Workflow stats not found');
            }

            // Update cost details
            Object.assign(stats.costDetails, costDetails);

            // Update model usage statistics
            Object.entries(modelUsage).forEach(([model, tokens]) => {
                if (!stats.modelUsage[model]) {
                    stats.modelUsage[model] = {
                        tokens: { input: 0, output: 0 },
                        requests: { successful: 0, failed: 0 },
                        latency: { average: 0, p95: 0, max: 0 },
                        cost: 0
                    };
                }
                stats.modelUsage[model].tokens.input += tokens;
            });

            this.workflowStats.set(workflowId, stats);

            return {
                success: true,
                data: stats
            };
        }, 'Resource usage update failed');
    }

    // ─── Protected Helper Methods ───────────────────────────────────────────────

    /**
     * Validate workflow steps
     */
    protected async validateWorkflowSteps(steps: StepConfig[]): Promise<void> {
        const errors: string[] = [];

        for (const step of steps) {
            if (!step.name) errors.push('Step name is required');
            if (!step.description) errors.push('Step description is required');
            if (!step.id) errors.push('Step ID is required');
        }

        if (errors.length > 0) {
            throw new Error(`Invalid workflow steps: ${errors.join(', ')}`);
        }
    }

    /**
     * Create default workflow stats
     */
    protected createDefaultStats(): WorkflowStats {
        return {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            llmUsageStats: {
                inputTokens: 0,
                outputTokens: 0,
                callsCount: 0,
                callsErrorCount: 0,
                parsingErrors: 0,
                totalLatency: 0,
                averageLatency: 0,
                lastUsed: Date.now(),
                memoryUtilization: {
                    peakMemoryUsage: 0,
                    averageMemoryUsage: 0,
                    cleanupEvents: 0
                },
                costBreakdown: {
                    input: 0,
                    output: 0,
                    total: 0,
                    currency: 'USD'
                }
            },
            iterationCount: 0,
            costDetails: {
                inputCost: 0,
                outputCost: 0,
                totalCost: 0,
                currency: 'USD',
                breakdown: {
                    promptTokens: { count: 0, cost: 0 },
                    completionTokens: { count: 0, cost: 0 }
                }
            },
            taskCount: 0,
            agentCount: 0,
            teamName: '',
            messageCount: 0,
            modelUsage: {}
        };
    }

    /**
     * Clean up workflow resources
     */
    public async cleanup(): Promise<void> {
        return await this.safeExecute(async () => {
            this.activeWorkflows.clear();
            this.workflowStats.clear();
            this.logManager.info('WorkflowManager cleaned up');
        }, 'Workflow cleanup failed');
    }
}

// Export singleton instance
export default WorkflowManager.getInstance();