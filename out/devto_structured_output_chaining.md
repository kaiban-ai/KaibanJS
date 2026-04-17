# Structured Output Chaining in KaibanJS: Bridging LLM and Workflow Agents

When building production AI systems, you often need the best of both worlds: **the creativity and adaptability of LLM-based agents** combined with **the reliability and determinism of structured workflows**. KaibanJS's structured output chaining feature makes this seamless.

In this article, we'll explore how to chain `ReactChampionAgent` (LLM-powered) with `WorkflowDrivenAgent` (workflow-based) to build robust AI systems using a real-world product review analysis use case.

## The Challenge: Combining LLM and Deterministic Processing

Modern AI applications frequently require:

1. **LLM-powered analysis** to extract insights from unstructured data
2. **Deterministic processing** to validate, transform, and aggregate that data
3. **Type-safe data flow** between these different processing stages

Traditional approaches require manual data transformation, error-prone mappings, and brittle integration points. KaibanJS solves this with **automatic structured output chaining**.

## What is Structured Output Chaining?

Structured output chaining automatically passes validated, schema-constrained outputs from one agent to another within a team. When a `ReactChampionAgent` task has an `outputSchema` that matches a `WorkflowDrivenAgent` workflow's `inputSchema`, the system handles the data transfer seamlessly.

### Key Benefits:

- ✅ **Type Safety**: Full end-to-end validation with Zod schemas
- ✅ **Zero Configuration**: Automatic detection and mapping
- ✅ **Error Prevention**: Schema validation catches mismatches early
- ✅ **Developer Experience**: Write clean, declarative code

## Real-World Example: Product Review Analysis

Let's build a complete review analysis system that:

1. Processes raw reviews using a deterministic workflow
2. Analyzes sentiment using an LLM agent
3. Generates business insights using another LLM agent

### Step 1: Define Review Schemas

First, we establish our data structures using Zod:

```javascript
import { z } from 'zod';

const reviewSchema = z.object({
  product: z.string(),
  rating: z.number().min(1).max(5),
  text: z.string().min(1),
  date: z.string().optional(),
  author: z.string().optional(),
});

const processedDataSchema = z.object({
  metrics: z.object({
    averageRating: z.number(),
    ratingDistribution: z.object({
      1: z.number(),
      2: z.number(),
      3: z.number(),
      4: z.number(),
      5: z.number(),
    }),
    totalReviews: z.number(),
    validReviews: z.number(),
    invalidReviews: z.number(),
    averageTextLength: z.number(),
    commonKeywords: z.array(
      z.object({
        word: z.string(),
        count: z.number(),
      })
    ),
  }),
  reviews: z.array(reviewSchema),
  summary: z.string(),
});
```

### Step 2: Create Workflow-Driven Review Processor

The `WorkflowDrivenAgent` handles deterministic data processing:

```javascript
import { Agent, Task } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';

// Validation step
const validateReviewsStep = createStep({
  id: 'validate-reviews',
  inputSchema: z.object({
    reviews: z.array(reviewSchema),
  }),
  outputSchema: z.object({
    validReviews: z.array(reviewSchema),
    invalidReviews: z.array(
      z.object({
        review: z.any(),
        errors: z.array(z.string()),
      })
    ),
    totalCount: z.number(),
    validCount: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { reviews } = inputData;
    const validReviews = [];
    const invalidReviews = [];

    reviews.forEach((review) => {
      const result = reviewSchema.safeParse(review);
      if (result.success) {
        validReviews.push(result.data);
      } else {
        invalidReviews.push({
          review,
          errors: result.error.errors.map(
            (e) => `${e.path.join('.')}: ${e.message}`
          ),
        });
      }
    });

    return {
      validReviews,
      invalidReviews,
      totalCount: reviews.length,
      validCount: validReviews.length,
    };
  },
});

// Metrics extraction step
const extractMetricsStep = createStep({
  id: 'extract-metrics',
  inputSchema: z.object({
    validReviews: z.array(reviewSchema),
    invalidReviews: z.array(z.any()),
    totalCount: z.number(),
    validCount: z.number(),
  }),
  outputSchema: z.object({
    metrics: z.object({
      averageRating: z.number(),
      ratingDistribution: z.object({
        1: z.number(),
        2: z.number(),
        3: z.number(),
        4: z.number(),
        5: z.number(),
      }),
      totalReviews: z.number(),
      validReviews: z.number(),
      invalidReviews: z.number(),
      averageTextLength: z.number(),
      commonKeywords: z.array(
        z.object({
          word: z.string(),
          count: z.number(),
        })
      ),
    }),
    validReviews: z.array(reviewSchema),
  }),
  execute: async ({ inputData }) => {
    const { validReviews, invalidReviews, totalCount, validCount } = inputData;

    // Calculate metrics
    const totalRating = validReviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = validCount > 0 ? totalRating / validCount : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    validReviews.forEach((review) => {
      ratingDistribution[review.rating.toString()]++;
    });

    const totalTextLength = validReviews.reduce(
      (sum, review) => sum + review.text.length,
      0
    );
    const averageTextLength = validCount > 0 ? totalTextLength / validCount : 0;

    // Extract keywords
    const wordCount = {};
    validReviews.forEach((review) => {
      const words = review.text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((word) => word.length > 3);
      words.forEach((word) => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    const commonKeywords = Object.entries(wordCount)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      metrics: {
        averageRating: Math.round(averageRating * 100) / 100,
        ratingDistribution,
        totalReviews: totalCount,
        validReviews: validCount,
        invalidReviews: invalidReviews.length,
        averageTextLength: Math.round(averageTextLength),
        commonKeywords,
      },
      validReviews,
    };
  },
});

// Data aggregation step
const aggregateDataStep = createStep({
  id: 'aggregate-data',
  inputSchema: z.object({
    metrics: z.object({
      averageRating: z.number(),
      ratingDistribution: z.object({
        1: z.number(),
        2: z.number(),
        3: z.number(),
        4: z.number(),
        5: z.number(),
      }),
      totalReviews: z.number(),
      validReviews: z.number(),
      invalidReviews: z.number(),
      averageTextLength: z.number(),
      commonKeywords: z.array(
        z.object({
          word: z.string(),
          count: z.number(),
        })
      ),
    }),
    validReviews: z.array(reviewSchema),
  }),
  outputSchema: processedDataSchema,
  execute: async ({ inputData }) => {
    const { metrics, validReviews } = inputData;

    const summary = `Processed ${metrics.validReviews} valid reviews out of ${
      metrics.totalReviews
    } total. 
Average rating: ${metrics.averageRating}/5. 
Rating distribution: ${metrics.ratingDistribution['5']} five-star, ${
      metrics.ratingDistribution['4']
    } four-star, ${metrics.ratingDistribution['3']} three-star, ${
      metrics.ratingDistribution['2']
    } two-star, ${metrics.ratingDistribution['1']} one-star reviews.
Average review length: ${metrics.averageTextLength} characters.
Top keywords: ${metrics.commonKeywords
      .slice(0, 5)
      .map((k) => k.word)
      .join(', ')}.`;

    return {
      processedData: {
        metrics,
        reviews: validReviews,
        summary,
      },
    };
  },
});

// Create and configure the workflow
const reviewProcessingWorkflow = createWorkflow({
  id: 'review-processing-workflow',
  inputSchema: z.object({
    reviews: z.array(reviewSchema),
  }),
  outputSchema: processedDataSchema,
});

reviewProcessingWorkflow
  .then(validateReviewsStep)
  .then(extractMetricsStep)
  .then(aggregateDataStep);
reviewProcessingWorkflow.commit();

// Create the workflow-driven agent
const reviewProcessorAgent = new Agent({
  name: 'Review Processor',
  type: 'WorkflowDrivenAgent',
  workflow: reviewProcessingWorkflow,
});
```

### Step 3: Create LLM Agents with Structured Outputs

Now we create LLM agents that receive the processed data and generate insights:

```javascript
// Sentiment analyzer with structured output expectation
const sentimentAnalyzerAgent = new Agent({
  name: 'Sentiment Analyzer',
  role: 'Sentiment Analysis Expert',
  goal: 'Analyze sentiment, themes, and patterns in product reviews',
  background:
    'Expert in natural language processing, sentiment analysis, and identifying patterns in customer feedback.',
  type: 'ReactChampionAgent',
  tools: [],
});

// Insights generator
const insightsGeneratorAgent = new Agent({
  name: 'Insights Generator',
  role: 'Business Insights Expert',
  goal: 'Generate actionable insights and recommendations based on review analysis',
  background:
    'Expert in business analysis and strategic recommendations. Specialized in translating customer feedback into actionable business insights.',
  type: 'ReactChampionAgent',
  tools: [],
});
```

### Step 4: Define Tasks with Schema Chaining

Here's where the magic happens - we define tasks that automatically chain:

```javascript
// Task 1: Process reviews (WorkflowDrivenAgent)
const processReviewsTask = new Task({
  description:
    'Process and analyze the product reviews: {reviews}. Extract metrics, validate data, and calculate statistics.',
  expectedOutput:
    'Structured metrics including average rating, rating distribution, common keywords, and processed review data',
  agent: reviewProcessorAgent,
});

// Task 2: Analyze sentiment (ReactChampionAgent)
// This automatically receives processedData from Task 1
const analyzeSentimentTask = new Task({
  description: `Analyze the sentiment and themes in the processed reviews. 
    Focus on:
    - Overall sentiment trends (positive, negative, neutral)
    - Main themes and topics mentioned by customers
    - Common pain points and complaints
    - Positive aspects and strengths highlighted
    - Emotional patterns across different rating levels
    
    Use the processed metrics and review data to provide comprehensive sentiment analysis.`,
  expectedOutput:
    'Detailed sentiment analysis with themes, pain points, strengths, and emotional patterns identified in the reviews',
  agent: sentimentAnalyzerAgent,
});

// Task 3: Generate insights (ReactChampionAgent)
// This automatically receives outputs from both Task 1 and Task 2
const generateInsightsTask = new Task({
  description: `Generate actionable business insights and recommendations based on the review metrics and sentiment analysis.
    Provide:
    - Key findings and trends
    - Priority areas for improvement
    - Strengths to leverage
    - Specific actionable recommendations
    - Strategic suggestions for product development and customer satisfaction`,
  expectedOutput:
    'Comprehensive business insights with actionable recommendations and strategic suggestions for product improvement',
  agent: insightsGeneratorAgent,
});
```

### Step 5: Assemble the Team

Put it all together:

```javascript
import { Team } from 'kaibanjs';

const team = new Team({
  name: 'Product Reviews Analysis Team',
  agents: [
    reviewProcessorAgent,
    sentimentAnalyzerAgent,
    insightsGeneratorAgent,
  ],
  tasks: [processReviewsTask, analyzeSentimentTask, generateInsightsTask],
  inputs: {
    reviews: [
      {
        product: 'Smartphone XYZ Pro',
        rating: 5,
        text: 'Excellent product, very fast and great battery life. The camera is impressive and the screen looks incredible.',
        date: '2024-01-15',
        author: 'John P.',
      },
      // ... more reviews
    ],
  },
  env: { OPENAI_API_KEY: process.env.OPENAI_API_KEY },
});

// Execute the team
const result = await team.start();
```

## How Schema Chaining Works

The automatic chaining happens through KaibanJS's task result system:

1. **Task 1 completes**: The `WorkflowDrivenAgent` processes reviews and returns structured data matching `processedDataSchema`.

2. **Automatic extraction**: The system extracts the result from Task 1 and stores it in the task store.

3. **Task 2 receives data**: When Task 2 (sentiment analysis) executes, it automatically receives Task 1's output as part of its context.

4. **Type-safe access**: The LLM in Task 2 can access the structured data via task result interpolation in the description.

5. **Task 3 receives multiple results**: Task 3 automatically receives results from both previous tasks.

### Visual Flow:

```
┌─────────────────────────────────────┐
│ Task 1: Process Reviews             │
│ Agent: WorkflowDrivenAgent          │
│ ─────────────────────────────────── │
│ Input: { reviews: [...] }           │
│ Output: { processedData: {...} }    │
└──────────────┬──────────────────────┘
               │
               │ ═══════════════════════
               │ AUTOMATIC SCHEMA CHAIN
               │ ═══════════════════════
               ▼
┌─────────────────────────────────────┐
│ Task 2: Analyze Sentiment           │
│ Agent: ReactChampionAgent           │
│ ─────────────────────────────────── │
│ Input: Task 1 result (auto-injected)│
│ Output: Sentiment analysis          │
└──────────────┬──────────────────────┘
               │
               │ ═══════════════════════
               │ MULTIPLE RESULTS CHAIN
               │ ═══════════════════════
               ▼
┌─────────────────────────────────────┐
│ Task 3: Generate Insights           │
│ Agent: ReactChampionAgent           │
│ ─────────────────────────────────── │
│ Input: Task 1 + Task 2 results      │
│ Output: Business insights           │
└─────────────────────────────────────┘
```

## Advanced: Explicit Schema Matching

For even more control, you can use explicit `outputSchema` on LLM tasks:

```javascript
const sentimentSchema = z.object({
  overallSentiment: z.enum(['positive', 'neutral', 'negative']),
  themes: z.array(z.string()),
  painPoints: z.array(z.string()),
  strengths: z.array(z.string()),
  emotionalPatterns: z.record(z.string(), z.string()),
});

const analyzeSentimentTask = new Task({
  description: 'Analyze sentiment in reviews...',
  outputSchema: sentimentSchema, // Explicit output schema
  agent: sentimentAnalyzerAgent,
});

// Now you can create a workflow that expects sentimentSchema
const insightsWorkflow = createWorkflow({
  id: 'insights-workflow',
  inputSchema: sentimentSchema, // Matches Task 2's outputSchema
  // ... workflow steps
});
```

When schemas match, KaibanJS automatically passes the data at the root level. If they don't match, the data is still available but nested under the task ID.

## Best Practices

1. **Use descriptive schemas**: Make your Zod schemas clear and well-documented
2. **Validate early**: Let schema validation catch errors before they propagate
3. **Keep schemas reusable**: Define common schemas once and import them
4. **Document dependencies**: Make task dependencies clear in descriptions
5. **Test workflows independently**: Ensure workflows work in isolation before chaining

## Conclusion

Structured output chaining in KaibanJS provides a powerful way to combine the flexibility of LLM agents with the reliability of deterministic workflows. By leveraging automatic schema-based data passing, you can build robust AI systems that are both powerful and maintainable.

The key advantages:

- **No manual data mapping** - The system handles it automatically
- **Type safety** - Zod schemas ensure data integrity
- **Better debugging** - Clear data flow and validation points
- **Production ready** - Deterministic workflows ensure consistency

Ready to build your own chained agent system? Check out the [KaibanJS documentation](https://docs.kaibanjs.com) and try the [live example](https://www.kaibanjs.com/examples/workflow-driven-review-analysis).

---

**Resources:**

- [KaibanJS Documentation](https://docs.kaibanjs.com)
- [WorkflowDrivenAgent Guide](https://docs.kaibanjs.com/how-to/Using-WorkflowDrivenAgent)
- [GitHub Repository](https://github.com/anthonydevs/KaibanJS)
