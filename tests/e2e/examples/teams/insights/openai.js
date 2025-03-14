const { Agent, Task, Team } = require('kaibanjs');

// Define agents
const profileAnalystAgent = new Agent({
  name: 'Alice',
  role: 'Passenger Profile Analyst',
  goal: 'Analyze passenger history and preferences to identify key patterns and needs.',
  background: 'Customer Behavior Analysis and Travel Preferences',
});

const recommendationAgent = new Agent({
  name: 'Bob',
  role: 'Travel Experience Specialist',
  goal: 'Create personalized travel recommendations based on passenger profile analysis.',
  background: 'Personalized Travel Planning and Customer Experience',
});

// Define tasks
const analysisTask = new Task({
  description: `Analyze passenger profile: {passenger_name} and identify key preferences and patterns. Consider their past travel history and experiences.`,
  expectedOutput:
    'A detailed analysis of passenger preferences and behavior patterns.',
  agent: profileAnalystAgent,
});

const recommendationTask = new Task({
  description: `Based on the passenger analysis, create personalized travel recommendations for their upcoming London-Dubai flight.`,
  expectedOutput:
    'Personalized travel recommendations considering passenger history and preferences.',
  isDeliverable: true,
  agent: recommendationAgent,
});

// Create a team with insights
const team = new Team({
  name: 'Passenger Experience Team',
  agents: [profileAnalystAgent, recommendationAgent],
  tasks: [analysisTask, recommendationTask],
  inputs: {
    passenger_name: 'Michael Zhang',
  },
  insights: `
Passenger Profile: Michael Zhang (Frequent Flyer ID: FF-789321)
Travel History and Preferences (2023):
1. Consistently books window seats (87% of flights), particularly on row 11 (Booking History #BK-2023-156)
2. Experienced significant delays on last Dubai trip (Flight DXB-892), filed complaint about lack of updates
3. Premium meal selection history shows strong preference for Asian Vegetarian meals (ordered on 9 out of 10 long-haul flights)
4. Always uses airport lounge at Terminal 4 during layovers (average stay: 2.5 hours, Lounge Access Log #LA-567)
5. Recent feedback (Survey ID: CS-982) indicated dissatisfaction with in-flight entertainment options on Boeing 787 fleet`,
  env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
  logLevel: 'error',
});

module.exports = team;
