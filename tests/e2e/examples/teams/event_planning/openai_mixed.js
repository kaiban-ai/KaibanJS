const { Agent, Task, Team } = require('kaibanjs');
const {
  TavilySearchResults,
} = require('@langchain/community/tools/tavily_search');

// Define tools
const searchInternetTool = new TavilySearchResults({
  maxResults: 3,
  apiKey: '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',
});

// Define agents with exact roles, goals, and backgrounds
const eventManagerAgent = new Agent({
  name: 'Peter Atlas',
  role: 'Oversees event planning and ensures smooth execution.',
  goal: 'Coordinate tasks and ensure timely execution.',
  background:
    'Expertise in event planning, resource allocation, and scheduling.',
  type: 'ReactChampionAgent',
  maxIterations: 20,
});

const venueCoordinatorAgent = new Agent({
  name: 'Sophia Lore',
  role: 'Manages venue logistics.',
  goal: 'Confirm venue availability, arrange setup, and handle issues.',
  background: `Knowledge of venue layouts, policies, and equipment setup.`,
  type: 'ReactChampionAgent',
  tools: [searchInternetTool],
});

const cateringAgent = new Agent({
  name: 'Maxwell Journey',
  role: 'Organizes food and beverages for the event',
  goal: `Deliver a catering plan and coordinate with vendors`,
  background: `Experience with catering contracts, menu planning, and dietary requirements`,
  type: 'ReactChampionAgent',
  tools: [searchInternetTool],
});

const marketingAgent = new Agent({
  name: 'Riley Morgan',
  role: 'Promotes the event and handles attendee registrations',
  goal: `Drive attendance and manage guest lists`,
  background: `Skilled in social media marketing, email campaigns, and analytics`,
  type: 'ReactChampionAgent',
  tools: [searchInternetTool],
});

// Define tasks with mixed parallel/non-parallel execution
const selectEventDateTask = new Task({
  referenceId: 'selectEventDateTask',
  name: 'Select Event Date',
  description: `Evaluates possible event dates based on key stakeholder availability, venue schedules, and other constraints like holidays`,
  expectedOutput: `Selected event date. 
  Rationale for the chosen date. 
  Notes on any potential conflicts or considerations.`,
  agent: eventManagerAgent,
});

// Non-parallel task
const bookVenueTask = new Task({
  referenceId: 'bookVenueTask',
  name: 'Book Venue',
  description: `Contact the venue, confirms availability for the selected date, and handles booking formalities`,
  expectedOutput: `
  Venue name and address.
  Confirmation details
  Cost estimate.
  Any notes on policies or special arrangements.
  `,
  agent: venueCoordinatorAgent,
  dependencies: ['selectEventDateTask'],
});

// Non-parallel task
const prepareEventBudgetTask = new Task({
  referenceId: 'prepareEventBudgetTask',
  name: 'Prepare Event Budget',
  description: `Create a detailed budget plan for the event, including venue costs, catering, marketing, and contingencies`,
  expectedOutput: `
  Detailed budget breakdown.
  Cost estimates for each category.
  Contingency allocations.
  Total budget summary.
  `,
  agent: eventManagerAgent,
  dependencies: ['selectEventDateTask'],
});

// Parallel task
const finalizeGuestListTask = new Task({
  referenceId: 'finalizeGuestListTask',
  name: 'Finalize Guest List',
  description: `Compile a guest list by integrating RSVPs, VIP requests, and corporate contacts`,
  expectedOutput: `
  Number of confirmed guests.
Guest list with contact details.
Special dietary or accessibility requirements.
  `,
  agent: marketingAgent,
  dependencies: ['selectEventDateTask'],
  allowParallelExecution: true,
});

// Non-parallel task
const createCateringPlanTask = new Task({
  referenceId: 'createCateringPlanTask',
  name: 'Create Catering Plan',
  description: `Based on the guest list, create a menu and select a vendor to meet dietary preferences and budget constraints.`,
  expectedOutput: `
  Detailed menu.
Vendor name and contract details.
Total cost estimate.
Notes on special arrangements for individual guests.
  `,
  agent: cateringAgent,
  dependencies: ['selectEventDateTask', 'finalizeGuestListTask'],
});

// Parallel task
const setupMarketingCampaignTask = new Task({
  referenceId: 'setupMarketingCampaignTask',
  name: 'Setup Marketing Campaign',
  description: `Develop a marketing plan to promote the event, including social media, email, and PR strategies.`,
  expectedOutput: `
  Marketing plan with key strategies and timelines.
  `,
  agent: marketingAgent,
  dependencies: ['selectEventDateTask', 'bookVenueTask'],
  allowParallelExecution: true,
});

// Non-parallel task
const coordinateVenueSetupTask = new Task({
  referenceId: 'coordinateVenueSetupTask',
  name: 'Coordinate Venue Setup',
  description: `Coordinate with venue staff to ensure all necessary preparations are made for the event.`,
  expectedOutput: `
  Venue setup schedule and checklist.
  Any notes on special arrangements or last-minute details.
  `,
  agent: venueCoordinatorAgent,
  dependencies: ['bookVenueTask', 'createCateringPlanTask'],
});

// Parallel task
const executeMarketingCampaignTask = new Task({
  referenceId: 'executeMarketingCampaignTask',
  name: 'Execute Marketing Campaign',
  description: `Execute the marketing plan, including social media, email, and PR strategies.`,
  expectedOutput: `
  Marketing campaign execution report.
  Any notes on campaign performance or feedback.
  `,
  agent: marketingAgent,
  dependencies: ['setupMarketingCampaignTask'],
  allowParallelExecution: true,
});

// Non-parallel task
const finalizeInspectionAndApprovalTask = new Task({
  referenceId: 'finalizeInspectionAndApprovalTask',
  name: 'Finalize Inspection and Approval',
  description: `Finalize inspection and approval of the event setup.`,
  expectedOutput: `
  Inspection report.
  Any notes on final adjustments or feedback.
  `,
  agent: eventManagerAgent,
  dependencies: ['coordinateVenueSetupTask', 'executeMarketingCampaignTask'],
});

// Team to coordinate the agents
const team = new Team({
  name: 'Event Planning Team',
  agents: [
    eventManagerAgent,
    venueCoordinatorAgent,
    cateringAgent,
    marketingAgent,
  ],
  tasks: [
    selectEventDateTask,
    bookVenueTask,
    prepareEventBudgetTask,
    finalizeGuestListTask,
    createCateringPlanTask,
    setupMarketingCampaignTask,
    coordinateVenueSetupTask,
    executeMarketingCampaignTask,
    finalizeInspectionAndApprovalTask,
  ],
  logLevel: 'error',
  inputs: {},
  env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
});

module.exports = {
  team,
  tasks: [
    selectEventDateTask,
    bookVenueTask,
    prepareEventBudgetTask,
    finalizeGuestListTask,
    createCateringPlanTask,
    setupMarketingCampaignTask,
    coordinateVenueSetupTask,
    executeMarketingCampaignTask,
    finalizeInspectionAndApprovalTask,
  ],
  agents: [
    eventManagerAgent,
    venueCoordinatorAgent,
    cateringAgent,
    marketingAgent,
  ],
};
