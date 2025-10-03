import AgentsBoardDebugger from '../AgentsBoardDebugger';
import teamOpenAI from '../teams/processing_images/openai';
import '../index.css';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/Image Processing Team',
  component: AgentsBoardDebugger,
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const withOpenAI = {
  args: {
    team: teamOpenAI,
    title: 'With OpenAI Vision Model',
  },
};
