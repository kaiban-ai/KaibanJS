import { fn } from '@storybook/test';
import AgentsBoardDebugger from '../AgentsBoardDebugger';
import teamWithChampionAgents from '../teams/sport_news/openai';
import teamWithReactAgents from '../teams/sport_news/openaiWithReActAgents';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Agents/Comparison',
  component: AgentsBoardDebugger
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const reactAgent = {
  args: {
    team: teamWithReactAgents,
    title: 'With LangChain ReAct Agents'
  },
};

export const reactChampionAgent = {
  args: {
    team: teamWithChampionAgents,
    title: 'With AgenticJS ReAct Agents'
  },
};