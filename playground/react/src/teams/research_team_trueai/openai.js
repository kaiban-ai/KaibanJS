import { Agent, Task, Team } from 'kaibanjs';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';


// Define tools
const searchTool = new TavilySearchResults({
    maxResults: 5,
    // apiKey: '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',
    apiKey: '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',
});

// Define agents
const researcher = new Agent({
    name: 'Senior Research Analyst',
    role: 'Researcher',
    goal: 'Uncover cutting-edge developments in AI and data science',
    background: `You work at a leading tech think tank.
    Your expertise lies in identifying emerging trends.
    You have a knack for dissecting complex data and presenting actionable insights.`,
    type: 'ReactChampionAgent',
    tools: [searchTool]
});

const writer = new Agent({
    name: 'Tech Content Strategist',
    role: 'Writer',
    goal: 'Craft compelling content on tech advancements',
    background: `You are a renowned Content Strategist, known for your insightful and engaging articles.
    You transform complex concepts into compelling narratives.`,
    type: 'ReactChampionAgent',
    tools: []
});

// Define tasks
const analysisTask = new Task({
    description: `Conduct a comprehensive analysis of the latest advancements in AI in 2024.
    Identify key trends, breakthrough technologies, and potential industry impacts.`,
    expectedOutput: 'Full analysis report in bullet points',
    agent: researcher
});

const blogPostTask = new Task({
    description: `Using the insights provided, develop an engaging blog
    post that highlights the most significant AI advancements.
    Your post should be informative yet accessible, catering to a tech-savvy audience.
    Make it sound cool, avoid complex words so it doesn't sound like AI.`,
    expectedOutput: 'Full blog post of at least 4 paragraphs',
    agent: writer
});

// Team to coordinate the agents
const researchTeam = new Team({
    name: 'AI Research and Communication Team',
    agents: [researcher, writer],
    tasks: [analysisTask, blogPostTask],
    inputs: {},  // Placeholder for dynamic inputs if needed
    env: {OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY, ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY}
});

export default researchTeam;
