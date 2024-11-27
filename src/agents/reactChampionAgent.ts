/**
 * @file reactChampionAgent.ts
 * @path src/agents/reactChampionAgent.ts
 * @description React Champion agent implementation using CoreManager services
 *
 * @module @agents
 */

// LLM Provider Imports
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';

// Core LangChain Imports
import { SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Tool } from "langchain/tools";
import { Runnable } from "@langchain/core/runnables";

// Local Imports
import { BaseAgent } from './baseAgent';
import { getApiKey } from '../utils/helpers/agent/agentUtils';
import { createError } from '../types/common/commonErrorTypes';

import type { 
    IReactChampionAgent, 
    IBaseAgent,
    IExecutableAgent
} from '../types/agent/agentBaseTypes';
import type { 
    ITaskType, 
    ITaskFeedback 
} from '../types/task/taskBaseTypes';
import type { 
    IOutput, 
    IParsedOutput 
} from '../types/llm/llmResponseTypes';
import type { IAgenticLoopResult } from '../types/llm/llmInstanceTypes';
import type { IErrorType, IErrorKind } from '../types/common/commonErrorTypes';
import type { IHandlerResult } from '../types/common/commonHandlerTypes';
import { AGENT_STATUS_enum } from '../types/common/commonEnums';
import type { IREACTChampionAgentPrompts } from '../types/agent/promptsTypes';
import type { IMessageHistory } from '../types/llm/message/messagingHistoryTypes';
import type { ILLMManager } from '../types/llm/llmManagerTypes';
import type { IThinkingManager } from '../types/agent/agentHandlersTypes';
import { 
    type ILLMConfig,
    type LLMProviderConfig
} from '../types/llm/llmCommonTypes';

export class ReactChampionAgent extends BaseAgent implements IReactChampionAgent {
    public executableAgent: IExecutableAgent;

    constructor(config: {
        id: string;
        name: string;
        role: string;
        goal: string;
        tools?: Tool[];
        llmConfig: ILLMConfig;
        promptTemplates: IREACTChampionAgentPrompts;
        messageHistory: IMessageHistory;
        store: any;
    }) {
        super({
            ...config,
            llmConfig: config.llmConfig
        });

        this.executableAgent = {
            runnable: {} as Runnable,
            getMessageHistory: () => new ChatMessageHistory(),
            inputMessagesKey: 'input',
            historyMessagesKey: 'history'
        };

        this.logInfo(`Agent created: ${this.name}`);
    }

    // ─── Task Execution ──────────────────────────────────────────────────────

    public async workOnTask(task: ITaskType): Promise<IAgenticLoopResult> {
        const result = await this.agentManager.executeAgentLoop(this, task);

        if (!result.success) {
            throw createError({
                message: typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to execute task',
                type: 'ExecutionError' as IErrorKind,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    taskId: task.id
                }
            });
        }

        return {
            result: result.result,
            metadata: {
                iterations: result.metadata.iterations,
                maxAgentIterations: result.metadata.maxAgentIterations
            }
        };
    }

    // ─── LLM Management ──────────────────────────────────────────────────────

    public normalizeLlmConfig(llmConfig: ILLMConfig): ILLMConfig {
        const llmManager = this.getDomainManager<ILLMManager>('LLMManager');
        return llmManager.normalizeConfig(llmConfig);
    }

    public async createLLMInstance(): Promise<void> {
        const llmManager = this.getDomainManager<ILLMManager>('LLMManager');
        const instance = await llmManager.createInstance(this.llmConfig);
        if (!instance.success || !instance.data) {
            throw createError({
                message: instance.error?.message || 'Failed to create LLM instance',
                type: 'InitializationError' as IErrorKind,
                context: {
                    component: this.constructor.name,
                    agentId: this.id
                }
            });
        }

        // Create a complete LLMInstance with all required methods
        this.llmInstance = {
            ...instance.data,
            generate: instance.data.generate.bind(instance.data),
            generateStream: instance.data.generateStream.bind(instance.data),
            validateConfig: instance.data.validateConfig.bind(instance.data),
            cleanup: instance.data.cleanup.bind(instance.data),
            getConfig: () => this.llmConfig,
            updateConfig: (updates) => {
                this.llmConfig = { ...this.llmConfig, ...updates };
            },
            getProvider: () => this.llmConfig.provider
        };
    }

    // ─── Iteration Handling ───────────────────────────────────────────────────

    public handleIterationStart(params: { 
        task: ITaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        this.handleStatusTransition({
            entity: 'agent',
            entityId: this.id,
            currentStatus: this.status,
            targetStatus: 'ITERATION_START' as keyof typeof AGENT_STATUS_enum,
            context: {
                agentId: this.id,
                agentName: this.name,
                operation: 'iteration_start',
                ...params
            }
        });
    }

    public handleIterationEnd(params: { 
        task: ITaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        this.handleStatusTransition({
            entity: 'agent',
            entityId: this.id,
            currentStatus: this.status,
            targetStatus: 'ITERATION_END' as keyof typeof AGENT_STATUS_enum,
            context: {
                agentId: this.id,
                agentName: this.name,
                operation: 'iteration_end',
                ...params
            }
        });
    }

    // ─── Error Handling ──────────────────────────────────────────────────────

    public handleThinkingError(params: {
        task: ITaskType;
        error: IErrorType;
    }): void {
        this.handleError(
            createError({
                message: params.error.message,
                type: 'CognitiveError' as IErrorKind,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    taskId: params.task.id
                }
            }),
            'Error during thinking phase'
        );
    }

    public handleMaxIterationsError(params: { 
        task: ITaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        this.handleError(
            createError({
                message: `Maximum iterations (${params.maxAgentIterations}) reached`,
                type: 'ExecutionError' as IErrorKind,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    taskId: params.task.id,
                    iterations: params.iterations,
                    maxIterations: params.maxAgentIterations
                }
            }),
            'Max iterations exceeded'
        );
    }

    public handleAgenticLoopError(params: {
        task: ITaskType;
        error: IErrorType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.handleError(
            createError({
                message: params.error.message,
                type: 'ExecutionError' as IErrorKind,
                context: {
                    component: this.constructor.name,
                    agentId: this.id,
                    taskId: params.task.id,
                    iterations: params.iterations,
                    maxIterations: params.maxAgentIterations
                }
            }),
            'Agentic loop error'
        );
    }

    // ─── Task Completion ─────────────────────────────────────────────────────

    public handleTaskCompleted(params: {
        task: ITaskType;
        parsedResultWithFinalAnswer: IParsedOutput;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        this.handleStatusTransition({
            entity: 'agent',
            entityId: this.id,
            currentStatus: this.status,
            targetStatus: 'TASK_COMPLETED' as keyof typeof AGENT_STATUS_enum,
            context: {
                agentId: this.id,
                agentName: this.name,
                operation: 'task_completed',
                ...params
            }
        });
    }

    public handleFinalAnswer(params: {
        agent: IBaseAgent;
        task: ITaskType;
        parsedLLMOutput: IParsedOutput;
    }): IParsedOutput {
        return params.parsedLLMOutput;
    }

    public handleIssuesParsingLLMOutput(params: {
        agent: IBaseAgent;
        task: ITaskType;
        output: IOutput;
        llmOutput: string;
    }): string {
        return this.promptTemplates.INVALID_JSON_FEEDBACK?.({
            agent: params.agent,
            task: params.task,
            llmOutput: params.llmOutput
        }) || 'Unable to parse LLM output';
    }

    // ─── Abstract Method Implementation ────────────────────────────────────────

    public async think(): Promise<IHandlerResult<unknown>> {
        const thinkingManager = this.getDomainManager<IThinkingManager>('ThinkingManager');
        if (!this.executionState.currentTask) {
            throw createError({
                message: 'No current task assigned',
                type: 'StateError' as IErrorKind,
                context: {
                    component: this.constructor.name,
                    agentId: this.id
                }
            });
        }

        const result = await thinkingManager.executeThinking({
            agent: this,
            task: this.executionState.currentTask,
            ExecutableAgent: this.executableAgent
        });

        return result;
    }
}
