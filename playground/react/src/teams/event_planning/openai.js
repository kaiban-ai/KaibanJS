import { Agent, Task, Team } from 'kaibanjs';

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

const eventManagerAgent1 = new Agent({
  name: 'Peter Atlas--1',
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
  background: 'Knowledge of venue layouts, policies, and equipment setup.',
  type: 'ReactChampionAgent',
});

const venueCoordinatorAgent1 = new Agent({
  name: 'Sophia Lore--1',
  role: 'Manages venue logistics.',
  goal: 'Confirm venue availability, arrange setup, and handle issues.',
  background: 'Knowledge of venue layouts, policies, and equipment setup.',
  type: 'ReactChampionAgent',
});

const cateringAgent = new Agent({
  name: 'Maxwell Journey',
  role: 'Organizes food and beverages for the event',
  goal: 'Deliver a catering plan and coordinate with vendors',
  background:
    'Experience with catering contracts, menu planning, and dietary requirements',
  type: 'ReactChampionAgent',
});

const cateringAgent1 = new Agent({
  name: 'Maxwell Journey--1',
  role: 'Organizes food and beverages for the event',
  goal: 'Deliver a catering plan and coordinate with vendors',
  background:
    'Experience with catering contracts, menu planning, and dietary requirements',
  type: 'ReactChampionAgent',
});

const marketingAgent = new Agent({
  name: 'Riley Morgan',
  role: 'Promotes the event and handles attendee registrations',
  goal: 'Drive attendance and manage guest lists',
  background:
    'Skilled in social media marketing, email campaigns, and analytics',
  type: 'ReactChampionAgent',
});

const marketingAgent1 = new Agent({
  name: 'Riley Morgan--1',
  role: 'Promotes the event and handles attendee registrations',
  goal: 'Drive attendance and manage guest lists',
  background:
    'Skilled in social media marketing, email campaigns, and analytics',
  type: 'ReactChampionAgent',
});

const marketingAgent2 = new Agent({
  name: 'Riley Morgan--2',
  role: 'Promotes the event and handles attendee registrations',
  goal: 'Drive attendance and manage guest lists',
  background:
    'Skilled in social media marketing, email campaigns, and analytics',
  type: 'ReactChampionAgent',
});

// Define tasks with sequential dependencies
const selectEventDateTask = new Task({
  referenceId: 'selectEventDateTask',
  name: 'Select Event Date',
  description:
    'Evaluates possible event dates based on key stakeholder availability, venue schedules, and other constraints like holidays',
  expectedOutput:
    'Selected event date. Rationale for the chosen date. Notes on any potential conflicts or considerations.',
  agent: eventManagerAgent,
});

const bookVenueTask = new Task({
  referenceId: 'bookVenueTask',
  name: 'Book Venue',
  description:
    'Contact the venue, confirms availability for the selected date, and handles booking formalities',
  expectedOutput:
    'Venue name and address. Confirmation details. Cost estimate. Any notes on policies or special arrangements.',
  agent: venueCoordinatorAgent,
  dependencies: ['selectEventDateTask'],
});

const finalizeGuestListTask = new Task({
  referenceId: 'finalizeGuestListTask',
  name: 'Finalize Guest List',
  description:
    'Compile a guest list by integrating RSVPs, VIP requests, and corporate contacts',
  expectedOutput:
    'Number of confirmed guests. Guest list with contact details. Special dietary or accessibility requirements.',
  agent: marketingAgent,
  dependencies: ['selectEventDateTask'],
});

const createCateringPlanTask = new Task({
  referenceId: 'createCateringPlanTask',
  name: 'Create Catering Plan',
  description:
    'Based on the guest list, create a menu and select a vendor to meet dietary preferences and budget constraints.',
  expectedOutput:
    'Detailed menu. Vendor name and contract details. Total cost estimate. Notes on special arrangements for individual guests.',
  agent: cateringAgent,
  dependencies: ['selectEventDateTask', 'finalizeGuestListTask'],
});

const setupMarketingCampaignTask = new Task({
  referenceId: 'setupMarketingCampaignTask',
  name: 'Setup Marketing Campaign',
  description:
    'Develop a marketing plan to promote the event, including social media, email, and PR strategies.',
  expectedOutput: 'Marketing plan with key strategies and timelines.',
  agent: marketingAgent1,
  dependencies: ['selectEventDateTask', 'bookVenueTask'],
});

const coordinateVenueSetupTask = new Task({
  referenceId: 'coordinateVenueSetupTask',
  name: 'Coordinate Venue Setup',
  description:
    'Coordinate with venue staff to ensure all necessary preparations are made for the event.',
  expectedOutput:
    'Venue setup schedule and checklist. Any notes on special arrangements or last-minute details.',
  agent: venueCoordinatorAgent1,
  dependencies: ['bookVenueTask', 'createCateringPlanTask'],
});

const executeMarketingCampaignTask = new Task({
  referenceId: 'executeMarketingCampaignTask',
  name: 'Execute Marketing Campaign',
  description:
    'Execute the marketing plan, including social media, email, and PR strategies.',
  expectedOutput:
    'Marketing campaign execution report. Any notes on campaign performance or feedback.',
  agent: marketingAgent2,
  dependencies: ['setupMarketingCampaignTask'],
});

const finalizeInspectionAndApprovalTask = new Task({
  referenceId: 'finalizeInspectionAndApprovalTask',
  name: 'Finalize Inspection and Approval',
  description: 'Finalize inspection and approval of the event setup.',
  expectedOutput:
    'Inspection report. Any notes on final adjustments or feedback.',
  agent: eventManagerAgent1,
  dependencies: ['coordinateVenueSetupTask', 'executeMarketingCampaignTask'],
});

// Create the team with sequential task execution
const team = new Team({
  name: 'Event Planning Team',
  agents: [
    eventManagerAgent,
    eventManagerAgent1,
    venueCoordinatorAgent,
    venueCoordinatorAgent1,
    cateringAgent,
    cateringAgent1,
    marketingAgent,
    marketingAgent1,
    marketingAgent2,
  ],
  tasks: [
    selectEventDateTask,
    bookVenueTask,
    finalizeGuestListTask,
    createCateringPlanTask,
    setupMarketingCampaignTask,
    coordinateVenueSetupTask,
    executeMarketingCampaignTask,
    finalizeInspectionAndApprovalTask,
  ],
  logLevel: 'error',
  inputs: {},
  env: { OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY },
});

export default team;
