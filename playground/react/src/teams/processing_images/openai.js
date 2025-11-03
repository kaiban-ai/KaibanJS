import { Agent, Task, Team } from 'kaibanjs';

// Define agents
const visionAnalyst = new Agent({
  name: 'Vision Scout',
  role: 'Image Analyzer',
  goal: 'Analyze images comprehensively and extract detailed information including objects, text, colors, style, and document-specific details.',
  background:
    'Computer vision specialist with expertise in image analysis, OCR, and visual content interpretation',
  tools: [],
});

const contentFormatter = new Agent({
  name: 'Report Writer',
  role: 'Content Formatter',
  goal: 'Format the image analysis results into a well-structured markdown report with embedded image.',
  background: 'Technical writing and content formatting specialist',
  tools: [],
});

// Define tasks
const imageAnalysisTask = new Task({
  description: `Analyze the provided image URL: {imageUrl}
  
  Please provide a comprehensive analysis including:
  - General description of the image content
  - Objects, people, animals, or items visible
  - Text content (if any) - read all visible text
  - Colors and visual style
  - For documents (passports, IDs, etc.): extract all visible fields, numbers, dates, names
  - Composition and layout
  - Any special features or notable elements
  - Quality and clarity of the image`,
  expectedOutput:
    'Detailed analysis of the image with all requested information extracted',
  agent: visionAnalyst,
});

const markdownReportTask = new Task({
  description: `Create a comprehensive markdown report based on the image analysis results.
  
  The report should include:
  - The original image displayed using markdown image syntax. Image url: {imageUrl}
  - A well-structured analysis with clear sections
  - Proper formatting for readability
  - All extracted information organized logically`,
  expectedOutput:
    'Complete markdown report with embedded image and detailed analysis',
  agent: contentFormatter,
});

// Create a team
const team = new Team({
  name: 'Image Analysis Team',
  agents: [visionAnalyst, contentFormatter],
  tasks: [imageAnalysisTask, markdownReportTask],
  inputs: {
    imageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&crop=face',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export default team;
