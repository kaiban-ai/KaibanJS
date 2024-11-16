/**
 * @file TeamManager.ts
 * @path src/managers/domain/team/TeamManager.ts
 * @description Core team management and orchestration implementation 
 *
 * @module @managers/domain/team
 */

import CoreManager from '../../core/CoreManager';
import { ErrorManager } from '../../core/ErrorManager';
import { LogManager } from '../../core/LogManager';
import { StatusManager } from '../../core/StatusManager';
import { DefaultFactory } from '@/utils/factories/defaultFactory';
import { LogCreator } from '@/utils/factories/logCreator';
import { calculateTaskStats } from '@/utils/helpers/stats';

// Import managers from canonical locations
import { AgentManager } from '../agent/AgentManager';
import { TaskManager } from '../task/TaskManager';
import { IterationManager } from '../task/IterationManager';
import { WorkflowManager } from '../workflow/WorkflowManager';

// Import types from canonical locations
import type { 
    TeamState, 
    TeamStore,
    TeamStoreApi,
    TeamStoreConfig,
    HandlerResult,
    TeamValidationResult
} from '@/utils/types/team';

import type {
    AgentType,
    TaskType,
    WorkflowResult,
    WorkflowStats,
    WorkflowStartResult,
    CostDetails,
    ModelUsageStats,
    ErrorType,
    LLMUsageStats,
    BaseStoreState
} from '@/utils/types';

import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '@/utils/types/common/enums';

/**
 * Core team management implementation
 */
export class TeamManager extends CoreManager {
    private static instance: TeamManager;
    private readonly errorManager: ErrorManager;
    private readonly logManager: LogManager;
    private readonly statusManager: StatusManager;
    private readonly agentManager: AgentManager;
    private readonly taskManager: TaskManager;
    private readonly iterationManager: IterationManager;
    private readonly workflowManager: WorkflowManager;
    private readonly activeTeams: Map<string, TeamStore>;
    private readonly workflowStats: Map<string, WorkflowStats>;

    private constructor() {
        super();
        this.errorManager = ErrorManager.getInstance();
        this.logManager = LogManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.agentManager = AgentManager.getInstance();
        this.taskManager = TaskManager.getInstance();
        this.iterationManager = IterationManager.getInstance();
        this.workflowManager = WorkflowManager.getInstance();
        this.activeTeams = new Map();
        this.workflowStats = new Map();
    }

    // ─── Singleton Access ───────────────────────────────────────────────────

    public static getInstance(): TeamManager {
        if (!TeamManager.instance) {
            TeamManager.instance = new TeamManager();
        }
        return TeamManager.instance;
    }

    // ─── Team Management ────────────────────────────────────────────────────

    /**
     * Initialize a new team with agents and tasks
     */
    public async initializeTeam(
        store: TeamStore,
        name: string,
        agents: AgentType[] = [],
        tasks: TaskType[] = [],
        config: TeamStoreConfig = {}
    ): Promise<HandlerResult> {
        try {
            const validation = await this.validateTeamSetup({ name, agents, tasks });
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            agents.forEach(agent => {
                agent.initialize(store, store.getState().env);
                this.logManager.debug(`Initialized agent: ${agent.name}`);
            });

            tasks.forEach(task => {
                task.setStore(store);
                this.logManager.debug(`Set store for task: ${task.id}`);
            });

            this.activeTeams.set(name, store);
            this.workflowStats.set(name, DefaultFactory.createWorkflowStats());

            const log = LogCreator.createWorkflowLog(
                `Team ${name} initialized with ${agents.length} agents and ${tasks.length} tasks`,
                WORKFLOW_STATUS_enum.INITIAL,
                {
                    teamName: name,
                    agentCount: agents.length,
                    taskCount: tasks.length,
                    timestamp: Date.now()
                }
            );

            store.setState(state => ({
                ...state,
                name,
                agents,
                tasks,
                workflowLogs: [log]
            }));

            return {
                success: true,
                data: store
            };

        } catch (error) {
            return this.handleTeamError(error, name);
        }
    }

    /**
     * Start workflow execution
     */
    public async startWorkflow(
        teamName: string,
        inputs: Record<string, unknown> = {}
    ): Promise<WorkflowStartResult> {
        const store = this.activeTeams.get(teamName);
        if (!store) {
            return this.handleTeamNotFound(teamName);
        }

        try {
            await this.statusManager.transition({
                currentStatus: store.getState().teamWorkflowStatus,
                targetStatus: WORKFLOW_STATUS_enum.RUNNING,
                entity: 'workflow',
                entityId: teamName,
                metadata: { inputs }
            });

            store.setState(state => ({
                ...state,
                inputs,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING
            }));

            const stats = await this.getWorkflowStats(teamName);
            if (!stats) {
                throw new Error('Failed to get workflow stats');
            }

            const result: WorkflowResult = {
                status: 'FINISHED',
                result: 'Workflow completed successfully',
                metadata: stats,
                completionTime: Date.now()
            };

            return {
                status: WORKFLOW_STATUS_enum.RUNNING,
                result,
                stats
            };

        } catch (error) {
            const errorResult = await this.handleWorkflowError(error, teamName, store);
            return {
                status: WORKFLOW_STATUS_enum.ERRORED,
                result: {
                    status: 'ERRORED',
                    error: errorResult.error?.message || 'Unknown error',
                    metadata: this.workflowStats.get(teamName) || DefaultFactory.createWorkflowStats(),
                    erroredAt: Date.now()
                },
                stats: this.workflowStats.get(teamName) || DefaultFactory.createWorkflowStats()
            };
        }
    }

    /**
     * Stop workflow execution
     */
    public async stopWorkflow(
        teamName: string,
        reason: string = 'Manual stop'
    ): Promise<HandlerResult> {
        const store = this.activeTeams.get(teamName);
        if (!store) {
            return this.handleTeamNotFound(teamName);
        }

        try {
            await this.statusManager.transition({
                currentStatus: store.getState().teamWorkflowStatus,
                targetStatus: WORKFLOW_STATUS_enum.STOPPING,
                entity: 'workflow',
                entityId: teamName,
                metadata: { reason }
            });

            const log = LogCreator.createWorkflowLog(
                `Workflow stopped: ${reason}`,
                WORKFLOW_STATUS_enum.STOPPED,
                { 
                    teamName,
                    reason,
                    timestamp: Date.now()
                }
            );

            store.setState(state => ({
                ...state,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED,
                workflowLogs: [...state.workflowLogs, log]
            }));

            return {
                success: true
            };

        } catch (error) {
            return this.handleTeamError(error, teamName);
        }
    }

    /**
     * Process team feedback
     */
    public async processFeedback(
        store: TeamStore,
        taskId: string,
        feedback: string,
        metadata: Record<string, unknown> = {}
    ): Promise<HandlerResult> {
        try {
            const task = store.getState().tasks.find(t => t.id === taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }

            const feedbackObj = DefaultFactory.createFeedbackObject({
                content: feedback,
                taskId,
                metadata
            });

            const log = LogCreator.createTaskLog({
                task,
                description: `Feedback received: ${feedback}`,
                status: TASK_STATUS_enum.REVISE,
                metadata: {
                    feedback: feedbackObj,
                    timestamp: Date.now()
                }
            });

            store.setState(state => ({
                tasks: state.tasks.map(t => 
                    t.id === taskId ? {
                        ...t,
                        status: TASK_STATUS_enum.REVISE,
                        feedbackHistory: [...t.feedbackHistory, feedbackObj]
                    } : t
                ),
                workflowLogs: [...state.workflowLogs, log]
            }));

            return {
                success: true,
                data: feedbackObj
            };

        } catch (error) {
            return this.handleTeamError(error);
        }
    }

    // ─── Resource Management ────────────────────────────────────────────────

    /**
     * Update cost tracking
     */
    public async updateCostTracking(
        store: TeamStore,
        modelUsage: ModelUsageStats,
        costDetails: CostDetails
    ): Promise<HandlerResult> {
        try {
            const stats = this.workflowStats.get(store.getState().name);
            if (!stats) {
                throw new Error('Workflow stats not found');
            }

            this.workflowStats.set(store.getState().name, {
                ...stats,
                modelUsage,
                costDetails,
                timestamp: Date.now()
            });

            return {
                success: true,
                data: this.workflowStats.get(store.getState().name)
            };

        } catch (error) {
            return this.handleTeamError(error);
        }
    }

    /**
     * Update resource tracking
     */
    public async updateResourceTracking(
        store: TeamStore,
        task: TaskType,
        llmUsageStats: LLMUsageStats
    ): Promise<HandlerResult> {
        try {
            const stats = calculateTaskStats(task, store.getState().workflowLogs);
            const modelCode = task.agent?.llmConfig?.model;
            
            if (!modelCode) {
                throw new Error('Model code not found');
            }

            await this.updateCostTracking(
                store,
                { [modelCode]: stats.llmUsageStats },
                stats.costDetails
            );

            return {
                success: true,
                data: stats
            };

        } catch (error) {
            return this.handleTeamError(error);
        }
    }

    /**
     * Get workflow statistics
     */
    public async getWorkflowStats(teamName: string): Promise<WorkflowStats | null> {
        const store = this.activeTeams.get(teamName);
        if (!store) return null;

        const stats = this.workflowStats.get(teamName);
        if (!stats) return null;

        return stats;
    }

    /**
     * Clean up resources
     */
    public async cleanup(): Promise<void> {
        for (const [teamName, store] of this.activeTeams.entries()) {
            try {
                await this.stopWorkflow(teamName, 'Cleanup');
                this.activeTeams.delete(teamName);
                this.workflowStats.delete(teamName);
            } catch (error) {
                this.logManager.error(`Error cleaning up team ${teamName}:`, error);
            }
        }
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    /**
     * Validate team setup
     */
    private async validateTeamSetup(params: {
        name: string;
        agents: AgentType[];
        tasks: TaskType[];
    }): Promise<TeamValidationResult> {
        const errors: string[] = [];

        if (!params.name) {
            errors.push('Team name is required');
        }

        params.agents.forEach(agent => {
            if (!agent.tools?.length) {
                errors.push(`Agent ${agent.name} has no tools`);
            }
            if (!agent.llmConfig) {
                errors.push(`Agent ${agent.name} has no LLM configuration`);
            }
        });

        params.tasks.forEach(task => {
            if (!task.title) errors.push('Task title is required');
            if (!task.description) errors.push('Task description is required');
            if (!task.agent) errors.push('Task must have assigned agent');
        });

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                teamName: params.name,
                agentCount: params.agents.length,
                taskCount: params.tasks.length
            }
        };
    }

    /**
     * Handle workflow error
     */
    private async handleWorkflowError(
        error: unknown,
        teamName: string,
        store?: TeamStore
    ): Promise<HandlerResult> {
        const errorResult = await this.errorManager.handleError({
            error: error as Error,
            context: { teamName },
            store: store ? {
                getState: () => store.getState(),
                setState: (fn) => store.setState(fn),
                prepareNewLog: store.prepareNewLog
            } : undefined
        });

        return {
            success: false,
            error: errorResult.error,
            data: null
        };
    }

    /**
     * Handle team not found error
     */
    private handleTeamNotFound(teamName: string): HandlerResult {
        return {
            success: false,
            error: new Error(`Team not found: ${teamName}`),
            data: null
        };
    }

    /**
     * Handle general team error
     */
    private async handleTeamError(error: unknown, teamName?: string): Promise<HandlerResult> {
        return this.handleWorkflowError(error, teamName || 'unknown');
    }
}

export default TeamManager.getInstance();