import AgentsBoardDebugger from "./AgentDebbuger/AgentsBoardDebugger";
import team from "./teams/productSpecsTeamClaude";
import "./index.css";

function App() {
    return (
        <div className="mainContent">
            <AgentsBoardDebugger team={team} />
        </div>
    );
}

export default App;
