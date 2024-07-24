import AgentsBoardDebugger from './AgentsBoardDebugger';
// import team from './teams/openai/sportsNewsTeam';
import team from './teams/openai/sportsNewsTeamWithChampionAgent';

function App() {
  return (
    <>
      <h1>AgenticJS Playground</h1>
      <AgentsBoardDebugger team={team}/>
    </>
  )
}

export default App
