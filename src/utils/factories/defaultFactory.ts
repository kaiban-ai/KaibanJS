/**
 * @file defaultFactory.ts
 * @path src/utils/factories/defaultFactory.ts
 * @description Factory implementation for creating default objects used throughout the application
 */

import { 
    LLMUsageStats, 
    CostDetails, 
    TeamState,
    MemoryMetrics,
    TokenUsage,
    ResponseMetadata,
    LLMProvider,
    MessageMetadataFields,
    WorkflowMetadata,
    TaskStats,
    ModelUsageStats,
    TeamEnvironment,
    TeamInputs
} from '@/utils/types';

import { 
    TASK_STATUS_enum, 
    AGENT_STATUS_enum, 
    WORKFLOW_STATUS_enum 
} from "@/utils/types/common/enums";

/**
 * Factory for creating default objects used throughout the application
 */
export class DefaultFactory {
    /**
     * Creates default LLM usage statistics
     */
    static createLLMUsageStats(): LLMUsageStats {
        return {
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
        };
    }

    /**
     * Creates default cost details
     */
    static createCostDetails(): CostDetails {
        return {
            inputCost: 0,
            outputCost: 0,
            totalCost: 0,
            currency: 'USD',
            breakdown: {
                promptTokens: { count: 0, cost: 0 },
                completionTokens: { count: 0, cost: 0 }
            }
        };
    }

    /**
     * Creates default initial state for the team store
     */
    static createInitialState(): Partial<TeamState> {
        return {
            teamWorkflowStatus: 'INITIAL',
            workflowResult: null,
            name: '',
            agents: [],
            tasks: [],
            workflowLogs: [],
            inputs: {},
            workflowContext: '',
            env: {},
            logLevel: 'info',
            tasksInitialized: false
        };
    }

    /**
     * Creates default memory metrics
     */
    static createMemoryMetrics(): MemoryMetrics {
        return {
            totalMessages: 0,
            totalTokens: 0,
            memoryUsage: 0,
            lastCleanup: {
                timestamp: Date.now(),
                messagesRemoved: 0,
                tokensFreed: 0
            },
            modelSpecificStats: {}
        };
    }

    /**
     * Creates default token usage statistics
     */
    static createTokenUsage(): TokenUsage {
        return {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        };
    }

    /**
     * Creates default response metadata
     */
    static createResponseMetadata(provider: LLMProvider, model: string): ResponseMetadata {
        return {
            model,
            provider,
            timestamp: Date.now(),
            latency: 0,
            finishReason: undefined,
            requestId: undefined
        };
    }

    /**
     * Creates default message metadata
     */
    static createMessageMetadata(): MessageMetadataFields {
        return {
            messageId: undefined,
            parentMessageId: undefined,
            conversationId: undefined,
            timestamp: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            llmUsageStats: this.createLLMUsageStats(),
            costDetails: this.createCostDetails(),
            tokenCount: 0
        };
    }

    /**
     * Creates default workflow metadata
     */
    static createWorkflowMetadata(teamName: string): WorkflowMetadata {
        return {
            result: '',
            duration: 0,
            llmUsageStats: this.createLLMUsageStats(),
            iterationCount: 0,
            costDetails: this.createCostDetails(),
            teamName,
            taskCount: 0,
            agentCount: 0
        };
    }

    /**
     * Creates default task statistics
     */
    static createTaskStats(): TaskStats {
        return {
            startTime: Date.now(),
            endTime: Date.now(),
            duration: 0,
            llmUsageStats: this.createLLMUsageStats(),
            iterationCount: 0,
            modelUsage: {}
        };
    }

    /**
     * Creates default model usage statistics
     */
    static createModelUsageStats(): ModelUsageStats {
        return {
            tokens: {
                input: 0,
                output: 0
            },
            requests: {
                successful: 0,
                failed: 0
            },
            latency: {
                average: 0,
                p95: 0,
                max: 0
            },
            cost: 0
        };
    }

    /**
     * Creates default team environment
     */
    static createTeamEnvironment(): TeamEnvironment {
        return {};
    }

    /**
     * Creates default team inputs
     */
    static createTeamInputs(): TeamInputs {
        return {};
    }

    /**
     * Creates model-specific usage statistics
     */
    static createModelSpecificStats(model: string): {
        messageCount: number;
        tokenCount: number;
        averageTokensPerMessage: number;
    } {
        return {
            messageCount: 0,
            tokenCount: 0,
            averageTokensPerMessage: 0
        };
    }

    /**
     * Creates a safe partial state update
     */
    static createSafeStateUpdate<T>(updates: Partial<T>): Partial<T> {
        return {
            ...updates,
            timestamp: Date.now()
        };
    }

    /**
     * Creates default status objects for tasks, agents, and workflows
     */
    static createStatusObjects() {
        return {
            createTaskStatus: (status: keyof typeof TASK_STATUS_enum = 'TODO') => ({
                status,
                timestamp: Date.now(),
                metadata: {}
            }),
            createAgentStatus: (status: keyof typeof AGENT_STATUS_enum = 'INITIAL') => ({
                status,
                timestamp: Date.now(),
                metadata: {}
            }),
            createWorkflowStatus: (status: keyof typeof WORKFLOW_STATUS_enum = 'INITIAL') => ({
                status,
                timestamp: Date.now(),
                metadata: {}
            })
        };
    }
}

export default DefaultFactory;