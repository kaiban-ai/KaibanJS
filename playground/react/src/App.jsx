import team from "./teams/anthropic/productSpecsTeam";
import AgentsBoardDebugger from "./components/AgentDebbuger/AgentsBoardDebugger";
import "./index.css";

function App() {
    return (
        <div className="mainContent">
            <AgentsBoardDebugger team={team} />
        </div>
    );
}

export default App;
