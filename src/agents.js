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
import { ChatOpenAI, OpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createReactAgent, AgentExecutor } from "langchain/agents";
import { StringOutputParser } from "@langchain/core/output_parsers";

function interpolateDescription(description, inputs) {
    let result = description;

    for (const key in inputs) {
        const placeholder = `{${key}}`;
        result = result.replace(placeholder, inputs[key]);
    }

    return result;
}

function getApiKey(llmConfig, provider) {
    if (llmConfig && llmConfig.apiKey) return llmConfig.apiKey;

    if (typeof process !== 'undefined' && process.env) {
        // Check if process.env is available (Node.js or Next.js environment)
        if (provider === 'anthropic') {
            return process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
        } else if (provider === 'google') {
            return process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        }
        else {
            return process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        }
    } else if (typeof window !== 'undefined') {
        // Check for browser environment with environment variables in import.meta.env
        if (provider === 'anthropic') {
            return import.meta.env.VITE_ANTHROPIC_API_KEY || window?.process?.env?.ANTHROPIC_API_KEY;
        } else if (provider === 'google') {
            return import.meta.env.VITE_GOOGLE_API_KEY || window?.process?.env?.GOOGLE_API_KEY;
        } else {
            return import.meta.env.VITE_OPENAI_API_KEY || window?.process?.env?.OPENAI_API_KEY;
        }
    }

    throw new Error('API key is missing. Please provide it through llmConfig or set the appropriate environment variables.');
}


class BaseAgent {
    constructor({ name, role, goal, background, tools, llmConfig = {} }) {
        this.id = uuidv4();
        this.name = name;
        this.role = role;
        this.goal = goal;
        this.background = background;
        this.tools = tools;

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
            model: "gpt-3.5-turbo-0125",
        };
        this.llmConfig = { ...defaultConfig, ...config.llmConfig };
    }

    async initAgent() {
        if (this.llmConfig.provider === 'anthropic') {
            this.llmInstance = new ChatAnthropic({
                ...this.llmConfig,
                apiKey: getApiKey(this.llmConfig, 'anthropic'),
            });
        } else if (this.llmConfig.provider === 'google') {
            this.llmInstance = new ChatGoogleGenerativeAI({
                ...this.llmConfig,
                apiKey: getApiKey(this.llmConfig, 'google'),
            });
        } else {
            this.llmInstance = new ChatOpenAI({
                ...this.llmConfig,
                apiKey: getApiKey(this.llmConfig, 'openai'),
            });
        }
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
    }
}

class ReActAgent extends BaseAgent {
    constructor(config) {
        super(config);
        const defaultConfig = {
            model: "gpt-3.5-turbo-instruct",
            temperature: 0,
        };
        this.llmConfig = { ...defaultConfig, ...config.llmConfig };
    }

    async initAgent() {
        this.llmInstance = new OpenAI({
            ...this.llmConfig,
            apiKey: getApiKey(this.llmConfig, 'openai'),
        });

        const prompt = "Your custom ReAct prompt";  // Example, specify your actual prompt
        this.agent = await createReactAgent({
            llm: this.llmInstance,
            tools: this.tools,
            prompt,
        });
    }

    async executeTask(task, inputs, context) {
        await this.initAgent();
        const executor = new AgentExecutor({
            agent: this.agent,
            tools: this.tools,
        });
        const result = await executor.invoke({
            input: task.description,
            chat_history: context,
        });
        return result.output;
    }
}

export { BaseAgent, ReActAgent, BasicChatAgent };
