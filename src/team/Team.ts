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
import type { IWorkflowLogMetadata } from '../types/team/teamLogsTypes';

import { 
    TASK_STATUS_enum, 
    WORKFLOW_STATUS_enum,
    AGENT_STATUS_enum,
} from '../types/common/enumTypes';

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
            stats: await this.getWorkflowStats()
        };
    }

    public async provideFeedback(taskId: string, feedbackContent: string): Promise<void> {
        await this.teamManager.provideFeedback(taskId, feedbackContent);
    }

    public async validateTask(taskId: string): Promise<void> {
        await this.teamManager.handleTaskStatusChange(taskId, TASK_STATUS_enum.VALIDATED);
    }

    public getWorkflowStatus(): WORKFLOW_STATUS_enum {
        return WORKFLOW_STATUS_enum.RUNNING; // This should come from TeamManager state
    }

    public async getWorkflowResult(): Promise<IWorkflowResult> {
        return {
            status: WORKFLOW_STATUS_enum.FINISHED,
            result: '',
            metadata: await this.getWorkflowStats(),
            completionTime: Date.now()
        };
    }

    public async getWorkflowStats(): Promise<IWorkflowStats> {
        const startTime = Date.now();
        const performanceMetrics = await this.metricsManager.getInitialPerformanceMetrics();
        const resourceMetrics = await this.metricsManager.getInitialResourceMetrics();
        const errorMetrics = this.metricsManager.getErrorMetrics();

        const llmUsageMetrics: ILLMUsageMetrics = {
            totalRequests: performanceMetrics.throughput.operationsPerSecond ?? 0,
            activeInstances: 0,
            activeUsers: 1,
            requestsPerSecond: performanceMetrics.throughput.operationsPerSecond ?? 0,
            averageResponseSize: resourceMetrics.networkUsage.download,
            peakMemoryUsage: resourceMetrics.memoryUsage,
            uptime: Date.now() - startTime,
            rateLimit: {
                current: 0,
                limit: 0,
                remaining: 0,
                resetTime: 0
            },
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
            timestamp: Date.now(),
            component: '',
            category: '',
            version: ''
        };

        const stats: IWorkflowStats = {
            llmUsageMetrics,
            iterationCount: Math.floor(performanceMetrics.throughput.operationsPerSecond ?? 0),
            duration: Date.now() - startTime
        };

        if (this.getWorkflowStatus() === WORKFLOW_STATUS_enum.FINISHED) {
            const metadata: IWorkflowLogMetadata = {
                workflow: {
                    duration: stats.duration,
                    id: this.name,
                    performance: performanceMetrics,
                    debugInfo: {
                        lastCheckpoint: '',
                        warnings: [],
                        errors: []
                    },
                    priority: 0,
                    retryCount: errorMetrics.totalErrors,
                    taskCount: this.tasks.length,
                    agentCount: this.agents.length,
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
                    llmUsageMetrics,
                    teamName: this.name,
                    messageCount: 0,
                    iterationCount: stats.iterationCount,
                    status: this.getWorkflowStatus()
                },
                performance: performanceMetrics,
                context: {
                    source: 'Team',
                    target: 'Workflow',
                    correlationId: this.name,
                    causationId: '',
                    taskId: '',
                    taskName: '',
                    agentId: '',
                    agentName: '',
                    workflowId: this.name,
                    messageId: '',
                    phase: 'stats',
                    duration: stats.duration
                },
                validation: {
                    isValid: true,
                    errors: [],
                    warnings: [],
                    metadata: {
                        timestamp: Date.now(),
                        validatorName: 'WorkflowStatsValidator'
                    }
                },
                timestamp: Date.now(),
                component: 'Team',
                operation: 'getWorkflowStats'
            };

            logPrettyWorkflowResult(metadata);
        }

        return stats;
    }

    public async cleanup(): Promise<void> {
        await this.messageManager.clear();
        await this.teamManager.stopWorkflow('Team cleanup requested');
    }
}

export default Team;
