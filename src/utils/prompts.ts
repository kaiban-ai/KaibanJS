/**
 * Prompt Templates for Agents.
 *
 * This module provides templates for constructing prompts that are used to interact with language models
 * within the KaibanJS library. These templates ensure that interactions are consistent and properly
 * formatted, facilitating effective communication with LLMs.
 *
 * @module prompts
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Agent } from '../index';
import { Task } from '../index';

/** Parameters for generating system messages */
export type SystemMessageParams = {
  /** Agent instance */
  agent: Agent;
  /** Current task */
  task: Task;
  /** Team insights and knowledge base */
  insights?: string;
};

/** Parameters for generating initial messages */
export type InitialMessageParams = {
  /** Agent instance */
  agent: Agent;
  /** Current task */
  task: Task;
  /** Additional context from previous tasks */
  context?: string;
};

/** Parameters for generating invalid JSON feedback */
export type InvalidJsonFeedbackParams = {
  /** Agent instance */
  agent: Agent;
  /** Current task */
  task: Task;
  /** Invalid LLM output */
  llmOutput: string;
};

/** Parameters for generating invalid output schema feedback */
export type InvalidOutputSchemaFeedbackParams = {
  /** Agent instance */
  agent: Agent;
  /** Current task */
  task: Task;
  /** Invalid LLM output */
  llmOutput: string;
  /** Expected output schema */
  outputSchema: z.ZodType;
  /** Schema validation error */
  outputSchemaError: Error;
};

/** Parameters for generating thought with self-question feedback */
export type ThoughtWithSelfQuestionFeedbackParams = {
  /** Agent instance */
  agent: Agent;
  /** Current task */
  task: Task;
  /** Agent's thought */
  thought: string;
  /** Self-question posed by agent */
  question: string;
  /** Parsed LLM output */
  parsedLLMOutput: unknown;
};

/** Parameters for generating thought feedback */
export type ThoughtFeedbackParams = {
  /** Agent instance */
  agent: Agent;
  /** Current task */
  task: Task;
  /** Agent's thought */
  thought: string;
  /** Parsed LLM output */
  parsedLLMOutput: unknown;
};

/** Parameters for generating self-question feedback */
export type SelfQuestionFeedbackParams = {
  /** Agent instance */
  agent: Agent;
  /** Current task */
  task: Task;
  /** Self-question posed by agent */
  question: string;
  /** Parsed LLM output */
  parsedLLMOutput: unknown;
};

/** Default prompt templates for the ReactChampionAgent */
export const REACT_CHAMPION_AGENT_DEFAULT_PROMPTS = {
  /**
   * Generates the system message that sets up the initial context and instructions for the agent.
   * This message defines the agent's role, capabilities, and the format of its responses.
   * @param params - Parameters for generating the system message
   * @returns Formatted system message
   */
  SYSTEM_MESSAGE: ({ agent, task, insights }: SystemMessageParams): string => {
    const prompt = `You are ${agent.name}.

Your role is: ${agent.role}.
Your background is: ${agent.background}.
Your main goal is: ${agent.goal}
You are working as part of a team.

For your work you will have available:

${
  insights
    ? `- Access to a defined set of tools. \n - Team's knowledge base and experience. You may need to consult this information to complete your current task.`
    : '- Access to a defined set of tools. '
}
- Findings and insights from previous tasks. You must use this information to complete your current task.
${
  insights
    ? `- Must follow a specific format for your output. \n ## Team Knowledge Base and Experience
Here is the essential knowledge shared by the team:
${insights}`
    : '- Must follow a specific format for your output.'
}

## Tools available for your use: 

${
  agent.tools.length > 0
    ? agent.tools
        .map(
          (tool) =>
            `${tool.name}: ${
              tool.description
            } Tool Input Schema: ${JSON.stringify(
              zodToJsonSchema(tool.schema)
            )}`
        )
        .join(', ')
    : 'No tools available. You must reply using your internal knowledge.'
}

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
   "thought": "your thoughts about what to do next", // it could be an action or ask yourself a follow up question
   "action":  "you decide what action to take based on your previous thought", // the action could be a self follow up question or decide to use a tool from the available tools to use,
   "actionInput": the input to the action, just a simple JSON object, enclosed in curly braces, using \\" to wrap keys and values. Remember to use the Tool Schema.
}

Examples: 

{
   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information.",
   "action": "tavily_search_results_json",
   "actionInput": {"query":"Copa America 2024 winner"}
}

other

{
   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information.",
   "action": "self_question",
   "actionInput": {"query":"Copa America 2024 winner"}
}

### Observation

{
   "observation":  "Reflect about the result of the action. (E.g:  I got the following results from the tool Can I get the Final Answer from there?)", 
    "isFinalAnswerReady": false // If you have the final answer or not
}

### Final Answer

IMPORTANT: (Please respect the expected output requirements from the user): ${
      task.outputSchema
        ? `${
            task.expectedOutput
          }", adhere to this JSON schema: ${JSON.stringify({
            finalAnswer: { ...zodToJsonSchema(task.outputSchema) },
          })}.`
        : task.expectedOutput
    }

{
    "finalAnswer": "The final answer to the Task."
}

**IMPORTANT**: You must return a valid JSON object. As if you were returning a JSON object from a function.
`;
    return prompt;
  },

  /**
   * Generates the initial message that provides the task description to the agent.
   * This message kickstarts the agent's work on a specific task.
   * @param params - Parameters for generating the initial message
   * @returns Formatted initial message
   */
  INITIAL_MESSAGE: ({ agent, task, context }: InitialMessageParams): string => {
    const prompt = `Hi ${agent.name}, please complete the following task: ${
      task.description
    }. 
        Your expected output should be: "${
          task.outputSchema
            ? `${
                task.expectedOutput
              }", adhere to this JSON schema: ${JSON.stringify(
                zodToJsonSchema(task.outputSchema)
              )}.`
            : task.expectedOutput
        }". 
        ${
          context
            ? `Incorporate the following findings and insights from previous tasks: "${context}"`
            : ''
        }`;
    return prompt;
  },

  /**
   * Generates feedback when the agent's response is not in valid JSON format.
   * This prompt asks the agent to correct its output format.
   * @param _params - Unused parameters for generating the invalid JSON feedback
   * @returns Formatted feedback message
   */
  INVALID_JSON_FEEDBACK: (_params: InvalidJsonFeedbackParams): string => {
    // eslint-disable-next-line no-useless-escape
    const prompt = `You returned an invalid JSON object. Please format your answer as a valid JSON object. Just the JSON object not comments or anything else. E.g: {\"finalAnswer\": \"The final answer\"}`;
    return prompt;
  },

  /**
   * Generates feedback when the agent's response does not match the expected schema.
   * This prompt asks the agent to correct its output format to match the schema.
   * @param params - Parameters for generating the invalid output schema feedback
   * @returns Formatted feedback message
   */
  INVALID_OUTPUT_SCHEMA_FEEDBACK: ({
    outputSchema,
    outputSchemaError,
  }: InvalidOutputSchemaFeedbackParams): string => {
    const prompt = `You returned an invalid JSON object with following error ${outputSchemaError.toString()}. Please format your answer adhere to this JSON schema ${JSON.stringify(
      zodToJsonSchema(outputSchema)
    )}.`;
    return prompt;
  },

  /**
   * Generates feedback for a thought that includes a self-question.
   * This prompt encourages the agent to answer its own question.
   * @param params - Parameters for generating the thought with self-question feedback
   * @returns Formatted feedback message
   */
  THOUGHT_WITH_SELF_QUESTION_FEEDBACK: ({
    question,
  }: ThoughtWithSelfQuestionFeedbackParams): string => {
    const prompt = `Awesome, please answer yourself the question: ${question}.`;
    return prompt;
  },

  /**
   * Generates feedback for a general thought from the agent.
   * This prompt encourages the agent to continue its line of thinking.
   * @param _params - Unused parameters for generating the thought feedback
   * @returns Formatted feedback message
   */
  THOUGHT_FEEDBACK: (_params: ThoughtFeedbackParams): string => {
    const prompt = `Your thoughts are great, let's keep going.`;
    return prompt;
  },

  /**
   * Generates feedback for a self-question from the agent.
   * This prompt encourages the agent to answer its own question.
   * @param _params - Unused parameters for generating the self-question feedback
   * @returns Formatted feedback message
   */
  SELF_QUESTION_FEEDBACK: (_params: SelfQuestionFeedbackParams): string => {
    const prompt = `Awesome, please answer yourself the question.`;
    return prompt;
  },
} as const;
