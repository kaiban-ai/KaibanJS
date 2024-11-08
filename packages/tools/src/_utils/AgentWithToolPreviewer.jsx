import React, { useState, useEffect, useRef } from 'react';
import './tools_agent_preview.css';

export const AgentWithToolPreviewer = ({ team }) => {
  const [agentLogs, setAgentLogs] = useState([]);
  const logsEndRef = useRef(null);
  const useTeamStore = team.useStore();

  const {
    agents,
    tasks,
    teamWorkflowStatus,
    startWorkflow,
    setInputs,
    inputs,
    workflowResult,
  } = useTeamStore((state) => ({
    agents: state.agents,
    tasks: state.tasks,
    teamWorkflowStatus: state.teamWorkflowStatus,
    startWorkflow: state.startWorkflow,
    setInputs: state.setInputs,
    inputs: state.inputs,
    workflowResult: state.workflowResult,
  }));

  // Subscribe to workflow logs
  useEffect(() => {
    const unsubscribe = team.useStore().subscribe(
      (state) => state.workflowLogs,
      (newLogs, previousLogs) => {
        if (newLogs.length > previousLogs.length) {
          const newLog = newLogs[newLogs.length - 1];
          if (newLog.logType === 'AgentStatusUpdate') {
            setAgentLogs((current) => [...current, newLog]);
          }
        }
      }
    );

    return () => unsubscribe();
  }, [team]);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentLogs]);

  // State for the textarea content
  const [inputText, setInputText] = useState(JSON.stringify(inputs, null, 2));

  // Update textarea when store inputs change
  useEffect(() => {
    setInputText(JSON.stringify(inputs, null, 2));
  }, [inputs]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    try {
      const newInputs = JSON.parse(e.target.value);
      setInputs(newInputs);
    } catch {
      // Invalid JSON - don't update the store
      console.warn('Invalid JSON input');
    }
  };

  const handleStartTeam = async () => {
    try {
      await startWorkflow();
    } catch (error) {
      console.error('Error starting team:', error);
    }
  };

  if (!agents || agents.length === 0) {
    return <div className="no-team-message">No agents available</div>;
  }

  const renderLogContent = (log) => {
    return (
      <div className="log-entry">
        <span className="log-timestamp">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
        <span className="log-agent">{log.agentName}</span>
        <span className={`log-status status-${log.agentStatus?.toLowerCase()}`}>
          {log.agentStatus}
        </span>
        <div className="log-content">
          <span className="log-description">{log.logDescription}</span>

          {/* Show tool input when using tool */}
          {log.agentStatus === 'USING_TOOL' && log.metadata?.input && (
            <div className="tool-details">
              <div className="tool-input">
                <strong>Tool Input:</strong>
                <pre>{JSON.stringify(log.metadata.input, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Show tool output when tool usage ends */}
          {log.agentStatus === 'USING_TOOL_END' && log.metadata?.output && (
            <div className="tool-details">
              <div className="tool-output">
                <strong>Tool Output:</strong>
                <pre>{JSON.stringify(log.metadata.output, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="agent-tools-preview">
      <div className="team-header">
        <div className="team-info">
          <h2>Team: {team.name}</h2>
          <p className="team-description">{team.description}</p>
        </div>
        <div className="team-controls">
          <div className="input-controls">
            <textarea
              className="inputs-editor"
              value={inputText}
              onChange={handleInputChange}
              rows={5}
              spellCheck="false"
            />
            <button
              className={`start-button ${teamWorkflowStatus.toLowerCase()}`}
              onClick={handleStartTeam}
              disabled={teamWorkflowStatus === 'RUNNING'}
            >
              {teamWorkflowStatus === 'RUNNING' ? 'Running...' : 'Start Team'}
            </button>
          </div>

          <div className="workflow-status">
            Status:{' '}
            <span className={`status-${teamWorkflowStatus.toLowerCase()}`}>
              {teamWorkflowStatus}
            </span>
          </div>
        </div>
        <div className="agents-container">
          {agents.map((agent, index) => (
            <div key={index} className="agent-card">
              <div className="agent-header">
                <div className="agent-title">
                  <h3>{agent.name}</h3>
                  <span className="agent-role">{agent.role}</span>
                </div>
                <span
                  className={`agent-status status-${agent.status?.toLowerCase()}`}
                >
                  {agent.status || 'IDLE'}
                </span>
              </div>

              <div className="agent-goal">
                <strong>Goal:</strong> {agent.goal}
              </div>

              <div className="agent-tools">
                <strong>Tools:</strong>
                {agent.tools && agent.tools.length > 0 ? (
                  <ul>
                    {agent.tools.map((tool, toolIndex) => (
                      <li key={toolIndex} className="tool-item">
                        <span className="tool-name">{tool.name}</span>
                        <span className="tool-description">
                          {tool.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-tools">No tools assigned</p>
                )}
              </div>

              <div className="agent-tasks">
                <strong>Assigned Tasks:</strong>
                <ul>
                  {tasks
                    .filter((task) => task.agent === agent)
                    .map((task, taskIndex) => (
                      <li key={taskIndex} className="task-item">
                        <span className="task-description">
                          {task.description}
                        </span>
                        <span
                          className={`task-status status-${task.status?.toLowerCase()}`}
                        >
                          {task.status}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        {/* Agent Status Logs at the bottom */}
        <div className="agent-logs-section">
          <h3>Agent Status Logs</h3>
          <div className="logs-container">
            {agentLogs.map((log, index) => (
              <React.Fragment key={index}>
                {renderLogContent(log)}
              </React.Fragment>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        {/* Workflow Result Section */}
        {workflowResult && (
          <div className="workflow-result">
            <h3>Workflow Result</h3>
            <div className="result-content">
              <pre>
                {typeof workflowResult === 'object'
                  ? JSON.stringify(workflowResult, null, 2)
                  : workflowResult}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
