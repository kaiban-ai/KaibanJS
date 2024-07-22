import { BaseAgent } from './baseAgent';
import { getApiKey, replaceAgentAttributes } from '../utils/agents';
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { createReactAgent, AgentExecutor } from "langchain/agents";
import { PromptTemplate } from '@langchain/core/prompts';
import { ReActAgentEnhancedPrompt } from '../utils/prompts';
import { DynamicTool } from "@langchain/core/tools";

const clockTool = new DynamicTool({
    name: "clock",
    description: "A tool that provides the current date and time.",
    func: async () => {
        const now = new Date();
        return `Current date and time: ${now.toLocaleString("en-US", { timeZone: "America/New_York" })}`;
    },
});

class ReActAgent extends BaseAgent {
    constructor(config) {
        super(config);
        const defaultConfig = {
            // model: "gpt-4o-mini",
            model: "gpt-3.5-turbo-0125",
            // model: "gpt-4-turbo",
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
        const LLMProviderClass = providers[provider] || providers.openai;

        this.llmInstance = new LLMProviderClass({
            ...this.llmConfig,
            apiKey: getApiKey(this.llmConfig, provider)
        });
    
    }

    async executeTask(task, inputs, context) {
        await this.initAgent();

        const teamKnowledgeBaseTool = new DynamicTool({
            name: "team_knowledge_base",
            description: "This tool will give you access to useful knowledge gathered by your team that could be helpful for successfully achieving your task. But please remember that this tool may not be accurate or up-to-date.",
            func: async () => {
                // return "Last Copa America was won by Argentina in 2024.";
                return context ? context : "Knowledge base is Currently empty you must find another way to get the information you are looking for.";
            }
        });


        const promptWithAgentAttributes = replaceAgentAttributes(ReActAgentEnhancedPrompt, {
            name: this.name,
            role: this.role,
            background: this.background,
            goal: this.goal,
            context: context,
            expectedOutput: task.expectedOutput,
        });

        // const interpolatedTaskDescription = interpolateDescription(task.description, task.inputs);
        // task.interpolatedTaskDescription = interpolatedTaskDescription;

        const prompt = PromptTemplate.fromTemplate(
            promptWithAgentAttributes
        );
        const allTools = this.tools.concat([clockTool, teamKnowledgeBaseTool]);
        this.agent = await createReactAgent({
            llm: this.llmInstance,
            tools: allTools,
            prompt,
            streamRunnable: false,
        });

        const executor = new AgentExecutor({
            agent: this.agent,
            tools: allTools,
            maxIterations: this.maxIterations
        });
        const _self = this;
        const result = await executor.invoke(
            {input: task.interpolatedTaskDescription},
            {
              callbacks: [
                {
                    handleLLMStart: async (llm, messages) => {
                        // console.log('----handleLLMStart!',messages[0]);

                        // Getting the input for the LLM
                        // console.log(messages[0]);
                        
                        _self.store.getState().handleAgentThinkingStart({agent: _self, task, messages});
                    },
                    handleLLMEnd: async (output) => {
                        // console.log('----handleLLMEnd!', output);
                        _self.store.getState().handleAgentThinkingEnd({agent: _self, task, output});
                        
                        // Getting the output from the LLM
                        // console.log(output?.generations[0][0].text);

                        // Getting the token usage from the LLM
                        // console.log(output?.llmOutput?.tokenUsage);
                    },
                    handleLLMError: async (err) => {
                        // console.log('----handleLLMError!', err);
                        _self.store.getState().handleAgentThinkingError({agent: _self, task, err});
                    },                    
                    handleAgentAction(action, runId) {
                        // console.log("\nhandleAgentAction", action, runId);
                        _self.store.getState().handleAgentActionStart({agent: _self, task,action, runId});
                        
                    },

                    handleToolStart(tool, input, runId){
                        // console.log("\nhandleToolStart", tool, input, runId);
                        _self.store.getState().handleAgentToolStart({agent: _self, task,tool, input, runId});
                    },
                    handleToolEnd(output, runId) {
                        // console.log("\nhandleToolEnd", output, runId);
                        _self.store.getState().handleAgentToolEnd({agent: _self, task, output, runId});

                        // NOTE: I could't find if Langchain has an AgentActionEnd handler
                        // _self.store.getState().handleAgentActionEnd({tool, input, runId});
                    },
                    handleToolError(err) {  
                        // console.log("\handleToolError", err);
                        _self.store.getState().handleAgentToolError({agent: _self, task, err});
                    },
                    handleAgentEnd(result, runId) {
                        // console.log("\nhandleAgentEnd", action, runId);
                        if(result.log === "" &&  result.returnValues.output === "Agent stopped due to max iterations."){
                            _self.store.getState().handleAgentMaxIterationsError({agent: _self, task, error: new Error("Agent stopped due to max iterations.")});                            
                        } else {
                            _self.store.getState().handleAgentFinalAnswer({agent: _self, task, result, runId});
                        }
                        
                    }
                },
              ]
        });        
        // console.log("Result:", result);
        if(result.output === "Agent stopped due to max iterations."){
            throw new Error("Agent stopped due to max iterations.");
        }
        _self.store.getState().handleAgentTaskCompleted({agent: _self, task, result});
        return result.output;
    }

}

export { ReActAgent };