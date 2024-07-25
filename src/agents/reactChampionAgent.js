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


// import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import {getChampionReActAgentSystemPrompt} from '../utils/prompts';

class ReactChampionAgent extends BaseAgent {
    constructor(config) {
        super(config);
        const defaultConfig = {
            model: "gpt-3.5-turbo-0125",
            provider: 'openai'
        };
        this.llmConfig = { ...defaultConfig, ...config.llmConfig };
    }

    async executeTask(task, inputs, context) {
        const _self = this;
        
        const agentConfigForExecution = this.buildAgent(_self, task, inputs, context);
        const ExecutableAgent =  agentConfigForExecution.executableAgent;
        let feedbackMessage = agentConfigForExecution.initialFeedbackMessage;
        
        let finalAnswer = null;
        let iterations = 0;
        const maxAgentIterations = 5;  // Define maximum iterations here
    
        try {
            while (!finalAnswer && iterations < maxAgentIterations) {

                logger.info(`🏁 Agent ${_self.name} - ${AGENT_STATUS_enum.ITERATION_START} (${iterations+1}/${maxAgentIterations})`);

                // pure function that returns the result of the agent thinking
                const thinkingResult = await this.executeAgentThinking(_self, ExecutableAgent, feedbackMessage);
                // sometimes the LLM does not returns a valid JSON object so we try to sanitize the output here
                const parsedThinkingResult = getParsedJSON(thinkingResult);

                const actionType = this.determineActionType(parsedThinkingResult);

                switch (actionType) {
                    case AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT:
                        feedbackMessage = this.handleIssuesParsingLLMOutput(_self);
                        break;
                    case AGENT_STATUS_enum.FINAL_ANSWER:
                        finalAnswer = this.handleFinalAnswer(_self, parsedThinkingResult);
                        break;
                    case AGENT_STATUS_enum.THOUGHT:
                        feedbackMessage = this.handleThought(_self, parsedThinkingResult);
                        break;
                    case AGENT_STATUS_enum.SELF_QUESTION:
                        feedbackMessage = this.handleSelfQuestion(_self, parsedThinkingResult);
                        break;
                    case AGENT_STATUS_enum.EXECUTING_ACTION:
                        logger.info(`⏩ Agent ${_self.name} will be ${AGENT_STATUS_enum.EXECUTING_ACTION}...`);
                        const tool = this.tools.find(tool => tool.name === parsedThinkingResult.action);
                        if (tool) {
                            try {
                                feedbackMessage = await this.executeUsingTool(_self, parsedThinkingResult, tool);
                            } catch (error) {
                                feedbackMessage = this.handleUsingToolError(_self, parsedThinkingResult, tool, error);
                            }
                        } else {
                            feedbackMessage = this.handleToolDoesNotExist(_self, parsedThinkingResult, tool);
                        }
                        break;
                    case AGENT_STATUS_enum.OBSERVATION:
                        feedbackMessage = this.handleObservation(_self, parsedThinkingResult);
                        break;
                    case AGENT_STATUS_enum.WEIRD_LLM_OUTPUT:
                        feedbackMessage = this.handleAgentWeirdOutput(_self, parsedThinkingResult);
                        break;
                    default:
                        logger.warn(`Unhandled agent status: ${actionType}`);
                        break;
                }

                logger.info(`🔄 Agent ${_self.name} - ${AGENT_STATUS_enum.ITERATION_END}`);
                iterations++;
            }
        } catch (error) {
            // TODO: See what to do with this kind of errors
            this.handleAgenticLoopCriticalError(_self, error, iterations, maxAgentIterations);
        }
    
        if (iterations >= maxAgentIterations) {
            this.handleMaxIterationsError(_self, iterations);
        }

        this.handleAgentTaskCompleted(_self, task, finalAnswer);
        return {
            result: {output: finalAnswer.finalAnswer},
            metadata: {iterations}
        };
    }

    async executeAgentThinking(agent, ExecutableAgent, feedbackMessage) {
        logger.info(`🤔 Agent ${agent.name} is ${AGENT_STATUS_enum.THINKING}...`);
        // console.log(AGENT_STATUS_enum.THINKING, iterations);
        const agentResult = await ExecutableAgent.invoke(
            {feedbackMessage},
            {"configurable":{"sessionId":"foo-bar-baz"}}
        );
        const agentResultParser = new StringOutputParser();
        const parsedResponse = await agentResultParser.invoke(agentResult);
        return parsedResponse;
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
        // Define the default settings
        const defaultConfig = {
            model: "gpt-3.5-turbo-0125",
            provider: 'openai'
        };
    
        // Merge the defaults with any custom settings provided
        agent.llmConfig = { ...defaultConfig, ...agent.llmConfig };
        
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
    

    handleIssuesParsingLLMOutput(agent) { 
        // console.log("ISSUES_PARSING_JSON", parsedJSON);
        logger.info(`😡 Agent ${agent.name} found some ${AGENT_STATUS_enum.ISSUES_PARSING_LLM_OUTPUT}.`);
        const feedbackMessage = "You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else.";
        return feedbackMessage;
    }

    handleFinalAnswer(agent, parsedThinkingResult) {
        logger.info(`🥳 Agent ${agent.name} got the ${AGENT_STATUS_enum.FINAL_ANSWER}`);
        // console.log(parsedJSON.finalAnswer);
        return parsedThinkingResult;
    }

    handleThought(agent, parsedThinkingResult) {
        logger.info(`💭 Agent ${agent.name} ${AGENT_STATUS_enum.THOUGHT}.`);
        const feedbackMessage = "Your toughts are great, please use it to get to the final answer now.";
        return feedbackMessage;
    }

    handleSelfQuestion(agent, parsedThinkingResult) {   
        logger.info(`❓Agent ${agent.name} have a ${AGENT_STATUS_enum.SELF_QUESTION}`);
        const feedbackMessage = "Awesome please answer yourself the question";
        return feedbackMessage;
    }

    async executeUsingTool(agent, parsedThinkingResult, tool) {
        logger.info(`🛠️⏳ Agent ${agent.name} is ${AGENT_STATUS_enum.USING_TOOL} ${tool.name}...`);
        // If the tool exists, use it
        const toolResult = await tool.call(parsedThinkingResult.actionInput.query);
        logger.info(`🛠️✅ Agent ${agent.name} - got  ${AGENT_STATUS_enum.TOOL_RESULTS} tool:${tool.name}`);
        // console.log(toolResult);
        const feedbackMessage = "You got this result from the tool: " + JSON.stringify(toolResult);
        return feedbackMessage;
    }

    handleUsingToolError(agent, parsedThinkingResult, tool, error) {
        logger.error(`🛠️🛑 Agent ${agent.name} - found ${AGENT_STATUS_enum.USING_TOOL_ERROR} tool: ${tool.name}`);
        logger.error(error);
        // console.error(`Error occurred while using the tool ${parsedThinkingResult.action}:`, error);
        const feedbackMessage = `An error occurred while using the tool ${parsedThinkingResult.action}. Please try again or use a different method.`;
        return feedbackMessage;
    }

    handleToolDoesNotExist(agent, parsedThinkingResult, tool) {
        logger.warn(`🛠️🚫 Agent ${agent.name} - Oops... it seems that the tool:${tool.name} ${AGENT_STATUS_enum.TOOL_DOES_NOT_EXIST}.`);
        // If the tool does not exist, notify the user
        // console.log(`The tool ${parsedThinkingResult.action} does not exist.`);
        const feedbackMessage = `Hey, the tool ${parsedThinkingResult.action} does not exist. Please find another way.`;
        return feedbackMessage;
    }

    handleObservation(agent, parsedThinkingResult) {
        logger.info(`🔍 Agent ${agent.name} - ${AGENT_STATUS_enum.OBSERVATION}`);
        const feedbackMessage = "Great observation. Please keep going. Let's get to the final answer.";
        return feedbackMessage;
    }
    handleAgentWeirdOutput(agent, parsedThinkingResult) {
        logger.warn(`🤔 Agent ${agent.name} - ${AGENT_STATUS_enum.WEIRD_LLM_OUTPUT}`);
        const feedbackMessage = "Your latest response does not match the way you are expected to output information. Please correct it.";
        return feedbackMessage;
    }

    handleAgenticLoopCriticalError(agent, error, iterations, maxAgentIterations) {
        logger.error(`🚨 Agent ${agent.name} - ${AGENT_STATUS_enum.AGENTIC_LOOP_CRITICAL_ERROR} | Iterations: ${iterations}/${maxAgentIterations}`);
        throw new Error(`Agent ${agent.name} encountered a critical error. Iterations: ${iterations}/${maxAgentIterations}.`, error);
    }

    handleMaxIterationsError(agent, iterations) {
        logger.warn(`🛑 Agent ${agent.name} - ${AGENT_STATUS_enum.MAX_ITERATIONS_ERROR} | Iterations: ${iterations}`);
        throw new Error(`Agent ${agent.name} reached the maximum number of iterations without finding a final answer.`);
    }

    handleAgentTaskCompleted(agent, task, finalAnswer) {
        logger.info(`🏁 Agent ${agent.name} - ${AGENT_STATUS_enum.TASK_COMPLETED}`);
        agent.store.getState().handleAgentTaskCompleted({agent, task, result: {output: finalAnswer.finalAnswer}});
        // console.log("Final Answer found:", finalAnswer);
        // console.log("Task completed:", task);
    }   
}

export { ReactChampionAgent };

// if(parsedThinkingResult === null) {
//     feedbackMessage = this.handleIssuesParsingLLMOutput(_self);
//  } else if(parsedThinkingResult.finalAnswer) {
//     finalAnswer = this.handleFinalAnswer(_self, parsedThinkingResult);
// } else if (parsedThinkingResult.action === "self_question") {
//     if(parsedThinkingResult.thought){
//         feedbackMessage = this.handleThought(_self, parsedThinkingResult);
//     } else {
//         feedbackMessage = this.handleSelfQuestion(_self, parsedThinkingResult);
//     }                    
// } else if (parsedThinkingResult.action) {
//     logger.info(`⏩ Agent ${_self.name} will be ${AGENT_STATUS_enum.EXECUTING_ACTION}...`);
//     const tool = this.tools.find(tool => tool.name === parsedThinkingResult.action);
//     if (tool) {
//         try {
//             feedbackMessage = await this.executeUsingTool(_self, parsedThinkingResult, tool);
//         } catch (error) {
//             feedbackMessage = this.handleUsingToolError(_self, parsedThinkingResult, tool, error);
//         }
//     } else {
//         feedbackMessage = this.handleToolDoesNotExist(_self, parsedThinkingResult, tool);
//     }
// } else if(parsedThinkingResult.observation) {
//     feedbackMessage = this.handleObservation(_self, parsedThinkingResult);
// } else {
//     feedbackMessage = this.handleAgentWeirdOutput(_self, parsedThinkingResult);

//     // console.log("Final Answer not found yet, continuing...");
// }