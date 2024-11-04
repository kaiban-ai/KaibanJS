/**
 * @file prompts.ts
 * @path src/utils/helpers/prompts/prompts.ts
 * @description Implementation of agent prompt templates
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from "langchain/tools";
import { 
    REACTChampionAgentPrompts,
    SystemMessageParams,
    InitialMessageParams,
    InvalidJSONFeedbackParams,
    ThoughtWithSelfQuestionParams,
    ThoughtFeedbackParams,
    SelfQuestionParams,
    ToolResultParams,
    ToolErrorParams,
    ToolNotExistParams,
    ForceFinalAnswerParams,
    FeedbackMessageParams,
    ObservationFeedbackParams,
    WeirdOutputFeedbackParams
} from '@/utils/types/agent/prompts';

/**
 * Default REACT Champion Agent prompts implementation
 */
export const REACT_CHAMPION_AGENT_DEFAULT_PROMPTS: REACTChampionAgentPrompts = {
    SYSTEM_MESSAGE: ({ agent, task }: SystemMessageParams): string => {
        const toolDescriptions = agent.tools.length > 0 
            ? agent.tools.map((tool: Tool) => 
                `${tool.name}: ${tool.description} Tool Input Schema: ${JSON.stringify(zodToJsonSchema(tool.schema))}`)
                .join(', ') 
            : "No tools available. You must reply using your internal knowledge.";

        return `You are ${agent.name}.
        
Your role is: ${agent.role}.
Your background is: ${agent.background}.
Your main goal is: ${agent.goal}.
You are working as part of a team.

For your work you will have available:

- Access to a defined set of tools. 
- Findings and insights from previous tasks. You must use this information to complete your current task.
- Must follow a specific format for your output.

## Tools available for your use: 

${toolDescriptions}

**Important:** You ONLY have access to the tools above, and should NEVER make up tools that are not listed here.

## Format of your output

You will return just one of the following:

- Thought + (Action or Self Question)
OR
- Observation
OR
- Final Answer

Below is the explanation of each one:

### Thought + (Action or Self Question)

{
   "thought": "your thoughts about what to do next",
   "action":  "you decide what action to take based on your previous thought",
   "actionInput": { /* the input to the action, just a simple JSON object */ }
}

### Observation

{
   "observation":  "Reflect about the result of the action. (E.g: I got the following results from the tool)",
   "isFinalAnswerReady": false
}

### Final Answer

IMPORTANT: (Please respect the expected output requirements from the user): ${task.expectedOutput}

{
    "finalAnswer": "The final answer to the Task."
}

**IMPORTANT**: You must return a valid JSON object. As if you were returning a JSON object from a function.`;
    },

    INITIAL_MESSAGE: ({ agent, task, context }: InitialMessageParams): string => {
        return `Hi ${agent.name}, please complete the following task: ${task.description}. 
        Your expected output should be: "${task.expectedOutput}". 
        ${context ? `Incorporate the following findings and insights from previous tasks: "${context}"` : ''}`;
    },

    INVALID_JSON_FEEDBACK: ({ agent, task, llmOutput }: InvalidJSONFeedbackParams): string => {
        return `You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else. E.g: {"finalAnswer": "The final answer"}`;
    },

    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: ({ agent, task, thought, question, parsedLLMOutput }: ThoughtWithSelfQuestionParams): string => {
        return `Interesting thought: "${thought}". Now, please answer your question: ${question}. Remember to use the correct JSON format for your response.`;
    },

    THOUGHT_FEEDBACK: ({ agent, task, thought, parsedLLMOutput }: ThoughtFeedbackParams): string => {
        return `Your thought process is clear: "${thought}". Please continue with your next step using the correct JSON format.`;
    },

    SELF_QUESTION_FEEDBACK: ({ agent, task, question, parsedLLMOutput }: SelfQuestionParams): string => {
        return `Good question. Please proceed to answer: ${question}. Remember to format your response as JSON.`;
    },

    TOOL_RESULT_FEEDBACK: ({ agent, task, toolResult, parsedLLMOutput }: ToolResultParams): string => {
        return `You got this result from the tool: ${JSON.stringify(toolResult)}. What do you make of this result? Please respond in the correct JSON format.`;
    },

    TOOL_ERROR_FEEDBACK: ({ agent, task, toolName, error, parsedLLMOutput }: ToolErrorParams): string => {
        return `An error occurred while using the tool ${toolName}: ${error.message}. Please try a different approach or tool. Remember to use JSON format for your response.`;
    },

    TOOL_NOT_EXIST_FEEDBACK: ({ agent, task, toolName, parsedLLMOutput }: ToolNotExistParams): string => {
        return `The tool "${toolName}" is not available to you. Please choose from the tools listed in your initial instructions. Respond with your new approach in JSON format.`;
    },

    OBSERVATION_FEEDBACK: ({ agent, task, parsedLLMOutput }: ObservationFeedbackParams): string => {
        return `Good observation. Based on this, what's your next step? Please continue in JSON format.`;
    },

    WEIRD_OUTPUT_FEEDBACK: ({ agent, task, parsedLLMOutput }: WeirdOutputFeedbackParams): string => {
        return `Your response format was incorrect. Please ensure you're providing a valid JSON object following the format specified in your instructions.`;
    },

    FORCE_FINAL_ANSWER_FEEDBACK: ({ agent, task, iterations, maxAgentIterations }: ForceFinalAnswerParams): string => {
        return `You've used ${iterations} out of ${maxAgentIterations} allowed iterations. Please provide your final answer now using the finalAnswer format in JSON.`;
    },

    WORK_ON_FEEDBACK_FEEDBACK: ({ agent, task, feedback }: FeedbackMessageParams): string => {
        return `Please address this feedback: "${feedback}". Revise your approach accordingly and respond in JSON format.`;
    }
};