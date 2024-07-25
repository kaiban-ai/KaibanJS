import AgentsBoardDebugger from '../AgentsBoardDebugger';
import teamOpenAI from '../teams/sport_news/openai';
import teamAnthropic from '../teams/sport_news/anthropic';
import teamGemini from '../teams/sport_news/gemini';
import teamMistral from '../teams/sport_news/mistral';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Teams/Sports News Team',
  component: AgentsBoardDebugger
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const withOpenAI = {
  args: {
    team: teamOpenAI
  },
};

export const withAnthropic = {
  args: {
    team: teamAnthropic
  },
};

export const withGeminiAI = {
  args: {
    team: teamGemini
  },
};

export const withMistral = {
  args: {
    team: teamMistral
  },
};