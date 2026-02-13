# Visual Representation of Schema Chaining

This example demonstrates how the `outputSchema` of a task processed by a `ReactChampionAgent` automatically chains with the `inputSchema` of a workflow from a task processed by a `WorkflowDrivenAgent` within the same Team.

## Team Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TEAM EXECUTION FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│  TASK 1: analyzeTextTask                                                │
│  Agent: ReactChampionAgent (textAnalyzerAgent)                          │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Input: { text: "..." }
                              ▼
         ┌─────────────────────────────────────┐
         │   ReactChampionAgent Processing      │
         │   - LLM analyzes text               │
         │   - Extracts structured data        │
         │   - Validates against outputSchema  │
         └─────────────────────────────────────┘
                              │
                              │ Output (Validated)
                              ▼
         ┌─────────────────────────────────────────────────────────────┐
         │  outputSchema: textAnalysisSchema                          │
         │  ┌───────────────────────────────────────────────────────┐ │
         │  │ {                                                     │ │
         │  │   title: string                                      │ │
         │  │   summary: string                                    │ │
         │  │   keywords: string[]                                 │ │
         │  │   wordCount: number                                  │ │
         │  │   sentiment: 'positive' | 'neutral' | 'negative'    │ │
         │  │   topics: string[]                                  │ │
         │  │ }                                                     │ │
         │  └───────────────────────────────────────────────────────┘ │
         └─────────────────────────────────────────────────────────────┘
                              │
                              │ ═══════════════════════════════════════
                              │  AUTOMATIC SCHEMA CHAINING
                              │  (System validates & passes data)
                              │ ═══════════════════════════════════════
                              ▼
         ┌─────────────────────────────────────────────────────────────┐
         │  inputSchema: textAnalysisSchema (Workflow Level)           │
         │  ┌───────────────────────────────────────────────────────┐ │
         │  │ {                                                     │ │
         │  │   title: string                                      │ │
         │  │   summary: string                                    │ │
         │  │   keywords: string[]                                 │ │
         │  │   wordCount: number                                  │ │
         │  │   sentiment: 'positive' | 'neutral' | 'negative'    │ │
         │  │   topics: string[]                                  │ │
         │  │ }                                                     │ │
         │  └───────────────────────────────────────────────────────┘ │
         └─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  TASK 2: processAnalysisTask                                            │
│  Agent: WorkflowDrivenAgent (analysisProcessorAgent)                   │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Workflow receives validated input
                              ▼
         ┌─────────────────────────────────────┐
         │  STEP 1: validateAnalysisStep       │
         │  inputSchema: textAnalysisSchema    │
         │  ─────────────────────────────────  │
         │  • Validates analysis data          │
         │  • Checks completeness              │
         │  • Generates validation notes       │
         └─────────────────────────────────────┘
                              │
                              │ Output: { isValid, analysis, validationNotes }
                              ▼
         ┌─────────────────────────────────────┐
         │  STEP 2: enrichAnalysisStep         │
         │  ─────────────────────────────────  │
         │  • Adds metadata (timestamp, counts) │
         │  • Generates recommendations        │
         │  • Enriches analysis data            │
         └─────────────────────────────────────┘
                              │
                              │ Final Output
                              ▼
         ┌─────────────────────────────────────────────────────────────┐
         │  Final Result:                                               │
         │  {                                                           │
         │    enrichedAnalysis: textAnalysisSchema,                     │
         │    metadata: { processedAt, keywordCount, topicCount, ... }, │
         │    recommendations: string[]                                 │
         │  }                                                           │
         └─────────────────────────────────────────────────────────────┘
```

## Key Features of Schema Chaining

### 1. Schema Matching

- Task 1's `outputSchema` (`textAnalysisSchema`) exactly matches Task 2's workflow `inputSchema`
- When schemas match, the output is passed directly to the workflow without requiring manual transformation

### 2. Automatic Validation

- The system validates Task 1's output against its `outputSchema`
- Then validates that it matches the workflow's `inputSchema`
- If validation fails, the output is passed under the `taskId` key

### 3. Data Flow

- **Task 1 output** → **Validation** → **Workflow inputSchema** → **Step 1 inputSchema**
- Data flows in a type-safe manner through the entire pipeline

### 4. No Manual Configuration

- No manual data mapping is required
- The system automatically detects the dependency between tasks
- Chaining occurs when Task 2 depends on Task 1

## Schema Structure

### textAnalysisSchema

```typescript
const textAnalysisSchema = z.object({
  title: z.string().describe('The main title extracted from the text'),
  summary: z.string().describe('A concise summary of the text content'),
  keywords: z
    .array(z.string())
    .describe('List of important keywords extracted from the text'),
  wordCount: z.number().describe('Total number of words in the text'),
  sentiment: z
    .enum(['positive', 'neutral', 'negative'])
    .describe('Overall sentiment of the text'),
  topics: z
    .array(z.string())
    .describe('Main topics or themes identified in the text'),
});
```

This schema is used as:

- **Task 1's `outputSchema`** (ReactChampionAgent)
- **Workflow's `inputSchema`** (WorkflowDrivenAgent)
- **Step 1's `inputSchema`** (validateAnalysisStep)

## How It Works

1. **Task 1 Execution**: The `ReactChampionAgent` processes the input text and generates structured output validated against `textAnalysisSchema`

2. **Automatic Extraction**: The system automatically extracts and validates the structured output from Task 1

3. **Schema Matching**: The system checks if Task 1's `outputSchema` matches the workflow's `inputSchema`

4. **Direct Passing**: When schemas match, the output is passed directly at the root level to the workflow

5. **Workflow Processing**: The `WorkflowDrivenAgent` receives the validated data and processes it through its workflow steps

6. **Type-Safe Flow**: Throughout the entire pipeline, data maintains type safety from LLM output to workflow execution

## Benefits

- ✅ **Type Safety**: Full end-to-end type safety from LLM output to workflow input
- ✅ **No Manual Mapping**: Automatic passing of structured outputs between tasks
- ✅ **Deterministic Processing**: Workflow ensures consistent processing of LLM outputs
- ✅ **Error Prevention**: Schema validation prevents type mismatches
- ✅ **Seamless Integration**: Works seamlessly between different agent types
