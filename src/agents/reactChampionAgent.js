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
 * Usage:
 * Deploy this agent in applications that demand high levels of interaction and precise control over state transitions, ensuring 
 * optimal performance and nuanced agent behavior.
 */

import { BaseAgent } from './baseAgent';
import { getApiKey } from '../utils/agents';
import { getParsedJSON } from '../utils/parser';
import { AGENT_STATUS_enum } from '../utils/enums';
import { interpolateTaskDescription, } from '../utils/tasks';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "langchain/stores/message/in_memory";
import {
    ChatPromptTemplate,
  } from "@langchain/core/prompts";
import { logger } from "../utils/logger";
import {getChampionReActAgentSystemPrompt} from '../utils/prompts';
import { LLMInvocationError } from '../utils/errors';

class ReactChampionAgent extends BaseAgent {
    constructor(config) {
        super(config);
    }

    async executeTask(task, inputs, context) {
        const _self = this;
        
        const agentConfigForExecution = this.buildAgent(_self, task, inputs, context);
        const ExecutableAgent =  agentConfigForExecution.executableAgent;
        let feedbackMessage = agentConfigForExecution.initialFeedbackMessage;
        
        let parsedResultWithFinalAnswer = null;
        let iterations = 0;
        const maxAgentIterations = _self.maxIterations;  // Define maximum iterations here
        let loopCriticalError = null;

        while (!parsedResultWithFinalAnswer && iterations < maxAgentIterations && !loopCriticalError) {
            try {
                _self.handleIterationStart({agent: _self, task, iterations, maxAgentIterations});

                // Check if we need to force the final answer
                if (_self.forceFinalAnswer && iterations === maxAgentIterations - 2) {
                    feedbackMessage = "We don't have more time to keep looking for the answer. Please use all the information you have gathered until now and give the finalAnswer right away.";
                }                

                // pure function that returns the result of the agent thinking
                const thinkingResult = await this.executeThinking(_self, task, ExecutableAgent, feedbackMessage);
                // sometimes the LLM does not returns a valid JSON object so we try to sanitize the output here
                const parsedLLMOutput = thinkingResult.parsedLLMOutput;

                const actionType = this.determineActionType(parsedLLMOutput);

                switch (actionType) {
                    case AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT:
                        feedbackMessage = this.handleIssuesParsingLLMOutput({agent: _self, task, output: thinkingResult});
                        break;
                    case AGENT_STATUS_enum.FINAL_ANSWER:
                        parsedResultWithFinalAnswer = this.handleFinalAnswer({agent: _self, task, parsedLLMOutput});
                        break;
                    case AGENT_STATUS_enum.THOUGHT:
                        feedbackMessage = this.handleThought({agent: _self, task, parsedLLMOutput});
                        break;
                    case AGENT_STATUS_enum.SELF_QUESTION:
                        feedbackMessage = this.handleSelfQuestion({agent: _self, task, parsedLLMOutput});
                        break;
                    case AGENT_STATUS_enum.EXECUTING_ACTION:
                        logger.debug(`⏩ Agent ${_self.name} will be ${AGENT_STATUS_enum.EXECUTING_ACTION}...`);
                        const toolName = parsedLLMOutput.action;
                        const tool = this.tools.find(tool => tool.name === toolName);
                        if (tool) {
                            try {
                                feedbackMessage = await this.executeUsingTool({agent: _self, task, parsedLLMOutput, tool});
                            } catch (error) {
                                feedbackMessage = this.handleUsingToolError({agent: _self, task, parsedLLMOutput, tool, error});
                            }
                        } else {
                            feedbackMessage = this.handleToolDoesNotExist({agent: _self, task, parsedLLMOutput, toolName });
                        }
                        break;
                    case AGENT_STATUS_enum.OBSERVATION:
                        feedbackMessage = this.handleObservation({agent: _self, task, parsedLLMOutput});
                        break;
                    case AGENT_STATUS_enum.WEIRD_LLM_OUTPUT:
                        feedbackMessage = this.handleWeirdOutput({agent:_self, task, parsedLLMOutput});
                        break;
                    default:
                        logger.warn(`Unhandled agent status: ${actionType}`);
                        break;
                }
            } catch (error) {
                // Check if the error is of type 'LLMInvocationError'
                if (error.name === 'LLMInvocationError') {
                    // Handle specific LLMInvocationError
                    _self.handleThinkingError({ agent: _self, task, error });
                } else {
                    // Handle other types of errors, perhaps more generally or differently
                    // TODO: Determine actions based on the type or severity of other errors
                    this.handleAgenticLoopError({agent: _self, task, error, iterations, maxAgentIterations});
                }
            
                // Assign the error to loopCriticalError and break the loop, indicating a critical error has occurred
                loopCriticalError = error;
                break; // Break the loop on critical error
            }
            _self.handleIterationEnd({agent: _self, task, iterations, maxAgentIterations});
            iterations++;      
        }
    
        // Return based on the loop outcomes
        if (loopCriticalError) {
            return {
                error: "Execution stopped due to a critical error: " + loopCriticalError.message,
                metadata: { iterations, maxAgentIterations }
            };
        } else if (parsedResultWithFinalAnswer) {
            this.handleTaskCompleted({agent: _self, task, parsedResultWithFinalAnswer, iterations, maxAgentIterations});
            return {
                result: parsedResultWithFinalAnswer,
                metadata: { iterations, maxAgentIterations }
            };
        } else if (iterations >= maxAgentIterations) {
            this.handleMaxIterationsError({agent: _self, task, iterations, maxAgentIterations});
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

    buildSystemMessage(agent, task, interpolatedTaskDescription){
        const systemMessage = getChampionReActAgentSystemPrompt({
            name: agent.name,
            role: agent.role,
            background: agent.background,
            goal: agent.goal,
            tools: agent.tools,
            description: interpolatedTaskDescription,
            expectedOutput: task.expectedOutput,
        });
        return systemMessage;
    }

    buildInitialMessage(agent, task, interpolatedTaskDescription, context){
        const feedbackMessage = `
            Hi ${agent.name}, please complete the following task: ${interpolatedTaskDescription}.
            Your expected output should be: "${task.expectedOutput}".
            ${context ? `Incorporate the following findings and insights from previous tasks: "${context}"` : ""}
        `;
        return feedbackMessage;
    }

    buildAgent(agent, task, inputs, context){
        // Ensure the API key is retrieved and set correctly
        const apiKey = getApiKey(agent.llmConfig, agent.env);
        agent.llmConfig.apiKey = apiKey;
        
        if (!agent.llmConfig.apiKey) {
            throw new Error('API key is missing. Please provide it through the Agent llmConfig or throught the team env variable. E.g: new Team ({name: "My Team", env: {OPENAI_API_KEY: "your-api-key"}})');
        }
    
        // Define a mapping of providers to their corresponding chat classes
        const providers = {
            anthropic: ChatAnthropic,
            google: ChatGoogleGenerativeAI,
            mistral: ChatMistralAI,
            openai: ChatOpenAI,
        };
    
        // Choose the chat class based on the provider, with a fallback to OpenAI if not found
        const ChatClass = providers[this.llmConfig.provider];
    
        // Initialize the language model instance with the complete configuration
        this.llmInstance = new ChatClass(this.llmConfig);
    
        // Initialize the chat message history
        this.memory = new ChatMessageHistory();
        const interpolatedDescription = interpolateTaskDescription(task.description, inputs);
        const systemMessage = this.buildSystemMessage(agent, task, interpolatedDescription);
        const feedbackMessage = this.buildInitialMessage(agent, task, interpolatedDescription, context);

        this.llmSystemMessage = systemMessage;

        const promptAgent = ChatPromptTemplate.fromMessages([
            new SystemMessage(systemMessage),
            ["placeholder", "{chat_history}"], // like this
            ["human", "{feedbackMessage}"],
        ]);
    
        const chainAgent = promptAgent.pipe(agent.llmInstance);
    
        const chainAgentWithHistory = new RunnableWithMessageHistory({
            runnable: chainAgent,
            getMessageHistory: () => {
               return agent.memory;
            },
            inputMessagesKey: "feedbackMessage",
            historyMessagesKey: "chat_history",
        });

        return {
         executableAgent: chainAgentWithHistory,
         initialFeedbackMessage: feedbackMessage
        }
    }

    determineActionType (parsedResult) {
        if (parsedResult === null) {
            return AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT;
        } else if (parsedResult.finalAnswer) {
            return AGENT_STATUS_enum.FINAL_ANSWER;
        } else if (parsedResult.action === "self_question") {
            return parsedResult.thought ? AGENT_STATUS_enum.THOUGHT : AGENT_STATUS_enum.SELF_QUESTION;
        } else if (parsedResult.action) {
            return AGENT_STATUS_enum.EXECUTING_ACTION; // Assume actions need to execute a tool or similar
        } else if (parsedResult.observation) {
            return AGENT_STATUS_enum.OBSERVATION;
        } else {
            return AGENT_STATUS_enum.WEIRD_LLM_OUTPUT; // Fallback for unhandled or unexpected output
        }
    }

    handleIterationStart({agent, task, iterations, maxAgentIterations}) {
        agent.store.getState().handleAgentIterationStart({agent, task, iterations, maxAgentIterations});
    }

    handleIterationEnd({agent, task, iterations, maxAgentIterations}) {
        agent.store.getState().handleAgentIterationEnd({agent, task, iterations, maxAgentIterations});
    }
    async handleThinkingStart({ agent, task, messages }) {
        try {
            const transformedMessages = messages.flatMap(subArray =>
                subArray.map(message => ({
                    type: message.constructor.name,
                    content: message.content
                }))
            );
            agent.store.getState().handleAgentThinkingStart({agent, task, messages: transformedMessages});
            return transformedMessages;
        } catch (error) {
            // TODO: Checkout the Errors waterfall handling
            logger.debug(`AGENT/handleThinkingStart: Error processing thinking messages: ${error.message}`);
            throw error;  // Rethrow to ensure it can still be handled upstream if necessary
        }
    }
    
    async handleThinkingEnd({ agent, task, output }) {
        try {
            const agentResultParser = new StringOutputParser();
            if (!output.generations || !output.generations[0] || !output.generations[0][0].message) {
                throw new Error('Invalid output structure');
            }

            const { message } = output.generations[0][0];
            const parsedResult = await agentResultParser.invoke(message);
            const parsedLLMOutput = getParsedJSON(parsedResult);
            const thinkingResult = {
                parsedLLMOutput: parsedLLMOutput,
                llmOutput: parsedResult,
                llmUsageStats: {
                    inputTokens: message.usage_metadata?.input_tokens ?? -1,
                    outputTokens: message.usage_metadata?.output_tokens ?? -1
                }
            };
            agent.store.getState().handleAgentThinkingEnd({agent, task, output: thinkingResult});
            return thinkingResult;
        } catch (error) {
            logger.debug(`AGENT/handleThinkingEnd: Error processing thinking result: ${error}`);
            throw error;  // Rethrow to ensure it can still be handled upstream if necessary
        }
    }

    handleThinkingError({ agent, task, error }) {  
        agent.store.getState().handleAgentThinkingError({agent, task, error});
    }

    async executeThinking(agent, task, ExecutableAgent, feedbackMessage) {
        return new Promise((resolve, reject) => {
            ExecutableAgent.invoke(
                { feedbackMessage },
                {
                    "configurable": { "sessionId": "foo-bar-baz" },
                    callbacks: [{
                        handleChatModelStart: (llm, messages) => {
                            agent.handleThinkingStart({ agent, task, messages }).catch(error => {
                                reject(error);
                            });
                        },
    
                        handleLLMEnd: async (output) => {
                            agent.handleThinkingEnd({ agent, task, output })
                                .then(thinkingResult => resolve(thinkingResult))
                                .catch(error => {
                                    reject(error);
                                });
                        }
                    }]
                }
            ).catch(error => {
                logger.error(`LLM_INVOCATION_ERROR: Error during LLM API call for Agent: ${agent.name}, Task: ${task.id}. Details:`, error);
                reject(new LLMInvocationError(`LLM API Error during executeThinking for Agent: ${agent.name}, Task: ${task.id}`, error));
            });
        });
    }
    
    handleIssuesParsingLLMOutput({agent, task, output}) { 
        const jSONPArsingError = new Error('Received an invalid JSON object from the LLM. Requesting a correctly formatted JSON response.', output.llmOutput);
        agent.store.getState().handleAgentIssuesParsingLLMOutput({agent, task, output, error: jSONPArsingError});
        const feedbackMessage = `You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else. E.g: {\"finalAnswer\": \"The final answer\"}`;
        return feedbackMessage;
    }

    handleFinalAnswer({agent, task, parsedLLMOutput}) {
        // console.log(parsedJSON.finalAnswer);
        if (parsedLLMOutput.finalAnswer) {
            if (typeof parsedLLMOutput.finalAnswer === 'object' && parsedLLMOutput.finalAnswer !== null) {
                parsedLLMOutput.finalAnswer = JSON.stringify(parsedLLMOutput.finalAnswer);
            }
        }
        agent.store.getState().handleAgentFinalAnswer({agent, task, output: parsedLLMOutput});
        return parsedLLMOutput;
    }

    handleThought({agent, task, parsedLLMOutput}) {
        agent.store.getState().handleAgentThought({agent, task, output: parsedLLMOutput});
        let feedbackMessage = "Your toughts are great, let's keep going.";
        if(parsedLLMOutput.action === 'self_question' && parsedLLMOutput.actionInput) {
            const actionAsString = typeof parsedLLMOutput.actionInput == 'object' ? JSON.stringify(parsedLLMOutput.actionInput) : parsedLLMOutput.actionInput;
            feedbackMessage = "Awesome, please answer yourself the question: " + actionAsString;
        }
        return feedbackMessage;
    }

    handleSelfQuestion({agent, task, parsedLLMOutput}) {
        agent.store.getState().handleAgentSelfQuestion({agent, task, output: parsedLLMOutput});
        const feedbackMessage = "Awesome, please answer yourself the question";
        return feedbackMessage;
    }

    async executeUsingTool({agent, task, parsedLLMOutput, tool}) {
        // If the tool exists, use it
        const toolInput = parsedLLMOutput.actionInput;
        agent.handleUsingToolStart({agent, task, tool, input: toolInput});
        const toolResult = await tool.call(toolInput);
        agent.handleUsingToolEnd({agent, task, tool, output: toolResult});
        // console.log(toolResult);
        const feedbackMessage = "You got this result from the tool: " + JSON.stringify(toolResult);
        return feedbackMessage;
    }

    handleUsingToolStart({agent, task, tool, input}) {
        agent.store.getState().handleAgentToolStart({agent, task, tool, input});
    }
    handleUsingToolEnd({agent, task, tool, output}) {
        agent.store.getState().handleAgentToolEnd({agent, task, tool, output});
    }

    handleUsingToolError({agent, task, parsedLLMOutput, tool, error}) {
        agent.store.getState().handleAgentToolError({agent, task, tool, error});
        // console.error(`Error occurred while using the tool ${parsedLLMOutput.action}:`, error);
        const feedbackMessage = `An error occurred while using the tool ${parsedLLMOutput.action}. Please try again or use a different method.`;
        return feedbackMessage;
    }

    handleToolDoesNotExist({agent, task, parsedLLMOutput, toolName}) {
        agent.store.getState().handleAgentToolDoesNotExist({agent, task, toolName});
        const feedbackMessage = `Hey, the tool ${parsedLLMOutput.action} does not exist. Please find another way.`;
        return feedbackMessage;
    }

    handleObservation({agent, task, parsedLLMOutput}) {
        agent.store.getState().handleAgentObservation({agent, task, output: parsedLLMOutput});
        const feedbackMessage = "Great observation. Please keep going. Let's get to the final answer.";
        return feedbackMessage;
    }

    handleWeirdOutput({agent, task, parsedLLMOutput}) {
        agent.store.getState().handleWeirdOutput({agent, task, output: parsedLLMOutput});
        const feedbackMessage = "Your latest response does not match the way you are expected to output information. Please correct it.";
        return feedbackMessage;
    }

    handleAgenticLoopError({agent, task, error, iterations, maxAgentIterations}) {
        agent.store.getState().handleAgentLoopError({agent, task, error, iterations, maxAgentIterations});
    }

    handleMaxIterationsError({agent, task, iterations, maxAgentIterations}) {
        const error = new Error(`Agent ${agent.name} reached the maximum number of iterations: [${maxAgentIterations}] without finding a final answer.`);
        agent.store.getState().handleAgentMaxIterationsError({agent, task, error, iterations, maxAgentIterations});
    }

    handleTaskCompleted({agent, task, parsedResultWithFinalAnswer, iterations, maxAgentIterations}) {
        agent.store.getState().handleAgentTaskCompleted({agent, task, result: parsedResultWithFinalAnswer.finalAnswer, iterations, maxAgentIterations});
        // console.log("Final Answer found:", finalAnswer);
        // console.log("Task completed:", task);
    }   
}

export { ReactChampionAgent };
