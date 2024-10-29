import { Agent, Task, Team } from 'kaibanjs';
import { ChatOllama } from "@langchain/ollama";


const llmInstance = new ChatOllama({
  model: "llama3.2:3b",
  temperature: 0,
  maxRetries: 2,
});

// Define agents
const requirementsAnalyst = new Agent({
  name: 'Emma',
  role: '需求分析师',
  goal: '根据创始人的意见，概述新功能的核心功能和目标。',
  contexts: "用户画像信息, 用户名字: Mikey",
  background: '商业分析',
  llmInstance: llmInstance
});

const technicalWriter = new Agent({
  name: 'Lucas',
  role: '技术作家',
  goal: '将功能大纲转换为详细的技术规范。',
  contexts: "用户画像信息, 用户名字: Mikey",
  background: '技术写作',
  llmInstance: llmInstance

});

const validator = new Agent({
  name: 'Mia',
  role: '验证专家',
  goal: '确保规格准确完整。',
  contexts: "用户画像信息, 用户名字: Mikey",
  background: '质量保证',
  llmInstance: llmInstance
});

// Define tasks
const analysisTask = new Task({
  description: `分析创始人的想法：{founderIdea} 并概述实现它所需的功能。`,
  expectedOutput: '创始人理念的职能大纲',
  agent: requirementsAnalyst
});

const writingTask = new Task({
  description: `根据提供的功能大纲创建详细的技术规范。包括用户故事、系统需求和验收标准。`,
  expectedOutput: '一份详细的技术规格文档。',
  isDeliverable: true,
  agent: technicalWriter
});

const validationTask = new Task({
  description: `审查技术规格以确保它们与创始人的愿景相符且技术上可行。`,
  expectedOutput: '一个经过验证的技术规范文档，已准备好开发。必须以Markdown格式。',
  agent: validator
});

// Create a team
const team = new Team({
  name: '产品规格团队',
  agents: [requirementsAnalyst, technicalWriter, validator],
  tasks: [analysisTask, writingTask, validationTask],
  inputs: { founderIdea: '我想为我们家的SAAS平台添加一个推荐计划。' },  // Initial input for the first task
});

export default team;
