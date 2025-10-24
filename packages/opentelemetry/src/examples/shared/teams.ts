import { Agent, Task, Team } from 'kaibanjs';

/**
 * Shared teams for OpenTelemetry examples
 * These teams range from simple to complex workflows
 */

// ============================================================================
// SIMPLE TEAMS
// ============================================================================

/**
 * Simple Data Processing Team
 * Single agent, single task - perfect for basic observability
 */
export const createSimpleDataTeam = () => {
  const dataProcessor = new Agent({
    name: 'Data Processor',
    role: 'Process and analyze data',
    goal: 'Extract valuable insights from data',
    background:
      'I am an expert data processor with experience in data analysis and insights extraction',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const processTask = new Task({
    title: 'Process Data',
    description: 'Process the provided data: {data} and extract insights',
    expectedOutput: 'Detailed insights and analysis from the data',
    agent: dataProcessor,
  });

  return new Team({
    name: 'Simple Data Processing Team',
    agents: [dataProcessor],
    tasks: [processTask],
    inputs: {
      data: 'The current crypto market is doing great. The top 3 coins are Bitcoin, Ethereum and Solana. The market is expected to grow by 10% in the next month. The price of Bitcoin is $100,000 and the price of Ethereum is $10,000. The price of Solana is $100.',
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

/**
 * Content Creation Team
 * Two agents working in sequence - good for testing task chaining
 */
export const createContentCreationTeam = () => {
  const researcher = new Agent({
    name: 'Research Specialist',
    role: 'Research and Information Gathering',
    goal: 'Gather comprehensive information about the given topic',
    background:
      'Expert researcher with experience in information gathering and fact-checking',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const writer = new Agent({
    name: 'Content Writer',
    role: 'Content Creation and Writing',
    goal: 'Create engaging and informative content based on research',
    background:
      'Professional writer with expertise in creating compelling content',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const researchTask = new Task({
    title: 'Research Topic',
    description: 'Research and gather information about: {topic}',
    expectedOutput: 'Comprehensive research findings and key insights',
    agent: researcher,
  });

  const writingTask = new Task({
    title: 'Create Content',
    description: 'Create engaging content based on the research findings',
    expectedOutput: 'Well-structured and informative content',
    agent: writer,
  });

  return new Team({
    name: 'Content Creation Team',
    agents: [researcher, writer],
    tasks: [researchTask, writingTask],
    inputs: {
      topic:
        'The impact of artificial intelligence on modern software development',
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

// ============================================================================
// INTERMEDIATE TEAMS
// ============================================================================

/**
 * Resume Creation Team
 * Multi-agent workflow with structured data processing
 */
export const createResumeCreationTeam = () => {
  const profileAnalyst = new Agent({
    name: 'Mary',
    role: 'Profile Analyst',
    goal: 'Extract structured information from conversational user input',
    background:
      'Data Processor with expertise in information extraction and structuring',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const resumeWriter = new Agent({
    name: 'Alex Mercer',
    role: 'Resume Writer',
    goal: 'Craft compelling, well-structured resumes that effectively showcase job seekers qualifications and achievements',
    background:
      'Extensive experience in recruiting, copywriting, and human resources, enabling effective resume design that stands out to employers',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const processingTask = new Task({
    title: 'Extract Profile Information',
    description:
      "Extract relevant details such as name, experience, skills, and job history from the user's 'aboutMe' input. aboutMe: {aboutMe}",
    expectedOutput: 'Structured data ready to be used for a resume creation',
    agent: profileAnalyst,
  });

  const resumeCreationTask = new Task({
    title: 'Create Resume',
    description:
      'Utilize the structured data to create a detailed and attractive resume. Enrich the resume content by inferring additional details from the provided information. Include sections such as a personal summary, detailed work experience, skills, and educational background',
    expectedOutput:
      'A professionally formatted resume in markdown format, ready for submission to potential employers',
    agent: resumeWriter,
  });

  return new Team({
    name: 'Resume Creation Team',
    agents: [profileAnalyst, resumeWriter],
    tasks: [processingTask, resumeCreationTask],
    inputs: {
      aboutMe:
        'My name is David Llaca. JavaScript Developer for 5 years. I worked for three years at Disney, where I developed user interfaces for their primary landing pages using React, NextJS, and Redux. Before Disney, I was a Junior Front-End Developer at American Airlines, where I worked with Vue and Tailwind. I earned a Bachelor of Science in Computer Science from FIU in 2018, and I completed a JavaScript bootcamp that same year.',
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

/**
 * Sports News Team
 * Multi-agent team with research and content creation
 */
export const createSportsNewsTeam = () => {
  const searchAgent = new Agent({
    name: 'Scout',
    role: 'Information Gatherer',
    goal: 'Find up-to-date information about the given sports query',
    background:
      'Research specialist with expertise in sports information gathering',
    type: 'ReactChampionAgent',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const contentCreator = new Agent({
    name: 'Writer',
    role: 'Content Creator',
    goal: 'Generate comprehensive articles about any sports event',
    background: 'Journalism expert with extensive experience in sports writing',
    type: 'ReactChampionAgent',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const searchTask = new Task({
    title: 'Research Sports Event',
    description:
      'Search for detailed information about the sports query: {sportsQuery}',
    expectedOutput:
      'Detailed information about the sports event. Key players, key moments, final score and other useful information',
    agent: searchAgent,
  });

  const writeTask = new Task({
    title: 'Write Sports Article',
    description:
      'Using the gathered information, write a detailed article about the sport event',
    expectedOutput:
      'A well-structured and engaging sports article. With a title, introduction, body, and conclusion. Min 4 paragraphs long',
    agent: contentCreator,
  });

  return new Team({
    name: 'Sports Content Creation Team',
    agents: [searchAgent, contentCreator],
    tasks: [searchTask, writeTask],
    inputs: {
      sportsQuery: 'Who won the Copa America in 2024?',
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

// ============================================================================
// COMPLEX TEAMS
// ============================================================================

/**
 * Trip Planning Team
 * Complex multi-agent workflow with multiple research phases
 */
export const createTripPlanningTeam = () => {
  const citySelectorAgent = new Agent({
    name: 'Peter Atlas',
    role: 'City Selection Expert',
    goal: 'Select the best city based on weather, season, and prices',
    background: 'An expert in analyzing travel data to pick ideal destinations',
    type: 'ReactChampionAgent',
    maxIterations: 20,
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const localExpertAgent = new Agent({
    name: 'Sophia Lore',
    role: 'Local Expert at this city',
    goal: 'Provide the BEST insights about the selected city',
    background:
      'A knowledgeable local guide with extensive information about the city, its attractions and customs',
    type: 'ReactChampionAgent',
    maxIterations: 5,
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const travelConciergeAgent = new Agent({
    name: 'Maxwell Journey',
    role: 'Amazing Travel Concierge',
    goal: 'Create the most amazing travel itineraries with budget and packing suggestions for the city',
    background:
      'Specialist in travel planning and logistics with decades of experience',
    type: 'ReactChampionAgent',
    maxIterations: 5,
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const identifyTask = new Task({
    title: 'Select Best City',
    description:
      'Analyze and select the best city for the trip based on specific criteria such as weather patterns, seasonal events, and travel costs. Origin: {origin}, City Options: {cities}, Trip Date: {range}, Traveler Interests: {interests}',
    expectedOutput:
      'Detailed report on the chosen city, including flight costs, weather forecast and attractions',
    agent: citySelectorAgent,
  });

  const gatherTask = new Task({
    title: 'Gather City Information',
    description:
      'Compile an in-depth guide for the selected city, considering key attractions, local customs, and special events. Trip Date: {range}, Origin: {origin}, Interests: {interests}',
    expectedOutput:
      'A comprehensive city guide, rich in cultural insights and practical tips',
    agent: localExpertAgent,
  });

  const planTask = new Task({
    title: 'Create Travel Itinerary',
    description:
      'Develop a full 7-day travel itinerary with detailed daily plans, including places to eat, packing suggestions, and a budget breakdown. Trip Date: {range}, Origin: {origin}, Interests: {interests}',
    expectedOutput: 'A complete expanded travel plan formatted as markdown',
    agent: travelConciergeAgent,
  });

  return new Team({
    name: 'Trip Planning Team',
    agents: [citySelectorAgent, localExpertAgent, travelConciergeAgent],
    tasks: [identifyTask, gatherTask, planTask],
    logLevel: 'info',
    inputs: {
      origin: 'New York',
      cities: ['Tokyo', 'Paris', 'Berlin'],
      interests: 'Art and Culture',
      range: '2024-12-01 to 2024-12-15',
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

/**
 * Product Specification Team
 * Complex team with multiple specialized agents
 */
export const createProductSpecTeam = () => {
  const marketAnalyst = new Agent({
    name: 'Market Analyst',
    role: 'Market Research Specialist',
    goal: 'Analyze market trends and competitive landscape',
    background:
      'Expert in market analysis with deep understanding of industry trends',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const productManager = new Agent({
    name: 'Product Manager',
    role: 'Product Strategy Expert',
    goal: 'Define product requirements and specifications',
    background:
      'Experienced product manager with expertise in product strategy and requirements gathering',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const technicalArchitect = new Agent({
    name: 'Technical Architect',
    role: 'System Architecture Specialist',
    goal: 'Design technical architecture and system specifications',
    background:
      'Senior technical architect with extensive experience in system design and architecture',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4o-mini',
    },
  });

  const marketResearchTask = new Task({
    title: 'Market Research',
    description: 'Conduct comprehensive market research for: {productIdea}',
    expectedOutput:
      'Detailed market analysis including trends, competitors, and opportunities',
    agent: marketAnalyst,
  });

  const productSpecTask = new Task({
    title: 'Product Specification',
    description:
      'Create detailed product specifications based on market research',
    expectedOutput: 'Comprehensive product specification document',
    agent: productManager,
  });

  const technicalSpecTask = new Task({
    title: 'Technical Architecture',
    description: 'Design technical architecture for the product specification',
    expectedOutput: 'Detailed technical architecture and system design',
    agent: technicalArchitect,
  });

  return new Team({
    name: 'Product Specification Team',
    agents: [marketAnalyst, productManager, technicalArchitect],
    tasks: [marketResearchTask, productSpecTask, technicalSpecTask],
    inputs: {
      productIdea: 'AI-powered project management tool for remote teams',
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

// ============================================================================
// TEAM FACTORY FUNCTIONS
// ============================================================================

export const getTeamByName = (teamName: string) => {
  const teams = {
    'simple-data': createSimpleDataTeam,
    'content-creation': createContentCreationTeam,
    'resume-creation': createResumeCreationTeam,
    'sports-news': createSportsNewsTeam,
    'trip-planning': createTripPlanningTeam,
    'product-spec': createProductSpecTeam,
  };

  const teamFactory = teams[teamName as keyof typeof teams];
  if (!teamFactory) {
    throw new Error(
      `Team '${teamName}' not found. Available teams: ${Object.keys(teams).join(
        ', '
      )}`
    );
  }

  return teamFactory();
};

export const getAvailableTeams = () => {
  return [
    {
      name: 'simple-data',
      description: 'Simple data processing team (1 agent, 1 task)',
    },
    {
      name: 'content-creation',
      description: 'Content creation team (2 agents, 2 tasks)',
    },
    {
      name: 'resume-creation',
      description: 'Resume creation team (2 agents, 2 tasks)',
    },
    {
      name: 'sports-news',
      description: 'Sports news team (2 agents, 2 tasks)',
    },
    {
      name: 'trip-planning',
      description: 'Trip planning team (3 agents, 3 tasks)',
    },
    {
      name: 'product-spec',
      description: 'Product specification team (3 agents, 3 tasks)',
    },
  ];
};
