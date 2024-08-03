import { BaseAgent } from './baseAgent';
import { getApiKey } from '../utils/agents';
import { interpolateTaskDescription, } from '../utils/tasks';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
// import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';

class BasicChatAgent extends BaseAgent {
    constructor(config) {
        super(config);
        this.llmConfig = config.llmConfig;
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
        const interpolatedDescription = interpolateTaskDescription(task.description, inputs);

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
        try {
            const response = await this.llmInstance.invoke(messages);
            return parser.invoke(response);
        } catch (error) {
            console.error("Error invoking LLM instance:", error);
            // Handle the error appropriately
        }
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

export { BasicChatAgent };