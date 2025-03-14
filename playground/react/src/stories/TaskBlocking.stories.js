import AgentsBoardDebugger from '../AgentsBoardDebugger';
import securityTeam from '../teams/task_blocking/basic_blocking';
import '../index.css';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Features/Task Blocking',
  component: AgentsBoardDebugger,
  parameters: {
    layout: 'fullscreen',
  },
};

export const SecurityClearanceBlocking = {
  args: {
    team: securityTeam,
    title: 'Security Clearance Validation',
  },
};
