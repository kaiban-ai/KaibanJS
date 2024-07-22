import React, { useState, useEffect } from 'react';

const AgentsBoardDebugger = ({team}) => {

    const useTeamStore = team.useStore(); 
    const { agents, tasks, workflowLogs, teamWorkflowStatus, workflowResult, inputs, setInputs } = useTeamStore(state => ({
        agents: state.agents,
        tasks: state.tasks,
        workflowLogs: state.workflowLogs,
        teamWorkflowStatus: state.teamWorkflowStatus,
        workflowResult: state.workflowResult,
        inputs: state.inputs,
        setInputs: state.setInputs,
    }));

    const [statusLog, setStatusLog] = useState([]);

    useEffect(() => {
        setStatusLog(prevLog => [...prevLog, teamWorkflowStatus]);
    }, [teamWorkflowStatus]);

    // useEffect(() => {
    //     console.log('Tasks:', tasks);
    // }, [tasks]);
        
    const startTeam = () => {
        try {
            team.start(inputs);
        } catch (error) {
            console.error('Invalid JSON input:', error);
        }      
    };


return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
        <h1 style={{ color: '#333', borderBottom: '1px solid #333' }}>Agents Team Debugger</h1>

        <div style={{ margin: '20px 0' }}>
            <h2 style={{ color: '#666', fontSize: '30px' }}>Team Inputs</h2>
            <textarea value={JSON.stringify(inputs, null, 2)} onChange={(e) => setInputs(JSON.parse(e.target.value))} placeholder="Enter JSON input" style={{ width: '500px' }}/>
            <p>
                <button onClick={startTeam} style={{ padding: '10px', backgroundColor: '#0000FF', color: 'white', border: 'none', cursor: 'pointer' }}>Start Workflow</button>
            </p>
        </div>        
        <div style={{ margin: '20px  0' }}>
            <h2 style={{ color: '#666', fontSize: '30px' }}>🕵️‍♂️ Agents</h2>
            {agents.map(agent => (
                <p key={agent.id} style={{ color: '#999' }}>{agent.name} - {agent.role} - status: ({agent.status})</p>
            ))}
        </div>
        <div style={{ margin: '20px 0' }}>
            <h2 style={{ color: '#666', fontSize: '30px' }}>📝 Tasks</h2>
            {tasks.map(task => (
                <p key={task.id} style={{ color: '#999' }}>🔘 {task.description} - {task.status}</p>
            ))}
        </div>
        <div style={{ margin: '20px 0' }}>
            <h2 style={{ color: '#666', fontSize: '30px' }}>🔄 Team Workflow Status Changes</h2>
            {statusLog.map((status, index) => (
                <div key={index} style={{ color: '#999', marginBottom: '10px' }}>
                    <div>🔘 Status: {status}</div>
                </div>
            ))}
        </div>        
        <div style={{ margin: '20px 0' }}>
            <h2 style={{ color: '#666', fontSize: '30px' }}>📋 Workflow Logs</h2>
            {workflowLogs.map((log, index) => (
                <p key={index} style={{ color: '#999' }}>🔘 ({log.taskStatus}) - ({log.taskTitle}) - ({log.agentName}) - ({log.agentStatus}) - timestamp: {log.timestamp} - {log.agent.name} - {log.task.description}</p>
            ))}
        </div>        
        <div style={{ margin: '20px 0' }}>
            <h2 style={{ color: '#666', fontSize: '30px' }}>Workflow Result</h2>
            <div>{workflowResult ? workflowResult : 'Not yet available'}</div>
        </div>       
        <div style={{ margin: '20px 0' }}>
            <h2 style={{ color: '#666', fontSize: '30px' }}>📊 Task Results</h2>
            {tasks.map(task => (
                <div key={task.id} style={{ color: '#999', marginBottom: '10px' }}>
                    <div>🔘 Task: {task.description}</div>
                    <div>Time: {task.duration ? `${task.duration} seconds` : 'Not yet available'}</div>
                    <div><strong>Result</strong></div>
                    <div>{task.result ? task.result : 'Not yet available'}</div>
                </div>
            ))}
        </div>       

    </div>
);
};

export default AgentsBoardDebugger;