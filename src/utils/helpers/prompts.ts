/**
 * C:\Users\pwalc\Documents\GroqEmailAssistant\KaibanJS\src\utils\prompts.ts
 * Prompt Templates for Agents.
 *
 * This file provides templates for constructing prompts that are used to interact with language models within the KaibanJS library. 
 * These templates ensure that interactions are consistent and properly formatted, facilitating effective communication with LLMs.
 *
 * Usage:
 * Utilize these templates when setting up dialogues or commands for agents to ensure they are correctly interpreted by the underlying LLMs.
 */

import { logger } from "../core/logger";
import { TASK_STATUS_enum } from '@/utils/core/enums';
import { 
    IBaseAgent,
    TaskType,
    Output,
    TeamStore 
} from '@/utils/types';

import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from 'langchain/tools';

export interface REACTChampionAgentPrompts {
    [key: string]: unknown;
    SYSTEM_MESSAGE: (params: { 
        agent: IBaseAgent; 
        task: TaskType 
    }) => string;

    INITIAL_MESSAGE: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        context?: string 
    }) => string;

    INVALID_JSON_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        llmOutput: string 
    }) => string;

    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        thought: string; 
        question: string; 
        parsedLLMOutput: Output 
    }) => string;

    THOUGHT_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        thought: string; 
        parsedLLMOutput: Output 
    }) => string;

    SELF_QUESTION_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        question: string; 
        parsedLLMOutput: Output 
    }) => string;

    TOOL_RESULT_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        toolResult: string; 
        parsedLLMOutput: Output 
    }) => string;

    TOOL_ERROR_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        toolName: string; 
        error: Error; 
        parsedLLMOutput: Output 
    }) => string;

    TOOL_NOT_EXIST_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        toolName: string; 
        parsedLLMOutput: Output 
    }) => string;

    OBSERVATION_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        parsedLLMOutput: Output 
    }) => string;

    WEIRD_OUTPUT_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        parsedLLMOutput: Output 
    }) => string;

    FORCE_FINAL_ANSWER_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        iterations: number; 
        maxAgentIterations: number 
    }) => string;

    WORK_ON_FEEDBACK_FEEDBACK: (params: { 
        agent: IBaseAgent; 
        task: TaskType; 
        feedback: string 
    }) => string;
}

export const REACT_CHAMPION_AGENT_DEFAULT_PROMPTS: REACTChampionAgentPrompts = {
    SYSTEM_MESSAGE: ({ agent, task }: { agent: IBaseAgent; task: TaskType }): string => {
        const prompt = `You are ${agent.name}.
        
Your role is: ${agent.role}.
Your background is: ${agent.background}.
Your main goal is: ${agent.goal}.
You are working as part of a team.

For your work you will have available:

- Access to a defined set of tools. 
- Findings and insights from previous tasks. You must use this information to complete your current task.
- Must follow a specific format for your output.

## Tools available for your use: 

${agent.tools.length > 0 ? 
    agent.tools.map((tool: Tool) => 
        `${tool.name}: ${tool.description} Tool Input Schema: ${JSON.stringify(zodToJsonSchema(tool.schema))}`
    ).join(', ') : 
    "No tools available. You must reply using your internal knowledge."}

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
   "thought": "your thoughts about what to do next" // it could be an action or ask yourself a follow up question
   "action":  "you decide what action to take based on your previous thought", // the action could be a self follow up question or decide to use a tool from the available tools to use,
   "actionInput": the input to the action, just a simple JSON object, enclosed in curly braces, using \\" to wrap keys and values. Remember to use the Tool Schema.
}

### Observation

{
   "observation":  "Reflect about the result of the action. (E.g:  I got the following results from the tool Can I get the Final Answer from there?)", 
    "isFinalAnswerReady": false // If you have the final answer or not
}

### Final Answer

IMPORTANT: (Please respect the expected output requirements from the user): ${task.expectedOutput}

{
    "finalAnswer": "The final answer to the Task."
}

**IMPORTANT**: You must return a valid JSON object. As if you were returning a JSON object from a function.`;
        return prompt;
    },

    INITIAL_MESSAGE: ({ agent, task, context }: { agent: IBaseAgent; task: TaskType; context?: string }): string => {
        return `Hi ${agent.name}, please complete the following task: ${task.description}. 
        Your expected output should be: "${task.expectedOutput}". 
        ${context ? `Incorporate the following findings and insights from previous tasks: "${context}"` : ''}`;
    },

    INVALID_JSON_FEEDBACK: ({ agent, task, llmOutput }: { agent: IBaseAgent; task: TaskType; llmOutput: string }): string => {
        return `You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else. E.g: {\"finalAnswer\": \"The final answer\"}`;
    },

    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: ({ agent, task, thought, question, parsedLLMOutput }: { 
        agent: IBaseAgent; task: TaskType; thought: string; question: string; parsedLLMOutput: Output 
    }): string => {
        return `Awesome, please answer yourself the question: ${question}.`;
    },

    THOUGHT_FEEDBACK: ({ agent, task, thought, parsedLLMOutput }: {
        agent: IBaseAgent; task: TaskType; thought: string; parsedLLMOutput: Output
    }): string => {
        return `Your thoughts are great, let's keep going.`;
    },

    SELF_QUESTION_FEEDBACK: ({ agent, task, question, parsedLLMOutput }: {
        agent: IBaseAgent; task: TaskType; question: string; parsedLLMOutput: Output
    }): string => {
        return `Awesome, please answer yourself the question.`;
    },

    TOOL_RESULT_FEEDBACK: ({ agent, task, toolResult, parsedLLMOutput }: {
        agent: IBaseAgent; task: TaskType; toolResult: string; parsedLLMOutput: Output
    }): string => {
        return `You got this result from the tool: ${JSON.stringify(toolResult)}`;
    },

    TOOL_ERROR_FEEDBACK: ({ agent, task, toolName, error, parsedLLMOutput }: {
        agent: IBaseAgent; task: TaskType; toolName: string; error: Error; parsedLLMOutput: Output
    }): string => {
        return `An error occurred while using the tool ${toolName}. Please try again or use a different method.`;
    },

    TOOL_NOT_EXIST_FEEDBACK: ({ agent, task, toolName, parsedLLMOutput }: {
        agent: IBaseAgent; task: TaskType; toolName: string; parsedLLMOutput: Output
    }): string => {
        return `Hey, the tool ${toolName} does not exist. Please find another way.`;
    },

    OBSERVATION_FEEDBACK: ({ agent, task, parsedLLMOutput }: {
        agent: IBaseAgent; task: TaskType; parsedLLMOutput: Output
    }): string => {
        return `Great observation. Please keep going. Let's get to the final answer.`;
    },

    WEIRD_OUTPUT_FEEDBACK: ({ agent, task, parsedLLMOutput }: {
        agent: IBaseAgent; task: TaskType; parsedLLMOutput: Output
    }): string => {
        return `Your latest response does not match the way you are expected to output information. Please correct it.`;
    },

    FORCE_FINAL_ANSWER_FEEDBACK: ({ agent, task, iterations, maxAgentIterations }: {
        agent: IBaseAgent; task: TaskType; iterations: number; maxAgentIterations: number
    }): string => {
        return `We don't have more time to keep looking for the answer. Please use all the information you have gathered until now and give the finalAnswer right away.`;
    },

    WORK_ON_FEEDBACK_FEEDBACK: ({ agent, task, feedback }: {
        agent: IBaseAgent; task: TaskType; feedback: string
    }): string => {
        return `Here is some feedback for you to address: ${feedback}`;
    },
};