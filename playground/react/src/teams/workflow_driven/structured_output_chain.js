import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';

// ============================================
// STEP 1: ReactChampionAgent with outputSchema
// ============================================

// Define the output schema for the ReactChampionAgent task
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

// Create ReactChampionAgent for text analysis
const textAnalyzerAgent = new Agent({
  name: 'Text Analyzer',
  role: 'Text Analysis Expert',
  goal: 'Analyze text and extract structured information',
  background:
    'Expert in natural language processing, text analysis, and information extraction',
  type: 'ReactChampionAgent',
  tools: [],
});

// Task 1: Analyze text and return structured output
const analyzeTextTask = new Task({
  description: `Analyze the following text and extract structured information: {text}
  
  Extract:
  - A clear title
  - A concise summary
  - Important keywords
  - Word count
  - Sentiment (positive, neutral, or negative)
  - Main topics or themes`,
  expectedOutput:
    'Structured analysis with title, summary, keywords, word count, sentiment, and topics',
  outputSchema: textAnalysisSchema,
  agent: textAnalyzerAgent,
});

// ============================================
// STEP 2: WorkflowDrivenAgent that processes the structured output
// ============================================

// Create workflow steps that will process the structured output from Task 1
const validateAnalysisStep = createStep({
  id: 'validate-analysis',
  inputSchema: textAnalysisSchema, // Receives the output from Task 1
  outputSchema: z.object({
    isValid: z.boolean(),
    analysis: textAnalysisSchema,
    validationNotes: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { title, summary, keywords, wordCount, sentiment, topics } =
      inputData;

    // Validate the analysis
    const isValid =
      title.length > 0 &&
      summary.length > 0 &&
      keywords.length > 0 &&
      wordCount > 0 &&
      topics.length > 0;

    const validationNotes = isValid
      ? 'Analysis passed all validation checks'
      : 'Analysis failed some validation checks';

    return {
      isValid,
      analysis: {
        title,
        summary,
        keywords,
        wordCount,
        sentiment,
        topics,
      },
      validationNotes,
    };
  },
});

const enrichAnalysisStep = createStep({
  id: 'enrich-analysis',
  inputSchema: z.object({
    isValid: z.boolean(),
    analysis: textAnalysisSchema,
    validationNotes: z.string(),
  }),
  outputSchema: z.object({
    enrichedAnalysis: textAnalysisSchema,
    metadata: z.object({
      processedAt: z.string(),
      keywordCount: z.number(),
      topicCount: z.number(),
      validationStatus: z.string(),
    }),
    recommendations: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { isValid, analysis } = inputData;

    // Generate recommendations based on the analysis
    const recommendations = [];
    if (analysis.wordCount < 100) {
      recommendations.push('Text is quite short, consider adding more detail');
    }
    if (analysis.keywords.length < 3) {
      recommendations.push(
        'Consider extracting more keywords for better categorization'
      );
    }
    if (analysis.sentiment === 'negative') {
      recommendations.push('Consider reviewing the tone of the content');
    }

    return {
      enrichedAnalysis: analysis,
      metadata: {
        processedAt: new Date().toISOString(),
        keywordCount: analysis.keywords.length,
        topicCount: analysis.topics.length,
        validationStatus: isValid ? 'valid' : 'needs_review',
      },
      recommendations,
    };
  },
});

// Create the workflow that processes the structured analysis
const analysisProcessingWorkflow = createWorkflow({
  id: 'analysis-processing-workflow',
  inputSchema: textAnalysisSchema, // Expects the output from Task 1
  outputSchema: z.object({
    enrichedAnalysis: textAnalysisSchema,
    metadata: z.object({
      processedAt: z.string(),
      keywordCount: z.number(),
      topicCount: z.number(),
      validationStatus: z.string(),
    }),
    recommendations: z.array(z.string()),
  }),
});

// Build the workflow: validate -> enrich
analysisProcessingWorkflow.then(validateAnalysisStep).then(enrichAnalysisStep);

analysisProcessingWorkflow.commit();

// Create WorkflowDrivenAgent for processing the analysis
const analysisProcessorAgent = new Agent({
  name: 'Analysis Processor',
  type: 'WorkflowDrivenAgent',
  workflow: analysisProcessingWorkflow,
});

// Task 2: Process the structured output from Task 1
// This task will automatically receive the output from analyzeTextTask as input
const processAnalysisTask = new Task({
  description:
    'Process and enrich the text analysis results. Validate the analysis and generate recommendations.',
  expectedOutput:
    'Enriched analysis with validation status and recommendations',
  agent: analysisProcessorAgent,
});

// ============================================
// Create the team
// ============================================

const team = new Team({
  name: 'Structured Output Chain Team',
  agents: [textAnalyzerAgent, analysisProcessorAgent],
  tasks: [analyzeTextTask, processAnalysisTask],
  inputs: {
    text: `Artificial Intelligence has revolutionized the way we interact with technology. 
    From voice assistants to autonomous vehicles, AI is transforming industries across the globe. 
    Machine learning algorithms can now process vast amounts of data, identify patterns, 
    and make predictions with remarkable accuracy. The future of AI holds even more promise, 
    with potential applications in healthcare, education, and environmental sustainability.`,
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
  },
  logLevel: 'info',
});

export default team;
