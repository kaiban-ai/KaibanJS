/**
 * @file TeamManager.ts
 * @path KaibanJS/src/managers/domain/team/TeamManager.ts
 * @description Domain-level team management and organization 
 */

import CoreManager from '../../core/CoreManager';
import { StatusManager } from '../../core/StatusManager';
import { TaskManager } from '../task/TaskManager';
import { AgentManager } from '../agent/AgentManager';

// Core utilities
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';
import { DefaultFactory } from '@/utils/factories/defaultFactory';

// Import types from canonical locations
import type { 
    TeamState, 
    TeamEnvironment,
    TeamInputs,
    TeamStore,
    TeamValidationResult,
    TeamPerformanceMetrics,
    TeamExecutionContext,
    TeamRuntimeState 
} from '@/utils/types/team';

import type { 
    TaskType, 
    AgentType,
    WorkflowResult,
    WorkflowStats,
    ErrorType 
} from '@/utils/types';

import { WORKFLOW_STATUS_enum, TASK_STATUS_enum } from '@/utils/types/common/enums';

// ─── Team Manager Implementation ──────────────────────────────────────────────

export class TeamManager extends CoreManager {
    private static instance: TeamManager;
    private readonly statusManager: StatusManager;
    private readonly taskManager: TaskManager;
    private readonly agentManager: AgentManager;
    private readonly activeTeams: Map<string, TeamStore>;
    private readonly executionContexts: Map<string, TeamExecutionContext>;

    private constructor() {
        super();
        this.statusManager = StatusManager.getInstance();
        this.taskManager = TaskManager.getInstance();
        this.agentManager = AgentManager.getInstance();
        this.activeTeams = new Map();
        this.executionContexts = new Map();
    }

    // ─── Singleton Access ───────────────────────────────────────────────────

    public static getInstance(): TeamManager {
        if (!TeamManager.instance) {
            TeamManager.instance = new TeamManager();
        }
        return TeamManager.instance;
    }

    // ─── Team Lifecycle Management ──────────────────────────────────────────

    public async initializeTeam(
        name: string,
        agents: AgentType[],
        tasks: TaskType[],
        env: TeamEnvironment = {}
    ): Promise<TeamStore | null> {
        try {
            const validationResult = await this.validateTeamConfig({
                name,
                agents,
                tasks,
                env
            });

            if (!validationResult.isValid) {
                throw new PrettyError({
                    message: 'Invalid team configuration',
                    context: { errors: validationResult.errors }
                });
            }

            const store = this.createTeamStore({
                name,
                agents,
                tasks,
                env,
                teamWorkflowStatus: 'INITIAL',
                workflowResult: null,
                workflowLogs: [],
                inputs: {},
                workflowContext: '',
                logLevel: 'info',
                tasksInitialized: false
            });

            this.activeTeams.set(name, store);
            this.executionContexts.set(name, this.createExecutionContext(store));

            return store;

        } catch (error) {
            logger.error('Team initialization error:', error);
            return null;
        }
    }

    // ─── Team Workflow Management ─────────────────────────────────────────────

    public async startWorkflow(
        teamName: string,
        inputs: TeamInputs = {}
    ): Promise<WorkflowResult | null> {
        const team = this.activeTeams.get(teamName);
        if (!team) {
            logger.error(`Team not found: ${teamName}`);
            return null;
        }

        try {
            await this.statusManager.transition({
                currentStatus: team.getState().teamWorkflowStatus,
                targetStatus: WORKFLOW_STATUS_enum.RUNNING,
                entity: 'workflow',
                entityId: teamName,
                metadata: { inputs }
            });

            const context = this.executionContexts.get(teamName);
            if (!context) {
                throw new Error('Execution context not found');
            }

            context.startTime = Date.now();
            context.status = WORKFLOW_STATUS_enum.RUNNING;

            team.setState(state => ({
                ...state,
                inputs,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.RUNNING
            }));

            const stats = await this.getWorkflowStats(teamName);
            return {
                status: 'RUNNING',
                metadata: stats,
                completionTime: Date.now()
            };

        } catch (error) {
            return this.handleWorkflowError(error, teamName);
        }
    }

    public async getWorkflowStats(teamName: string): Promise<WorkflowStats | null> {
        const team = this.activeTeams.get(teamName);
        if (!team) return null;

        const context = this.executionContexts.get(teamName);
        if (!context) return null;

        return {
            startTime: context.startTime,
            endTime: Date.now(),
            duration: (Date.now() - context.startTime) / 1000,
            llmUsageStats: DefaultFactory.createLLMUsageStats(),
            iterationCount: context.stats.taskCount,
            costDetails: DefaultFactory.createCostDetails(),
            taskCount: team.getState().tasks.length,
            agentCount: team.getState().agents.length,
            teamName: team.getState().name,
            messageCount: team.getState().workflowLogs.length,
            modelUsage: {}
        };
    }

    // ─── Team State Management ───────────────────────────────────────────────

    public getTeam(teamName: string): TeamStore | null {
        return this.activeTeams.get(teamName) || null;
    }

    public getTeamStats(teamName: string): TeamPerformanceMetrics | null {
        const context = this.executionContexts.get(teamName);
        if (!context) return null;

        const team = this.activeTeams.get(teamName);
        if (!team) return null;

        return {
            tasks: {
                total: context.stats.taskCount,
                completed: context.stats.completedTaskCount,
                failed: context.stats.taskStatusCounts[TASK_STATUS_enum.ERROR] || 0,
                averageDuration: context.stats.taskCount > 0 
                    ? (Date.now() - context.startTime) / context.stats.taskCount 
                    : 0,
                successRate: context.stats.taskCount > 0
                    ? context.stats.completedTaskCount / context.stats.taskCount * 100
                    : 0
            },
            resources: {
                memory: context.stats.llmUsageStats.memoryUtilization.peakMemoryUsage,
                cpu: 0,
                averageLatency: context.stats.llmUsageStats.averageLatency,
                maxLatency: context.stats.llmUsageStats.totalLatency
            },
            costs: {
                total: context.stats.llmUsageStats.costBreakdown.total,
                breakdown: DefaultFactory.createCostDetails(),
                costPerTask: context.stats.taskCount > 0
                    ? context.stats.llmUsageStats.costBreakdown.total / context.stats.taskCount
                    : 0,
                costPerToken: context.stats.llmUsageStats.totalLatency > 0
                    ? context.stats.llmUsageStats.costBreakdown.total / context.stats.llmUsageStats.totalLatency
                    : 0
            },
            llm: {
                totalTokens: context.stats.llmUsageStats.inputTokens + context.stats.llmUsageStats.outputTokens,
                inputTokens: context.stats.llmUsageStats.inputTokens,
                outputTokens: context.stats.llmUsageStats.outputTokens,
                tokensPerTask: context.stats.taskCount > 0
                    ? (context.stats.llmUsageStats.inputTokens + context.stats.llmUsageStats.outputTokens) / context.stats.taskCount
                    : 0,
                tokensPerSecond: context.startTime > 0
                    ? (context.stats.llmUsageStats.inputTokens + context.stats.llmUsageStats.outputTokens) / ((Date.now() - context.startTime) / 1000)
                    : 0
            }
        };
    }

    // ─── Resource Management ────────────────────────────────────────────────

    public async cleanup(): Promise<void> {
        for (const [teamName, store] of this.activeTeams.entries()) {
            try {
                await this.stopWorkflow(teamName);
                this.activeTeams.delete(teamName);
                this.executionContexts.delete(teamName);
            } catch (error) {
                logger.error(`Error cleaning up team ${teamName}:`, error);
            }
        }
    }

    // ─── Private Helper Methods ───────────────────────────────────────────────

    private async validateTeamConfig(config: {
        name: string;
        agents: AgentType[];
        tasks: TaskType[];
        env: TeamEnvironment;
    }): Promise<TeamValidationResult> {
        const errors: string[] = [];

        if (!config.name) errors.push('Team name is required');
        if (!config.agents?.length) errors.push('At least one agent is required');
        if (!config.tasks?.length) errors.push('At least one task is required');

        // Validate each agent
        for (const agent of config.agents) {
            if (!agent.tools?.length) {
                errors.push(`Agent ${agent.name} has no tools configured`);
            }
            if (!agent.llmConfig) {
                errors.push(`Agent ${agent.name} has no LLM configuration`);
            }
        }

        // Validate tasks
        for (const task of config.tasks) {
            if (!task.title) errors.push('Task title is required');
            if (!task.description) errors.push('Task description is required');
            if (!task.agent) errors.push('Task must have an assigned agent');
        }

        return {
            isValid: errors.length === 0,
            errors,
            context: {
                teamName: config.name,
                agentCount: config.agents.length,
                taskCount: config.tasks.length
            }
        };
    }

    private createTeamStore(state: TeamState): TeamStore {
        // Implementation would use actual store creation logic
        return {
            getState: () => state,
            setState: (fn: (state: TeamState) => Partial<TeamState>) => {
                Object.assign(state, fn(state));
            },
            subscribe: () => () => {},
            destroy: () => {},
            ...state
        } as TeamStore;
    }

    private createExecutionContext(store: TeamStore): TeamExecutionContext {
        return {
            startTime: Date.now(),
            status: WORKFLOW_STATUS_enum.INITIAL,
            activeAgents: [],
            completedTasks: [],
            stats: {
                taskCount: store.getState().tasks.length,
                completedTaskCount: 0,
                completionPercentage: 0,
                taskStatusCounts: {
                    PENDING: 0,
                    TODO: store.getState().tasks.length,
                    DOING: 0,
                    BLOCKED: 0,
                    REVISE: 0,
                    DONE: 0,
                    ERROR: 0,
                    AWAITING_VALIDATION: 0,
                    VALIDATED: 0
                },
                llmUsageStats: DefaultFactory.createLLMUsageStats(),
                costDetails: DefaultFactory.createCostDetails()
            }
        };
    }

    private async stopWorkflow(teamName: string): Promise<void> {
        const team = this.activeTeams.get(teamName);
        if (!team) return;

        try {
            await this.statusManager.transition({
                currentStatus: team.getState().teamWorkflowStatus,
                targetStatus: WORKFLOW_STATUS_enum.STOPPING,
                entity: 'workflow',
                entityId: teamName
            });

            team.setState(state => ({
                ...state,
                teamWorkflowStatus: WORKFLOW_STATUS_enum.STOPPED
            }));

        } catch (error) {
            logger.error(`Error stopping workflow for team ${teamName}:`, error);
        }
    }

    private handleWorkflowError(error: unknown, teamName: string): WorkflowResult {
        const team = this.activeTeams.get(teamName);
        const context = this.executionContexts.get(teamName);

        const prettyError = new PrettyError({
            message: error instanceof Error ? error.message : String(error),
            context: {
                teamName,
                status: team?.getState().teamWorkflowStatus,
                activeAgents: context?.activeAgents.length
            }
        });

        logger.error(`Workflow error:`, prettyError);

        return {
            status: 'ERRORED',
            error: {
                message: prettyError.message,
                type: prettyError.type || 'WorkflowError',
                context: prettyError.context,
                timestamp: Date.now()
            },
            metadata: context?.stats || undefined,
            erroredAt: Date.now()
        };
    }
}

export default TeamManager;