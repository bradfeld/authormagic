import React from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

// Test component with various TypeScript and logic issues
const TypeScriptBugTest = () => {
  // Type mismatch - should be caught
  const user: User = {
    id: '123', // Should be number, not string
    name: 'John',
    // Missing required email field
  };

  // Potential null reference
  const processUser = (userData: User | null) => {
    // Accessing property without null check
    return userData.name.toUpperCase();
  };

  // Infinite loop potential (used in button)
  const riskyLoop = () => {
    let count = 0;
    while (count >= 0) {
      count++;
      // No break condition - infinite loop
    }
  };

  // Promise without await (used in effect)
  const fetchData = async () => {
    const response = await fetch('/api/data');
    const data = response.json(); // Missing await - should be caught by Bugbot
    return data;
  };

  // Call fetchData to avoid unused error
  React.useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <h3>TypeScript Bug Test</h3>
      <p>User: {user.name}</p>
      <button onClick={() => processUser(null)}>Test Null Reference</button>
      <button onClick={riskyLoop}>Start Infinite Loop</button>
    </div>
  );
};

export default TypeScriptBugTest;
