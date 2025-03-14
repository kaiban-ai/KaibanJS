import { Agent, Task, Team } from 'kaibanjs';

const blockingAgent = new Agent({
  name: 'Security Validator',
  role: 'Security Clearance Checker',
  goal: 'Validate security requirements and block tasks that lack proper authorization',
  background: 'Expert in security protocols and access control management',
  tools: [],
  kanbanTools: ['block-task-tool'],
});

const securityTask = new Task({
  description: `This task after the agent has checked the security clearance, should be blocked because the agent does not have the required clearance.`,
  expectedOutput:
    'Use the block_task tool to block the task with a clear explanation of why you cannot proceed.',
  agent: blockingAgent,
});

const team = new Team({
  name: 'Security Validation Team',
  agents: [blockingAgent],
  tasks: [securityTask],
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export default team;
