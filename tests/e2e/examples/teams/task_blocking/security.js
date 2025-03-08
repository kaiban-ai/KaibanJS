const { Agent, Task, Team } = require('kaibanjs');

const securityAgent = new Agent({
  name: 'Security Validator',
  role: 'Security Clearance Checker',
  goal: 'Validate security requirements and block tasks that lack proper authorization',
  background: 'Expert in security protocols and access control management',
  tools: [],
  kanbanTools: ['block-task-tool'],
});

const securityTask = new Task({
  description: `You are tasked with reviewing a request to access highly sensitive data. 
  The request lacks proper authorization credentials and security clearance documentation.
  As a security validator, you must assess this situation and take appropriate action.
  
  Given the missing security credentials, you should block this task using the block_task tool
  and provide a clear explanation of why access cannot be granted.`,
  agent: securityAgent,
});

const team = new Team({
  name: 'Security Validation Team',
  agents: [securityAgent],
  tasks: [securityTask],
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
});

module.exports = team;
