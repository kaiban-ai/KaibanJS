/**
 * Agent Implementations.
 *
 * This file contains implementations of various types of agents used within the library, each designed 
 * to handle specific roles and tasks dynamically. These implementations extend a base agent class that 
 * provides common functionalities and serve as specialized agents for different operational contexts.
 *
 * Classes:
 * - BaseAgent: A foundational class that provides basic properties and methods which are common across 
 *   all specialized agents. This class is designed to be extended by more specific agent types.
 * - ReActAgent: A specialized agent designed to interact with Langchain's ReAct model. It extends 
 *   BaseAgent and implements additional methods specific to handling tasks with Langchain's AI capabilities.
 *
 * The architecture allows for easy addition of more specialized agents as needed, facilitating scalability 
 * and adaptability to new types of tasks or AI interactions.
 */

import { v4 as uuidv4 } from 'uuid';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent, AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';


function interpolateDescription(description, inputs) {
    let result = description;

    for (const key in inputs) {
        const placeholder = `{${key}}`;
        result = result.replace(placeholder, inputs[key]);
    }

    return result;
}

function getApiKey(llmConfig, provider) {
    if (llmConfig?.apiKey) return llmConfig.apiKey;

    let env = {};

    if (typeof process !== 'undefined' && process.env) {
        env = process.env;
    } else if (typeof window !== 'undefined') {
        env = window?.process?.env || import.meta.env || {};
    }

    const apiKeys = {
        anthropic: env.ANTHROPIC_API_KEY || env.NEXT_PUBLIC_ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY,
        google: env.GOOGLE_API_KEY || env.NEXT_PUBLIC_GOOGLE_API_KEY || env.VITE_GOOGLE_API_KEY,
        mistral: env.MISTRAL_API_KEY || env.NEXT_PUBLIC_MISTRAL_API_KEY || env.VITE_MISTRAL_API_KEY,
        openai: env.OPENAI_API_KEY || env.NEXT_PUBLIC_OPENAI_API_KEY || env.VITE_OPENAI_API_KEY,
    };

    return apiKeys[provider] || apiKeys.openai || (() => { throw new Error('API key is missing. Please provide it through llmConfig or set the appropriate environment variables.'); })();
}


class BaseAgent {
    constructor({ name, role, goal, background, tools, llmConfig = {}, maxIterations = 5 }) {
        this.id = uuidv4();
        this.name = name;
        this.role = role;
        this.goal = goal;
        this.background = background;
        this.tools = tools;
        this.maxIterations = maxIterations;

        const defaultConfig = {
            model: "gpt-3.5-turbo-0125",
            apiKey: getApiKey(llmConfig, llmConfig.provider || 'openai'),
        };
        this.llmConfig = { ...defaultConfig, ...llmConfig };

        if (!this.llmConfig.apiKey) {
            throw new Error('API key is missing. Please provide it through llmConfig or set the appropriate environment variables.');
        }
    }

    async initAgent() {
        throw new Error("initAgent must be implemented by subclasses.");
    }

    executeTask(task) {
        throw new Error("executeTask must be implemented by subclasses.");
    }
}

class BasicChatAgent extends BaseAgent {
    constructor(config) {
        super(config);
        const defaultConfig = {
            model: "gpt-3.5-turbo-1106",
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
            apiKey: getApiKey(this.llmConfig, provider),
        });
    }

    async executeTask(task, inputs, context) {
        await this.initAgent();
        const interpolatedDescription = interpolateDescription(task.description, inputs);

        const systemMessage = `
            Hello, You are ${this.name}.
            Your role is: ${this.role}.
            Your background is: ${this.background}.
            Your main goal is: ${this.goal}.
            Tools available for your use: ${this.tools.length > 0 ? this.tools.join(', ') : "No specific tools assigned"}.
            Task description: ${interpolatedDescription}
        `;

        const humanMessage = `
            Hi ${this.name}, please complete the following task: ${interpolatedDescription}.
            Your expected output should be: "${task.expectedOutput}".
            ${context ? `Incorporate the following findings and insights from previous tasks: "${context}"` : "This is the first task, so there's no input from a previous task."}
        `;

        const messages = [
            new SystemMessage(systemMessage),
            new HumanMessage(humanMessage),
        ];
        const parser = new StringOutputParser();
        const response = await this.llmInstance.invoke(messages);

        return parser.invoke(response);

        // const prompt = ChatPromptTemplate.fromMessages([
        //     ['system', 'You are a helpful assistant'],
        //     ['placeholder', '{chat_history}'],
        //     ['human', '{input}'],
        //     ['placeholder', '{agent_scratchpad}'],
        // ]);

        // this.agent = await createToolCallingAgent({
        //     llm: this.llmInstance,
        //     tools: this.tools,
        //     prompt
        // });

        // const agentExecutor = new AgentExecutor({
        //     agent: this.agent,
        //     tools: this.tools,
        // });

        // const result = await agentExecutor.invoke({ input: interpolatedDescription });
        // return result.output;
    }
}

class ReActAgent extends BaseAgent {
    constructor(config) {
        super(config);
        const defaultConfig = {
            model: "gpt-3.5-turbo-1106",
            temperature: 0,
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
            apiKey: getApiKey(this.llmConfig, provider),
            // callbacks: [
            //     {
            //         handleLLMStart: async () => {
            //             onUpdate("start");
            //             console.log('----handleLLMStart!');
            //         },
            //         handleLLMEnd: async (output) => {
            //             onUpdate("end");
            //             console.log('----handleLLMEnd!', output);
            //             console.log(output?.llmOutput?.tokenUsage);
            //         }
            //     },
            // ],
        });
    }

    async executeTask(task, inputs, context) {
        await this.initAgent();

        const interpolatedDescription = interpolateDescription(task.description, inputs);

        const prompt = PromptTemplate.fromTemplate(`
            Answer the following questions as best you can. You have access to the following tools:

            {tools}

            Use the following format:

            Question: the input question you must answer
            Thought: you should always think about what to do
            Action: the action to take, should be one of [{tool_names}]
            Action Input: the input to the action
            Observation: the result of the action
            ... (this Thought/Action/Action Input/Observation can repeat N times)
            Thought: I now know the final answer
            Final Answer: the final answer to the original input question

            Begin!

            Question: {input}
            Thought:{agent_scratchpad}
            `);

        this.agent = await createReactAgent({
            llm: this.llmInstance,
            tools: this.tools,
            prompt,
            streamRunnable: false,
        });

        const executor = new AgentExecutor({
            agent: this.agent,
            tools: this.tools,
            maxIterations: this.maxIterations,
            // callbacks: [
            //     {
            //         handleAgentAction(action) {
            //             console.log('handleAgentAction!', action);
            //         },
            //         handleAgentEnd(action) {
            //             console.log('handleAgentEnd!', action);
            //         },
            //     },
            // ]
        });
        const result = await executor.invoke({
            input: interpolatedDescription,
            // chat_history: context,
        });

        console.log("Result:", result);
        return result.output;
    }
}

export { BaseAgent, ReActAgent, BasicChatAgent };
