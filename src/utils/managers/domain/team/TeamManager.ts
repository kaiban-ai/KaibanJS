/**
 * @file teamManager.ts
 * @path src/utils/managers/domain/team/teamManager.ts
 * @description Core team management implementation using service registry pattern
 *
 * @module @managers/domain/team
 */

import CoreManager from '../../core/coreManager';
import { PrettyError } from '@/utils/core/errors';

import type { 
    TeamState, 
    TeamWorkflow,
    TeamValidationResult,
    HandlerResult,
    TeamInitParams 
} from '@/utils/types/team';

import type { 
    WorkflowResult,
    WorkflowStats,
    WorkflowStartResult,
    CostDetails
} from '@/utils/types/workflow';

import type {
    AgentType,
    TaskType,
    FeedbackObject
} from '@/utils/types';

import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core team management implementation
 */
export class TeamManager extends CoreManager {
    private static instance: TeamManager;
    private readonly activeTeams: Map<string, TeamWorkflow>;
    private readonly teamStats: Map<string, WorkflowStats>;

    private constructor() {
        super();
        this.activeTeams = new Map();
        this.teamStats = new Map();
        this.registerDomainManager('TeamManager', this);
    }

    public static getInstance(): TeamManager {
        if (!TeamManager.instance) {
            TeamManager.instance = new TeamManager();
        }
        return TeamManager.instance;
    }

    // ─── Team Management Methods ─────────────────────────────────────────────────

    public async initializeTeam(params: TeamInitParams): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const validation = await this.validateTeamSetup(params);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Get required managers through service registry
            const agentManager = this.getDomainManager<AgentManager>('AgentManager');
            const taskManager = this.getDomainManager<TaskManager>('TaskManager');
            const workflowManager = this.getDomainManager<WorkflowManager>('WorkflowManager');

            // Initialize workflow
            const workflow = await workflowManager.configureWorkflow({
                name: params.name,
                teamId: crypto.randomUUID(),
                agents: params.agents || [],
                tasks: params.tasks || []
            });

            // Initialize agents and tasks
            for (const agent of params.agents || []) {
                await agentManager.createAgent(agent);
            }

            for (const task of params.tasks || []) {
                await taskManager.createTask(task);
            }

            this.activeTeams.set(workflow.id, workflow);
            this.teamStats.set(workflow.id, this.createDefaultStats());

            return {
                success: true,
                data: workflow
            };

        }, 'Team initialization failed');
    }

    // ─── Workflow Management Methods ───────────────────────────────────────────────

    public async startWorkflow(params: {
        teamId: string;
        inputs?: Record<string, unknown>;
    }): Promise<WorkflowStartResult> {
        return await this.safeExecute(async () => {
            const { teamId, inputs = {} } = params;
            const workflow = this.activeTeams.get(teamId);
            if (!workflow) {
                throw new PrettyError('Team not found');
            }

            const workflowManager = this.getDomainManager<WorkflowManager>('WorkflowManager');
            await workflowManager.startWorkflow(workflow.id);

            await this.handleStatusTransition({
                currentStatus: WORKFLOW_STATUS_enum.INITIAL,
                targetStatus: WORKFLOW_STATUS_enum.RUNNING,
                entity: 'workflow',
                entityId: teamId,
                metadata: { inputs }
            });

            // Get initial stats
            const stats = await this.getWorkflowStats(teamId);

            return {
                status: WORKFLOW_STATUS_enum.RUNNING,
                result: null,
                stats: stats || this.createDefaultStats()
            };

        }, 'Workflow start failed');
    }

    public async stopWorkflow(
        teamId: string,
        reason: string = 'Manual stop'
    ): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const workflow = this.activeTeams.get(teamId);
            if (!workflow) {
                throw new PrettyError('Team not found');
            }

            const workflowManager = this.getDomainManager<WorkflowManager>('WorkflowManager');
            await workflowManager.stopWorkflow(workflow.id);

            await this.handleStatusTransition({
                currentStatus: WORKFLOW_STATUS_enum.RUNNING,
                targetStatus: WORKFLOW_STATUS_enum.STOPPED,
                entity: 'workflow',
                entityId: teamId,
                metadata: { reason }
            });

            return {
                success: true,
                data: {
                    teamId,
                    reason,
                    timestamp: Date.now()
                }
            };

        }, 'Workflow stop failed');
    }

    // ─── Task Management Methods ────────────────────────────────────────────────

    public async processFeedback(
        teamId: string,
        taskId: string,
        feedback: string,
        metadata?: Record<string, unknown>
    ): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const workflow = this.activeTeams.get(teamId);
            if (!workflow) {
                throw new PrettyError('Team not found');
            }

            const taskManager = this.getDomainManager<TaskManager>('TaskManager');
            const task = await taskManager.getTask(taskId);
            if (!task) {
                throw new PrettyError('Task not found');
            }

            await this.handleStatusTransition({
                currentStatus: task.status,
                targetStatus: TASK_STATUS_enum.REVISE,
                entity: 'task',
                entityId: taskId,
                metadata: {
                    teamId,
                    feedback,
                    ...metadata
                }
            });

            const feedbackObj: FeedbackObject = {
                id: crypto.randomUUID(),
                content: feedback,
                timestamp: new Date(),
                userId: 'system',
                status: 'PENDING'
            };

            if (task.store) {
                task.store.setState(state => ({
                    tasks: state.tasks.map(t => 
                        t.id === taskId ? {
                            ...t,
                            feedbackHistory: [...t.feedbackHistory, feedbackObj]
                        } : t
                    )
                }));
            }

            return {
                success: true,
                data: feedbackObj
            };

        }, 'Feedback processing failed');
    }

    // ─── Resource Management Methods ──────────────────────────────────────────────

    public async trackResources(
        teamId: string,
        modelUsage: Record<string, number>,
        costDetails: CostDetails
    ): Promise<HandlerResult> {
        return await this.safeExecute(async () => {
            const stats = this.teamStats.get(teamId);
            if (!stats) {
                throw new PrettyError('Team stats not found');
            }

            Object.assign(stats.costDetails, costDetails);
            
            // Update model usage statistics
            Object.entries(modelUsage).forEach(([model, usage]) => {
                if (!stats.modelUsage[model]) {
                    stats.modelUsage[model] = {
                        tokens: { input: 0, output: 0 },
                        requests: { successful: 0, failed: 0 },
                        latency: { average: 0, p95: 0, max: 0 },
                        cost: 0
                    };
                }
                stats.modelUsage[model].tokens.input += usage;
            });

            this.teamStats.set(teamId, stats);

            return {
                success: true,
                data: stats
            };

        }, 'Resource tracking failed');
    }

    // ─── Stats and Metrics Methods ────────────────────────────────────────────────

    public async getWorkflowStats(teamId: string): Promise<WorkflowStats | null> {
        return await this.safeExecute(async () => {
            return this.teamStats.get(teamId) || null;
        }, 'Stats retrieval failed');
    }

    // ─── Protected Helper Methods ───────────────────────────────────────────────

    protected async validateTeamSetup(params: TeamInitParams): Promise<TeamValidationResult> {
        const errors: string[] = [];

        if (!params.name) {
            errors.push('Team name is required');
        }

        if (params.agents?.length) {
            const agentManager = this.getDomainManager<AgentManager>('AgentManager');
            for (const agent of params.agents) {
                const validation = await agentManager.validateAgent(agent);
                if (!validation.isValid) {
                    errors.push(`Agent ${agent.name || agent.id} validation failed: ${validation.errors.join(', ')}`);
                }
            }
        }

        if (params.tasks?.length) {
            const taskManager = this.getDomainManager<TaskManager>('TaskManager');
            for (const task of params.tasks) {
                const validation = await taskManager.validateTask(task);
                if (!validation.isValid) {
                    errors.push(`Task ${task.title || task.id} validation failed: ${validation.errors.join(', ')}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                teamName: params.name,
                agentCount: params.agents?.length || 0,
                taskCount: params.tasks?.length || 0
            }
        };
    }

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

    public async cleanup(): Promise<void> {
        return await this.safeExecute(async () => {
            const workflowManager = this.getDomainManager<WorkflowManager>('WorkflowManager');
            
            for (const [teamId] of this.activeTeams) {
                await this.stopWorkflow(teamId, 'Cleanup');
            }

            this.activeTeams.clear();
            this.teamStats.clear();

            await workflowManager.cleanup();
            this.logManager.info('TeamManager cleaned up');
        }, 'Team cleanup failed');
    }
}

// Export singleton instance
export default TeamManager.getInstance();