import { BaseAgent } from './baseAgent';
import { getApiKey } from '../utils/agents';
import { getParsedJSON } from '../utils/parser';
import { AGENT_STATUS_enum } from '../utils/enums';
import { interpolateTaskDescription, } from '../utils/tasks';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
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
        };
        this.llmConfig = { ...defaultConfig, ...config.llmConfig };
    }

    async initAgent() {
        const providers = {
            anthropic: ChatAnthropic,
            google: ChatGoogleGenerativeAI,
            mistral: ChatMistralAI,
            openai: ChatOpenAI,
        };

        const provider = this.llmConfig.provider;
        const ChatClass = providers[provider] || providers.openai;

        this.llmInstance = new ChatClass({
            ...this.llmConfig,
            apiKey: getApiKey(this.llmConfig, provider)
        });

        this.memory = new ChatMessageHistory();
    }

    async executeTask(task, inputs, context) {
        await this.initAgent();
        const interpolatedDescription = interpolateTaskDescription(task.description, inputs);
        const _self = this;
        const systemMessage = getChampionReActAgentSystemPrompt({
            name: this.name,
            role: this.role,
            background: this.background,
            goal: this.goal,
            tools: this.tools,
            description: interpolatedDescription,
            expectedOutput: task.expectedOutput,
        });
        
        let humanMessage = `
            Hi ${this.name}, please complete the following task: ${interpolatedDescription}.
            Your expected output should be: "${task.expectedOutput}".
            ${context ? `Incorporate the following findings and insights from previous tasks: "${context}"` : ""}
        `;
    
        const promptAgent = ChatPromptTemplate.fromMessages([
            new SystemMessage(systemMessage),
            ["placeholder", "{chat_history}"], // like this
            ["human", "{humanMessage}"],
        ]);
    
        const chainAgent = promptAgent.pipe(this.llmInstance);
    
        const chainAgentWithHistory = new RunnableWithMessageHistory({
            runnable: chainAgent,
            getMessageHistory: () => {
               return _self.memory;
            },
            inputMessagesKey: "humanMessage",
            historyMessagesKey: "chat_history",
        });
    
        const agentResultParser = new StringOutputParser();
    
        let finalAnswer = null;
        let iterations = 0;
        const maxAgentIterations = 5;  // Define maximum iterations here
    
        try {
            while (!finalAnswer && iterations < maxAgentIterations) {
                logger.info(`🤔 Agent ${_self.name} is ${AGENT_STATUS_enum.THINKING}...`);
                // console.log(AGENT_STATUS_enum.THINKING, iterations);
                const agentResult = await chainAgentWithHistory.invoke(
                    {humanMessage},
                    {"configurable":{"sessionId":"foo-bar-baz"}}
                );
                const parsedResponse = await agentResultParser.invoke(agentResult);
                const parsedJSON = getParsedJSON(parsedResponse);
                if(parsedJSON === null) {
                    // console.log("ISSUES_PARSING_JSON", parsedJSON);
                    logger.info(`😡 Agent ${_self.name} found some issues parsing the LLM output...`);
                    humanMessage = "You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else.";
                } else if(parsedJSON.finalAnswer) {
                    logger.info(`🥳 Agent ${_self.name} got the final answer.`);
                    // console.log(parsedJSON.finalAnswer);
                    finalAnswer = parsedJSON;
                } else if (parsedJSON.action === "self_question") {
                    if(parsedJSON.thought){
                        logger.info(`💭 Agent ${_self.name} got a ${AGENT_STATUS_enum.THOUGHT}...`);
                        humanMessage = "Your toughts are great, please use it to get to the final answer now.";
                    } else {
                        logger.info(`🔄🤔 Agent ${_self.name} got a SELF_QUESTION...`);
                        humanMessage = "Awesome please answer yourself the question";
                    }                    
                    // console.log(parsedJSON);
                } else if (parsedJSON.action) {
                    logger.info(`⏩😃 Agent ${_self.name} will be executing an Action...`);
                    // console.log("action", parsedJSON);
                    // Check if the tool exists in the tools array
                    const tool = this.tools.find(tool => tool.name === parsedJSON.action);
                    if (tool) {
                        try {
                            logger.info(`🛠️⏳ Agent ${_self.name} is using ${tool.name}...`);
                            // If the tool exists, use it
                            const toolResult = await tool.call(parsedJSON.actionInput.query);
                            logger.info(`🛠️✅ Agent ${_self.name} - got results from the tool ${tool.name}`);
                            // console.log(toolResult);
                            humanMessage = "You got this result from the tool: " + JSON.stringify(toolResult);
                        } catch (error) {
                            // Handle any error that occurs during the tool call
                            logger.error(`🛠️🛑 Agent ${_self.name} - found errors while using the tool ${tool.name}`);
                            // console.error(`Error occurred while using the tool ${parsedJSON.action}:`, error);
                            humanMessage = `An error occurred while using the tool ${parsedJSON.action}. Please try again or use a different method.`;
                        }
                    } else {
                        logger.warn(`🛠️🚫 Agent ${_self.name} - Oops... it seems that the tool ${tool.name} does not exist.`);
                        // If the tool does not exist, notify the user
                        // console.log(`The tool ${parsedJSON.action} does not exist.`);
                        humanMessage = `Hey, the tool ${parsedJSON.action} does not exist. Please find another way.`;
                    }
                } else if(parsedJSON.observation) {
                    logger.info(`🧐 Agent ${_self.name} made an OBSERVATION...`);
                    // console.log("observation", parsedJSON);
                } else {
                    logger.info(`😤🔄 Agent ${_self.name} still hasn't found what they're looking for...`);
                    // console.log("nothing", parsedJSON);
                    // console.log("Final Answer not found yet, continuing...");
                }
                iterations++;
            }
        } catch (error) {
            console.error("Error invoking LLM instance:", error);
            // Handle the error appropriately
        }
    
        if (iterations >= maxAgentIterations) {
            console.log("Maximum iterations reached without finding a final answer.");
        }
        _self.store.getState().handleAgentTaskCompleted({agent: _self, task, result: {output: finalAnswer.finalAnswer}});
        return {
            result: {output: finalAnswer.finalAnswer},
            metadata: {iterations}
        };
    }
    
}

export { ReactChampionAgent };