'use client';

import React, { useState } from 'react';

// Simple test component with security issues for Bugbot to catch
const BugbotTest = () => {
  const [userInput, setUserInput] = useState('');

  // Security vulnerability: Direct innerHTML injection
  const handleSubmit = () => {
    const element = document.getElementById('output');
    if (element) {
      // This should trigger Bugbot's input_sanitization rule
      element.innerHTML = userInput;
    }
  };

  // This component uses 'use client' but might not need it
  // Should trigger server_component_default rule
  return (
    <div>
      <h3>Bugbot Security Test</h3>

      <input
        type="text"
        value={userInput}
        onChange={e => setUserInput(e.target.value)}
        placeholder="Enter HTML content"
      />

      <button onClick={handleSubmit}>Inject Content</button>

      {/* This div will receive unescaped HTML */}
      <div id="output" />
    </div>
  );
};

export default BugbotTest;
