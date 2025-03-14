import AgentsBoardDebugger from '../AgentsBoardDebugger';
import teamSequential from '../teams/event_planning/openai';
import teamParallel from '../teams/event_planning/openai_parallel';
import teamMixed from '../teams/event_planning/openai_mixed';
import '../index.css';

export default {
  title: 'Features/Task Chaining',
  component: AgentsBoardDebugger,
};

export const SequentialEventPlanning = {
  args: {
    team: teamSequential,
    title: 'Event Planning with Sequential Tasks',
  },
};

export const ParallelEventPlanning = {
  args: {
    team: teamParallel,
    title: 'Event Planning with Parallel Tasks',
  },
};

export const MixedEventPlanning = {
  args: {
    team: teamMixed,
    title: 'Event Planning with Mixed Task Dependencies',
  },
};
