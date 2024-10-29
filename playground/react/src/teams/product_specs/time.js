import { Agent, Task, Team } from 'kaibanjs';
import { ChatOllama } from "@langchain/ollama";


const llmInstance = new ChatOllama({
  model: "aya-expanse",
  temperature: 0,
  maxRetries: 2,
});


const contexts = `
用户画像：Mikey
1.	职业背景：
•	Mikey是一名程序员，对编程和游戏充满兴趣，目标是成为一名优秀的编程专家。
•	当前在专注于任务助手系统的设计，尤其是在用户输入信息的提取和任务流管理上投入了大量精力。
•	Mikey的工作涉及电子商务和广告系统的设计，并对数据存储和处理（如Hadoop和Neo4j）有深入研究。
2.	项目经验：
•	Prompt设计：正在设计与信息提取和流执行系统相关的prompt，注重于提高prompt的准确性和效果。
•	多节点任务流：开发了基于条件的任务流管理系统，并使用多代理系统协调任务，依赖于Cypher查询和elementid功能来管理数据流。
•	广告和点击数据：涉及一个广告分发系统，该系统基于点击数据和时区调整来实现精准的目标分配。
•	日历组件：正在使用React中的DayPicker库来实现单行日历显示。
3.	技术偏好：
•	编程语言：主要使用Python和Node.js，近期研究了BM25等排名算法的实现。
•	Git工作流程：采用dev和release分支的分支管理，利用rebase将dev合并到release_next以保持代码的最新状态。
•	偏爱连贯的链式推理法，通过多步骤分析确保问题的彻底解决。
4.	个人偏好：
•	代码输出偏好：偏爱完整的代码模板，无占位符。
•	喜欢在回复内容中使用<output></output>标签。
•	用户体验要求高，注重系统的响应速度和准确性。

5. 工作习惯
* 擅长处理各种技术问题，并能快速找到解决方案。
* 对各种小任务都可以在短时间内处理掉,平常一个任务处理时间在2小时以内。
`;

const requirementsAnalyst = new Agent({
  name: '工时估算专家',
  role: '工时估算专家',
  goal: '提供准确的工时估算和建议',
  background: '具备丰富的项目经验和估算技能',
  contexts: contexts,
  maxIterations: 3,
  // promptTemplates: customPrompts,
  llmInstance
});

const analystManager = new Agent({
  name: '建议分析专家',
  role: '建议分析专家',
  goal: '对工时估算专家的估算进行分析，并给出建议',
  background: '具备丰富的项目经验和分析技能',
  contexts: contexts,
  maxIterations: 3,
  // promptTemplates: customPrompts,
  llmInstance
});
const requirementsAnalysisTask = new Task({
  description: '对任务[{founderIdea}]进行分析，进行技术评估并估算工时',
  expectedOutput: '分析任务, 给出估算工时',
  agent: requirementsAnalyst,
});

const technicalEstimationTask = new Task({
  description: '根据[{founderIdea}] 进行分析,给出建议',
  expectedOutput: '分析任务, 给出建议',
  agent: analystManager,
});


const team = new Team({
  name: '工时估算团队',  // 团队的名称
  agents: [requirementsAnalyst, analystManager],  // 包含的代理
  tasks: [requirementsAnalysisTask, technicalEstimationTask],  // 需要执行的任务
  inputs: { founderIdea: '把今天有问题的站点上线了' },  // 初始输入，通常是项目的背景或初步想法
});


export default team;
