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
import { StringOutputParser } from "@langchain/core/output_parsers";

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
        this.llmConfig = config.llmConfig;
    }

    async initAgent() {
        // Ensure the API key is retrieved and set correctly
        const apiKey = getApiKey(this.llmConfig, this.env);
        this.llmConfig.apiKey = apiKey;
        
        if (!this.llmConfig.apiKey) {
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
                        const transformedMessages = messages.flatMap(subArray =>
                            subArray.map(message => ({
                                type: message.constructor.name,
                                content: message.content
                            }))
                        );                        
                        
                        _self.store.getState().handleAgentThinkingStart({agent: _self, task, messages:transformedMessages});
                    },
                    handleLLMEnd: async (output) => {
                        // console.log('----handleLLMEnd!', output);
                        const agentResultParser = new StringOutputParser();
                        if (!output.generations || !output.generations[0] || !output.generations[0][0].message) {
                            throw new Error('ReactAgent: handleLLMEnd -> Invalid output structure');
                        }  
                        
                        const { message } = output.generations[0][0];
                        const parsedResult = await agentResultParser.invoke(message);
                        const thinkingResult = {
                            llmOutput: parsedResult,
                            llmUsageStats: {
                                inputTokens: message.usage_metadata?.input_tokens ?? -1,
                                outputTokens: message.usage_metadata?.output_tokens ?? -1
                            }
                        };                        
                        _self.store.getState().handleAgentThinkingEnd({agent: _self, task, output: thinkingResult});
                        
                        // Getting the output from the LLM
                        // console.log(output?.generations[0][0].text);

                        // Getting the token usage from the LLM
                        // console.log(output?.llmOutput?.tokenUsage);
                    },
                    handleLLMError: async (err) => {
                        // console.log('----handleLLMError!', err);
                        _self.store.getState().handleAgentThinkingError({agent: _self, task, error:err});
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
                        _self.store.getState().handleAgentToolError({agent: _self, task, error: err});
                    },
                    async handleAgentEnd(result, runId) {
                        if(result.log === "" &&  result.returnValues.output === "Agent stopped due to max iterations."){
                            _self.store.getState().handleAgentMaxIterationsError({agent: _self, task, error: new Error("Agent stopped due to max iterations.")});                            
                        } else {
                            // TODO: Check this code here
                            console.log("Result Agent:", result);
                            const { message } = result;
                            const parsedResult = await agentResultParser.invoke(message);                            
                            const thinkingResult = {
                                llmOutput: parsedResult,
                                llmUsageStats: {
                                    inputTokens: message.usage_metadata?.input_tokens ?? -1,
                                    outputTokens: message.usage_metadata?.output_tokens ?? -1
                                }
                            };                            
                            _self.store.getState().handleAgentFinalAnswer({agent: _self, task, output: thinkingResult});
                        }
                        
                    }
                },
              ]
        });        
        // console.log("Result:", result);
        if(result.output === "Agent stopped due to max iterations."){
            throw new Error("Agent stopped due to max iterations.");
        }
        _self.store.getState().handleAgentTaskCompleted({agent: _self, task, result: result.output});
        return result.output;
    }

}

export { ReActAgent };