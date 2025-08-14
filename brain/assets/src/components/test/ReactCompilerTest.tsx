import React, { useState } from 'react';

// Test component to verify React Compiler is working
// This component opts into React Compiler with "use memo"
function ReactCompilerTest() {
  "use memo";  // React Compiler directive for annotation mode
  
  const [count, setCount] = useState(0);
  const [name, setName] = useState('React Compiler Test');
  
  // Expensive calculation that should be memoized by React Compiler
  const expensiveValue = Math.pow(count, 2) + Math.random() * 1000;
  
  return (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="text-lg font-bold mb-4">{name}</h3>
      <div className="space-y-2">
        <p>Count: {count}</p>
        <p>Expensive Value: {expensiveValue.toFixed(2)}</p>
        <div className="space-x-2">
          <button 
            onClick={() => setCount(c => c + 1)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Increment
          </button>
          <button 
            onClick={() => setName(name === 'React Compiler Test' ? 'Compiler Working!' : 'React Compiler Test')}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Toggle Name
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReactCompilerTest;