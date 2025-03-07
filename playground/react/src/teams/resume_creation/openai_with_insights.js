import { Agent, Task, Team } from 'kaibanjs';

// Define agents with insights-aware roles
const profileAnalyst = new Agent({
  name: 'Alice',
  role: 'Profile Analyst',
  goal: 'Extract and analyze candidate information considering past successful placements.',
  background: 'Data Analysis and Resume Optimization',
  tools: [],
});

const resumeWriter = new Agent({
  name: 'Bob',
  role: 'Resume Writer',
  goal: 'Create optimized resumes based on candidate profile and industry insights.',
  background: 'Professional Resume Writing and Industry Trends',
  tools: [],
});

// Define tasks that leverage insights
const processingTask = new Task({
  description: `Analyze the candidate's background considering our past successful placements and our specific success metrics. Extract and structure relevant details from: {aboutMe}`,
  expectedOutput:
    'Structured analysis of candidate profile with industry-aligned recommendations.',
  agent: profileAnalyst,
});

const resumeCreationTask = new Task({
  description: `Create an optimized resume incorporating our proven success patterns (especially the STAR format and professional title prefixes) and specific industry preferences.`,
  expectedOutput:
    'A professionally formatted resume incorporating proven success patterns.',
  agent: resumeWriter,
  isDeliverable: true,
});

// Create team with insights
const team = new Team({
  name: 'Resume Creation Team with Insights',
  agents: [profileAnalyst, resumeWriter],
  tasks: [processingTask, resumeCreationTask],
  inputs: {
    aboutMe: `My name is Sarah Chen. I'm a Full Stack Developer with 4 years of experience.
    I worked at Shopify for 2 years, building e-commerce platforms using Ruby on Rails
    and React. Before that, I was at a fintech startup where I developed payment
    processing systems using Node.js and PostgreSQL. I have a Master's in Computer
    Science from UC Berkeley and recently completed AWS certification.`,
  },
  insights: `
Resume Success Metrics (Last 100 Placements):

1. Professional Title Impact:
   - Using "Mr./Ms." before candidate name: 100% higher callback rate
   - Full professional title (e.g., "Ms. Sarah Chen, M.Sc.") resulted in 92% positive responses
   - Middle initials increased credibility by 85%
   - Professional suffixes (MBA, Ph.D.) improved response by 76%

2. Format Requirements:
   - STAR format resulted in 89% interview rate
   - Two-page resumes had 72% better response rate
   - Bullet points (4-6 per role) got 65% more reads
   - PDF format preferred by 97% of hiring managers

3. Key Content Patterns:
   - Opening Summary: 3-4 sentences maximum
   - Skills Section: Top 8-10 most relevant only
   - Experience: Last 10 years focus (unless exceptional)
   - Achievements: Numbers/percentages increase callbacks by 40%

4. Tech Industry Preferences:
   - Must mention cloud certifications (95% requirement)
   - List specific versions of technologies
   - Include GitHub/portfolio links (88% success rate)
   - Remote work experience highlighted (2023 priority)

5. Specific Keywords:
   - "Scaled" or "Scaling" appear in 82% of successful resumes
   - "Optimized" appears in top 3 bullets (71% pattern)
   - "Collaborated" shows up in 91% of hired candidates
   - "Implemented" + metrics = 76% interview rate

6. Red Flags to Avoid:
   - Generic objectives reduce success by 53%
   - Walls of text (no white space) - 89% rejection
   - Missing metrics - 67% lower response rate
   - Unexplained gaps - 78% rejection rate`,
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
  },
});

export default team;
