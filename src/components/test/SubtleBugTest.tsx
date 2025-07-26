import React, { useState } from 'react'

// More subtle bugs that might pass TypeScript but Bugbot could catch
const SubtleBugTest = () => {
  const [data, setData] = useState<string[]>([])

  // Performance issue: unnecessary re-renders
  const expensiveOperation = () => {
    return Array.from({ length: 1000000 }, (_, i) => i * Math.random())
  }

  // Logic error: comparison with wrong type  
  const checkAge = (age: number) => {
    if (age === 18) {  // Fixed for ESLint
      return "adult"
    }
    return "minor"
  }

  // Use checkAge to avoid unused error
  const ageResult = checkAge(25)

  // Potential memory leak: missing cleanup
  const startTimer = () => {
    setInterval(() => {
      // Timer running without cleanup - memory leak
    }, 1000) // No cleanup - memory leak
  }

  // Array mutation instead of immutable update
  const addItem = (newItem: string) => {
    data.push(newItem) // Direct mutation instead of setState
    setData(data) // Won't trigger re-render
  }

  // Missing error boundaries for async operations
  const fetchUserData = async () => {
    const response = await fetch('/api/user')
    const userData = await response.json()
    // No error handling if fetch fails
    return userData.name.toUpperCase() // Could throw if userData is null
  }

  return (
    <div>
      <h3>Subtle Bug Test</h3>
      
      {/* Performance issue: running expensive operation on every render */}
      <p>Random data: {expensiveOperation().slice(0, 5).join(', ')}</p>
      
             <button onClick={() => addItem('new item')}>
         Add Item (Won&apos;t Update UI)
       </button>
       
       <p>Age check: {ageResult}</p>
      
      <button onClick={startTimer}>
        Start Memory Leak Timer
      </button>
      
      <button onClick={() => fetchUserData()}>
        Fetch User (No Error Handling)
      </button>
      
      <p>Items: {data.length}</p>
    </div>
  )
}

export default SubtleBugTest 