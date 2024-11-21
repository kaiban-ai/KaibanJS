/**
 * @file reactChampionAgent.ts
 * @path C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\agents\reactChampionAgent.ts
 * @description React Champion agent implementation using manager-based architecture
 */

import { v4 as uuidv4 } from 'uuid';
import { Tool } from "langchain/tools";
import { BaseAgentManager } from '../managers/domain/agent/baseAgentManager';
import { LLMManager } from '../managers/domain/llm/llmManager';
import { TaskManager } from '../managers/domain/task/taskManager';
import { getApiKey } from '../utils/helpers/agent/agentUtils';

import type { 
    IReactChampionAgent, 
    IBaseAgent 
} from '../types/agent/agentBaseTypes';
import type { 
    TaskType, 
    FeedbackObject 
} from '../types/task/taskBase';
import type { 
    Output, 
    ParsedOutput 
} from '../types/llm/llmResponseTypes';
import type { AgenticLoopResult } from '../types/llm/llmInstanceTypes';
import type { ErrorType } from '../types/common';
import type { HandlerResult } from '../types/agent/agentHandlersTypes';
import { AGENT_STATUS_enum } from '../types/common/commonEnums';
import { REACTChampionAgentPrompts } from '../types/agent/promptsTypes';
import { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from '../utils/helpers/prompts';
import { LLMProviders } from '../types/llm/llmCommonTypes';

interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class ReactChampionAgent extends BaseAgentManager implements IReactChampionAgent {
    public id: string;
    public name: string;
    public role: string;
    public goal: string;
    public background: string;
    public tools: Tool[];
    public maxIterations: number;
    public store!: any;
    public status: keyof typeof AGENT_STATUS_enum;
    public env: Record<string, any> | null;
    public llmInstance: any | null;
    public llmConfig: any;
    public llmSystemMessage: string | null;
    public forceFinalAnswer: boolean;
    public promptTemplates: REACTChampionAgentPrompts;
    public messageHistory: any;
    public executableAgent: any;

    private static instance: ReactChampionAgent;

    constructor(config: any) {
        super();

        const mergedConfig = {
            ...config,
            promptTemplates: {
                ...REACT_CHAMPION_AGENT_DEFAULT_PROMPTS,
                ...config.promptTemplates
            }
        };

        // Validate required configuration parameters
        this.validateRequiredParams(mergedConfig, ['name', 'role', 'goal']);

        // Initialize required properties
        this.id = uuidv4();
        this.name = mergedConfig.name;
        this.role = mergedConfig.role;
        this.goal = mergedConfig.goal;
        this.background = mergedConfig.background || '';
        this.tools = mergedConfig.tools || [];
        this.maxIterations = mergedConfig.maxIterations || 10;
        this.status = AGENT_STATUS_enum.INITIAL;
        this.env = null;
        this.llmInstance = mergedConfig.llmInstance || null;
        this.llmConfig = this.normalizeLlmConfig(mergedConfig.llmConfig || {});
        this.llmSystemMessage = null;
        this.forceFinalAnswer = mergedConfig.forceFinalAnswer ?? true;
        this.promptTemplates = mergedConfig.promptTemplates;

        this.log(`Agent created: ${this.name}`);
    }

    public static getInstance(config?: any): ReactChampionAgent {
        if (!ReactChampionAgent.instance) {
            ReactChampionAgent.instance = new ReactChampionAgent(config);
        }
        return ReactChampionAgent.instance;
    }

    protected async validateAgent(agent: IBaseAgent): Promise<ValidationResult> {
        const errors: string[] = [];

        try {
            this.validateRequiredParams(
                { name: agent.name, role: agent.role, goal: agent.goal },
                ['name', 'role', 'goal']
            );
        } catch (error) {
            errors.push((error as Error).message);
        }

        if (!agent.llmConfig?.provider) {
            errors.push('LLM configuration missing or invalid');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    protected async initializeAgent(agent: IBaseAgent): Promise<void> {
        const result = await this.safeExecute(async () => {
            if (!agent.llmInstance) {
                const apiKey = getApiKey(agent.llmConfig, agent.env as Record<string, string> || {});
                if (!apiKey) {
                    throw new Error('API key is required via config or environment');
                }
                agent.llmConfig.apiKey = apiKey;
                this.createLLMInstance();
            }

            await this.handleStatusTransition({
                currentStatus: agent.status,
                targetStatus: AGENT_STATUS_enum.INITIAL,
                entity: 'agent',
                entityId: agent.id,
                metadata: this.prepareMetadata({ agent })
            });
        }, 'Agent initialization failed');

        if (result === null) {
            throw new Error('Agent initialization failed');
        }
    }

    protected async cleanupAgent(agentId: string): Promise<void> {
        const result = await this.safeExecute(async () => {
            const agent = this.activeAgents.get(agentId);
            if (agent) {
                agent.llmInstance = null;
                await this.handleStatusTransition({
                    currentStatus: agent.status,
                    targetStatus: AGENT_STATUS_enum.IDLE,
                    entity: 'agent',
                    entityId: agentId,
                    metadata: this.prepareMetadata({ reason: 'cleanup' })
                });
            }
        }, 'Agent cleanup failed');

        if (result === null) {
            throw new Error('Agent cleanup failed');
        }
    }

    protected async handleAgentOperation(params: {
        agent: IBaseAgent;
        task: TaskType;
        store: any;
    }): Promise<HandlerResult> {
        const result = await this.safeExecute(async () => {
            const { agent, task } = params;
            
            // Core agent operation logic would go here
            
            return {
                success: true,
                data: this.prepareMetadata({
                    agentId: agent.id,
                    taskId: task.id,
                    completed: true
                })
            } as HandlerResult;
        }, 'Agent operation failed');

        if (result === null) {
            throw new Error('Agent operation failed');
        }

        return result;
    }

    protected async handleFeedback(params: {
        agent: IBaseAgent;
        task: TaskType;
        feedback: string;
        context: string;
    }): Promise<HandlerResult> {
        const result = await this.safeExecute(async () => {
            const { agent, task } = params;
            
            // Feedback handling logic would go here
            
            return {
                success: true,
                data: this.prepareMetadata({
                    agentId: agent.id,
                    taskId: task.id,
                    feedbackProcessed: true
                })
            } as HandlerResult;
        }, 'Feedback handling failed');

        if (result === null) {
            throw new Error('Feedback handling failed');
        }

        return result;
    }

    public async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        const result = await this.safeExecute(async () => {
            await this.registerAgent(this as unknown as IBaseAgent);
            
            const operationResult = await this.handleAgentOperation({
                agent: this as unknown as IBaseAgent,
                task,
                store: this.store
            });

            if (!operationResult.success) {
                throw operationResult.error;
            }

            await this.unregisterAgent(this.id);

            return {
                result: operationResult.data,
                metadata: operationResult.data
            } as AgenticLoopResult;
        }, 'Task execution failed');

        if (result === null) {
            throw new Error('Task execution failed');
        }

        return result;
    }

    public async workOnFeedback(
        task: TaskType,
        feedbackList: FeedbackObject[],
        context: string
    ): Promise<void> {
        const result = await this.safeExecute(async () => {
            await Promise.all(
                feedbackList.map(async (feedback) => {
                    return await this.handleFeedback({
                        agent: this as unknown as IBaseAgent,
                        task,
                        feedback: feedback.content,
                        context
                    });
                })
            );
        }, 'Feedback processing failed');

        if (result === null) {
            throw new Error('Feedback processing failed');
        }
    }

    public handleAgenticLoopError(params: {
        task: TaskType;
        error: ErrorType;
        iterations: number;
        maxAgentIterations: number;
    }): AgenticLoopResult {
        const { error, iterations, maxAgentIterations } = params;

        this.handleError(
            error as Error,
            'Agentic loop error'
        );

        return {
            error: error.message,
            metadata: {
                iterations,
                maxAgentIterations,
                ...this.prepareMetadata()
            }
        };
    }

    public createLLMInstance(): void {
        const result = this.safeExecute(async () => {
            this.llmInstance = this.llmManager.createInstance(this.llmConfig);
        }, 'LLM instance creation failed');
    }

    public handleTaskCompleted(params: {
        task: TaskType;
        parsedResultWithFinalAnswer: ParsedOutput;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { task, parsedResultWithFinalAnswer, iterations, maxAgentIterations } = params;
        
        this.handleStatusTransition({
            currentStatus: this.status,
            targetStatus: AGENT_STATUS_enum.TASK_COMPLETED,
            entity: 'agent',
            entityId: this.id,
            metadata: this.prepareMetadata({
                iterations,
                maxAgentIterations,
                result: parsedResultWithFinalAnswer
            })
        });
        
        const log = this.store.prepareNewLog({
            agent: this,
            task,
            logDescription: 'Task completed successfully',
            metadata: this.prepareMetadata({
                iterations,
                maxAgentIterations,
                result: parsedResultWithFinalAnswer
            }),
            logType: 'AgentStatusUpdate',
            agentStatus: AGENT_STATUS_enum.TASK_COMPLETED
        });

        this.store.setState((state: any) => ({
            workflowLogs: [...state.workflowLogs, log]
        }));
    }

    public handleIterationStart(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        this.handleStatusTransition({
            currentStatus: this.status,
            targetStatus: AGENT_STATUS_enum.ITERATION_START,
            entity: 'agent',
            entityId: this.id,
            metadata: this.prepareMetadata(params)
        });
        
        this.log(
            `Starting iteration ${params.iterations + 1}/${params.maxAgentIterations}`,
            this.name,
            params.task.id
        );
    }

    public handleIterationEnd(params: { 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number; 
    }): void {
        this.handleStatusTransition({
            currentStatus: this.status,
            targetStatus: AGENT_STATUS_enum.ITERATION_END,
            entity: 'agent',
            entityId: this.id,
            metadata: this.prepareMetadata(params)
        });
        
        this.log(
            `Completed iteration ${params.iterations + 1}/${params.maxAgentIterations}`,
            this.name,
            params.task.id
        );
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
        this.handleError(
            new Error(`Maximum iterations (${params.maxAgentIterations}) reached`),
            'Max iterations exceeded'
        );
    }

    public handleThinkingError(params: {
        task: TaskType;
        error: ErrorType;
    }): void {
        this.handleError(
            params.error as Error,
            'Error during thinking phase'
        );
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

    public normalizeLlmConfig(llmConfig: any): any {
        if (llmConfig.provider === 'none') {
            return {
                provider: LLMProviders.OPENAI,
                model: 'gpt-4',
                apiKey: ''
            };
        }
        
        return {
            ...llmConfig,
            provider: llmConfig.provider || LLMProviders.OPENAI,
            model: llmConfig.model || 'gpt-4',
            apiKey: llmConfig.apiKey || ''
        };
    }

    public setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        this.handleStatusTransition({
            currentStatus: this.status,
            targetStatus: status,
            entity: 'agent',
            entityId: this.id,
            metadata: this.prepareMetadata()
        });
    }

    public setStore(store: any): void {
        const result = this.safeExecute(async () => {
            this.validateRequiredParams({ store }, ['store']);
            this.store = store;
        }, 'Store setting failed');

        if (result === null) {
            throw new Error('Store setting failed');
        }
    }

    public setEnv(env: Record<string, any>): void {
        const result = this.safeExecute(async () => {
            this.env = env;
            this.log(`Environment updated for agent: ${this.name}`, this.name);
        }, 'Environment setting failed');

        if (result === null) {
            throw new Error('Environment setting failed');
        }
    }

    public initialize(store: any, env: Record<string, any>): void {
        const result = this.safeExecute(async () => {
            this.validateRequiredParams({ store }, ['store']);
            this.store = store;
            this.env = env;

            if (!this.llmInstance) {
                const apiKey = getApiKey(this.llmConfig, this.env as Record<string, string> || {});
                if (!apiKey) {
                    throw new Error('API key is required via config or environment');
                }
                this.llmConfig.apiKey = apiKey;
                this.createLLMInstance();
            }

            this.log(`Initialized agent: ${this.name}`, this.name);
        }, 'Agent initialization failed');

        if (result === null) {
            throw new Error('Agent initialization failed');
        }
    }
}

export default ReactChampionAgent;
