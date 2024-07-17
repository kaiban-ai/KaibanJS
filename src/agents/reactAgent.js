import { BaseAgent } from './baseAgent';
import { interpolateDescription, getApiKey } from './utils';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createReactAgent, AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';

class ReActAgent extends BaseAgent {
    constructor(config) {
        super(config);
        const defaultConfig = {
            model: "gpt-3.5-turbo-0125",
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

export { ReActAgent };