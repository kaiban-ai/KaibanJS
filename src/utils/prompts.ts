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

import { zodToJsonSchema } from "zod-to-json-schema";

interface Agent {
    name: string;
    role: string;
    background: string;
    goal: string;
    tools: { name: string; description: string; schema: any }[];
}

interface Task {
    description: string;
    expectedOutput: string;
}

interface LLMOutput {
    thought?: string;
    action?: string;
    actionInput?: object;
    observation?: string;
    isFinalAnswerReady?: boolean;
    finalAnswer?: string;
}

interface REACTChampionAgentPrompts {
    SYSTEM_MESSAGE: ({ agent, task }: { agent: Agent; task: Task }) => string;
    INITIAL_MESSAGE: ({ agent, task, context }: { agent: Agent; task: Task; context?: string }) => string;
    INVALID_JSON_FEEDBACK: ({ agent, task, llmOutput }: { agent: Agent; task: Task; llmOutput: string }) => string;
    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: ({ agent, task, thought, question, parsedLLMOutput }: { agent: Agent; task: Task; thought: string; question: string; parsedLLMOutput: string }) => string;
    THOUGHT_FEEDBACK: ({ agent, task, thought, parsedLLMOutput }: { agent: Agent; task: Task; thought: string; parsedLLMOutput: string }) => string;
    SELF_QUESTION_FEEDBACK: ({ agent, task, question, parsedLLMOutput }: { agent: Agent; task: Task; question: string; parsedLLMOutput: string }) => string;
    TOOL_RESULT_FEEDBACK: ({ agent, task, toolResult, parsedLLMOutput }: { agent: Agent; task: Task; toolResult: string; parsedLLMOutput: string }) => string;
    TOOL_ERROR_FEEDBACK: ({ agent, task, toolName, error, parsedLLMOutput }: { agent: Agent; task: Task; toolName: string; error: string; parsedLLMOutput: string }) => string;
    TOOL_NOT_EXIST_FEEDBACK: ({ agent, task, toolName, parsedLLMOutput }: { agent: Agent; task: Task; toolName: string; parsedLLMOutput: string }) => string;
    OBSERVATION_FEEDBACK: ({ agent, task, parsedLLMOutput }: { agent: Agent; task: Task; parsedLLMOutput: string }) => string;
    WEIRD_OUTPUT_FEEDBACK: ({ agent, task, parsedLLMOutput }: { agent: Agent; task: Task; parsedLLMOutput: string }) => string;
    FORCE_FINAL_ANSWER_FEEDBACK: ({ agent, task, iterations, maxAgentIterations }: { agent: Agent; task: Task; iterations: number; maxAgentIterations: number }) => string;
    WORK_ON_FEEDBACK_FEEDBACK: ({ agent, task, feedback }: { agent: Agent; task: Task; feedback: string }) => string;
}

const REACT_CHAMPION_AGENT_DEFAULT_PROMPTS: REACTChampionAgentPrompts = {
    SYSTEM_MESSAGE: ({ agent, task }) => {
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
    agent.tools.map(tool => `${tool.name}: ${tool.description} Tool Input Schema: ${JSON.stringify(zodToJsonSchema(tool.schema))}`).join(', ') : 
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

Examples: 

{
   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information."
   "action": "tavily_search_results_json",
   "actionInput": {"query":"Copa America 2024 winner"}
}

other

{
   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information."
   "action": "self_question",
   "actionInput": {"query":"Copa America 2024 winner"}
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
    INITIAL_MESSAGE: ({ agent, task, context }) => {
        return `Hi ${agent.name}, please complete the following task: ${task.description}. 
        Your expected output should be: "${task.expectedOutput}". 
        ${context ? `Incorporate the following findings and insights from previous tasks: "${context}"` : ''}`;
    },
    INVALID_JSON_FEEDBACK: ({ agent, task, llmOutput }) => {
        return `You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else. E.g: {\"finalAnswer\": \"The final answer\"}`;
    },
    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: ({ agent, task, thought, question, parsedLLMOutput }) => {
        return `Awesome, please answer yourself the question: ${question}.`;
    },
    THOUGHT_FEEDBACK: ({ agent, task, thought, parsedLLMOutput }) => {
        return `Your thoughts are great, let's keep going.`;
    },
    SELF_QUESTION_FEEDBACK: ({ agent, task, question, parsedLLMOutput }) => {
        return `Awesome, please answer yourself the question.`;
    },
    TOOL_RESULT_FEEDBACK: ({ agent, task, toolResult, parsedLLMOutput }) => {
        return `You got this result from the tool: ${JSON.stringify(toolResult)}`;
    },
    TOOL_ERROR_FEEDBACK: ({ agent, task, toolName, error, parsedLLMOutput }) => {
        return `An error occurred while using the tool ${toolName}. Please try again or use a different method.`;
    },
    TOOL_NOT_EXIST_FEEDBACK: ({ agent, task, toolName, parsedLLMOutput }) => {
        return `Hey, the tool ${toolName} does not exist. Please find another way.`;
    },
    OBSERVATION_FEEDBACK: ({ agent, task, parsedLLMOutput }) => {
        return `Great observation. Please keep going. Let's get to the final answer.`;
    },
    WEIRD_OUTPUT_FEEDBACK: ({ agent, task, parsedLLMOutput }) => {
        return `Your latest response does not match the way you are expected to output information. Please correct it.`;
    },
    FORCE_FINAL_ANSWER_FEEDBACK: ({ agent, task, iterations, maxAgentIterations }) => {
        return `We don't have more time to keep looking for the answer. Please use all the information you have gathered until now and give the finalAnswer right away.`;
    },
    WORK_ON_FEEDBACK_FEEDBACK: ({ agent, task, feedback }) => {
        return `Here is some feedback for you to address: ${feedback}`;
    },
};

export { REACT_CHAMPION_AGENT_DEFAULT_PROMPTS };
