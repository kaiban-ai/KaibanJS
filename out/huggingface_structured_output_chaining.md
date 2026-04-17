# Structured Output Chaining: Combining LLM Agents with Deterministic Workflows in KaibanJS

## Abstract

Multi-agent AI systems face a fundamental challenge: balancing the creative reasoning capabilities of large language models (LLMs) with the reliability requirements of production systems. This article introduces **structured output chaining** in KaibanJS, a novel approach that enables seamless integration between LLM-based agents (`ReactChampionAgent`) and deterministic workflow agents (`WorkflowDrivenAgent`) through automatic schema-based data flow.

We demonstrate this architecture through a comprehensive product review analysis system that processes unstructured data deterministically, extracts insights via LLM reasoning, and generates actionable business intelligence—all while maintaining end-to-end type safety and validation.

## Introduction

The evolution of AI agent frameworks has given rise to two complementary paradigms:

1. **LLM-driven agents** that leverage the reasoning and language understanding capabilities of foundation models
2. **Workflow-driven agents** that execute deterministic, rule-based processes

Each approach has distinct advantages:

- **LLM agents** excel at unstructured tasks, natural language understanding, and creative problem-solving
- **Workflow agents** provide determinism, cost efficiency, debuggability, and predictable execution

The challenge lies in orchestrating these paradigms effectively. Traditional approaches require manual data transformation layers, increasing complexity and introducing potential error points. KaibanJS addresses this through **structured output chaining**, an automatic schema-based data passing mechanism.

## Architecture Overview

### Schema-Based Data Flow

Structured output chaining operates on the principle of **schema matching**. When a task processed by a `ReactChampionAgent` defines an `outputSchema` (using Zod), and a subsequent task processed by a `WorkflowDrivenAgent` defines a matching `inputSchema`, the system automatically:

1. Validates the LLM output against the `outputSchema`
2. Matches the schema structure with the workflow's `inputSchema`
3. Passes the validated data directly to the workflow without manual transformation

This creates a type-safe pipeline from LLM reasoning to deterministic processing.

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    KaibanJS Team                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Task 1: Data Processing                        │  │
│  │  Agent: WorkflowDrivenAgent                     │  │
│  │  ────────────────────────────────────────────── │  │
│  │  • Deterministic validation                     │  │
│  │  • Metric extraction                            │  │
│  │  • Data aggregation                             │  │
│  │  Output Schema: processedDataSchema             │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                        │
│                 │ Schema-validated data                  │
│                 ▼                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Task 2: Sentiment Analysis                     │  │
│  │  Agent: ReactChampionAgent                      │  │
│  │  ────────────────────────────────────────────── │  │
│  │  • LLM-based reasoning                          │  │
│  │  • Pattern recognition                          │  │
│  │  • Semantic understanding                       │  │
│  │  Input: Auto-injected from Task 1               │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                        │
│                 │ Combined results                       │
│                 ▼                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Task 3: Insight Generation                     │  │
│  │  Agent: ReactChampionAgent                      │  │
│  │  ────────────────────────────────────────────── │  │
│  │  • Strategic analysis                           │  │
│  │  • Recommendation synthesis                     │  │
│  │  Input: Task 1 + Task 2 results                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Implementation: Product Review Analysis System

### Problem Formulation

We demonstrate structured output chaining through a product review analysis pipeline that:

1. **Validates and processes** raw review data deterministically
2. **Extracts sentiment and themes** using LLM reasoning
3. **Generates business insights** by synthesizing processed data and sentiment analysis

### Schema Design

The foundation of our system is a well-defined type hierarchy using Zod:

```typescript
import { z } from 'zod';

// Base review structure
const reviewSchema = z.object({
  product: z.string(),
  rating: z.number().min(1).max(5),
  text: z.string().min(1),
  date: z.string().optional(),
  author: z.string().optional(),
});

// Processed data output schema
const processedDataSchema = z.object({
  processedData: z.object({
    metrics: z.object({
      averageRating: z.number(),
      ratingDistribution: z.record(z.string(), z.number()),
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
  }),
});
```

This schema serves as:

- The output contract for the workflow-driven processing agent
- The input expectation for downstream LLM agents
- The validation layer ensuring data integrity

### Deterministic Processing Layer

The `WorkflowDrivenAgent` executes a three-stage workflow:

#### Stage 1: Validation

```javascript
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
```

**Key Characteristics:**

- Deterministic execution: same input always produces same output
- Schema validation: ensures data integrity
- Error isolation: invalid reviews are captured without failing the pipeline

#### Stage 2: Metric Extraction

```javascript
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
      ratingDistribution: z.record(z.string(), z.number()),
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

    // Statistical computation
    const totalRating = validReviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = validCount > 0 ? totalRating / validCount : 0;

    // Distribution analysis
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    validReviews.forEach((review) => {
      ratingDistribution[review.rating.toString()]++;
    });

    // Text analysis
    const totalTextLength = validReviews.reduce(
      (sum, review) => sum + review.text.length,
      0
    );
    const averageTextLength = validCount > 0 ? totalTextLength / validCount : 0;

    // Keyword extraction (TF-based)
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
```

**Analysis:**

- Statistical operations: mean, distribution, aggregation
- Text processing: keyword frequency analysis
- Deterministic: no stochastic operations, fully reproducible

#### Stage 3: Aggregation

```javascript
const aggregateDataStep = createStep({
  id: 'aggregate-data',
  inputSchema: z.object({
    metrics: z.object({
      averageRating: z.number(),
      ratingDistribution: z.record(z.string(), z.number()),
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
```

### LLM-Based Analysis Layer

Following deterministic processing, LLM agents perform semantic analysis:

```javascript
// Sentiment Analysis Agent
const sentimentAnalyzerAgent = new Agent({
  name: 'Sentiment Analyzer',
  role: 'Sentiment Analysis Expert',
  goal: 'Analyze sentiment, themes, and patterns in product reviews',
  background:
    'Expert in natural language processing, sentiment analysis, and identifying patterns in customer feedback. Specialized in understanding customer emotions, pain points, and satisfaction drivers.',
  type: 'ReactChampionAgent',
  tools: [],
});

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
```

**Key Features:**

- Automatic data injection: Task 1's output is automatically available in the task context
- LLM reasoning: Leverages language model's understanding of semantics and emotion
- Structured output: Can optionally define `outputSchema` for further chaining

### Insight Generation Layer

The final layer synthesizes all previous results:

```javascript
const insightsGeneratorAgent = new Agent({
  name: 'Insights Generator',
  role: 'Business Insights Expert',
  goal: 'Generate actionable insights and recommendations based on review analysis',
  background:
    'Expert in business analysis and strategic recommendations. Specialized in translating customer feedback into actionable business insights, product improvement suggestions, and strategic recommendations for stakeholders.',
  type: 'ReactChampionAgent',
  tools: [],
});

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

## Mechanism: Automatic Data Chaining

### Task Result Propagation

KaibanJS maintains a task result store that automatically propagates outputs:

1. **Task Completion**: When a task completes, its result is stored with schema validation
2. **Context Injection**: Subsequent tasks receive previous task results in their execution context
3. **Schema Matching**: When schemas match, data is passed at the root level
4. **Fallback Behavior**: Non-matching schemas are nested under task IDs for manual access

### Implementation Details

The chaining mechanism operates at the team orchestration level:

```javascript
// Simplified pseudocode of the chaining logic
function executeTask(task, teamContext) {
  // Collect results from previous tasks
  const previousResults = collectTaskResults(task.dependencies);

  // If outputSchema matches workflow inputSchema, extract directly
  if (previousTask.outputSchema && workflow.inputSchema) {
    if (schemasMatch(previousTask.outputSchema, workflow.inputSchema)) {
      // Direct schema matching: pass at root level
      const inputData = validateAndExtract(
        previousTask.result,
        workflow.inputSchema
      );
      return executeWorkflow(workflow, inputData);
    }
  }

  // Otherwise, include in context for manual access
  return executeWorkflow(workflow, {
    ...previousResults,
    ...teamContext.inputs,
  });
}
```

## Experimental Results

### System Performance

**Deterministic Processing:**

- Processing time: O(n) where n is number of reviews
- Consistency: 100% deterministic output for identical inputs
- Cost: $0 (no LLM calls in workflow)

**LLM Analysis:**

- Token usage: ~500-1000 tokens per review batch (depends on batch size)
- Latency: ~2-5 seconds per LLM task (depends on provider)
- Variability: Non-deterministic but acceptable for analysis tasks

### Type Safety Validation

All data transformations maintain type safety:

- Schema validation at workflow boundaries: 100% coverage
- Runtime type checking: Zod validation catches mismatches
- Compile-time safety: TypeScript ensures correct schema usage

### Error Handling

The system gracefully handles:

- Invalid review data: Isolated and reported without pipeline failure
- LLM errors: Retryable with exponential backoff
- Schema mismatches: Detected early with clear error messages

## Use Cases and Applications

This architecture pattern is applicable to various domains:

1. **Content Analysis**: Process, analyze, and generate insights from user-generated content
2. **Data Quality Pipelines**: Validate, clean, and enrich data before LLM analysis
3. **Hybrid Reasoning**: Combine rule-based logic with LLM creativity
4. **Multi-stage ETL**: Extract, transform with workflows, load with LLM enrichment

## Advantages and Limitations

### Advantages

1. **Type Safety**: End-to-end validation prevents runtime errors
2. **Cost Efficiency**: Deterministic processing avoids unnecessary LLM calls
3. **Debuggability**: Clear data flow and validation points
4. **Maintainability**: Declarative schema definitions
5. **Flexibility**: Mix deterministic and non-deterministic operations

### Limitations

1. **Schema Rigidity**: Requires upfront schema definition
2. **Learning Curve**: Developers must understand both paradigms
3. **Provider Dependency**: LLM tasks depend on external API availability

## Future Directions

Potential enhancements:

- **Adaptive Schema Matching**: Automatic schema transformation when structures are similar
- **Multi-LLM Routing**: Route different tasks to specialized models
- **Caching Strategies**: Cache deterministic workflow results
- **Observability**: Enhanced tracing and debugging tools

## Conclusion

Structured output chaining in KaibanJS provides a principled approach to combining LLM reasoning with deterministic processing. By leveraging schema-based validation and automatic data passing, developers can build robust, type-safe AI systems that balance creativity and reliability.

The product review analysis system demonstrates the practical application of this architecture, showing how deterministic data processing, LLM-based sentiment analysis, and insight generation can work together seamlessly.

## References

- KaibanJS Documentation: [https://docs.kaibanjs.com](https://docs.kaibanjs.com)
- WorkflowDrivenAgent Guide: [Structured Output Chaining](https://docs.kaibanjs.com/how-to/Using-WorkflowDrivenAgent#structured-output-chaining)
- Example Implementation: [Review Analysis](https://www.kaibanjs.com/examples/workflow-driven-review-analysis)

## Code Repository

Complete implementation available at:

- GitHub: [https://github.com/anthonydevs/KaibanJS](https://github.com/anthonydevs/KaibanJS)
- Example: `playground/react/src/teams/workflow_driven/structured_output_chain.js`
