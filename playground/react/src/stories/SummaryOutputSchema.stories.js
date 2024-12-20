import AgentsBoardDebugger from '../AgentsBoardDebugger';
import team from '../teams/output_schema/openai';
import '../index.css';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/Summary with output schema',
  component: AgentsBoardDebugger,
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const withOpenAI = {
  args: {
    team,
    title: 'With OpenAI Model',
  },
};
