/**
 * @file ReactChampionAgent.ts
 * @path KaibanJS/src/agents/reactChampion/ReactChampionAgent.ts
 * @description React Champion agent implementation using manager-based architecture
 */

// Core utilities
import { logger } from '@/utils/core/logger';
import { PrettyError } from '@/utils/core/errors';

// Managers
import { AgentManager } from '@/utils/managers/domain/agent/AgentManager';
import { StatusManager } from '@/utils/managers/core/StatusManager';
import { MessageHistoryManager } from '@/utils/managers/domain/llm/MessageHistoryManager';

// Handlers
import { messageHandler } from '@/utils/handlers/messageHandler';
import { errorHandler } from '@/utils/handlers/errorHandler';
import { taskHandler } from '@/utils/handlers/taskHandler';

// Base Agent
import { BaseAgent } from '../baseAgent';

// Types from canonical locations
import type { 
    AgenticLoopResult,
    TaskType, 
    FeedbackObject,
    IReactChampionAgent,
    ThinkingResult,
    Output,
    ParsedOutput,
    ErrorType,
    REACTChampionAgentPrompts
} from '@/utils/types';

import { AGENT_STATUS_enum } from '@/utils/types/common/enums';

/**
 * React Champion Agent Implementation
 */
export class ReactChampionAgent extends BaseAgent implements IReactChampionAgent {
    public executableAgent: any;
    private readonly agentManager: AgentManager;
    private readonly statusManager: StatusManager;
    private readonly messageHistory: MessageHistoryManager;

    constructor(config: any) {  // TODO: Type this properly based on your config needs
        super(config);
        this.agentManager = AgentManager.getInstance();
        this.statusManager = StatusManager.getInstance();
        this.messageHistory = MessageHistoryManager.getInstance();
    }

    // ─── Task Processing ────────────────────────────────────────────────────────

    public async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        try {
            logger.info(`Agent ${this.name} working on task ${task.title}`);

            // Let AgentManager handle the execution
            const result = await this.agentManager.executeTask(
                this.id, 
                task,
                { startTime: Date.now() }
            );

            return {
                result: result.result as Output | null,
                error: result.error?.message,
                metadata: {
                    iterations: result.context?.iterations || 0,
                    maxAgentIterations: this.maxIterations
                }
            };

        } catch (error) {
            return this.handleAgenticLoopError({ 
                task, 
                error: error as ErrorType,
                iterations: 0,
                maxAgentIterations: this.maxIterations
            });
        }
    }

    // ─── Feedback Processing ─────────────────────────────────────────────────────

    public async workOnFeedback(
        task: TaskType,
        feedbackList: FeedbackObject[],
        context: string
    ): Promise<void> {
        try {
            await Promise.all(
                feedbackList.map(feedback => 
                    taskHandler.handleTaskFeedback(this.store, task.id, feedback.content)
                )
            );
        } catch (error) {
            await errorHandler.handleError({
                error: error as ErrorType,
                context: { feedbackList, task },
                task,
                agent: this,
                store: this.store
            });
            throw error;
        }
    }

    // ─── Error Handlers ─────────────────────────────────────────────────────────

    private handleAgenticLoopError(params: {
        task: TaskType;
        error: ErrorType;
        iterations: number;
        maxAgentIterations: number;
    }): AgenticLoopResult {
        const { task, error, iterations, maxAgentIterations } = params;

        const prettyError = new PrettyError({
            message: error.message,
            context: {
                taskId: task.id,
                agentId: this.id,
                iterations,
                maxAgentIterations
            },
            rootError: error
        });

        logger.error(`Agentic loop error:`, prettyError);

        return {
            error: prettyError.message,
            metadata: {
                iterations,
                maxAgentIterations
            }
        };
    }

    public handleThinkingError(params: {
        task: TaskType;
        error: ErrorType;
    }): void {
        const { task, error } = params;
        errorHandler.handleError({
            error,
            context: { phase: 'thinking' },
            task,
            agent: this,
            store: this.store
        });
    }

    public handleMaxIterationsError(params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { task, iterations, maxAgentIterations } = params;

        const error = new PrettyError({
            message: `Maximum iterations (${maxAgentIterations}) exceeded`,
            context: { taskId: task.id, iterations, maxIterations: maxAgentIterations }
        });

        errorHandler.handleError({
            error,
            context: { phase: 'iterations' },
            task,
            agent: this,
            store: this.store
        });
    }

    // ─── LLM Instance Creation ────────────────────────────────────────────────────

    public createLLMInstance(): void {
        try {
            this.executableAgent = this.agentManager.createExecutableAgent(this);
        } catch (error) {
            logger.error('Error creating LLM instance:', error);
            throw error;
        }
    }

    // ─── Status Transition Handlers ───────────────────────────────────────────────

    public async handleIterationStart(params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<void> {
        const { task, iterations, maxAgentIterations } = params;

        await this.statusManager.transition({
            currentStatus: this.status,
            targetStatus: AGENT_STATUS_enum.ITERATION_START,
            entity: 'agent',
            entityId: this.id,
            metadata: { iterations, maxAgentIterations }
        });

        logger.debug(`Starting iteration ${iterations + 1}/${maxAgentIterations}`);
    }

    public async handleIterationEnd(params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): Promise<void> {
        const { task, iterations, maxAgentIterations } = params;

        await this.statusManager.transition({
            currentStatus: this.status,
            targetStatus: AGENT_STATUS_enum.ITERATION_END,
            entity: 'agent',
            entityId: this.id,
            metadata: { iterations, maxAgentIterations }
        });

        logger.debug(`Completed iteration ${iterations + 1}/${maxAgentIterations}`);
    }

    public handleTaskCompleted(params: {
        task: TaskType;
        parsedResultWithFinalAnswer: ParsedOutput;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { task, parsedResultWithFinalAnswer, iterations, maxAgentIterations } = params;

        taskHandler.handleCompletion({
            store: this.store,
            agent: this,
            task,
            result: parsedResultWithFinalAnswer,
            metadata: {
                iterations,
                maxAgentIterations
            }
        });
    }

    public handleFinalAnswer(params: {
        agent: IReactChampionAgent;
        task: TaskType;
        parsedLLMOutput: ParsedOutput;
    }): ParsedOutput {
        return params.parsedLLMOutput;
    }

    public handleIssuesParsingLLMOutput(params: {
        agent: IReactChampionAgent;
        task: TaskType;
        output: Output;
        llmOutput: string;
    }): string {
        return this.promptTemplates.INVALID_JSON_FEEDBACK({
            agent: params.agent,
            task: params.task,
            llmOutput: params.llmOutput
        });
    }
}

// Export the class
export default ReactChampionAgent;