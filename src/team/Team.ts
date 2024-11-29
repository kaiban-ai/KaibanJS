/**
 * @file Team.ts
 * @description Core Team implementation using manager architecture
 */

import { TeamManager } from '../managers/domain/team/teamManager';
import { MessageManager } from '../managers/domain/llm/messageManager';
import { MetricsManager } from '../managers/core/metricsManager';
import { logPrettyWorkflowResult } from '../utils/helpers/formatting/prettyLogs';

import type { ITeamState } from '../types/team/teamBaseTypes';
import type {
    IWorkflowStartResult,
    IWorkflowResult
} from '../types/workflow/workflowBaseTypes';
import type { IWorkflowStats } from '../types/workflow/workflowStatsTypes';
import type { ILLMUsageMetrics } from '../types/llm/llmMetricTypes';
import type { IAgentType } from '../types/agent/agentBaseTypes';
import type { ITaskType } from '../types/task/taskBaseTypes';

import { 
    TASK_STATUS_enum, 
    WORKFLOW_STATUS_enum,
    AGENT_STATUS_enum,
} from '../types/common/commonEnums';

export class Team {
    private readonly teamManager: TeamManager;
    private readonly messageManager: MessageManager;
    private readonly metricsManager: MetricsManager;
    private readonly name: string;
    private readonly agents: string[];
    private readonly tasks: string[];

    constructor(params: { 
        name: string; 
        agents?: IAgentType[]; 
        tasks?: ITaskType[]; 
        logLevel?: string; 
        inputs?: Record<string, unknown>; 
        env?: Record<string, string> 
    }) {
        this.name = params.name;
        this.agents = params.agents?.map(agent => agent.id) || [];
        this.tasks = params.tasks?.map(task => task.id) || [];
        this.teamManager = TeamManager.getInstance();
        this.messageManager = MessageManager.getInstance();
        this.metricsManager = MetricsManager.getInstance();
        
        this.initialize(params);
    }

    private async initialize(params: { 
        agents?: IAgentType[]; 
        tasks?: ITaskType[]; 
        env?: Record<string, string> 
    }): Promise<void> {
        // Initialize agents and tasks through their respective managers
        if (params.agents) {
            for (const agent of params.agents) {
                await this.teamManager.handleAgentStatusChange(agent, AGENT_STATUS_enum.INITIAL);
            }
        }

        if (params.tasks) {
            for (const task of params.tasks) {
                await this.teamManager.handleTaskStatusChange(task.id, TASK_STATUS_enum.TODO);
            }
        }
    }

    public async start(inputs: Record<string, unknown> = {}): Promise<IWorkflowStartResult> {
        const state: ITeamState = {
            name: this.name,
            agents: this.agents,
            tasks: this.tasks,
            workflowLogs: [],
            teamWorkflowStatus: WORKFLOW_STATUS_enum.INITIAL,
            workflowContext: {},
            inputs,
            env: {},
            tasksInitialized: false
        };

        const result = await this.teamManager.startWorkflow(state, inputs);

        if (!result.success) {
            throw result.error;
        }

        return {
            status: WORKFLOW_STATUS_enum.RUNNING,
            result: result.data as IWorkflowResult,
            stats: this.getWorkflowStats()
        };
    }

    public async provideFeedback(taskId: string, feedbackContent: string): Promise<void> {
        await this.teamManager.provideFeedback(taskId, feedbackContent);
    }

    public async validateTask(taskId: string): Promise<void> {
        await this.teamManager.handleTaskStatusChange(taskId, TASK_STATUS_enum.VALIDATED);
    }

    public getWorkflowStatus(): keyof typeof WORKFLOW_STATUS_enum {
        return WORKFLOW_STATUS_enum.RUNNING; // This should come from TeamManager state
    }

    public getWorkflowResult(): IWorkflowResult {
        return {
            status: WORKFLOW_STATUS_enum.FINISHED,
            result: '',
            metadata: this.getWorkflowStats(),
            completionTime: Date.now()
        };
    }

    public getWorkflowStats(): IWorkflowStats {
        const context = this.metricsManager.createIterationContext();
        const llmUsageMetrics: ILLMUsageMetrics = {
            totalRequests: context.usage.totalRequests,
            activeInstances: 0,
            activeUsers: context.usage.activeUsers,
            requestsPerSecond: context.usage.requestsPerSecond,
            averageResponseLength: 0,
            averageResponseSize: context.usage.averageResponseSize,
            peakMemoryUsage: context.usage.peakMemoryUsage,
            uptime: context.usage.uptime,
            rateLimit: context.usage.rateLimit,
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
            timestamp: context.usage.timestamp
        };

        const stats: IWorkflowStats = {
            llmUsageMetrics,
            iterationCount: context.iterations,
            duration: Date.now() - context.startTime
        };

        if (this.getWorkflowStatus() === WORKFLOW_STATUS_enum.FINISHED) {
            logPrettyWorkflowResult({
                metadata: {
                    result: String(this.getWorkflowResult()),
                    duration: stats.duration,
                    llmUsageMetrics: stats.llmUsageMetrics,
                    iterationCount: stats.iterationCount
                }
            });
        }

        return stats;
    }

    public async cleanup(): Promise<void> {
        await this.messageManager.clear();
        await this.teamManager.stopWorkflow('Team cleanup requested');
    }
}

export default Team;
