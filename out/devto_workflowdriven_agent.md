# Introducing WorkflowDrivenAgent: Deterministic AI Workflows in KaibanJS

The world of multi-agent AI systems is evolving rapidly, and while LLM-based agents excel at creative problem-solving, there's a growing need for **deterministic, repeatable processes** in production environments. Today, we're excited to introduce the **WorkflowDrivenAgent** in KaibanJS - a game-changing approach that combines the power of structured workflows with seamless multi-agent orchestration.

## What is KaibanJS?

[KaibanJS](https://kaibanjs.com) is a powerful multi-agent framework that enables developers to build sophisticated AI systems with multiple specialized agents working together. Think of it as your **AI team orchestrator** - where each agent has specific roles, tools, and capabilities, all coordinated through an intuitive task-based system.

### Key Features of KaibanJS:

- 🤖 **Multi-Agent Orchestration**: Coordinate multiple AI agents seamlessly
- 🔧 **Tool Integration**: Connect agents with external APIs, databases, and services
- 📊 **Real-time Monitoring**: Track agent performance and workflow execution
- 🔄 **Task Chaining**: Create complex workflows with dependent tasks
- 🎯 **Type Safety**: Full TypeScript support with robust error handling
- 🌐 **Framework Agnostic**: Works with React, Vue, Node.js, and more

## The Problem with Pure LLM Agents

Traditional LLM-based agents (like KaibanJS's `ReactChampionAgent`) are fantastic for tasks requiring creativity and dynamic decision-making. However, they have limitations:

```typescript
// Traditional LLM Agent - Great for creative tasks
const creativAgent = new Agent({
  type: 'ReactChampionAgent',
  name: 'Creative Writer',
  role: 'Content Creator',
  goal: 'Write engaging blog posts',
  background: 'Expert copywriter with 10 years experience',
});
```

**Challenges:**

- ❌ **Non-deterministic**: Same input might produce different outputs
- ❌ **Costly**: Every decision requires LLM calls
- ❌ **Complex debugging**: Hard to trace execution paths
- ❌ **Limited control**: Difficult to enforce specific business logic

## Enter WorkflowDrivenAgent

The `WorkflowDrivenAgent` solves these challenges by executing **predefined workflows** instead of relying on LLM reasoning for every step. It's perfect for structured, repeatable processes while still allowing LLM integration where needed.

### Key Advantages:

- ✅ **Deterministic**: Same input = same output, every time
- ✅ **Cost-effective**: No LLM calls for workflow orchestration
- ✅ **Type-safe**: Full schema validation with Zod
- ✅ **Debuggable**: Clear execution paths and state tracking
- ✅ **Flexible**: Mix deterministic steps with LLM-powered operations

## Basic Implementation

Let's start with a simple example:

```typescript
import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Step 1: Add two numbers
const addStep = createStep({
  id: 'add',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
  execute: async ({ inputData }) => {
    const { a, b } = inputData;
    console.log(`Adding ${a} + ${b}`);
    return a + b;
  },
});

// Step 2: Multiply by original inputs
const multiplyStep = createStep({
  id: 'multiply',
  inputSchema: z.number(),
  outputSchema: z.number(),
  execute: async ({ inputData, getInitData }) => {
    const sum = inputData;
    const { a, b } = getInitData();
    return sum * a * b;
  },
});

// Create the workflow
const mathWorkflow = createWorkflow({
  id: 'math-workflow',
  inputSchema: z.object({ a: z.number(), b: z.number() }),
  outputSchema: z.number(),
});

// Build workflow: add -> multiply
mathWorkflow.then(addStep).then(multiplyStep);
mathWorkflow.commit();

// Create the WorkflowDrivenAgent
const workflowAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Math Processor',
  workflow: mathWorkflow,
});
```

## Advanced Patterns

### 1. Conditional Branching

```typescript
const processStep = createStep({
  id: 'process',
  inputSchema: z.object({ value: z.number() }),
  outputSchema: z.object({ result: z.string(), isPositive: z.boolean() }),
  execute: async ({ inputData }) => {
    const { value } = inputData;
    return {
      result: `Processed: ${value}`,
      isPositive: value > 0,
    };
  },
});

const positiveStep = createStep({
  id: 'positive',
  inputSchema: z.object({ result: z.string(), isPositive: z.boolean() }),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    return `${inputData.result} - This is a positive number!`;
  },
});

const negativeStep = createStep({
  id: 'negative',
  inputSchema: z.object({ result: z.string(), isPositive: z.boolean() }),
  outputSchema: z.string(),
  execute: async ({ inputData }) => {
    return `${inputData.result} - This is a negative number!`;
  },
});

// Conditional workflow
workflow.then(processStep).branch([
  [async ({ inputData }) => inputData.isPositive, positiveStep],
  [async () => true, negativeStep], // fallback
]);
```

### 2. Parallel Processing

```typescript
const workflow = createWorkflow({
  id: 'parallel-processing',
  inputSchema: z.array(z.number()),
  outputSchema: z.array(z.number()),
});

// Process multiple items in parallel with concurrency control
workflow.foreach(processItemStep, { concurrency: 5 });
workflow.commit();
```

### 3. Suspend and Resume

Perfect for workflows requiring human approval:

```typescript
const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({ amount: z.number() }),
  outputSchema: z.object({ approved: z.boolean() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({ reason: z.string() }),
  execute: async ({ inputData, suspend, isResuming, resumeData }) => {
    if (isResuming) {
      return { approved: resumeData.approved };
    }

    if (inputData.amount > 1000) {
      // Suspend for manual approval
      await suspend({ reason: 'requires_manual_approval' });
      return { approved: false };
    }

    return { approved: true };
  },
});
```

## Integrating LLM SDKs in Workflows

One of the most powerful features is the ability to use **any LLM SDK** within workflow steps:

```typescript
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { ChatOpenAI } from '@langchain/openai';

// Step using Vercel AI SDK
const aiAnalysisStep = createStep({
  id: 'ai-analysis',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ analysis: z.string(), confidence: z.number() }),
  execute: async ({ inputData }) => {
    const { text } = await generateText({
      model: createOpenAI()('gpt-4o-mini'),
      prompt: `Analyze this data: ${inputData.data}`,
      temperature: 0.3,
    });

    return {
      analysis: text,
      confidence: 0.85,
    };
  },
});

// Step using LangChain
const langchainStep = createStep({
  id: 'langchain-search',
  inputSchema: z.object({ query: z.string() }),
  outputSchema: z.object({ results: z.string() }),
  execute: async ({ inputData }) => {
    const model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });

    const result = await model.invoke([
      { role: 'user', content: `Search for: ${inputData.query}` },
    ]);

    return { results: result.content };
  },
});
```

## Mixed Teams: Best of Both Worlds

Combine WorkflowDrivenAgent with traditional LLM agents:

```typescript
const team = new Team({
  name: 'Hybrid AI Team',
  agents: [
    // Deterministic data processing
    new Agent({
      type: 'WorkflowDrivenAgent',
      name: 'Data Processor',
      workflow: dataProcessingWorkflow,
    }),
    // Creative analysis
    new Agent({
      type: 'ReactChampionAgent',
      name: 'Creative Analyst',
      role: 'Data Analyst',
      goal: 'Provide creative insights on processed data',
      background: 'Expert in data interpretation and storytelling',
    }),
  ],
  tasks: [
    new Task({
      description: 'Process and validate the input data',
      expectedOutput: 'Clean, validated dataset',
      agent: 'Data Processor',
    }),
    new Task({
      description: 'Generate creative insights from the processed data',
      expectedOutput: 'Strategic recommendations and insights',
      agent: 'Creative Analyst',
    }),
  ],
});

const result = await team.start({ rawData: userData });
```

## Real-World Use Cases

### 1. Data Processing Pipeline

```typescript
// ETL workflow with validation, transformation, and loading
const etlWorkflow = createWorkflow({
  id: 'etl-pipeline',
  inputSchema: z.object({ rawData: z.array(z.any()) }),
  outputSchema: z.object({
    processedRecords: z.number(),
    errors: z.array(z.string()),
  }),
});

etlWorkflow.then(validateDataStep).then(transformDataStep).then(loadDataStep);
```

### 2. Content Moderation

```typescript
// Automated content review with human escalation
const moderationWorkflow = createWorkflow({
  id: 'content-moderation',
  inputSchema: z.object({ content: z.string(), userId: z.string() }),
  outputSchema: z.object({ approved: z.boolean(), reason: z.string() }),
});

moderationWorkflow.then(autoModerationStep).branch([
  [async ({ inputData }) => inputData.confidence > 0.9, approveStep],
  [async () => true, humanReviewStep], // Suspend for human review
]);
```

### 3. Financial Processing

```typescript
// Transaction processing with compliance checks
const transactionWorkflow = createWorkflow({
  id: 'transaction-processing',
  inputSchema: z.object({
    amount: z.number(),
    fromAccount: z.string(),
    toAccount: z.string(),
  }),
  outputSchema: z.object({
    transactionId: z.string(),
    status: z.enum(['completed', 'pending', 'rejected']),
  }),
});

transactionWorkflow
  .then(validateAccountsStep)
  .then(checkBalanceStep)
  .then(complianceCheckStep)
  .branch([
    [async ({ inputData }) => inputData.amount > 10000, manualApprovalStep],
    [async () => true, processTransactionStep],
  ]);
```

## Monitoring and Observability

WorkflowDrivenAgent provides excellent observability:

```typescript
// Real-time monitoring
const run = workflow.createRun();

// Subscribe to workflow events
const unsubscribe = run.watch((event) => {
  console.log('Event:', event.type);
  console.log('Step:', event.payload?.stepId);
  console.log('Status:', event.payload?.stepStatus);
});

// Stream execution for real-time updates
const { stream, getWorkflowState } = run.stream({
  inputData: { query: 'AI trends 2024' },
});

const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  console.log('Live update:', value);
}
```

## Performance Benefits

| Metric             | ReactChampionAgent         | WorkflowDrivenAgent |
| ------------------ | -------------------------- | ------------------- |
| **Execution Time** | Variable (LLM dependent)   | Consistent & Fast   |
| **Cost**           | High (multiple LLM calls)  | Low (deterministic) |
| **Reliability**    | 85-95%                     | 99%+                |
| **Debugging**      | Complex                    | Straightforward     |
| **Scalability**    | Limited by LLM rate limits | High throughput     |

## Getting Started

1. **Install the packages:**

```bash
npm install kaibanjs @kaibanjs/workflow zod
```

2. **Create your first workflow:**

```typescript
import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// Your workflow steps here...
```

3. **Integrate with your existing KaibanJS teams:**

```typescript
const team = new Team({
  name: 'My Hybrid Team',
  agents: [workflowAgent, llmAgent],
  tasks: [workflowTask, analysisTask],
});
```

## When to Use Each Agent Type

### Use WorkflowDrivenAgent for:

- ✅ Data processing pipelines
- ✅ Business rule enforcement
- ✅ API orchestration
- ✅ Compliance workflows
- ✅ Batch processing
- ✅ Deterministic calculations

### Use ReactChampionAgent for:

- ✅ Creative content generation
- ✅ Dynamic problem-solving
- ✅ Natural language understanding
- ✅ Adaptive decision-making
- ✅ Research and analysis
- ✅ Customer interaction

## Conclusion

The WorkflowDrivenAgent represents a significant evolution in multi-agent AI systems. By combining the **reliability of deterministic workflows** with the **flexibility of LLM integration**, KaibanJS now offers the best of both worlds.

Whether you're building data processing pipelines, content moderation systems, or complex business workflows, the WorkflowDrivenAgent provides the **predictability, performance, and maintainability** that production systems demand.

Ready to build more reliable AI systems? Check out the [KaibanJS documentation](https://docs.kaibanjs.com) and start experimenting with WorkflowDrivenAgent today!

---

**Resources:**

- 📚 [KaibanJS Documentation](https://docs.kaibanjs.com)
- 🔧 [WorkflowDrivenAgent Guide](https://docs.kaibanjs.com/how-to/Using-WorkflowDrivenAgent)
- 💻 [GitHub Repository](https://github.com/kaiban-ai/KaibanJS)
- 🌐 [Official Website](https://kaibanjs.com)

_What workflows will you build with WorkflowDrivenAgent? Share your use cases in the comments below!_
