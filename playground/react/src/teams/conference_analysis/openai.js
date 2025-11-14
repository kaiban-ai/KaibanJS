import { Agent, Task, Team } from 'kaibanjs';
import { z } from 'zod';
import OpenAI from 'openai';

// ──── Custom Tool: Audio Transcription ────────────────────────────────
/**
 * Custom tool for transcribing audio files using OpenAI Whisper API
 * Downloads audio from URL and transcribes it client-side
 */
class AudioTranscriptionTool {
  name = 'audio_transcription';

  description =
    'Downloads an audio file from a URL and transcribes it using OpenAI Whisper API. Returns the full transcription text.';

  schema = z.object({
    audioUrl: z.string().describe('URL of the audio file to transcribe'),
  });

  openaiClient = null;

  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.openaiClient = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage
    });
  }

  async invoke(input) {
    const { audioUrl } = input;

    try {
      // Download audio file from URL
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.statusText}`);
      }

      const audioBlob = await response.blob();

      // Convert blob to File object for OpenAI API
      const audioFile = new File([audioBlob], 'audio.mp3', {
        type: audioBlob.type || 'audio/mpeg',
      });

      // Transcribe using OpenAI Whisper
      const transcription = await this.openaiClient.audio.transcriptions.create(
        {
          file: audioFile,
          model: 'gpt-4o-mini-transcribe',
          response_format: 'text',
          //   model: 'gpt-4o-transcribe-diarize',
          //   response_format: 'diarized_json',
          //   chunking_strategy: 'auto',
        }
      );
      console.log('transcription', transcription);

      return typeof transcription === 'string'
        ? transcription
        : JSON.stringify(transcription);
    } catch (error) {
      return JSON.stringify({
        status: 'ERROR',
        message: `Failed to transcribe audio: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      });
    }
  }
}

// Initialize transcription tool with API key from environment
const transcriptionTool = new AudioTranscriptionTool(
  import.meta.env.VITE_OPENAI_API_KEY
);

// ──── Agents ───────────────────────────────────────────────────────────

/**
 * Transcription Agent
 * Handles audio transcription using the custom tool
 */
const transcriber = new Agent({
  name: 'Transcriber',
  role: 'Audio Transcription Specialist',
  goal: 'Transcribe audio recordings to accurate text ',
  background: 'Expert in audio processing and speech-to-text conversion.',
  type: 'ReactChampionAgent',
  tools: [transcriptionTool],
});

/**
 * Content Analyst Agent
 * Analyzes transcription to extract topics, context, participants, and generate summary
 * This agent handles multiple related analysis tasks
 */
const contentAnalyst = new Agent({
  name: 'Analyst',
  role: 'Content Analysis Specialist',
  goal: 'Analyze conference content to identify topics, context, participants, and create summaries.',
  background:
    'Expert in content analysis, information extraction, and summarization with experience in meeting analysis.',
  type: 'ReactChampionAgent',
  tools: [],
});

/**
 * Information Extractor Agent
 * Extracts action items and relevant notes from the transcription
 */
const informationExtractor = new Agent({
  name: 'Extractor',
  role: 'Information Extraction Specialist',
  goal: 'Extract actionable items, responsibilities, and key notes from conference discussions.',
  background:
    'Specialist in identifying action items, tracking responsibilities, and extracting key insights from conversations.',
  type: 'ReactChampionAgent',
  tools: [],
});

/**
 * Document Consolidator Agent
 * Consolidates all analysis into a final markdown document
 */
const consolidator = new Agent({
  name: 'Consolidator',
  role: 'Document Consolidation Specialist',
  goal: 'Consolidate all conference analysis into a comprehensive, well-structured markdown document.',
  background:
    'Expert in document creation and information synthesis, creating professional meeting notes and reports.',
  type: 'ReactChampionAgent',
  tools: [],
});

// ──── Tasks ─────────────────────────────────────────────────────────────

/**
 * Task 1: Transcribe audio
 */
const transcriptionTask = new Task({
  description: `Transcribe the audio file from the provided URL: {audioUrl}`,
  expectedOutput:
    'Complete transcription of the conference audio in plain text format.',
  agent: transcriber,
});

/**
 * Task 2: Analyze topics and context
 * Uses contentAnalyst agent
 */
const topicContextTask = new Task({
  description: `Analyze the transcription to identify the main topics discussed and the overall context of the conference. 
    Provide a clear overview of what the conference was about and the key themes.`,
  expectedOutput:
    'Detailed analysis of main topics and context of the conference.',
  agent: contentAnalyst,
});

/**
 * Task 3: Extract participants
 * Uses contentAnalyst agent
 */
const participantsTask = new Task({
  description: `Identify all participants mentioned in the transcription. 
    Extract their names, roles, titles, and any other relevant information about them.`,
  expectedOutput:
    'Complete list of participants with their details (names, roles, titles, etc.).',
  agent: contentAnalyst,
});

/**
 * Task 4: Generate summary
 * Uses contentAnalyst agent
 */
const summaryTask = new Task({
  description: `Create a concise and comprehensive summary of the conference based on the transcription. 
    Highlight the main points, decisions made, and important discussions.`,
  expectedOutput:
    'A well-structured summary of the conference covering main points and decisions.',
  agent: contentAnalyst,
});

/**
 * Task 5: Extract action items
 * Uses informationExtractor agent
 */
const actionItemsTask = new Task({
  description: `Identify all action items mentioned in the conference. 
    For each action item, extract the task description and the person responsible (if mentioned).`,
  expectedOutput:
    'List of action items with descriptions and assigned responsible parties.',
  agent: informationExtractor,
});

/**
 * Task 6: Extract relevant notes
 * Uses informationExtractor agent
 */
const notesTask = new Task({
  description: `Extract and organize all relevant notes, insights, and important information from the conference. 
    Focus on key takeaways, decisions, and valuable insights that should be documented.`,
  expectedOutput:
    'Organized collection of relevant notes, insights, and key takeaways from the conference.',
  agent: informationExtractor,
});

/**
 * Task 7: Consolidate final document
 * Uses consolidator agent - This is the deliverable
 */
const consolidationTask = new Task({
  description: `Consolidate all the analysis results into a comprehensive markdown document. 
    Include:
    - Conference Summary
    - Topics & Context
    - Participants (with details)
    - Action Items (with responsible parties)
    - Key Notes & Insights
    
    Format everything in a clear, professional markdown structure suitable for meeting notes.`,
  expectedOutput:
    'A complete, well-formatted markdown document containing all conference analysis results.',
  isDeliverable: true,
  agent: consolidator,
});

// ──── Team ──────────────────────────────────────────────────────────────

// Create the team
const team = new Team({
  name: 'Conference Analysis Team',
  agents: [transcriber, contentAnalyst, informationExtractor, consolidator],
  tasks: [
    transcriptionTask,
    topicContextTask,
    participantsTask,
    summaryTask,
    actionItemsTask,
    notesTask,
    consolidationTask,
  ],
  inputs: {
    audioUrl:
      'https://raw.githubusercontent.com/ringcentral/ringcentral-api-docs/main/resources/RC_Conversation_Sample.mp3',
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export default team;
