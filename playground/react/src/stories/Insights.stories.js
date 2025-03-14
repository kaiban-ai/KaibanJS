import AgentsBoardDebugger from '../AgentsBoardDebugger';
import teamOpenAIWithInsights from '../teams/resume_creation/openai_with_insights';
import '../index.css';

export default {
  title: 'Features/Insights',
  component: AgentsBoardDebugger,
};

export const ResumeCreation = {
  args: {
    team: teamOpenAIWithInsights,
    title: 'Resume Creation with Historical Placement Data',
  },
};
