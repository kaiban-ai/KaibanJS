/**
 * @file ReactChampionAgent.ts
 * @path src/agents/reactChampion/ReactChampionAgent.ts
 * @description React Champion agent implementation using manager-based architecture
 */

//import { BaseAgent } from '../baseAgent';
import AgentManagerSingleton from '../../utils/managers/domain/agent/AgentManager';
import { ErrorManager } from '../../utils/managers/core/ErrorManager';
import IterationManagerSingleton from '../../utils/managers/domain/agent/IterationManager';
import ToolManagerSingleton from '../../utils/managers/domain/agent/ToolManager';
import AgenticLoopManager from '../../utils/managers/domain/agent/AgenticLoopManager';

import type { 
    IReactChampionAgent, 
    IBaseAgent 
} from '../../utils/types/agent/base';
import type { 
    TaskType, 
    FeedbackObject 
} from '../../utils/types/task/base';
import type { 
    Output, 
    ParsedOutput 
} from '../../utils/types/llm/responses';
import type { AgenticLoopResult } from '../../utils/types/llm/instance';
import type { ErrorType } from '../../utils/types/common';
import { AGENT_STATUS_enum } from '../../utils/types/common/enums';

export class ReactChampionAgent extends BaseAgent implements IReactChampionAgent {
    public executableAgent: any;
    private readonly agentManager: typeof AgentManagerSingleton;
    private readonly iterationManager: typeof IterationManagerSingleton;
    private readonly toolManager: typeof ToolManagerSingleton;
    private readonly agenticLoopManager: AgenticLoopManager;
    private readonly errorManager: ErrorManager;

    constructor(config: any) {
        super(config);
        this.agentManager = AgentManagerSingleton;
        this.iterationManager = IterationManagerSingleton;
        this.toolManager = ToolManagerSingleton;
        this.agenticLoopManager = AgenticLoopManager.getInstance();
        this.errorManager = ErrorManager.getInstance();
    }

    public async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        try {
            return await this.agenticLoopManager.executeLoop({
                agent: this,
                task,
                feedbackMessage: undefined
            });
        } catch (error) {
            return this.handleAgenticLoopError({ 
                task, 
                error: error as ErrorType,
                iterations: 0,
                maxAgentIterations: this.maxIterations
            });
        }
    }

    public async workOnFeedback(
        task: TaskType,
        feedbackList: FeedbackObject[],
        context: string
    ): Promise<void> {
        try {
            await Promise.all(
                feedbackList.map(async (feedback) => {
                    return await this.agenticLoopManager.executeLoop({
                        agent: this,
                        task,
                        feedbackMessage: feedback.content
                    });
                })
            );
        } catch (error) {
            this.errorManager.handleError(
                new Error('Error processing task feedback'),
                { 
                    component: 'ReactChampionAgent',
                    method: 'workOnFeedback',
                    feedbackList, 
                    task,
                    error
                }
            );
            throw error;
        }
    }

    public handleAgenticLoopError(params: {
        task: TaskType;
        error: ErrorType;
        iterations: number;
        maxAgentIterations: number;
    }): AgenticLoopResult {
        const { task, error, iterations, maxAgentIterations } = params;

        this.errorManager.handleError(
            new Error('Agentic loop error'),
            {
                component: 'ReactChampionAgent',
                method: 'workOnTask',
                taskId: task.id,
                agentId: this.id,
                iterations,
                maxAgentIterations,
                error
            }
        );

        return {
            error: error.message,
            metadata: {
                iterations,
                maxAgentIterations
            }
        };
    }

    public createLLMInstance(): void {
        try {
            const agentManagerInstance = this.agentManager.getInstance();
            const toolManagerInstance = this.toolManager.getInstance();
            
            agentManagerInstance.initializeAgent(this, this.store, {
                ...this.env || {},
                tools: toolManagerInstance.getAgentTools(this)
            });
        } catch (error) {
            this.errorManager.handleError(
                new Error('Error creating LLM instance'),
                {
                    component: 'ReactChampionAgent',
                    method: 'createLLMInstance',
                    error
                }
            );
        }
    }

    // Implementation of required IReactChampionAgent methods...
    public handleIterationStart(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        const iterationManagerInstance = this.iterationManager.getInstance();
        iterationManagerInstance.handleIterationStart({ agent: this, ...params });
    }

    public handleIterationEnd(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        const iterationManagerInstance = this.iterationManager.getInstance();
        iterationManagerInstance.handleIterationEnd({ agent: this, ...params });
    }

    public handleFinalAnswer(params: {
        agent: IBaseAgent;
        task: TaskType;
        parsedLLMOutput: ParsedOutput;
    }): ParsedOutput {
        return params.parsedLLMOutput;
    }

    public handleMaxIterationsError(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        const iterationManagerInstance = this.iterationManager.getInstance();
        iterationManagerInstance.handleMaxIterationsError({ 
            agent: this, 
            ...params,
            error: new Error(`Maximum iterations (${params.maxAgentIterations}) reached`)
        });
    }

    public handleThinkingError(params: {
        task: TaskType;
        error: ErrorType;
    }): void {
        this.errorManager.handleError(params.error, {
            component: 'ReactChampionAgent',
            method: 'handleThinkingError',
            taskId: params.task.id,
            agentId: this.id
        });
    }

    public handleIssuesParsingLLMOutput(params: {
        agent: IBaseAgent;
        task: TaskType;
        output: Output;
        llmOutput: string;
    }): string {
        return this.promptTemplates.INVALID_JSON_FEEDBACK?.({
            agent: params.agent,
            task: params.task,
            llmOutput: params.llmOutput
        }) || 'Unable to parse LLM output';
    }
}

export default ReactChampionAgent;