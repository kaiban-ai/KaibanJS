const { Agent, Task, Team } = require('kaibanjs');

// Define agents
const feedbackAnalyst = new Agent({
  name: 'Alice',
  role: 'Feedback Analyst',
  goal: 'Analyze customer feedback and identify key patterns and sentiments.',
  background: 'Expert in customer feedback analysis and sentiment analysis',
  tools: [],
});

const insightGenerator = new Agent({
  name: 'Bob',
  role: 'Insight Generator',
  goal: 'Generate actionable insights from analyzed feedback.',
  background:
    'Specialist in converting customer feedback into business recommendations',
  tools: [],
});

const summaryWriter = new Agent({
  name: 'Charlie',
  role: 'Summary Writer',
  goal: 'Create clear and concise summary reports from insights.',
  background: 'Professional writer specializing in business communications',
  tools: [],
});

// Define tasks
const analysisTask = new Task({
  description: `Analyze the customer feedback and identify common themes, sentiments, and patterns.
  Feedback data: {feedbackData}`,
  expectedOutput:
    'Analysis of key themes and sentiments from customer feedback.',
  agent: feedbackAnalyst,
});

const insightTask = new Task({
  description: `Based on the analyzed feedback, generate actionable business insights and recommendations.
  Focus on practical improvements and opportunities.`,
  expectedOutput: 'List of actionable insights and recommendations.',
  agent: insightGenerator,
});

const summaryTask = new Task({
  description: `Create a concise executive summary that outlines the key findings and recommendations.
  Include both the main patterns found and the suggested actions.`,
  expectedOutput: 'Executive summary with key findings and recommendations.',
  agent: summaryWriter,
});

// Create a team
const team = new Team({
  name: 'Customer Feedback Analysis Team',
  agents: [feedbackAnalyst, insightGenerator, summaryWriter],
  tasks: [analysisTask, insightTask, summaryTask],
  inputs: {
    feedbackData: `
      Customer 1: "The new mobile app is much faster than before, but the search function is still confusing."
      Customer 2: "Great customer service, the support team resolved my issue in minutes!"
      Customer 3: "Prices are a bit high compared to competitors, but quality is worth it."
      Customer 4: "Would love to see more color options for the product."
      Customer 5: "The checkout process is smooth, but shipping takes too long."
    `,
  },
  env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
  logLevel: 'error',
});

module.exports = team;
