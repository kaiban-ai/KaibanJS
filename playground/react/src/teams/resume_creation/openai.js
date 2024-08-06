import { Agent, Task, Team } from 'agenticjs';

// Define agents
const profileAnalyst = new Agent({
    name: 'Ivy', 
    role: 'Profile Analyst', 
    goal: 'Extract structured information from conversational user input.', 
    background: 'Data Processor',
    tools: []  // Tools are omitted for now
});

const formatter = new Agent({
    name: 'Formy', 
    role: 'Formatter', 
    goal: 'Format structured information into a professional resume.', 
    background: 'Document Formatter',
    tools: []
});

const reviewer = new Agent({
    name: 'Revy', 
    role: 'Reviewer', 
    goal: 'Review and polish the final resume.', 
    background: 'Quality Assurance Specialist',
    tools: []
});

// Define tasks
const processingTask = new Task({ 
  description: `Extract relevant details such as name, experience, skills, and job history from the user's 'aboutMe' input. 
  aboutMe: {aboutMe}`,
  expectedOutput: 'Structured data ready for formatting.', 
  agent: profileAnalyst
});

const formattingTask = new Task({ 
    description: `Use the extracted information to create a clean, professional resume layout tailored for a JavaScript Developer.`,
    expectedOutput: 'A well-formatted resume in PDF format.', 
    agent: formatter 
});

const reviewTask = new Task({ 
    description: `Ensure the resume is error-free, engaging, and meets professional standards.`,
    expectedOutput: 'A polished, final resume ready for job applications.', 
    agent: reviewer 
});

// Create a team
const team = new Team({
  name: 'Resume Creation Team',
  agents: [profileAnalyst, formatter, reviewer],
  tasks: [processingTask, formattingTask, reviewTask],
  inputs: { aboutMe: 'My name is Will, I have been a Javascript Developer for 3 years. I know React, NextJS, and REDUX. My latest job was as a Junior Developer at Disney creating UIs for the main landing page.' },  // Initial input for the first task
});

export default team;