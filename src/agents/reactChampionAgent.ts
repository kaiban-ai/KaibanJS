import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatGroq, ChatGroqInput } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { GoogleGenerativeAIChatInput } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { Tool } from "langchain/tools";

import { BaseAgent as BaseAgentImplementation } from './baseAgent';
import MessageHistoryManager from '@/utils/managers/messageHistoryManager';
import { interpolateTaskDescription } from "@/utils/helpers/tasks";
import { getParsedJSON } from '@/utils/parsers/parser';
import { logger } from "@/utils/core/logger";
import { LLMInvocationError } from '@/utils/core/errors';
import { AGENT_STATUS_enum } from "@/utils/types/common/enums";
import type { REACTChampionAgentPrompts } from '@/utils/types/agent/prompts';
import { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS } from '@/utils/helpers/prompts/prompts';

import { ThinkingResult } from "@/utils/types/agent/handlers";

import type {
    AgenticLoopResult
} from '@/utils/types/llm/instance';

import type {
    ParsedOutput,
    Output
} from '@/utils/types/llm/responses';

import {
    isGroqConfig,
    isOpenAIConfig,
    isAnthropicConfig,
    isGoogleConfig,
    isMistralConfig
} from '@/utils/types';

import type {
    BaseAgentConfig,
    TaskType,
    LLMConfig,
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig,
    FeedbackObject,
    ThinkingHandlerParams,
    AgentType,
    LLMUsageStats,
    IReactChampionAgent
} from '@/utils/types';

class ReactChampionAgent extends BaseAgentImplementation implements IReactChampionAgent {
    executableAgent: any;
    messageHistory: MessageHistoryManager; // Updated type
    promptTemplates: REACTChampionAgentPrompts & Record<string, unknown>;
    public llmInstance: any;
    public llmSystemMessage: string | null = null;

    constructor(config: BaseAgentConfig & { 
        promptTemplates?: Partial<REACTChampionAgentPrompts> 
    }) {
        super(config);
        this.messageHistory = new MessageHistoryManager(); // Updated initialization
        this.executableAgent = null;
        
        // Merge provided templates with defaults
        this.promptTemplates = {
            ...REACT_CHAMPION_AGENT_DEFAULT_PROMPTS,
            ...config.promptTemplates
        } as REACTChampionAgentPrompts & Record<string, unknown>;

        if (this.llmConfig) {
            this.createLLMInstance();
        }
    }

    public checkStore(): void {
        if (!this.store) {
            throw new Error('Store is not initialized.');
        }
    }

    public async addMessageToHistory(role: 'ai' | 'human', content: string): Promise<void> {
        await this.messageHistory.addMessage(
            role === 'ai' ? new AIMessage(content) : new HumanMessage(content)
        );
    }

    public parseOutput(content: string): ParsedOutput | null {
        try {
            const parsed = getParsedJSON(content);
            if (!parsed) return null;

            return {
                thought: parsed.thought,
                action: parsed.action,
                actionInput: parsed.actionInput || undefined,
                observation: parsed.observation,
                isFinalAnswerReady: parsed.isFinalAnswerReady,
                finalAnswer: parsed.finalAnswer
            };
        } catch (error) {
            logger.error('Error parsing output:', error);
            return null;
        }
    }

    createLLMInstance(): void {
        if (!this.llmConfig) {
            throw new Error("LLM configuration is missing");
        }
        if (!this.llmConfig.provider) {
            throw new Error("LLM provider must be specified");
        }

        try {
            switch (this.llmConfig.provider.toLowerCase()) {
                case 'groq':
                    this.createGroqInstance();
                    break;
                case 'openai':
                    this.createOpenAIInstance();
                    break;
                case 'anthropic':
                    this.createAnthropicInstance();
                    break;
                case 'google':
                    this.createGoogleInstance();
                    break;
                case 'mistral':
                    this.createMistralInstance();
                    break;
                default:
                    throw new Error(`Unsupported LLM provider: ${this.llmConfig.provider}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create LLM instance: ${errorMessage}`);
        }
    }

    public createGroqInstance(): void {
        if (!this.llmConfig || !isGroqConfig(this.llmConfig)) {
            throw new Error('Invalid Groq configuration');
        }

        const groqConfig: ChatGroqInput = {
            apiKey: this.llmConfig.apiKey ?? '',
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature ?? 0.7,
            stop: this.llmConfig.stop,
            streaming: this.llmConfig.streaming ?? false,
        };

        this.llmInstance = new ChatGroq(groqConfig);
    }

    public createOpenAIInstance(): void {
        if (!this.llmConfig || !isOpenAIConfig(this.llmConfig)) {
            throw new Error('Invalid OpenAI configuration');
        }

        const openAIConfig = {
            apiKey: this.llmConfig.apiKey ?? '',
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature ?? 0.7,
            maxTokens: this.llmConfig.max_tokens,
            stop: this.llmConfig.stop,
            streaming: this.llmConfig.streaming ?? false,
            frequencyPenalty: this.llmConfig.frequency_penalty ?? 0,
            presencePenalty: this.llmConfig.presence_penalty ?? 0,
            topP: this.llmConfig.top_p ?? 1,
            n: this.llmConfig.n ?? 1,
        };

        Object.keys(openAIConfig).forEach(key => {
            if (openAIConfig[key as keyof typeof openAIConfig] === undefined) {
                delete openAIConfig[key as keyof typeof openAIConfig];
            }
        });

        this.llmInstance = new ChatOpenAI(openAIConfig);
    }

    public createAnthropicInstance(): void {
        if (!this.llmConfig || !isAnthropicConfig(this.llmConfig)) {
            throw new Error('Invalid Anthropic configuration');
        }

        const anthropicConfig = {
            apiKey: this.llmConfig.apiKey ?? '',
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature,
            maxTokensToSample: this.llmConfig.max_tokens_to_sample,
            stopSequences: this.llmConfig.stop_sequences,
            streaming: this.llmConfig.streaming,
            system: this.llmConfig.system,
        };

        Object.keys(anthropicConfig).forEach(key => {
            if (anthropicConfig[key as keyof typeof anthropicConfig] === undefined) {
                delete anthropicConfig[key as keyof typeof anthropicConfig];
            }
        });

        this.llmInstance = new ChatAnthropic(anthropicConfig);
    }

    public createGoogleInstance(): void {
        if (!this.llmConfig || !isGoogleConfig(this.llmConfig)) {
            throw new Error('Invalid Google configuration');
        }

        const googleConfig: Partial<GoogleGenerativeAIChatInput> = {
            apiKey: this.llmConfig.apiKey,
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature,
            maxOutputTokens: this.llmConfig.maxOutputTokens,
            topP: this.llmConfig.topP,
            topK: this.llmConfig.topK,
            stopSequences: this.llmConfig.stopSequences,
            safetySettings: this.llmConfig.safetySettings,
            streaming: this.llmConfig.streaming ?? false,
            streamUsage: this.llmConfig.streamUsage ?? true,
            apiVersion: this.llmConfig.apiVersion,
            baseUrl: this.llmConfig.baseUrl,
        };

        Object.keys(googleConfig).forEach(key => {
            if (googleConfig[key as keyof typeof googleConfig] === undefined) {
                delete googleConfig[key as keyof typeof googleConfig];
            }
        });

        this.llmInstance = new ChatGoogleGenerativeAI(googleConfig);
    }

    public createMistralInstance(): void {
        if (!this.llmConfig || !isMistralConfig(this.llmConfig)) {
            throw new Error('Invalid Mistral configuration');
        }

        const mistralConfig = {
            apiKey: this.llmConfig.apiKey ?? '',
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature,
            maxTokens: this.llmConfig.max_tokens,
            topP: this.llmConfig.top_p,
            safeMode: this.llmConfig.safe_mode,
            randomSeed: this.llmConfig.random_seed,
            streaming: this.llmConfig.streaming,
        };

        Object.keys(mistralConfig).forEach(key => {
            if (mistralConfig[key as keyof typeof mistralConfig] === undefined) {
                delete mistralConfig[key as keyof typeof mistralConfig];
            }
        });

        this.llmInstance = new ChatMistralAI(mistralConfig);
    }

    async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        const config = this.prepareAgentForTask(task, task.inputs || {}, task.interpolatedTaskDescription || '');
        this.executableAgent = config.executableAgent;
        return await this.agenticLoop(this, task, this.executableAgent, config.initialFeedbackMessage);
    }

    public prepareAgentForTask(
        task: TaskType,
        inputs: Record<string, unknown>,
        context: string
    ): { executableAgent: any; initialFeedbackMessage: string } {
        const interpolatedDescription = interpolateTaskDescription(
            task.description, 
            Object.fromEntries(
                Object.entries(inputs).map(([key, value]) => [key, String(value)])
            )
        );
        const systemMessage = this.promptTemplates.SYSTEM_MESSAGE({
            agent: this as unknown as IReactChampionAgent,
            task: {
                ...task,
                description: interpolatedDescription
            }
        });

        const feedbackMessage = this.promptTemplates.INITIAL_MESSAGE({
            agent: this as unknown as IReactChampionAgent,
            task: {
                ...task,
                description: interpolatedDescription
            },
            context
        });

        this.llmSystemMessage = systemMessage;

        const promptAgent = ChatPromptTemplate.fromMessages([
            new SystemMessage(systemMessage),
            ["placeholder", "{chat_history}"],
            ["human", "{feedbackMessage}"],
        ]);

        const chainAgent = promptAgent.pipe(this.llmInstance);
        const chainAgentWithHistory = new RunnableWithMessageHistory({
            runnable: chainAgent,
            getMessageHistory: () => this.messageHistory,
            inputMessagesKey: "feedbackMessage",
            historyMessagesKey: "chat_history",
        });

        return {
            executableAgent: chainAgentWithHistory,
            initialFeedbackMessage: feedbackMessage
        };
    }

    public determineActionType(parsedResult: ParsedOutput | null): keyof typeof AGENT_STATUS_enum {
        if (parsedResult === null) {
            return AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT;
        } else if (parsedResult.finalAnswer) {
            return AGENT_STATUS_enum.FINAL_ANSWER;
        } else if (parsedResult.action === "self_question") {
            return parsedResult.thought ? AGENT_STATUS_enum.THOUGHT : AGENT_STATUS_enum.SELF_QUESTION;
        } else if (parsedResult.action) {
            return AGENT_STATUS_enum.EXECUTING_ACTION;
        } else if (parsedResult.observation) {
            return AGENT_STATUS_enum.OBSERVATION;
        } else {
            return AGENT_STATUS_enum.WEIRD_LLM_OUTPUT;
        }
    }

    public async executeThinking(
        agent: ReactChampionAgent,
        task: TaskType,
        ExecutableAgent: any,
        feedbackMessage: string
    ): Promise<ThinkingResult> {
        return new Promise((resolve, reject) => {
            const callOptions = {
                stop: (this.llmConfig as LLMConfig).stopSequences,
                timeout: 60000,
                metadata: { taskId: task.id },
                tags: ['thinking'],
                callbacks: [{
                    handleChatModelStart: (llm: any, messages: BaseMessage[]) => {
                        agent.handleThinkingStart({ 
                            agent: this as unknown as AgentType, 
                            task, 
                            messages 
                        }).catch((error: unknown) => {
                            reject(error instanceof Error ? error : new Error(String(error)));
                        });
                    },
                    handleLLMEnd: async (output: any) => {
                        try {
                            const thinkingResult = await agent.handleThinkingEnd({ 
                                agent: this as unknown as AgentType, 
                                task, 
                                output 
                            });
                            await this.messageHistory.addMessage(new AIMessage(thinkingResult.llmOutput));
                            resolve(thinkingResult);
                        } catch (error: unknown) {
                            reject(error instanceof Error ? error : new Error(String(error)));
                        }
                    }
                }]
            };

            ExecutableAgent.invoke(
                { feedbackMessage },
                callOptions
            ).catch((error: unknown) => {
                logger.error(`LLM_INVOCATION_ERROR: Error during LLM API call for Agent: ${agent.name}, Task: ${task.id}. Details:`, error);
                reject(new LLMInvocationError(
                    `LLM API Error during executeThinking for Agent: ${agent.name}, Task: ${task.id}`,
                    this.llmConfig.provider || 'unknown', // Added provider
                    error instanceof Error ? error : new Error(String(error)),
                    'Check API configuration and retry',
                    { taskId: task.id, agentName: agent.name }
                ));
            });
        });
    }

    public async agenticLoop(
        agent: ReactChampionAgent,
        task: TaskType,
        ExecutableAgent: any,
        initialMessage: string
    ): Promise<AgenticLoopResult> {
        let feedbackMessage = initialMessage;
        let parsedResultWithFinalAnswer: ParsedOutput | null = null;
        let iterations = 0;
        const maxAgentIterations = agent.maxIterations;
        let loopCriticalError: Error | null = null;
        let currentParsedOutput: Output | null = null;

        while (!parsedResultWithFinalAnswer && iterations < maxAgentIterations && !loopCriticalError) {
            try {
                this.handleIterationStart({
                    task,
                    iterations,
                    maxAgentIterations
                });

                if (agent.forceFinalAnswer && iterations === maxAgentIterations - 2) {
                    feedbackMessage = this.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({
                        agent: this as unknown as IReactChampionAgent,
                        task,
                        iterations,
                        maxAgentIterations
                    });
                }

                const thinkingResult = await this.executeThinking(agent, task, ExecutableAgent, feedbackMessage);
                const parsedLLMOutput = thinkingResult.parsedLLMOutput;
                currentParsedOutput = thinkingResult;

                if (parsedLLMOutput === null) {
                    feedbackMessage = this.handleIssuesParsingLLMOutput({
                        agent: this as unknown as IReactChampionAgent,
                        task,
                        output: thinkingResult,
                        llmOutput: thinkingResult.llmOutput
                    });
                    continue;
                }

                const actionType = this.determineActionType(parsedLLMOutput);
                switch (actionType) {
                    case AGENT_STATUS_enum.FINAL_ANSWER:
                        parsedResultWithFinalAnswer = this.handleFinalAnswer({
                            agent: this as unknown as IReactChampionAgent,
                            task,
                            parsedLLMOutput
                        });
                        break;

                    case AGENT_STATUS_enum.THOUGHT:
                        if (parsedLLMOutput.action === "self_question" && parsedLLMOutput.thought) {
                            feedbackMessage = this.promptTemplates.THOUGHT_WITH_SELF_QUESTION_FEEDBACK({
                                agent: this as unknown as IReactChampionAgent,
                                task,
                                thought: parsedLLMOutput.thought,
                                question: parsedLLMOutput.actionInput?.question as string || '',
                                parsedLLMOutput: currentParsedOutput
                            });
                        } else {
                            feedbackMessage = this.promptTemplates.THOUGHT_FEEDBACK({
                                agent: this as unknown as IReactChampionAgent,
                                task,
                                thought: parsedLLMOutput.thought || '',
                                parsedLLMOutput: currentParsedOutput
                            });
                        }
                        break;

                    case AGENT_STATUS_enum.SELF_QUESTION:
                        feedbackMessage = this.promptTemplates.SELF_QUESTION_FEEDBACK({
                            agent: this as unknown as IReactChampionAgent,
                            task,
                            question: parsedLLMOutput.actionInput?.question as string || '',
                            parsedLLMOutput: currentParsedOutput
                        });
                        break;

                    case AGENT_STATUS_enum.EXECUTING_ACTION:
                        if (!parsedLLMOutput.action) {
                            feedbackMessage = "No action specified in parsed output.";
                            break;
                        }

                        const tool = this.tools.find(t => t.name === parsedLLMOutput.action);
                        if (tool) {
                            feedbackMessage = await this.executeUsingTool({
                                agent,
                                task,
                                tool,
                                toolResult: JSON.stringify(parsedLLMOutput.actionInput || {}),
                                parsedLLMOutput: currentParsedOutput
                            });
                        } else {
                            feedbackMessage = this.handleToolDoesNotExist({
                                agent: this as unknown as IReactChampionAgent,
                                task,
                                toolName: parsedLLMOutput.action,
                                parsedLLMOutput: currentParsedOutput
                            });
                        }
                        break;

                    case AGENT_STATUS_enum.OBSERVATION:
                        feedbackMessage = this.promptTemplates.OBSERVATION_FEEDBACK({
                            agent: this as unknown as IReactChampionAgent,
                            task,
                            parsedLLMOutput: currentParsedOutput
                        });
                        break;

                    case AGENT_STATUS_enum.WEIRD_LLM_OUTPUT:
                        feedbackMessage = this.promptTemplates.WEIRD_OUTPUT_FEEDBACK({
                            agent: this as unknown as IReactChampionAgent,
                            task,
                            parsedLLMOutput: currentParsedOutput
                        });
                        break;

                    default:
                        logger.warn(`Unhandled agent status: ${actionType}`);
                        break;
                }

                await this.addMessageToHistory(
                    actionType === AGENT_STATUS_enum.FINAL_ANSWER ? 'ai' : 'human',
                    feedbackMessage
                );

            } catch (error) {
                if (error instanceof LLMInvocationError) {
                    this.handleThinkingError({ task, error });
                } else {
                    this.handleAgenticLoopError({
                        task,
                        error: error instanceof Error ? error : new Error(String(error)),
                        iterations,
                        maxAgentIterations
                    });
                }

                loopCriticalError = error instanceof Error ? error : new Error(String(error));
                break;
            }

            this.handleIterationEnd({
                task,
                iterations,
                maxAgentIterations
            });
            iterations++;
        }

        return this.handleLoopCompletion(loopCriticalError, parsedResultWithFinalAnswer, task, iterations, maxAgentIterations);
    }

    public handleLoopCompletion(
        loopCriticalError: Error | null,
        parsedResultWithFinalAnswer: ParsedOutput | null,
        task: TaskType,
        iterations: number,
        maxAgentIterations: number
    ): AgenticLoopResult {
        if (loopCriticalError) {
            return {
                error: "Execution stopped due to a critical error: " + loopCriticalError.message,
                metadata: { iterations, maxAgentIterations }
            };
        } else if (parsedResultWithFinalAnswer) {
            this.handleTaskCompleted({
                task,
                parsedResultWithFinalAnswer,
                iterations,
                maxAgentIterations
            });
            return {
                result: parsedResultWithFinalAnswer,
                metadata: { iterations, maxAgentIterations }
            };
        } else if (iterations >= maxAgentIterations) {
            this.handleMaxIterationsError({
                task,
                iterations,
                maxAgentIterations
            });
            return {
                error: "Task incomplete: reached maximum iterations without final answer.",
                metadata: { iterations, maxAgentIterations }
            };
        } else {
            return {
                error: "Execution terminated unexpectedly without results.",
                metadata: { iterations, maxAgentIterations }
            };
        }
    }

    public async executeUsingTool(params: { 
        agent: ReactChampionAgent; 
        task: TaskType; 
        tool: Tool;
        toolResult: string;
        parsedLLMOutput: Output;
    }): Promise<string> {
        const { task, tool, toolResult, parsedLLMOutput } = params;
        this.setStatus(AGENT_STATUS_enum.USING_TOOL);
        this.checkStore();

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `🛠️ Using tool: ${tool.name}`,
            metadata: { tool, input: toolResult },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.info(`🛠️ ${AGENT_STATUS_enum.USING_TOOL}: Using ${tool.name}`);
            logger.debug(`Tool Input:`, toolResult);
            this.store.workflowLogs.push(newLog);
        }

        try {
            const result = await tool.call(toolResult);

            this.store.handleToolExecution({
                agent: this as unknown as AgentType,
                task,
                tool,
                input: toolResult,
                result
            });

            this.setStatus(AGENT_STATUS_enum.USING_TOOL_END);

            const endLog = this.store.prepareNewLog({
                agent: this as unknown as AgentType,
                task,
                logDescription: `🛠️✅ Tool execution complete: ${tool.name}`,
                metadata: { output: result },
                logType: 'AgentStatusUpdate',
                agentStatus: this.status,
            });

            if (endLog) {
                logger.info(`🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Got results from ${tool.name}`);
                logger.debug(`Tool Output:`, result);
                this.store.workflowLogs.push(endLog);
            }

            return this.promptTemplates.TOOL_RESULT_FEEDBACK({
                agent: this as unknown as IReactChampionAgent,
                task,
                toolResult: result,
                parsedLLMOutput
            });
        } catch (error) {
            const errorToHandle = error instanceof Error ? error : new Error(String(error));
            return this.handleUsingToolError({
                agent: this as unknown as IReactChampionAgent,
                task,
                tool,
                toolName: tool.name,
                error: errorToHandle,
                parsedLLMOutput
            });
        }
    }

    public handleUsingToolError(params: { 
        agent: IReactChampionAgent; 
        task: TaskType; 
        tool: Tool;
        toolName: string;
        error: Error;
        parsedLLMOutput: Output;
    }): string {
        const { task, tool, toolName, error, parsedLLMOutput } = params;
        this.setStatus(AGENT_STATUS_enum.USING_TOOL_ERROR);
        this.checkStore();

        this.store.handleToolError({
            agent: this as unknown as AgentType,
            task,
            tool,
            error,
            toolName
        });

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `🛠️🛑 Tool error: ${toolName}`,
            metadata: { error, toolName },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.error(`🛠️🛑 ${AGENT_STATUS_enum.USING_TOOL_ERROR}: Error using tool: ${toolName}`);
            logger.error(error);
            this.store.workflowLogs.push(newLog);
        }

        return this.promptTemplates.TOOL_ERROR_FEEDBACK({
            agent: this as unknown as IReactChampionAgent,
            task,
            toolName,
            error,
            parsedLLMOutput
        });
    }

    public handleToolDoesNotExist(params: { 
        agent: IReactChampionAgent; 
        task: TaskType; 
        toolName: string;
        parsedLLMOutput: Output;
    }): string {
        const { task, toolName, parsedLLMOutput } = params;
        this.setStatus(AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST);
        this.checkStore();

        this.store.handleToolDoesNotExist({
            agent: this as unknown as AgentType,
            task,
            toolName
        });

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `🛠️🚫 Unknown tool: ${toolName}`,
            metadata: { toolName },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.warn(`🛠️🚫 ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}: Unknown tool: ${toolName}`);
            this.store.workflowLogs.push(newLog);
        }

        return this.promptTemplates.TOOL_NOT_EXIST_FEEDBACK({
            agent: this as unknown as IReactChampionAgent,
            task,
            toolName,
            parsedLLMOutput
        });
    }

    public handleIterationStart(params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { iterations, maxAgentIterations } = params;
        logger.info(`📍 Starting iteration ${iterations + 1}/${maxAgentIterations}`);
    }

    public handleIterationEnd(params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { iterations, maxAgentIterations } = params;
        logger.info(`✓ Completed iteration ${iterations + 1}/${maxAgentIterations}`);
    }

    public handleThinkingStart(params: ThinkingHandlerParams): Promise<void> {
        const { task, messages } = params;
        this.setStatus(AGENT_STATUS_enum.THINKING);
        this.checkStore();

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `🤔 Starting to think`,
            metadata: { messages },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.info(`🤔 ${AGENT_STATUS_enum.THINKING}: Starting thought process`);
            this.store.workflowLogs.push(newLog);
        }
        return Promise.resolve();
    }

    public async handleThinkingEnd(params: ThinkingHandlerParams): Promise<ThinkingResult> {
        const { task, output } = params;
        this.setStatus(AGENT_STATUS_enum.THINKING_END);
        this.checkStore();

        const parsedOutput = output ? this.parseOutput(output.llmOutput || '') : null;
        const llmUsageStats: LLMUsageStats = output?.llmUsageStats || {
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

        const result: ThinkingResult = {
            parsedLLMOutput: parsedOutput,
            llmOutput: output?.llmOutput || '',
            llmUsageStats
        };

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `🤔✅ Finished thinking`,
            metadata: { output, parsedOutput },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.info(`🤔✅ ${AGENT_STATUS_enum.THINKING_END}: Completed thought process`);
            this.store.workflowLogs.push(newLog);
        }

        return result;
    }

    public handleThinkingError(params: { task: TaskType; error: Error }): void {
        const { task, error } = params;
        this.setStatus(AGENT_STATUS_enum.THINKING_ERROR);
        this.checkStore();

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `🛑 Thinking error occurred`,
            metadata: { error },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.error(`🛑 ${AGENT_STATUS_enum.THINKING_ERROR}: Error during thought process`);
            logger.error(error);
            this.store.workflowLogs.push(newLog);
        }

        this.store.handleTaskBlocked({
            task,
            error
        });
    }

    public handleTaskCompleted(params: {
        task: TaskType;
        parsedResultWithFinalAnswer: ParsedOutput;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { task, parsedResultWithFinalAnswer } = params;
        this.setStatus(AGENT_STATUS_enum.TASK_COMPLETED);
        this.checkStore();

        this.store.handleTaskCompletion({
            agent: this as unknown as AgentType,
            task,
            result: typeof parsedResultWithFinalAnswer.finalAnswer === 'string' 
                ? parsedResultWithFinalAnswer.finalAnswer 
                : JSON.stringify(parsedResultWithFinalAnswer.finalAnswer) // Updated
        });
    }

    public handleMaxIterationsError(params: {
        task: TaskType;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { task, iterations, maxAgentIterations } = params;
        const errorMessage = `Maximum iterations [${maxAgentIterations}] reached without final answer`;
        this.setStatus(AGENT_STATUS_enum.MAX_ITERATIONS_ERROR);
        this.checkStore();

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `⚠️ ${errorMessage}`,
            metadata: { iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.warn(`⚠️ ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR}: ${errorMessage}`);
            this.store.workflowLogs.push(newLog);
        }

        this.store.handleTaskIncomplete({
            agent: this as unknown as AgentType,
            task,
            error: new Error(errorMessage)
        });
    }

    public handleAgenticLoopError(params: {
        task: TaskType;
        error: Error;
        iterations: number;
        maxAgentIterations: number;
    }): void {
        const { task, error } = params;
        this.setStatus(AGENT_STATUS_enum.AGENTIC_LOOP_ERROR);
        this.checkStore();

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `🚨 Agentic loop error`,
            metadata: { error },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.error(`🚨 ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR}: ${error.message}`);
            logger.error(error);
            this.store.workflowLogs.push(newLog);
        }

        this.store.handleTaskBlocked({
            task,
            error
        });
    }

    public handleIssuesParsingLLMOutput(params: { 
        agent: IReactChampionAgent; 
        task: TaskType; 
        output: Output;
        llmOutput: string;
    }): string {
        const { task, llmOutput } = params;
        this.setStatus(AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT);
        this.checkStore();

        const newLog = this.store.prepareNewLog({
            agent: this as unknown as AgentType,
            task,
            logDescription: `😡 JSON parsing issues`,
            metadata: { llmOutput },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });

        if (newLog) {
            logger.error(`😡 ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}: Invalid JSON from LLM`);
            logger.debug('Raw output:', llmOutput);
            this.store.workflowLogs.push(newLog);
        }

        return this.promptTemplates.INVALID_JSON_FEEDBACK({
            agent: this as unknown as IReactChampionAgent,
            task,
            llmOutput
        });
    }

    public handleFinalAnswer(params: { 
        agent: IReactChampionAgent; 
        task: TaskType; 
        parsedLLMOutput: ParsedOutput;
    }): ParsedOutput {
        const { parsedLLMOutput } = params;
        return {
            ...parsedLLMOutput,
            finalAnswer: typeof parsedLLMOutput.finalAnswer === 'object' 
                ? JSON.stringify(parsedLLMOutput.finalAnswer)
                : parsedLLMOutput.finalAnswer // Corrected reference
        };
    }

    public setStatus(status: keyof typeof AGENT_STATUS_enum): void {
        this.status = status;
    }

    // Required by IReactChampionAgent interface but implemented in parent class
    async workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void> {
        // Implementation inherited from BaseAgentImplementation
        throw new Error("Method not implemented.");
    }
}

// Export the ReactChampionAgent class
export { ReactChampionAgent };
