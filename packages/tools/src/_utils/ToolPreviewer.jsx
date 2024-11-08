import React, { useState } from 'react';
import MonacoEditor from 'react-monaco-editor';

import './tools.css';

export const ToolPreviewer = ({ toolInstance, callParams }) => {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Create a state object with the same structure as callParams
  const [params, setParams] = useState(callParams);

  const handleParamChange = (key, value) => {
    setParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleToolCall = async () => {
    setIsLoading(true);
    try {
      // Use the params state instead of callParams
      const result = await toolInstance._call(params);
      setOutput(result);
    } catch (error) {
      console.error('Error calling tool:', error);
      setOutput('Error: Failed to execute tool');
    } finally {
      setIsLoading(false);
    }
  };

  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: true,
    cursorStyle: 'line',
    automaticLayout: true,
    minimap: { enabled: false },
  };

  return (
    <div className="firecrawl-tool">
      <div className="input-container">
        {/* Map through the params object to create inputs */}
        {Object.entries(params).map(([key, value]) => (
          <input
            key={key}
            type="text"
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            placeholder={`Enter ${key}`}
          />
        ))}
        <button onClick={handleToolCall} disabled={isLoading}>
          {isLoading ? 'Executing tool...' : 'Execute Tool'}
        </button>
      </div>
      <div className="editor-container">
        {output ? (
          <MonacoEditor
            width="100%"
            height="calc(100vh - 100px)" // Adjust this value as needed
            language="markdown"
            theme="vs-dark"
            value={output}
            options={editorOptions}
          />
        ) : (
          <p className="no-content-message">No content yet. Enter a URL and click &apos;Execute Tool&apos; to fetch content.</p>
        )}
      </div>
    </div>
  );
};
