import AgentsBoardDebugger from '../AgentsBoardDebugger';
import teamOpenAI from '../teams/resume_creation/openai';


// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/Resume Creation Team',
  component: AgentsBoardDebugger
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const withOpenAI = {
  args: {
    team: teamOpenAI,
    title: 'With OpenAI Model'
  },
};
