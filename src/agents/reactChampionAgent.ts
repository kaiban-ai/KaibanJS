/**
 * Enhanced ReAct Agent Implementation.
 *
 * This file implements the ReactChampionAgent, a variation of the traditional ReAct (Reasoning and Action) agent model,
 * tailored to enhance the agent's capabilities through iterative feedback loops. Unlike the original ReAct pattern that typically
 * follows a linear execution path, our Reflex Act model introduces a round-trip communication process, enabling continuous refinement
 * and fine-tuning of actions based on real-time feedback.
 *
 * This enhanced approach allows the agent to dynamically adjust its strategies and responses, significantly improving adaptability
 * and decision-making accuracy in complex scenarios. The model is designed for environments where ongoing interaction and meticulous
 * state management are crucial.
 *
 * @packageDocumentation
 */

import { ChatAnthropic } from '@langchain/anthropic';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatXAI } from '@langchain/xai';
import {
  AIMessageChunk,
  BaseMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatGeneration } from '@langchain/core/outputs';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatMistralAI } from '@langchain/mistralai';
import { ChatOpenAI } from '@langchain/openai';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import { Task } from '..';
import { TeamStore } from '../stores';
import { TaskResult } from '../stores/taskStore.types';
import { BaseTool, ToolResult } from '../tools/baseTool';
import { BlockTaskTool } from '../tools/blockTaskTool';
import { getApiKey, LangChainChatModel } from '../utils/agents';
import {
  AGENT_STATUS_enum,
  KANBAN_TOOLS_enum,
  WORKFLOW_STATUS_enum,
} from '../utils/enums';
import { AbortError, LLMInvocationError } from '../utils/errors';
import {
  AgentLoopResult,
  LLMOutput,
  ParsedLLMOutput,
  ThinkingPromise,
  ThinkingResult,
  ToolCallingPromise,
} from '../utils/llm.types';
import { logger } from '../utils/logger';
import { getParsedJSON } from '../utils/parser';
import { interpolateTaskDescriptionV2 } from '../utils/tasks';
import { BaseAgent, BaseAgentParams, Env, LLMConfig } from './baseAgent';

/**
 * ReactChampionAgent class that extends BaseAgent to implement enhanced ReAct pattern
 * @class
 */
export class ReactChampionAgent extends BaseAgent {
  protected executableAgent?: RunnableWithMessageHistory<unknown, unknown>;
  protected llmInstance?: LangChainChatModel;
  protected interactionsHistory: ChatMessageHistory;
  protected lastFeedbackMessage: string | null;

  // TODO: Check if this is needed
  protected currentIterations: number;

  constructor(config: BaseAgentParams) {
    super(config);

    // Handle kanban tools based on configuration
    const enabledKanbanTools = config.kanbanTools || [];

    // Add kanban tools that are enabled
    if (
      enabledKanbanTools.includes(KANBAN_TOOLS_enum.BLOCK_TASK_TOOL) ||
      enabledKanbanTools.includes(KANBAN_TOOLS_enum.BLOCK_TASK)
    ) {
      this.tools = [...this.tools, new BlockTaskTool(this)];
    }

    this.llmInstance = config.llmInstance;
    this.interactionsHistory = new ChatMessageHistory();
    this.lastFeedbackMessage = null;
    this.currentIterations = 0;
  }

  /**
   * Initializes the agent with store and environment configuration
   * @param store - The agent store instance
   * @param env - Environment configuration
   */
  initialize(store: TeamStore, env: Env): void {
    // Set up API key and check configuration
    this.store = store;
    this.env = env;

    // We oppened the door to allow the use of an already instantiated LLM
    if (!this.llmInstance) {
      const apiKey = getApiKey(this.llmConfig, this.env);
      if (!apiKey && !this.llmConfig.apiBaseUrl) {
        throw new Error(
          'API key is missing. Please provide it through the Agent llmConfig or through the team env variable.'
        );
      }
      this.llmConfig.apiKey = apiKey;

      // Define a mapping of providers to their corresponding chat classes
      const providerFactories: Record<
        string,
        (
          llmConfig: LLMConfig
        ) =>
          | ChatOpenAI
          | ChatAnthropic
          | ChatGoogleGenerativeAI
          | ChatMistralAI
          | ChatDeepSeek
          | ChatXAI
      > = {
        anthropic: (llmConfig: LLMConfig) => new ChatAnthropic(llmConfig),
        google: (llmConfig: LLMConfig) => new ChatGoogleGenerativeAI(llmConfig),
        mistral: (llmConfig: LLMConfig) => new ChatMistralAI(llmConfig),
        openai: (llmConfig: LLMConfig) => new ChatOpenAI(llmConfig),
        deepseek: (llmConfig: LLMConfig) => new ChatDeepSeek(llmConfig),
        xai: (llmConfig: LLMConfig) => new ChatXAI(llmConfig),
        default: (llmConfig: LLMConfig) => new ChatOpenAI(llmConfig),
      };

      // Choose the chat class based on the provider
      const provider = this.llmConfig.provider;
      const providerFactory =
        providerFactories[provider] || providerFactories.default;
      this.llmInstance = providerFactory(this.llmConfig) as LangChainChatModel;
    } else {
      const extractedLlmConfig: Record<string, unknown> = {
        ...this.llmInstance.lc_kwargs,
        provider:
          this.llmInstance.lc_namespace[
            this.llmInstance.lc_namespace.length - 1
          ],
      };

      // FIXME: This is a hack to accept a custom LLMConfig from the user
      this.llmConfig = extractedLlmConfig as unknown as LLMConfig;
    }
    this.interactionsHistory = new ChatMessageHistory();
    this.lastFeedbackMessage = null;
    this.executableAgent = undefined;
  }

  /**
   * Resumes work on a task
   * @param task - The task to resume
   */
  async workOnTaskResume(task: Task) {
    const lastFeedbackMessage = this.lastFeedbackMessage;
    await this.agenticLoop(
      this,
      task,
      this.executableAgent,
      lastFeedbackMessage
    );
  }

  /**
   * Updates the agent's environment configuration
   * @param env - New environment configuration
   */
  updateEnv(env: Env): void {
    this.env = env;

    // Only update if we're using environment-based API keys
    const apiKey = getApiKey(this.llmConfig, this.env, true);
    if (apiKey && this.llmConfig.apiKey !== apiKey) {
      this.llmConfig.apiKey = apiKey;

      // Define a mapping of providers to their corresponding chat classes
      const providerFactories: Record<
        string,
        (
          llmConfig: LLMConfig
        ) =>
          | ChatOpenAI
          | ChatAnthropic
          | ChatGoogleGenerativeAI
          | ChatMistralAI
          | ChatDeepSeek
          | ChatXAI
      > = {
        anthropic: (llmConfig: LLMConfig) => new ChatAnthropic(llmConfig),
        google: (llmConfig: LLMConfig) => new ChatGoogleGenerativeAI(llmConfig),
        mistral: (llmConfig: LLMConfig) => new ChatMistralAI(llmConfig),
        openai: (llmConfig: LLMConfig) => new ChatOpenAI(llmConfig),
        deepseek: (llmConfig: LLMConfig) => new ChatDeepSeek(llmConfig),
        xai: (llmConfig: LLMConfig) => new ChatXAI(llmConfig),
        default: (llmConfig: LLMConfig) => new ChatOpenAI(llmConfig),
      };

      // Choose the chat class based on the provider
      const provider = this.llmConfig.provider;
      const providerFactory =
        providerFactories[provider] || providerFactories.default;
      this.llmInstance = providerFactory(this.llmConfig) as LangChainChatModel;
    }
  }

  /**
   * Starts work on a new task
   * @param task - The task to work on
   * @param inputs - Task inputs
   * @param context - Task context
   */
  async workOnTask(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ): Promise<AgentLoopResult> {
    const config = this.prepareAgentForTask(task, inputs, context);
    this.executableAgent = config.executableAgent;
    return await this.agenticLoop(
      this,
      task,
      this.executableAgent,
      config.initialFeedbackMessage
    );
  }

  /**
   * Processes feedback for a task
   * @param task - The task to process feedback for
   * @param feedbackList - List of feedback items
   */
  async workOnFeedback(
    task: Task,
    feedbackList: Array<{ content: string }>
  ): Promise<AgentLoopResult> {
    const feedbackString = feedbackList.map((f) => f.content).join(', ');
    const feedbackMessage = this.promptTemplates.WORK_ON_FEEDBACK_FEEDBACK({
      agent: this,
      task,
      feedback: feedbackString,
    });
    return await this.agenticLoop(
      this,
      task,
      this.executableAgent,
      feedbackMessage
    );
  }

  /**
   * Prepares the agent for a new task
   * @param task - The task to prepare for
   * @param inputs - Task inputs
   * @param context - Task context
   */
  prepareAgentForTask(
    task: Task,
    inputs: Record<string, unknown>,
    context: string
  ) {
    if (!this.llmInstance) {
      throw new Error('LLM instance is not initialized');
    }

    const interpolatedDescription = interpolateTaskDescriptionV2(
      task.description,
      inputs,
      this.store?.getState()?.getTaskResults()
    );
    const systemMessage = this.buildSystemMessage(
      this,
      task,
      interpolatedDescription
    );
    const feedbackMessage = this.buildInitialMessage(
      this,
      task,
      interpolatedDescription,
      context
    );
    this.llmSystemMessage = systemMessage;

    const promptAgent = ChatPromptTemplate.fromMessages([
      new SystemMessage(systemMessage),
      ['placeholder', '{chat_history}'],
      ['human', '{feedbackMessage}'],
    ]);

    const chainAgent = promptAgent.pipe(this.llmInstance);
    const chainAgentWithHistory = new RunnableWithMessageHistory<
      unknown,
      unknown
    >({
      runnable: chainAgent,
      getMessageHistory: () => this.interactionsHistory,
      inputMessagesKey: 'feedbackMessage',
      historyMessagesKey: 'chat_history',
    });

    return {
      executableAgent: chainAgentWithHistory,
      initialFeedbackMessage: feedbackMessage,
    };
  }

  /**
   * Main agent loop for processing tasks
   * @param agent - The agent instance
   * @param task - The task being processed
   * @param ExecutableAgent - The executable agent instance
   * @param initialMessage - Initial feedback message
   */
  async agenticLoop(
    agent: ReactChampionAgent,
    task: Task,
    ExecutableAgent: RunnableWithMessageHistory<unknown, unknown> | undefined,
    initialMessage: string | null
  ): Promise<AgentLoopResult> {
    if (!ExecutableAgent) {
      throw new Error('Executable agent is not initialized');
    }

    let feedbackMessage = initialMessage;
    let parsedResultWithFinalAnswer = null;
    let iterations = 0;
    const maxAgentIterations = agent.maxIterations;
    let loopCriticalError = null;
    let blockReason = null;

    while (
      !parsedResultWithFinalAnswer &&
      iterations < maxAgentIterations &&
      !loopCriticalError &&
      !blockReason
    ) {
      this.lastFeedbackMessage = feedbackMessage;

      const workflowStatus = agent.store?.getState()?.teamWorkflowStatus;

      if (
        workflowStatus === WORKFLOW_STATUS_enum.STOPPED ||
        workflowStatus === WORKFLOW_STATUS_enum.STOPPING
      ) {
        return {
          result: parsedResultWithFinalAnswer,
          metadata: { iterations, maxAgentIterations },
        };
      }

      try {
        agent.handleIterationStart({
          agent,
          task,
          iterations,
          maxAgentIterations,
        });

        if (agent.forceFinalAnswer && iterations === maxAgentIterations - 2) {
          feedbackMessage = this.promptTemplates.FORCE_FINAL_ANSWER_FEEDBACK({
            agent,
            task,
            iterations,
            maxAgentIterations,
          });
        }

        const thinkingResult = await this.executeThinking(
          agent,
          task,
          ExecutableAgent,
          feedbackMessage
        );
        const parsedLLMOutput = thinkingResult.parsedLLMOutput;

        const actionType = this.determineActionType(parsedLLMOutput);

        switch (actionType) {
          case AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT:
            feedbackMessage = this.handleIssuesParsingLLMOutput({
              agent,
              task,
              output: thinkingResult,
            });
            break;
          case AGENT_STATUS_enum.OUTPUT_SCHEMA_VALIDATION_ERROR:
            feedbackMessage = this.handleIssuesParsingSchemaOutput({
              agent,
              task,
              output: thinkingResult,
            });
            break;
          case AGENT_STATUS_enum.FINAL_ANSWER:
            parsedResultWithFinalAnswer = this.handleFinalAnswer({
              agent,
              task,
              parsedLLMOutput,
            });
            break;
          case AGENT_STATUS_enum.THOUGHT:
            feedbackMessage = this.handleThought({
              agent,
              task,
              parsedLLMOutput,
            });
            break;
          case AGENT_STATUS_enum.SELF_QUESTION:
            feedbackMessage = this.handleSelfQuestion({
              agent,
              task,
              parsedLLMOutput,
            });
            break;
          case AGENT_STATUS_enum.EXECUTING_ACTION:
            logger.debug(
              `⏩ Agent ${agent.name} will be ${AGENT_STATUS_enum.EXECUTING_ACTION}...`
            );
            {
              const toolName = parsedLLMOutput.action;
              const tool = this.tools.find((tool) => tool.name === toolName);
              if (tool) {
                try {
                  const toolResponse = await this.executeUsingTool({
                    agent,
                    task,
                    parsedLLMOutput,
                    tool,
                  });

                  if (toolResponse?.action === 'BLOCK_TASK') {
                    blockReason = toolResponse.reason;
                    break;
                  }

                  feedbackMessage = this.promptTemplates.TOOL_RESULT_FEEDBACK({
                    agent,
                    task,
                    toolResult: toolResponse.result,
                    parsedLLMOutput,
                  });
                } catch (error: unknown) {
                  if (error instanceof AbortError) {
                    throw error;
                  }
                  feedbackMessage = this.handleUsingToolError({
                    agent,
                    task,
                    parsedLLMOutput,
                    tool,
                    error: new LLMInvocationError(
                      `Error executing tool: ${error}`,
                      error as Error
                    ),
                  });
                }
              } else {
                feedbackMessage = this.handleToolDoesNotExist({
                  agent,
                  task,
                  parsedLLMOutput,
                  toolName: toolName ?? '',
                });
              }
            }
            break;
          case AGENT_STATUS_enum.OBSERVATION:
            feedbackMessage = this.handleObservation({
              agent,
              task,
              parsedLLMOutput,
            });
            break;
          case AGENT_STATUS_enum.WEIRD_LLM_OUTPUT:
            feedbackMessage = this.handleWeirdOutput({
              agent,
              task,
              parsedLLMOutput,
            });
            break;
          default:
            logger.warn(`Unhandled agent status: ${actionType}`);
            break;
        }
      } catch (error: unknown) {
        if (error instanceof AbortError) {
          break;
        }
        if (error instanceof LLMInvocationError) {
          agent.handleThinkingError({ agent, task, error });
        } else {
          this.handleAgenticLoopError({
            agent,
            task,
            error: new LLMInvocationError(
              `Error during agentic loop: ${error}`,
              error as Error
            ),
            iterations,
            maxAgentIterations,
          });
        }

        loopCriticalError = error;
        break;
      }
      agent.handleIterationEnd({
        agent,
        task,
        iterations,
        maxAgentIterations,
      });
      iterations++;
    }

    if (loopCriticalError) {
      return {
        error:
          'Execution stopped due to a critical error: ' +
          (loopCriticalError as Error).message,
        metadata: { iterations, maxAgentIterations },
      };
    } else if (blockReason) {
      agent.store?.getState()?.handleAgentBlockTask({
        agent,
        task,
        reason: blockReason,
        metadata: {
          isAgentDecision: true,
          blockedBy: agent.name,
        },
      });

      return {
        error: blockReason,
        metadata: { iterations, maxAgentIterations },
      };
    } else if (parsedResultWithFinalAnswer) {
      this.handleTaskCompleted({
        agent,
        task,
        parsedResultWithFinalAnswer,
        iterations,
        maxAgentIterations,
      });
      return {
        result: parsedResultWithFinalAnswer,
        metadata: { iterations, maxAgentIterations },
      };
    } else if (iterations >= maxAgentIterations) {
      this.handleMaxIterationsError({
        agent,
        task,
        iterations,
        maxAgentIterations,
      });
      return {
        error:
          'Task incomplete: reached maximum iterations without final answer.',
        metadata: { iterations, maxAgentIterations },
      };
    } else {
      return {
        error: 'Execution terminated unexpectedly without results.',
        metadata: { iterations, maxAgentIterations },
      };
    }
  }

  /**
   * Builds the system message for the agent
   */
  buildSystemMessage(
    agent: ReactChampionAgent,
    task: Task,
    interpolatedTaskDescription: string
  ): string {
    return this.promptTemplates.SYSTEM_MESSAGE({
      agent,
      task: {
        ...task,
        description: interpolatedTaskDescription,
      },
      insights: this.store?.getState()?.insights,
    });
  }

  /**
   * Builds the initial message for the agent
   */
  buildInitialMessage(
    agent: ReactChampionAgent,
    task: Task,
    interpolatedTaskDescription: string,
    context?: string
  ): string {
    return this.promptTemplates.INITIAL_MESSAGE({
      agent,
      task: {
        ...task,
        description: interpolatedTaskDescription,
      },
      context,
    });
  }

  /**
   * Determines the type of action based on parsed LLM output
   */
  determineActionType(parsedResult: ParsedLLMOutput): string {
    if (parsedResult === null) {
      return AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT;
    } else if (
      parsedResult.finalAnswer &&
      parsedResult.outputSchema &&
      !parsedResult.isValidOutput
    ) {
      return AGENT_STATUS_enum.OUTPUT_SCHEMA_VALIDATION_ERROR;
    } else if (parsedResult.finalAnswer) {
      return AGENT_STATUS_enum.FINAL_ANSWER;
    } else if (parsedResult.action === 'self_question') {
      return parsedResult.thought
        ? AGENT_STATUS_enum.THOUGHT
        : AGENT_STATUS_enum.SELF_QUESTION;
    } else if (parsedResult.action) {
      return AGENT_STATUS_enum.EXECUTING_ACTION;
    } else if (parsedResult.observation) {
      return AGENT_STATUS_enum.OBSERVATION;
    } else {
      return AGENT_STATUS_enum.WEIRD_LLM_OUTPUT;
    }
  }

  // Handler methods
  handleIterationStart(params: {
    agent: ReactChampionAgent;
    task: Task;
    iterations: number;
    maxAgentIterations: number;
  }): void {
    const { agent, task, iterations, maxAgentIterations } = params;
    agent.store?.getState()?.handleAgentIterationStart({
      agent,
      task,
      iterations,
      maxAgentIterations,
    });
  }

  handleIterationEnd(params: {
    agent: ReactChampionAgent;
    task: Task;
    iterations: number;
    maxAgentIterations: number;
  }): void {
    const { agent, task, iterations, maxAgentIterations } = params;
    agent.store?.getState()?.handleAgentIterationEnd({
      agent,
      task,
      iterations,
      maxAgentIterations,
    });
  }

  async handleThinkingStart(params: {
    agent: ReactChampionAgent;
    task: Task;
    messages: BaseMessage[][];
  }): Promise<unknown[]> {
    const { agent, task, messages } = params;
    try {
      const transformedMessages = messages.flatMap((subArray) =>
        subArray.map((message) => ({
          type: message.constructor.name,
          content: message.content.toString(),
        }))
      );
      agent.store?.getState()?.handleAgentThinkingStart({
        agent,
        task,
        messages: transformedMessages,
      });
      return transformedMessages;
    } catch (error) {
      logger.debug(
        `AGENT/handleThinkingStart: Error processing thinking messages: ${
          (error as Error).message
        }`
      );
      throw error;
    }
  }

  async handleThinkingEnd(params: {
    agent: ReactChampionAgent;
    task: Task;
    output: LLMOutput;
  }): Promise<ThinkingResult> {
    const { agent, task, output } = params;
    try {
      const agentResultParser = new StringOutputParser();
      const generations = output.generations as ChatGeneration[][];
      if (!generations || !generations[0] || !generations[0][0].message) {
        throw new Error('Invalid output structure');
      }

      const message = generations[0][0].message as AIMessageChunk;
      const parsedResult = await agentResultParser.invoke(message);
      const parsedLLMOutput: ParsedLLMOutput = getParsedJSON(parsedResult);

      if (task.outputSchema && parsedLLMOutput.finalAnswer) {
        parsedLLMOutput.outputSchema = task.outputSchema;
        const parsedSchema = task.outputSchema.safeParse(
          parsedLLMOutput.finalAnswer
        );

        parsedLLMOutput.isValidOutput = parsedSchema.success;
        parsedLLMOutput.outputSchemaErrors = parsedSchema.error;
        parsedLLMOutput.finalAnswer = parsedSchema.success
          ? parsedSchema.data
          : parsedLLMOutput.finalAnswer;
      }
      const thinkingResult = {
        parsedLLMOutput,
        llmOutput: parsedResult,
        llmUsageStats: {
          inputTokens: message.usage_metadata?.input_tokens ?? -1,
          outputTokens: message.usage_metadata?.output_tokens ?? -1,
        },
      };
      agent.store
        ?.getState()
        ?.handleAgentThinkingEnd({ agent, task, output: thinkingResult });
      return thinkingResult;
    } catch (error) {
      logger.debug(
        `AGENT/handleThinkingEnd: Error processing thinking result: ${error}`
      );
      throw error;
    }
  }

  handleThinkingError(params: {
    agent: ReactChampionAgent;
    task: Task;
    error: LLMInvocationError;
  }): void {
    const { agent, task, error } = params;
    agent.store?.getState()?.handleAgentThinkingError({ agent, task, error });
  }

  /**
   * Executes the thinking process for the agent
   */
  async executeThinking(
    agent: ReactChampionAgent,
    task: Task,
    ExecutableAgent: RunnableWithMessageHistory<unknown, unknown>,
    feedbackMessage: string | null
  ): Promise<ThinkingResult> {
    const promiseObj: ThinkingPromise = {} as ThinkingPromise;
    let rejectFn: (error: Error) => void;
    const abortController = new AbortController();

    const thinkingPromise = new Promise<ThinkingResult>((resolve, reject) => {
      rejectFn = reject;

      ExecutableAgent.invoke(
        { feedbackMessage },
        {
          configurable: { sessionId: task.id },
          callbacks: [
            {
              handleChatModelStart: async (_, messages) => {
                await agent.handleThinkingStart({ agent, task, messages });
              },
              handleLLMEnd: async (output: LLMOutput) => {
                const result = await agent.handleThinkingEnd({
                  agent,
                  task,
                  output,
                });
                resolve(result);
              },
            },
          ],
          signal: abortController.signal,
        }
      ).catch((error: Error) => {
        if (error.name === 'AbortError') {
          reject(new AbortError('Task was cancelled'));
        } else {
          logger.error(
            `LLM_INVOCATION_ERROR: Error during LLM API call for Agent: ${agent.name}, Task: ${task.id}. Details:`,
            error
          );
          reject(
            new LLMInvocationError(
              `LLM API Error during executeThinking for Agent: ${agent.name}, Task: ${task.id}`,
              error
            )
          );
        }
      });
    });

    Object.assign(promiseObj, {
      promise: thinkingPromise,
      reject: (e: Error) => {
        abortController.abort();
        rejectFn(e);
      },
    });

    this.store?.getState()?.trackPromise(this.id, promiseObj);

    try {
      return await thinkingPromise;
    } catch (error) {
      if (error instanceof AbortError) {
        throw error;
      }
      throw new LLMInvocationError(
        `LLM API Error during executeThinking for Agent: ${agent.name}, Task: ${task.id}`,
        error as Error
      );
    } finally {
      this.store?.getState()?.removePromise(this.id, promiseObj);
    }
  }

  handleIssuesParsingLLMOutput(params: {
    agent: ReactChampionAgent;
    task: Task;
    output: ThinkingResult;
  }): string {
    const { agent, task, output } = params;
    const jSONPArsingError = new LLMInvocationError(
      `Received an invalid JSON object from the LLM. Requesting a correctly formatted JSON response. Cause:${output.llmOutput}`
    );
    agent.store?.getState()?.handleAgentIssuesParsingLLMOutput({
      agent,
      task,
      output,
      error: jSONPArsingError,
    });
    return this.promptTemplates.INVALID_JSON_FEEDBACK({
      agent,
      task,
      llmOutput: output.llmOutput,
    });
  }

  handleIssuesParsingSchemaOutput(params: {
    agent: ReactChampionAgent;
    task: Task;
    output: ThinkingResult;
  }): string {
    const { agent, task, output } = params;
    const jSONPArsingError = new LLMInvocationError(
      'The output does not match the expected schema structure',
      new Error(JSON.stringify(output.parsedLLMOutput.outputSchemaErrors))
    );
    agent.store?.getState()?.handleAgentIssuesParsingSchemaOutput({
      agent,
      task,
      output,
      error: jSONPArsingError,
    });
    return this.promptTemplates.INVALID_OUTPUT_SCHEMA_FEEDBACK({
      agent,
      task,
      llmOutput: output.llmOutput,
      outputSchema: task.outputSchema,
      outputSchemaError: output.parsedLLMOutput.outputSchemaErrors,
    });
  }

  handleFinalAnswer(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
  }): ParsedLLMOutput {
    const { agent, task, parsedLLMOutput } = params;
    if (parsedLLMOutput.finalAnswer) {
      if (
        typeof parsedLLMOutput.finalAnswer === 'object' &&
        parsedLLMOutput.finalAnswer !== null &&
        !task.outputSchema
      ) {
        parsedLLMOutput.finalAnswer = JSON.stringify(
          parsedLLMOutput.finalAnswer
        );
      }
    }
    agent.store
      ?.getState()
      ?.handleAgentFinalAnswer({ agent, task, output: parsedLLMOutput });
    return parsedLLMOutput;
  }

  handleThought(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
  }): string {
    const { agent, task, parsedLLMOutput } = params;
    agent.store
      ?.getState()
      ?.handleAgentThought({ agent, task, output: parsedLLMOutput });
    let feedbackMessage = this.promptTemplates.THOUGHT_FEEDBACK({
      agent,
      task,
      thought: parsedLLMOutput.thought ?? '',
      parsedLLMOutput,
    });
    if (
      parsedLLMOutput.action === 'self_question' &&
      parsedLLMOutput.actionInput
    ) {
      const actionAsString =
        typeof parsedLLMOutput.actionInput == 'object'
          ? JSON.stringify(parsedLLMOutput.actionInput)
          : parsedLLMOutput.actionInput;
      feedbackMessage =
        this.promptTemplates.THOUGHT_WITH_SELF_QUESTION_FEEDBACK({
          agent,
          task,
          thought: parsedLLMOutput.thought ?? '',
          question: actionAsString,
          parsedLLMOutput,
        });
    }
    return feedbackMessage;
  }

  handleSelfQuestion(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
  }): string {
    const { agent, task, parsedLLMOutput } = params;
    agent.store
      ?.getState()
      ?.handleAgentSelfQuestion({ agent, task, output: parsedLLMOutput });
    return this.promptTemplates.SELF_QUESTION_FEEDBACK({
      agent,
      task,
      question: parsedLLMOutput.thought ?? '',
      parsedLLMOutput,
    });
  }

  async executeUsingTool(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
    tool: BaseTool;
  }): Promise<{
    result: string;
    error?: LLMInvocationError;
    reason?: string;
    action: string;
  }> {
    const { agent, task, parsedLLMOutput, tool } = params;
    const toolInput = parsedLLMOutput.actionInput ?? {};
    agent.handleUsingToolStart({ agent, task, tool, input: toolInput });

    const promiseObj: ToolCallingPromise = {} as ToolCallingPromise;
    let rejectFn: (error: Error) => void = () => {};

    const toolPromise = new Promise((resolve, reject) => {
      rejectFn = reject;
      tool.invoke(toolInput).then(resolve).catch(reject);
    });

    Object.assign(promiseObj, { promise: toolPromise, reject: rejectFn });

    this.store?.getState()?.trackPromise(this.id, promiseObj);

    try {
      const toolResult: ToolResult = (await toolPromise) as ToolResult;
      agent.handleUsingToolEnd({
        agent,
        task,
        tool,
        output: toolResult,
      });
      const action =
        typeof toolResult === 'object' && 'action' in toolResult
          ? (toolResult.action as string)
          : tool.name;
      const result =
        typeof toolResult === 'object' && 'result' in toolResult
          ? (toolResult.result as string)
          : (toolResult as string);
      const error =
        typeof toolResult === 'object' && 'error' in toolResult
          ? (toolResult.error as LLMInvocationError)
          : undefined;
      const reason =
        typeof toolResult === 'object' && 'reason' in toolResult
          ? (toolResult.reason as string)
          : undefined;
      return {
        result,
        error,
        reason,
        action,
      };
    } catch (error) {
      if (error instanceof AbortError) {
        throw error;
      }

      const e = new LLMInvocationError(
        `Error executing tool: ${error}`,
        error as Error
      );
      this.handleUsingToolError({
        agent,
        task,
        parsedLLMOutput,
        tool,
        error: e,
      });

      return {
        result: '',
        error: e,
        reason: e.message,
        action: tool.name,
      };
    } finally {
      this.store?.getState()?.removePromise(this.id, promiseObj);
    }
  }

  handleUsingToolStart(params: {
    agent: ReactChampionAgent;
    task: Task;
    tool: BaseTool;
    input?: Record<string, unknown> | string;
  }): void {
    const { agent, task, tool, input } = params;
    agent.store?.getState()?.handleAgentToolStart({ agent, task, tool, input });
  }

  handleUsingToolEnd(params: {
    agent: ReactChampionAgent;
    task: Task;
    tool: BaseTool;
    output: ToolResult;
  }): void {
    const { agent, task, tool, output } = params;
    agent.store?.getState()?.handleAgentToolEnd({ agent, task, tool, output });
  }

  handleUsingToolError(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
    tool: BaseTool;
    error: LLMInvocationError;
  }): string {
    const { agent, task, parsedLLMOutput, tool, error } = params;
    agent.store?.getState()?.handleAgentToolError({ agent, task, tool, error });
    return this.promptTemplates.TOOL_ERROR_FEEDBACK({
      agent,
      task,
      toolName: parsedLLMOutput.action ?? tool.name,
      error,
      parsedLLMOutput,
    });
  }

  handleToolDoesNotExist(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
    toolName: string;
  }): string {
    const { agent, task, parsedLLMOutput, toolName } = params;
    agent.store
      ?.getState()
      ?.handleAgentToolDoesNotExist({ agent, task, toolName });
    return this.promptTemplates.TOOL_NOT_EXIST_FEEDBACK({
      agent,
      task,
      toolName: parsedLLMOutput.action ?? toolName,
      error: new LLMInvocationError(`Tool ${toolName} does not exist`),
      parsedLLMOutput,
    });
  }

  handleObservation(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
  }): string {
    const { agent, task, parsedLLMOutput } = params;
    agent.store
      ?.getState()
      ?.handleAgentObservation({ agent, task, output: parsedLLMOutput });
    return this.promptTemplates.OBSERVATION_FEEDBACK({
      agent,
      task,
      parsedLLMOutput,
    });
  }

  handleWeirdOutput(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedLLMOutput: ParsedLLMOutput;
  }): string {
    const { agent, task, parsedLLMOutput } = params;
    agent.store
      ?.getState()
      ?.handleWeirdOutput({ agent, task, output: parsedLLMOutput });
    return this.promptTemplates.WEIRD_OUTPUT_FEEDBACK({
      agent,
      task,
      parsedLLMOutput,
    });
  }

  handleAgenticLoopError(params: {
    agent: ReactChampionAgent;
    task: Task;
    error: LLMInvocationError;
    iterations: number;
    maxAgentIterations: number;
  }): void {
    const { agent, task, error, iterations, maxAgentIterations } = params;
    agent.store?.getState()?.handleAgentLoopError({
      agent,
      task,
      error,
      iterations,
      maxAgentIterations,
    });
  }

  handleTaskAborted(params: {
    agent: ReactChampionAgent;
    task: Task;
    error: LLMInvocationError;
  }): void {
    const { agent, task, error } = params;
    agent.store?.getState()?.handleAgentTaskAborted({
      agent,
      task,
      error,
    });
  }

  handleMaxIterationsError(params: {
    agent: ReactChampionAgent;
    task: Task;
    iterations: number;
    maxAgentIterations: number;
  }): void {
    const { agent, task, iterations, maxAgentIterations } = params;
    const error = new LLMInvocationError(
      `Agent ${agent.name} reached the maximum number of iterations: [${maxAgentIterations}] without finding a final answer.`
    );
    agent.store?.getState()?.handleAgentMaxIterationsError({
      agent,
      task,
      error,
      iterations,
      maxAgentIterations,
    });
  }

  handleTaskCompleted(params: {
    agent: ReactChampionAgent;
    task: Task;
    parsedResultWithFinalAnswer: ParsedLLMOutput;
    iterations: number;
    maxAgentIterations: number;
  }): void {
    const {
      agent,
      task,
      parsedResultWithFinalAnswer,
      iterations,
      maxAgentIterations,
    } = params;
    agent.store?.getState()?.handleAgentTaskCompleted({
      agent,
      task,
      result: parsedResultWithFinalAnswer.finalAnswer as TaskResult,
      iterations,
      maxAgentIterations,
    });
  }

  getCleanedAgent(): Partial<BaseAgent> {
    const { executableAgent: _, ...rest } = this;

    return {
      ...rest,
      id: '[REDACTED]',
      env: '[REDACTED]',
      llmConfig: {
        ...this.llmConfig,
        apiKey: '[REDACTED]',
      },
    };
  }

  reset() {
    super.reset();
    this.lastFeedbackMessage = null;
    this.currentIterations = 0;
    this.interactionsHistory = new ChatMessageHistory();
  }
}
