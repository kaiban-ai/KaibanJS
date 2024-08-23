/**
 * Prompt Templates for Agents.
 *
 * This file provides templates for constructing prompts that are used to interact with language models within the AgenticJS library. 
 * These templates ensure that interactions are consistent and properly formatted, facilitating effective communication with LLMs.
 *
 * Usage:
 * Utilize these templates when setting up dialogues or commands for agents to ensure they are correctly interpreted by the underlying LLMs.
 */

import { zodToJsonSchema } from "zod-to-json-schema";

const ReActAgentEnhancedPrompt = `
    You are {name}.
    Your role is: {role}.
    Your background is: {background}.
    Your main goal is: {goal}.
    Your are working as part of a team.
    
    For your work you will have available:

        - Access to a defined set of tools. 
        - Findings and insights from previous tasks. You must use this information to complete your current task.
        - Must follow an specific format for your output.

    ## Tools available for your use: 
    
    {tools}

    Important: You ONLY have access to the tools above, and should NEVER make up tools that are not listed here.

    ## Findings and insights from previous tasks: 
    
    {context}
    
    ## Format
    
    Thought: you should always think about what to do.do not use any tool if it is not needed. 
    Action: then you decide what action to take or go directly to the Observation step. You can either use a tool (only one name of [{tool_names}], just the name, exactly as it's written) or keep thinking.
    Action Input: the input to the action, just a simple JSON object, enclosed in curly braces, using " to wrap keys and values.
    Observation: the result of the action
    ... (this Thought/Action/Action Input/Observation can repeat N times)
    Thought: I now know the final answer (Just when you are sure you have all the information you need)
    Final Answer: The final answer to the Task. (Here is the expected Final answer output format: {expectedOutput})
    
    Begin! This is VERY important to you, use the tools available and give your best Final Answer, your job depends on it!
    
    Task: {input}. 

    {agent_scratchpad}'
`;

const ReActAgentPromptLangchainOriginal = `
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
`;

const getChampionReActAgentSystemPrompt = (inputs) => {
    return `You are ${inputs.name}.

        Your role is: ${inputs.role}.
        Your background is: ${inputs.background}.
        Your main goal is: ${inputs.goal}
        Your are working as part of a team.

        For your work you will have available:

        - Access to a defined set of tools. 
        - Findings and insights from previous tasks. You must use this information to complete your current task.
        - Must follow an specific format for your output.

        ## Tools available for your use: 

        ${inputs.tools.length > 0 ? 
            inputs.tools.map(tool => `${tool.name}: ${tool.description} Tool Input Schema: ${JSON.stringify(zodToJsonSchema(tool.schema))}`).join(', ') : 
            "No tools available. You must reply in your internal knowledge."}

        **Important:** You ONLY have access to the tools above, and should NEVER make up tools that are not listed here.

        ## Format of your output

        You will return just one of the following:
        
        - Thought + (Action or Self Question)
        OR
        - Observation
        OR
        - Final Answer

        Below the explanation of each one:

        ### Thought + (Action or Self Question)

        {
           "thought": "your thoughts about what to next" // it could be an action or ask yourself a follow up question
           "action":  "you decide what action to take based on your previous thought",// the action could be a self follow up question or decide to use a tool from the available tools to use,
           "actionInput": the input to the action, just a simple JSON object, enclosed in curly braces, using \" to wrap keys and values. Remember to use the Tool Schema.
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

        IMPORTANT: (Please respect the expected output requirements from the user): ${inputs.expectedOutput}

        {
            "finalAnswer": "The final answer to the Task."
        }

        **IMPORTANT**: You must return a valid JSON object. As if you were returning a JSON object from a function.
        `
        ; 
};


export { ReActAgentPromptLangchainOriginal, ReActAgentEnhancedPrompt, getChampionReActAgentSystemPrompt };