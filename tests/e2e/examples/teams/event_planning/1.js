const fs = require('fs');

// Read the openai.requests.json file
const requestsData = JSON.parse(
  fs.readFileSync('./openai.requests.json', 'utf8')
);

// Store the new request to match against
const newRequest = {
  model: 'gpt-4o-mini',
  temperature: 1,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
  n: 1,
  stream: false,
  messages: [
    {
      role: 'system',
      content:
        'You are Riley Morgan.\n\nYour role is: Promotes the event and handles attendee registrations.\nYour background is: Skilled in social media marketing, email campaigns, and analytics.\nYour main goal is: Drive attendance and manage guest lists\nYou are working as part of a team.\n\nFor your work you will have available:\n\n- Access to a defined set of tools. \n- Findings and insights from previous tasks. You must use this information to complete your current task.\n- Must follow a specific format for your output.\n\n## Tools available for your use: \n\ntavily_search_results_json: A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. Input should be a search query. Tool Input Schema: {"type":"object","properties":{"input":{"type":"string"}},"additionalProperties":false,"$schema":"http://json-schema.org/draft-07/schema#"}\n\n**Important:** You ONLY have access to the tools above, and should NEVER make up tools that are not listed here.\n\n## Format of your output\n\nYou will return just one of the following:\n\n- Thought + (Action or Self Question)\nOR\n- Observation\nOR\n- Final Answer\n\nBelow is the explanation of each one:\n\n### Thought + (Action or Self Question)\n\n{\n   "thought": "your thoughts about what to do next" // it could be an action or ask yourself a follow up question\n   "action":  "you decide what action to take based on your previous thought", // the action could be a self follow up question or decide to use a tool from the available tools to use,\n   "actionInput": the input to the action, just a simple JSON object, enclosed in curly braces, using \\" to wrap keys and values. Remember to use the Tool Schema.\n}\n\nExamples: \n\n{\n   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information."\n   "action": "tavily_search_results_json",\n   "actionInput": {"query":"Copa America 2024 winner"}\n}\n\nother\n\n{\n   "thought": "To find out who won the Copa America in 2024, I need to search for the most recent and relevant information."\n   "action": "self_question",\n   "actionInput": {"query":"Copa America 2024 winner"}\n}\n\n### Observation\n\n{\n   "observation":  "Reflect about the result of the action. (E.g:  I got the following results from the tool Can I get the Final Answer from there?)", \n    "isFinalAnswerReady": false // If you have the final answer or not\n}\n\n### Final Answer\n\nIMPORTANT: (Please respect the expected output requirements from the user): \n  Marketing plan with key strategies and timelines.\n  \n\n{\n    "finalAnswer": "The final answer to the Task."\n}\n\n**IMPORTANT**: You must return a valid JSON object. As if you were returning a JSON object from a function.\n',
    },
    {
      role: 'user',
      content:
        'Hi Riley Morgan, please complete the following task: Compile a guest list by integrating RSVPs, VIP requests, and corporate contacts. \n        Your expected output should be: "\n  Number of confirmed guests.\nGuest list with contact details.\nSpecial dietary or accessibility requirements.\n  ". \n        Incorporate the following findings and insights from previous tasks: "Task: Evaluates possible event dates based on key stakeholder availability, venue schedules, and other constraints like holidays\nResult: The selected event date is April 15, 2024. The rationale for choosing this date is that it aligns well with key stakeholder availability and avoids major holidays, ensuring maximal participation. Additionally, the chosen venue is available on this date without any overlapping events. Potential conflicts to consider include the possibility of scheduling conflicts with other local events in mid-April, which may affect attendance, and the need to finalize confirmations with stakeholders by the end of March 2024.\n"',
    },
    {
      role: 'assistant',
      content:
        '{\n   "thought": "I need to compile the guest list by integrating RSVPs, VIP requests, and corporate contacts, while also considering the confirmed event date of April 15, 2024. I\'ll start by gathering the RSVPs and corporate contacts first.",\n   "action": "self_question",\n   "actionInput": {"query":"Collect RSVPs, VIP requests, and corporate contacts for the event on April 15, 2024."}\n}',
    },
    {
      role: 'user',
      content:
        'Awesome, please answer yourself the question: {"query":"Collect RSVPs, VIP requests, and corporate contacts for the event on April 15, 2024."}.',
    },
    {
      role: 'assistant',
      content:
        '{\n   "observation": "I do not have the actual RSVPs, VIP requests, and corporate contacts available in my current context. Therefore, I need to initiate a process to gather this information.",\n   "isFinalAnswerReady": false\n}',
    },
    {
      role: 'user',
      content:
        "Great observation. Please keep going. Let's get to the final answer.",
    },
    {
      role: 'assistant',
      content:
        '{\n   "thought": "To gather the necessary RSVPs, VIP requests, and corporate contacts, I\'ll create a strategy to collect this information through email outreach and social media channels.",\n   "action": "self_question",\n   "actionInput": {"query":"Draft an email campaign to collect RSVPs, VIP requests, and corporate contacts for the event on April 15, 2024."}\n}',
    },
    {
      role: 'user',
      content:
        'Awesome, please answer yourself the question: {"query":"Draft an email campaign to collect RSVPs, VIP requests, and corporate contacts for the event on April 15, 2024."}.',
    },
    {
      role: 'assistant',
      content:
        '{\n   "observation": "I can outline a plan for the email campaign, including key points to include in the email for collecting RSVPs, VIP requests, and corporate contacts. However, I still need to execute this plan to finalize guest details.",\n   "isFinalAnswerReady": false\n}',
    },
    {
      role: 'user',
      content:
        "Great observation. Please keep going. Let's get to the final answer.",
    },
    {
      role: 'assistant',
      content:
        '{\n   "thought": "I will outline the key points for the email campaign, which will help inform potential guests about the event, request their RSVPs, and allow them to indicate any special dietary or accessibility requirements.",\n   "action": "self_question",\n   "actionInput": {"query":"What key points should I include in the email campaign for collecting RSVPs and guest preferences?"}\n}',
    },
    {
      role: 'user',
      content:
        'Awesome, please answer yourself the question: {"query":"What key points should I include in the email campaign for collecting RSVPs and guest preferences?"}.',
    },
    {
      role: 'assistant',
      content:
        '{\n   "observation": "The key points to include in the email campaign are: 1. Event details (date, time, location); 2. RSVP request with a deadline; 3. Request for VIP status indication; 4. Inquiry about special dietary or accessibility requirements; 5. Contact information for inquiries. This will help ensure all necessary information is collected.",\n   "isFinalAnswerReady": false\n}',
    },
    {
      role: 'user',
      content:
        "Great observation. Please keep going. Let's get to the final answer.",
    },
    {
      role: 'assistant',
      content:
        '{\n   "thought": "Based on the outlined key points, I will draft the email for the campaign to effectively collect RSVPs, VIP requests, and additional preferences from potential guests.",\n   "action": "self_question",\n   "actionInput": {"query":"Draft the email for the RSVP campaign for the event on April 15, 2024."}\n}',
    },
    {
      role: 'user',
      content:
        'Awesome, please answer yourself the question: {"query":"Draft the email for the RSVP campaign for the event on April 15, 2024."}.',
    },
    {
      role: 'assistant',
      content:
        '{\n   "observation": "I have drafted the email which includes all the necessary elements: event details, RSVP request, VIP indication, dietary and accessibility inquiries, and contact information. However, I still need to send this email and gather the responses to compile the final guest list.",\n   "isFinalAnswerReady": false\n}',
    },
    {
      role: 'user',
      content:
        "We don't have more time to keep looking for the answer. Please use all the information you have gathered until now and give the finalAnswer right away.",
    },
    {
      role: 'assistant',
      content:
        '{\n    "finalAnswer": "The final answer to the Task is as follows: \\nNumber of confirmed guests: To be determined upon collection of RSVPs. \\nGuest list with contact details: To be compiled after receiving responses. \\nSpecial dietary or accessibility requirements: To be noted based on guest feedback in the RSVP responses."\n}',
    },
    {
      role: 'user',
      content:
        "Great observation. Please keep going. Let's get to the final answer.",
    },
  ],
};

// Find matching request in the file
const matchingRequest = requestsData.find(({ body }) => {
  if (!body.messages) return false;

  const reqNMessages = body.messages.length;
  const newReqNMessages = newRequest.messages.length;
  const reqMessages = body.messages.slice(0, reqNMessages);
  const newReqMessages = newRequest.messages.slice(0, newReqNMessages);

  if (JSON.stringify(reqMessages[1]) === JSON.stringify(newReqMessages[1])) {
    console.log(JSON.stringify(reqMessages[1]));
    console.log(JSON.stringify(newReqMessages[1]));
  }

  return (
    JSON.stringify(reqMessages).replace(/\\n\s+/g, '\\n') ===
    JSON.stringify(newReqMessages).replace(/\\n\s+/g, '\\n')
  );
});

// If a matching request is found, print the index
if (matchingRequest) {
  console.log(
    `Matching request found at index: ${requestsData.indexOf(matchingRequest)}`
  );
} else {
  console.log('No matching request found.');
}
