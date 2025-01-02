/**
 * @file prompts.ts
 * @path KaibanJS/src/utils/helpers/prompts/prompts.ts
 * @description Implementation of agent prompt templates for REACT Champion agents
 * 
 * @module @helpers/prompts
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from "langchain/tools";
import type { 
    // Parameter types
    ISystemMessageParams,
    IInitialMessageParams,
    IInvalidJSONFeedbackParams,
    IThoughtWithSelfQuestionParams,
    IThoughtFeedbackParams,
    ISelfQuestionParams,
    IToolResultParams,
    IToolErrorParams,
    IToolNotExistParams,
    IObservationFeedbackParams,
    IWeirdOutputFeedbackParams,
    IForceFinalAnswerParams,
    IFeedbackMessageParams,
    IREACTChampionAgentPrompts
} from '../../../types/agent';

import { validatePrompts } from './index';

/**
 * Default prompt templates for REACT Champion agents
 * Provides a complete set of templates for agent-task interactions
 */
const REACT_CHAMPION_AGENT_DEFAULT_PROMPTS: IREACTChampionAgentPrompts = {
    SYSTEM_MESSAGE: function systemMessageTemplate(params: ISystemMessageParams): string {
        const { agent, task } = params;
        const toolDescriptions = agent.tools.length > 0 
            ? agent.tools.map((tool: Tool) => 
                `${tool.name}: ${tool.description} Tool Input Schema: ${JSON.stringify(zodToJsonSchema(tool.schema))}`)
                .join(', ') 
            : "No tools available. You must reply using your internal knowledge.";

        return `You are ${agent.name}.
        
Your role is: ${agent.role}.
Your background is: ${agent.background}.
Your main goal is: ${agent.goal}.
You are working as part of a team to systematically break down and solve tasks using reasoning and tool usage.

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

    INITIAL_MESSAGE: function initialMessageTemplate(params: IInitialMessageParams): string {
        const { agent, task, context } = params;
        return `Starting task for ${agent.role}.
         Task: ${task.description}
         Expected Output: ${task.expectedOutput}
         ${context ? `Context from previous tasks: ${context}` : ''}
         Let's begin by analyzing the task and planning our approach.`;
    },

    INVALID_JSON_FEEDBACK: function invalidJsonFeedbackTemplate(params: IInvalidJSONFeedbackParams): string {
        const { agent, task, llmOutput } = params;
        return `Invalid JSON output detected.
         Agent: ${agent.role}
         Task: ${task.description}
         Problematic Output: ${llmOutput}
         Please ensure your response is a valid JSON structure.`;
    },

    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: function thoughtWithSelfQuestionTemplate(params: IThoughtWithSelfQuestionParams): string {
        const { agent, thought, question } = params;
        return `Reflection for ${agent.role}:
         Current Thought: ${thought}
         Self-Questioning: ${question}
         Please address this question and continue reasoning using the correct JSON format.`;
    },

    THOUGHT_FEEDBACK: function thoughtFeedbackTemplate(params: IThoughtFeedbackParams): string {
        const { agent, task, thought } = params;
        return `Thought Analysis for ${agent.role}:
         Task: ${task.description}
         Thought: ${thought}
         Please evaluate this reasoning and determine next steps in JSON format.`;
    },

    SELF_QUESTION_FEEDBACK: function selfQuestionFeedbackTemplate(params: ISelfQuestionParams): string {
        const { agent, task, question } = params;
        return `Self-Reflection for ${agent.role}:
         Task: ${task.description}
         Reflective Question: ${question}
         Please answer this question to guide your problem-solving strategy. Respond in JSON format.`;
    },

    TOOL_RESULT_FEEDBACK: function toolResultFeedbackTemplate(params: IToolResultParams): string {
        const { agent, task, toolResult } = params;
        return `Tool Execution Result for ${agent.role}:
         Task: ${task.description}
         Result: ${JSON.stringify(toolResult)}
         Please analyze this result and determine next steps in JSON format.`;
    },

    TOOL_ERROR_FEEDBACK: function toolErrorFeedbackTemplate(params: IToolErrorParams): string {
        const { agent, task, toolName, error } = params;
        return `Tool Error for ${agent.role}:
         Task: ${task.description}
         Tool: ${toolName}
         Error: ${error.message}
         Please adjust strategy and consider alternative approaches in JSON format.`;
    },

    TOOL_NOT_EXIST_FEEDBACK: function toolNotExistFeedbackTemplate(params: IToolNotExistParams): string {
        const { agent, task, toolName } = params;
        return `Tool Unavailability for ${agent.role}:
         Task: ${task.description}
         Missing Tool: ${toolName}
         Please reassess using only available tools listed in initial instructions. Respond in JSON format.`;
    },

    OBSERVATION_FEEDBACK: function observationFeedbackTemplate(_: IObservationFeedbackParams): string {
        return `Observation phase. Please analyze current state and prepare next action in JSON format.`;
    },

    WEIRD_OUTPUT_FEEDBACK: function weirdOutputFeedbackTemplate(_: IWeirdOutputFeedbackParams): string {
        return `Unexpected output format detected. Please ensure your response follows the specified JSON structure.`;
    },

    FORCE_FINAL_ANSWER_FEEDBACK: function forceFinalAnswerFeedbackTemplate(params: IForceFinalAnswerParams): string {
        const { agent, task, iterations, maxAgentIterations } = params;
        return `Final Answer Compilation for ${agent.role}:
         Task: ${task.description}
         Iterations: ${iterations}/${maxAgentIterations}
         Please synthesize key insights and provide final solution in JSON format.`;
    },

    WORK_ON_FEEDBACK_FEEDBACK: function workOnFeedbackFeedbackTemplate(params: IFeedbackMessageParams): string {
        const { agent, task, feedback } = params;
        return `Feedback Processing for ${agent.role}:
         Task: ${task.description}
         Feedback: ${feedback}
         Please incorporate this feedback and refine your approach in JSON format.`;
    }
} as const;

// Validate prompts at runtime
validatePrompts(REACT_CHAMPION_AGENT_DEFAULT_PROMPTS);

export default REACT_CHAMPION_AGENT_DEFAULT_PROMPTS;
