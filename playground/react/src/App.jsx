import AgentsBoardDebugger from './AgentsBoardDebugger';
import team from './teams/product_specs/openai';

function App() {
  return (
    <>
      <h1>KaibanJS Playground</h1>
      <AgentsBoardDebugger team={team}/>
    </>
  )
}

export default App
