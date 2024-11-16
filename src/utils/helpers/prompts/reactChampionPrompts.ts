import { REACTChampionAgentPrompts } from '../../types/agent/prompts';

export const REACT_CHAMPION_AGENT_DEFAULT_PROMPTS: REACTChampionAgentPrompts = {
    SYSTEM_MESSAGE: ({ agent, task }) => 
        `You are a ${agent.role} working on the task: ${task.description}. 
         Your goal is to systematically break down and solve the task using reasoning and tool usage.`,

    INITIAL_MESSAGE: ({ agent, task, context }) => 
        `Starting task for ${agent.role}. 
         Task: ${task.description}
         ${context ? `Context: ${context}` : ''}
         Let's begin by analyzing the task and planning our approach.`,

    INVALID_JSON_FEEDBACK: ({ agent, task, llmOutput }) => 
        `Invalid JSON output detected. 
         Agent: ${agent.role}
         Task: ${task.description}
         Problematic Output: ${llmOutput}
         Please ensure your response is a valid JSON structure.`,

    THOUGHT_WITH_SELF_QUESTION_FEEDBACK: ({ agent, task, thought, question }) => 
        `Reflection for ${agent.role}:
         Current Thought: ${thought}
         Self-Questioning: ${question}
         Continue reasoning and refining your approach.`,

    THOUGHT_FEEDBACK: ({ agent, task, thought }) => 
        `Thought Analysis for ${agent.role}:
         Task: ${task.description}
         Thought: ${thought}
         Evaluate the reasoning and consider potential next steps.`,

    SELF_QUESTION_FEEDBACK: ({ agent, task, question }) => 
        `Self-Reflection for ${agent.role}:
         Task: ${task.description}
         Reflective Question: ${question}
         Use this question to guide your problem-solving strategy.`,

    TOOL_RESULT_FEEDBACK: ({ agent, task, toolResult }) => 
        `Tool Execution Result for ${agent.role}:
         Task: ${task.description}
         Result: ${JSON.stringify(toolResult)}
         Analyze this result and determine the next action.`,

    TOOL_ERROR_FEEDBACK: ({ agent, task, toolName, error }) => 
        `Tool Error for ${agent.role}:
         Task: ${task.description}
         Tool: ${toolName}
         Error: ${error.message}
         Adjust strategy and consider alternative approaches.`,

    TOOL_NOT_EXIST_FEEDBACK: ({ agent, task, toolName }) => 
        `Tool Unavailability for ${agent.role}:
         Task: ${task.description}
         Missing Tool: ${toolName}
         Reassess task requirements and available resources.`,

    OBSERVATION_FEEDBACK: () => 
        `Observation phase. Analyze current state and prepare for next action.`,

    WEIRD_OUTPUT_FEEDBACK: () => 
        `Unexpected output detected. Reassess reasoning and approach.`,

    FORCE_FINAL_ANSWER_FEEDBACK: ({ agent, task, iterations, maxAgentIterations }) => 
        `Final Answer Compilation for ${agent.role}:
         Task: ${task.description}
         Iterations: ${iterations}/${maxAgentIterations}
         Synthesize key insights and provide a comprehensive solution.`,

    WORK_ON_FEEDBACK_FEEDBACK: ({ agent, task, feedback }) => 
        `Feedback Processing for ${agent.role}:
         Task: ${task.description}
         Feedback: ${feedback}
         Incorporate feedback and refine your approach.`
};

export default REACT_CHAMPION_AGENT_DEFAULT_PROMPTS;
