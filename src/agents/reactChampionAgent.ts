/**
 * Path: C:/Users/pwalc/Documents/GroqEmailAssistant/KaibanJS/src/agents/reactChampionAgent.ts
 * 
 * ReactChampionAgent Class Implementation
 * This class implements an AI agent capable of performing tasks using various language models.
 */

// Base Implementation
import { BaseAgent as BaseAgentImplementation } from './baseAgent';

// LangChain LLM Providers
import { ChatGroq, ChatGroqInput } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";

// LangChain Core Components
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";

// Local Utilities
import CustomMessageHistory from '../utils/CustomMessageHistory';
import { interpolateTaskDescription } from '../utils/tasks';
import { getParsedJSON } from '../utils/parser';
import { logger } from "../utils/logger";
import { LLMInvocationError } from '../utils/errors';
import { AGENT_STATUS_enum } from '../utils/enums';

// Import types from centralized types.d.ts
import {
    BaseAgentConfig,
    TaskType,
    FeedbackObject,
    Output,
    LLMConfig,
    GroqConfig,
    OpenAIConfig,
    AnthropicConfig,
    GoogleConfig,
    MistralConfig,
    ThinkingResult,
    AgenticLoopResult,
    ThinkingHandlerParams,
    ToolHandlerParams,
    StatusHandlerParams,
    IterationHandlerParams,
    TaskCompletionParams,
    MessageBuildParams,
    StreamingHandlerConfig,
    CompletionResponse,
    IReactChampionAgent
} from '../../types/types';

// Import type guard functions
import {
    isGroqConfig,
    isOpenAIConfig,
    isAnthropicConfig,
    isGoogleConfig,
    isMistralConfig
} from '../../types/types';

class ReactChampionAgent extends BaseAgentImplementation implements IReactChampionAgent {
    executableAgent: any;
    messageHistory: CustomMessageHistory;

    constructor(config: BaseAgentConfig) {
        super(config);
        this.messageHistory = new CustomMessageHistory();
        this.executableAgent = null;
    }

    // Creates the appropriate LLM instance based on the provider configuration
    createLLMInstance(): void {
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

    // Creates a Groq LLM instance
    private createGroqInstance(): void {
        if (!isGroqConfig(this.llmConfig)) {
            throw new Error('Invalid Groq configuration');
        }
    
        const groqConfig: Partial<ChatGroqInput> = {
            apiKey: this.llmConfig.apiKey,
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature ?? 0.7,
            stop: this.llmConfig.stop,
            streaming: this.llmConfig.streaming ?? false,
        };
    
        // Remove undefined properties
        Object.keys(groqConfig).forEach(key => 
            groqConfig[key as keyof typeof groqConfig] === undefined && 
            delete groqConfig[key as keyof typeof groqConfig]
        );
    
        this.llmInstance = new ChatGroq(groqConfig);
    }
	// Creates an OpenAI LLM instance
    private createOpenAIInstance(): void {
        if (!isOpenAIConfig(this.llmConfig)) {
            throw new Error('Invalid OpenAI configuration');
        }
    
        const openAIConfig = {
            apiKey: this.llmConfig.apiKey,
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature ?? 0.7,
            maxTokens: this.llmConfig.maxTokens,
            stop: this.llmConfig.stop,
            streaming: this.llmConfig.streaming ?? false,
            callbacks: this.llmConfig.callbacks,
            frequencyPenalty: this.llmConfig.frequencyPenalty ?? 0,
            presencePenalty: this.llmConfig.presencePenalty ?? 0,
            topP: this.llmConfig.topP ?? 1,
            n: this.llmConfig.n ?? 1,
        };
    
        // Remove undefined properties
        Object.keys(openAIConfig).forEach(key => 
            openAIConfig[key as keyof typeof openAIConfig] === undefined && 
            delete openAIConfig[key as keyof typeof openAIConfig]
        );
    
        this.llmInstance = new ChatOpenAI(openAIConfig);
    }
    
    // Creates an Anthropic LLM instance
    private createAnthropicInstance(): void {
        if (!isAnthropicConfig(this.llmConfig)) {
            throw new Error('Invalid Anthropic configuration');
        }
    
        const anthropicConfig = {
            apiKey: this.llmConfig.apiKey,
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature,
            maxTokens: this.llmConfig.maxTokens,
            stopSequences: this.llmConfig.stopSequences,
            streaming: this.llmConfig.streaming,
            anthropicApiUrl: this.llmConfig.anthropicApiUrl,
        };
    
        // Remove undefined properties
        Object.keys(anthropicConfig).forEach(key => 
            anthropicConfig[key as keyof typeof anthropicConfig] === undefined && 
            delete anthropicConfig[key as keyof typeof anthropicConfig]
        );
    
        this.llmInstance = new ChatAnthropic(anthropicConfig);
    }
    
    // Creates a Google LLM instance
    private createGoogleInstance(): void {
        if (!isGoogleConfig(this.llmConfig)) {
            throw new Error('Invalid Google configuration');
        }
    
        const googleConfig: Partial<GoogleGenerativeAIChatInput> = {
            apiKey: this.llmConfig.apiKey,
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature,
            maxOutputTokens: this.llmConfig.maxOutputTokens,
            topK: this.llmConfig.topK,
            topP: this.llmConfig.topP,
            stopSequences: this.llmConfig.stopSequences,
            safetySettings: this.llmConfig.safetySettings,
            streaming: this.llmConfig.streaming ?? false,
            apiVersion: this.llmConfig.apiVersion,
            baseUrl: this.llmConfig.apiBaseUrl,
        };
    
        // Remove undefined properties
        Object.keys(googleConfig).forEach(key => 
            googleConfig[key as keyof typeof googleConfig] === undefined && 
            delete googleConfig[key as keyof typeof googleConfig]
        );
    
        this.llmInstance = new ChatGoogleGenerativeAI(googleConfig);
    }
    
    // Creates a Mistral LLM instance
    private createMistralInstance(): void {
        if (!isMistralConfig(this.llmConfig)) {
            throw new Error('Invalid Mistral configuration');
        }
    
        const mistralConfig = {
            apiKey: this.llmConfig.apiKey,
            modelName: this.llmConfig.model,
            temperature: this.llmConfig.temperature,
            maxTokens: this.llmConfig.maxTokens,
            topP: this.llmConfig.topP,
            safeMode: this.llmConfig.safeMode,
            randomSeed: this.llmConfig.randomSeed,
            streaming: this.llmConfig.streaming,
        };
    
        // Remove undefined properties
        Object.keys(mistralConfig).forEach(key => 
            mistralConfig[key as keyof typeof mistralConfig] === undefined && 
            delete mistralConfig[key as keyof typeof mistralConfig]
        );
    
        this.llmInstance = new ChatMistralAI(mistralConfig);
    }

    // Executes a task using the agent
    async workOnTask(task: TaskType): Promise<AgenticLoopResult> {
        const config = this.prepareAgentForTask(task, task.inputs, task.interpolatedTaskDescription || '');
        this.executableAgent = config.executableAgent;
        return await this.agenticLoop(this, task, this.executableAgent, config.initialFeedbackMessage);
    }

    // Processes feedback for a task
    async workOnFeedback(task: TaskType, feedbackList: FeedbackObject[], context: string): Promise<void> {
        const feedbackString = feedbackList.map(f => f.content).join(', ');
        const feedbackMessage = this.promptTemplates.WORK_ON_FEEDBACK_FEEDBACK({
            agent: this,
            task,
            feedback: feedbackString,
            context
        });
        await this.agenticLoop(this, task, this.executableAgent, feedbackMessage);
    }
	// Prepares the agent for task execution
    private prepareAgentForTask(
        task: TaskType, 
        inputs: Record<string, any>, 
        context: string
    ): { executableAgent: any; initialFeedbackMessage: string } {
        const interpolatedDescription = interpolateTaskDescription(task.description, inputs);
        const systemMessage = this.buildSystemMessage({
            agent: this,
            task,
            interpolatedTaskDescription: interpolatedDescription
        });
        const feedbackMessage = this.buildInitialMessage({
            agent: this,
            task,
            interpolatedTaskDescription: interpolatedDescription,
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

    // Main agent execution loop
    private async agenticLoop(
        agent: ReactChampionAgent,
        task: TaskType,
        ExecutableAgent: any,
        initialMessage: string
    ): Promise<AgenticLoopResult> {
        let feedbackMessage = initialMessage;
        let parsedResultWithFinalAnswer = null;
        let iterations = 0;
        const maxAgentIterations = agent.maxIterations;
        let loopCriticalError = null;

        while (!parsedResultWithFinalAnswer && iterations < maxAgentIterations && !loopCriticalError) {
            try {
                this.handleIterationStart({
                    task,
                    iterations,
                    maxAgentIterations
                });

                if (agent.forceFinalAnswer && iterations === maxAgentIterations - 2) {
                    feedbackMessage = this.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({
                        agent,
                        task,
                        iterations,
                        maxAgentIterations
                    });
                }

                const thinkingResult = await this.executeThinking(agent, task, ExecutableAgent, feedbackMessage);
                const parsedLLMOutput = thinkingResult.parsedLLMOutput;

                const actionType = this.determineActionType(parsedLLMOutput);

                switch (actionType) {
                    case AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT:
                        feedbackMessage = this.handleIssuesParsingLLMOutput({
                            agent,
                            task,
                            parsedLLMOutput,
                            output: thinkingResult
                        });
                        break;
                    case AGENT_STATUS_enum.FINAL_ANSWER:
                        parsedResultWithFinalAnswer = this.handleFinalAnswer({
                            agent,
                            task,
                            parsedLLMOutput
                        });
                        break;
                    case AGENT_STATUS_enum.THOUGHT:
                        feedbackMessage = this.handleThought({
                            agent,
                            task,
                            parsedLLMOutput
                        });
                        break;
                    case AGENT_STATUS_enum.SELF_QUESTION:
                        feedbackMessage = this.handleSelfQuestion({
                            agent,
                            task,
                            parsedLLMOutput
                        });
                        break;
                    case AGENT_STATUS_enum.EXECUTING_ACTION:
                        logger.debug(`⏩ Agent ${agent.name} will be ${AGENT_STATUS_enum.EXECUTING_ACTION}...`);
                        const toolName = parsedLLMOutput.action;
                        const tool = this.tools.find(tool => tool.name === toolName);
                        if (tool) {
                            try {
                                feedbackMessage = await this.executeUsingTool({
                                    agent,
                                    task,
                                    parsedLLMOutput,
                                    tool
                                });
                            } catch (error) {
                                feedbackMessage = this.handleUsingToolError({
                                    agent,
                                    task,
                                    parsedLLMOutput,
                                    tool,
                                    error: error instanceof Error ? error : new Error(String(error))
                                });
                            }
                        } else {
                            feedbackMessage = this.handleToolDoesNotExist({
                                agent,
                                task,
                                parsedLLMOutput,
                                toolName
                            });
                        }
                        break;
                    case AGENT_STATUS_enum.OBSERVATION:
                        feedbackMessage = this.handleObservation({
                            agent,
                            task,
                            parsedLLMOutput
                        });
                        break;
                    case AGENT_STATUS_enum.WEIRD_LLM_OUTPUT:
                        feedbackMessage = this.handleWeirdOutput({
                            agent,
                            task,
                            parsedLLMOutput
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
                    const errorToHandle = error instanceof Error ? error : new Error(String(error));
                    this.handleAgenticLoopError({
                        task,
                        error: errorToHandle,
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
	// Executes the thinking phase of the agent
    private async executeThinking(
        agent: ReactChampionAgent,
        task: TaskType,
        ExecutableAgent: any,
        feedbackMessage: string
    ): Promise<ThinkingResult> {
        return new Promise((resolve, reject) => {
            const callOptions = {
                stop: this.llmConfig.stopSequences,
                timeout: 60000,
                metadata: { taskId: task.id },
                tags: ['thinking'],
                callbacks: [{
                    handleChatModelStart: (llm: any, messages: BaseMessage[]) => {
                        agent.handleThinkingStart({ agent, task, messages }).catch((error: unknown) => {
                            reject(error instanceof Error ? error : new Error(String(error)));
                        });
                    },
                    handleLLMEnd: async (output: any) => {
                        try {
                            const thinkingResult = await agent.handleThinkingEnd({ agent, task, output });
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
                    error instanceof Error ? error : new Error(String(error))
                ));
            });
        });
    }

    // Determines the type of action to take based on parsed LLM output
    private determineActionType(parsedResult: any): keyof typeof AGENT_STATUS_enum {
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

    // Executes a tool action
    private async executeUsingTool(params: ToolHandlerParams): Promise<string> {
        const { agent, task, parsedLLMOutput, tool } = params;
        const toolInput = parsedLLMOutput.actionInput;
        this.setStatus(AGENT_STATUS_enum.USING_TOOL);
        
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🛠️⏳ Agent ${this.name} is ${AGENT_STATUS_enum.USING_TOOL} ${tool.name}...`,
            metadata: { tool, input: toolInput },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        
        logger.info(`🛠️⏳ ${AGENT_STATUS_enum.USING_TOOL}: Agent ${this.name} is using ${tool.name}...`);
        logger.debug(`Tool Input:`, toolInput);
        this.store.getState().workflowLogs.push(newLog);
        
        try {
            const toolResult = await tool.call(toolInput);
            
            this.setStatus(AGENT_STATUS_enum.USING_TOOL_END);
            const endLog = this.store.getState().prepareNewLog({
                agent: this,
                task,
                logDescription: `🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${this.name} - got results from tool:${tool.name}`,
                metadata: { output: toolResult },
                logType: 'AgentStatusUpdate',
                agentStatus: this.status,
            });
            
            logger.info(`🛠️✅ ${AGENT_STATUS_enum.USING_TOOL_END}: Agent ${this.name} - got results from tool:${tool.name}`);
            logger.debug(`Tool Output:`, toolResult);
            this.store.getState().workflowLogs.push(endLog);
            
            return this.promptTemplates.TOOL_RESULT_FEEDBACK({
                agent,
                task,
                toolResult,
                parsedLLMOutput
            });
        } catch (error) {
            const errorToHandle = error instanceof Error ? error : new Error(String(error));
            return this.handleUsingToolError({ ...params, error: errorToHandle });
        }
    }

    // Adds a message to the message history
    private async addMessageToHistory(role: string, content: string): Promise<void> {
        await this.messageHistory.addMessage(
            role === 'ai' ? new AIMessage(content) : new HumanMessage(content)
        );
    }

    // Handles streaming response from LLM
    private async handleStreamingResponse(stream: AsyncIterable<StreamingHandlerConfig>): Promise<string> {
        let fullResponse = '';
        try {
            for await (const chunk of stream) {
                const content = chunk?.content || '';
                fullResponse += content;
            }
            return fullResponse;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error processing streaming response: ${errorMessage}`);
        }
    }

    // Formats the completion response
    private async formatCompletionResponse(response: CompletionResponse): Promise<ThinkingResult> {
        try {
            const usageStats = {
                inputTokens: response?.usage?.prompt_tokens || -1,
                outputTokens: response?.usage?.completion_tokens || -1
            };

            const content = response?.content || response?.message?.content || '';
            
            return {
                parsedLLMOutput: this.parseOutput(content),
                llmOutput: content,
                llmUsageStats: usageStats
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Error formatting completion response: ${errorMessage}`);
        }
    }
	
	// Handles the start of the thinking process
    private async handleThinkingStart(params: ThinkingHandlerParams): Promise<void> {
        const { agent, task, messages } = params;
        try {
            const transformedMessages = messages?.map(message => ({
                type: message.constructor.name,
                content: message.content
            }));
            this.setStatus(AGENT_STATUS_enum.THINKING);
            const newLog = this.store.getState().prepareNewLog({
                agent: this,
                task,
                logDescription: `🤔 Agent ${this.name} starts thinking...`,
                metadata: { messages: transformedMessages },
                logType: 'AgentStatusUpdate',
                agentStatus: this.status,
            });
            logger.info(`🤔 ${AGENT_STATUS_enum.THINKING}: Agent ${this.name} starts thinking...`);
            logger.debug('System Message:', transformedMessages?.[0]);
            logger.debug('Feedback Message:', transformedMessages?.[transformedMessages.length - 1].content);
            logger.debug('All Messages', transformedMessages);
            this.store.getState().workflowLogs.push(newLog);
        } catch (error: unknown) {
            logger.debug(`AGENT/handleThinkingStart: Error processing thinking messages: ${error}`);
            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    // Handles the end of the thinking process
    private async handleThinkingEnd(params: ThinkingHandlerParams): Promise<ThinkingResult> {
        const { agent, task, output } = params;
        try {
            const agentResultParser = new StringOutputParser();
            if (!output?.generations?.[0]?.[0]?.message) {
                throw new Error('Invalid output structure');
            }

            const { message } = output.generations[0][0];
            const parsedResult = await agentResultParser.invoke(message);
            const parsedLLMOutput = getParsedJSON(parsedResult);
            const thinkingResult: ThinkingResult = {
                parsedLLMOutput,
                llmOutput: parsedResult,
                llmUsageStats: {
                    inputTokens: message.usage_metadata?.input_tokens ?? -1,
                    outputTokens: message.usage_metadata?.output_tokens ?? -1
                }
            };
            this.setStatus(AGENT_STATUS_enum.THINKING_END);
            const newLog = this.store.getState().prepareNewLog({
                agent: this,
                task,
                logDescription: `🤔 Agent ${this.name} finished thinking.`,
                metadata: { output: thinkingResult },
                logType: 'AgentStatusUpdate',
                agentStatus: this.status,
            });
            logger.info(`💡 ${AGENT_STATUS_enum.THINKING_END}: Agent ${this.name} finished thinking.`);
            logger.trace(`Output:`, thinkingResult.parsedLLMOutput);
            logger.trace(`Usage:`, thinkingResult.llmUsageStats);
            this.store.getState().workflowLogs.push(newLog);
            return thinkingResult;
        } catch (error: unknown) {
            logger.debug(`AGENT/handleThinkingEnd: Error processing thinking result: ${error}`);
            throw error instanceof Error ? error : new Error(String(error));
        }
    }

    // Handles issues parsing LLM output
    private handleIssuesParsingLLMOutput(params: StatusHandlerParams): string {
        const { agent, task, output } = params;
        const JSONParsingError = new Error('Received an invalid JSON object from the LLM. Requesting a correctly formatted JSON response.');
        this.setStatus(AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `😡 Agent ${this.name} found some ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}. ${JSONParsingError.message}`,
            metadata: { output, error: JSONParsingError },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });        
        logger.debug(`😡 ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}: Agent ${this.name} found issues parsing the LLM output. ${JSONParsingError.message}`);
        this.store.getState().workflowLogs.push(newLog);
        return this.promptTemplates.INVALID_JSON_FEEDBACK({
            agent,
            task,
            llmOutput: output.llmOutput
        });
    }

    // Handles final answer from LLM
    private handleFinalAnswer(params: StatusHandlerParams): any {
        const { agent, task, parsedLLMOutput } = params;
        const finalAnswer = typeof parsedLLMOutput.finalAnswer === 'object' && parsedLLMOutput.finalAnswer !== null
            ? JSON.stringify(parsedLLMOutput.finalAnswer)
            : parsedLLMOutput.finalAnswer;

        const outputWithFormattedAnswer = {
            ...parsedLLMOutput,
            finalAnswer
        };

        this.setStatus(AGENT_STATUS_enum.FINAL_ANSWER);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🥳 Agent ${this.name} got the ${AGENT_STATUS_enum.FINAL_ANSWER}`,
            metadata: { output: outputWithFormattedAnswer },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.info(`🥳 ${AGENT_STATUS_enum.FINAL_ANSWER}: Agent ${this.name} arrived to the Final Answer.`);
        logger.debug(`${finalAnswer}`);
        this.store.getState().workflowLogs.push(newLog);
        return outputWithFormattedAnswer;
    }

    // Handles thought from LLM
    private handleThought(params: StatusHandlerParams): string {
        const { agent, task, parsedLLMOutput } = params;
        this.setStatus(AGENT_STATUS_enum.THOUGHT);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `💭 Agent ${this.name} ${AGENT_STATUS_enum.THOUGHT}.`,
            metadata: { output: parsedLLMOutput },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.info(`💭 ${AGENT_STATUS_enum.THOUGHT}: Agent ${this.name} has a cool thought.`);
        logger.info(`${parsedLLMOutput.thought}`);
        this.store.getState().workflowLogs.push(newLog);
        
        let feedbackMessage = this.promptTemplates.THOUGHT_FEEDBACK({
            agent,
            task,
            thought: parsedLLMOutput.thought,
            parsedLLMOutput
        });

        if(parsedLLMOutput.action === 'self_question' && parsedLLMOutput.actionInput) {
            const actionAsString = typeof parsedLLMOutput.actionInput === 'object' ? 
                JSON.stringify(parsedLLMOutput.actionInput) : parsedLLMOutput.actionInput;
            feedbackMessage = this.promptTemplates.THOUGHT_WITH_SELF_QUESTION_FEEDBACK({
                agent,
                task,
                thought: parsedLLMOutput.thought,
                question: actionAsString,
                parsedLLMOutput
            });
        }
        return feedbackMessage;
    }

    // Handles self-question from LLM
    private handleSelfQuestion(params: StatusHandlerParams): string {
        const { agent, task, parsedLLMOutput } = params;
        this.setStatus(AGENT_STATUS_enum.SELF_QUESTION);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `❓Agent ${this.name} have a ${AGENT_STATUS_enum.SELF_QUESTION}`,
            metadata: { output: parsedLLMOutput },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.info(`❓${AGENT_STATUS_enum.SELF_QUESTION}: Agent ${this.name} have a self question.`);
        logger.debug(parsedLLMOutput);
        this.store.getState().workflowLogs.push(newLog);
        return this.promptTemplates.SELF_QUESTION_FEEDBACK({
            agent,
            task,
            question: parsedLLMOutput.thought,
            parsedLLMOutput
        });
    }

    // Handles tool usage error
    private handleUsingToolError(params: ToolHandlerParams): string {
        const { agent, task, parsedLLMOutput, tool, error } = params;
        this.setStatus(AGENT_STATUS_enum.USING_TOOL_ERROR);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: 'Error during tool use',
            metadata: { error },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.error(`🛠️🛑 ${AGENT_STATUS_enum.USING_TOOL_ERROR}: Agent ${this.name} found an error using the tool: ${tool.name}`);
        logger.error(error);        
        this.store.getState().workflowLogs.push(newLog);
        return this.promptTemplates.TOOL_ERROR_FEEDBACK({
            agent,
            task,
            toolName: parsedLLMOutput.action,
            error,
            parsedLLMOutput
        });
    }

    // Handles case when tool does not exist
    private handleToolDoesNotExist(params: ToolHandlerParams): string {
        const { agent, task, parsedLLMOutput, toolName } = params;
        this.setStatus(AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🛠️🚫 Agent ${this.name} - Oops... it seems that the tool:${toolName} ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}.`,
            metadata: { toolName },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.warn(`🛠️🚫 ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}: Agent ${this.name} - is trying to use a tool that does not exist. Tool Name:${toolName}.`);  
        this.store.getState().workflowLogs.push(newLog);
        return this.promptTemplates.TOOL_NOT_EXIST_FEEDBACK({
            agent,
            task,
            toolName: parsedLLMOutput.action,
            parsedLLMOutput
        });
    }

    // Handles observation from LLM
    private handleObservation(params: StatusHandlerParams): string {
        const { agent, task, parsedLLMOutput } = params;
        this.setStatus(AGENT_STATUS_enum.OBSERVATION);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🔍 Agent ${this.name} - ${AGENT_STATUS_enum.OBSERVATION}`,
            metadata: { output: parsedLLMOutput },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.info(`🔍 ${AGENT_STATUS_enum.OBSERVATION}: Agent ${this.name} made an observation.`);
        logger.debug(`${parsedLLMOutput.observation}`);
        this.store.getState().workflowLogs.push(newLog);
        return this.promptTemplates.OBSERVATION_FEEDBACK({
            agent,
            task,
            parsedLLMOutput
        });
    }

    // Handles weird output from LLM
    private handleWeirdOutput(params: StatusHandlerParams): string {
        const { agent, task, parsedLLMOutput } = params;
        this.setStatus(AGENT_STATUS_enum.WEIRD_LLM_OUTPUT);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🤔 Agent ${this.name} - ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT}`,
            metadata: { output: parsedLLMOutput },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.warn(`🤔 ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT} - Agent: ${this.name}`);
        this.store.getState().workflowLogs.push(newLog);
        return this.promptTemplates.WEIRD_OUTPUT_FEEDBACK({
            agent,
            task,
            parsedLLMOutput
        });
    }

    // Handles agentic loop error
    private handleAgenticLoopError(params: IterationHandlerParams & { error: Error }): void {
        const { task, error, iterations, maxAgentIterations } = params;
        this.setStatus(AGENT_STATUS_enum.AGENTIC_LOOP_ERROR);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🚨 Agent ${this.name} - ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR} | Iterations: ${iterations}/${maxAgentIterations}`,
            metadata: { error, iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.error(`🚨 ${AGENT_STATUS_enum.AGENTIC_LOOP_ERROR}  - Agent: ${this.name} | Iterations: ${iterations}/${maxAgentIterations}`, error.message);   
        this.store.getState().workflowLogs.push(newLog);
        this.store.getState().handleTaskBlocked({ task, error });
    }

    // Handles maximum iterations error
    private handleMaxIterationsError(params: IterationHandlerParams): void {
        const { task, iterations, maxAgentIterations } = params;
        const error = new Error(`Agent ${this.name} reached the maximum number of iterations: [${maxAgentIterations}] without finding a final answer.`);
        this.setStatus(AGENT_STATUS_enum.MAX_ITERATIONS_ERROR);
        const newLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🛑 Agent ${this.name} - ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} | Iterations: ${iterations}`,
            metadata: { error, iterations, maxAgentIterations },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.error(`🛑 ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} - Agent ${this.name} | Iterations: ${iterations}/${maxAgentIterations}. You can adjust the maxAgentIterations property in the agent initialization. Current value is ${maxAgentIterations}`);
        this.store.getState().workflowLogs.push(newLog);
        this.store.getState().handleTaskBlocked({ task, error });
    }

    // Handles task completion
    private handleTaskCompleted(params: TaskCompletionParams): void {
        const { task, parsedResultWithFinalAnswer, iterations, maxAgentIterations } = params;
        this.setStatus(AGENT_STATUS_enum.TASK_COMPLETED);
        const agentLog = this.store.getState().prepareNewLog({
            agent: this,
            task,
            logDescription: `🏁 Agent ${this.name} - ${AGENT_STATUS_enum.TASK_COMPLETED}`,
            metadata: { 
                result: parsedResultWithFinalAnswer.finalAnswer, 
                iterations, 
                maxAgentIterations 
            },
            logType: 'AgentStatusUpdate',
            agentStatus: this.status,
        });
        logger.info(`🏁 ${AGENT_STATUS_enum.TASK_COMPLETED}: Agent ${this.name} finished the given task.`);
        this.store.getState().workflowLogs.push(agentLog);
        this.store.getState().handleTaskCompleted({ 
            agent: this, 
            task, 
            result: parsedResultWithFinalAnswer.finalAnswer 
        });
    }

    // Builds a system message for the agent
    private buildSystemMessage(params: MessageBuildParams): string {
        const { agent, task, interpolatedTaskDescription } = params;
        return this.promptTemplates.SYSTEM_MESSAGE({
            agent,
            task: {
                ...task,
                description: interpolatedTaskDescription
            }
        });
    }

    // Builds an initial message for the agent
    private buildInitialMessage(params: MessageBuildParams): string {
        const { agent, task, interpolatedTaskDescription, context } = params;
        return this.promptTemplates.INITIAL_MESSAGE({
            agent,
            task: {
                ...task,
                description: interpolatedTaskDescription
            },
            context
        });
    }

    // Parses the LLM output
    private parseOutput(content: string): any {
        try {
            return getParsedJSON(content);
        } catch (error) {
            logger.error('Error parsing output:', error);
            return null;
        }
    }
}

export { ReactChampionAgent };
	