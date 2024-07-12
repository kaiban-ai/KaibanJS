import { useTeamStore } from "agenticjs"; // Ensure correct path
import { useEffect, useState } from "react";
import Spinner from "../components/Spinner/Spinner";
import "./appDebuggerStyles.css";

const AgentsBoardDebugger = ({ team }) => {
    const {
        agents,
        tasks,
        workflowLogs,
        teamWorkflowStatus,
        workflowResult,
        inputs,
        setInputs,
    } = useTeamStore((state) => ({
        agents: state.agents,
        tasks: state.tasks,
        workflowLogs: state.workflowLogs,
        teamWorkflowStatus: state.teamWorkflowStatus,
        workflowResult: state.workflowResult,
        inputs: state.inputs,
        setInputs: state.setInputs,
    }));

    const [statusLog, setStatusLog] = useState([teamWorkflowStatus]);

    useEffect(() => {
        const unsub = useTeamStore.subscribe((state, previusState) => {
            if (state.teamWorkflowStatus !== previusState.teamWorkflowStatus)
                setStatusLog((prevLog) => [
                    ...prevLog,
                    state.teamWorkflowStatus,
                ]);
        });

        return unsub;
    }, []);

    const startTeam = () => {
        try {
            team.start(inputs);
        } catch (error) {
            console.error("Invalid JSON input:", error);
        }
    };

    return (
        <div>
            <h1 className="title">Agents Team Debugger</h1>
            <div className="section">
                <h2 className="sectionTitle">Team Inputs</h2>
                <div>
                    <textarea
                        value={JSON.stringify(inputs, null, 2)}
                        onChange={(e) => setInputs(JSON.parse(e.target.value))}
                        placeholder="Enter JSON input"
                        className="inputTextarea"
                    />
                </div>

                <div className="actionWrapper">
                    <button onClick={startTeam} className="actionButton">
                        Start Workflow
                    </button>

                    {teamWorkflowStatus === "running_workflow" && <Spinner />}
                </div>
            </div>

            <div className="section">
                <h2 className="sectionTitle">🕵️‍♂️ Agents</h2>
                <ul>
                    {agents.map((agent) => (
                        <li key={agent.id} className="listItem">
                            {agent.name} - {agent.role}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="section">
                <h2 className="sectionTitle">📝 Tasks</h2>
                <ul>
                    {tasks.map((task) => (
                        <li key={task.id} className="listItem">
                            {task.description} - {task.status}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="section">
                <h2 className="sectionTitle">
                    🔄 Team Workflow Status Changes
                </h2>

                <ul>
                    {statusLog.map((status, index) => (
                        <li key={index} className="listItem">
                            Status: {status}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="section">
                <h2 className="sectionTitle">📋 Task Logs</h2>

                <ul>
                    {workflowLogs.map((log) => (
                        <li
                            key={log.task.id + log.task.status + log.agent.name}
                            className="listItem"
                        >
                            ({log.task.status}) - timestamp: {log.timestamp} -{" "}
                            {log.agent.name} - {log.task.description}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="section">
                <h2 className="sectionTitle">Workflow Result</h2>
                <div>
                    {workflowResult ? workflowResult : "Not yet available"}
                </div>
            </div>
            <div className="section">
                <h2 className="sectionTitle">📊 Task Results</h2>

                <ul>
                    {tasks.map((task) => (
                        <li key={task.id} className="listItem">
                            <div> Task: {task.description}</div>

                            <div>
                                Time:{" "}
                                {task.duration
                                    ? `${task.duration} seconds`
                                    : "Not yet available"}
                            </div>

                            <div>
                                <strong>Result</strong>
                            </div>

                            <div>
                                {task.result
                                    ? task.result
                                    : "Not yet available"}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AgentsBoardDebugger;
