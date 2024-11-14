import { ToolPreviewer } from '../_utils/ToolPreviewer.jsx';
import { YouTubeVideoCaption } from './index.js';
import { Agent, Task, Team } from '../../../../src/index';
import React from 'react';
import { AgentWithToolPreviewer } from '../_utils/AgentWithToolPreviewer.jsx';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Tools/YouTube',
  component: ToolPreviewer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

const youtubeTool = new YouTubeVideoCaption({
  token: import.meta.env.VITE_YOUTUBE_LONG_LIVE_TOKEN,
});

// Create an agent with the YouTube tool
const captionExtractor = new Agent({
  name: 'Caption Extractor',
  role: 'YouTube Caption Analyzer',
  goal: 'Extract and analyze captions from YouTube videos',
  tools: [youtubeTool],
  maxIterations: 5,
});

// Create a caption extraction task
const captionExtractionTask = new Task({
  description:
    'Extract captions for video ID: {videoId} and provide a structured summary',
  agent: captionExtractor,
  expectedOutput: 'A well-formatted analysis of the video captions',
});

// Create the team
const team = new Team({
  name: 'Caption Extraction Unit',
  description:
    'Specialized team for extracting and analyzing YouTube video captions',
  agents: [captionExtractor],
  tasks: [captionExtractionTask],
  inputs: {
    videoId: 'NFpqFEl-URY', // Example video ID
  },
  env: {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  },
});

export const Default = {
  args: {
    toolInstance: youtubeTool,
    callParams: {
      videoId: 'NFpqFEl-URY',
    },
  },
};

export const withAgent = {
  render: (args) => <AgentWithToolPreviewer {...args} />,
  args: {
    team: team,
  },
};
