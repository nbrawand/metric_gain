import { useState, useEffect } from 'react'

function App() {
  const [apiStatus, setApiStatus] = useState<string>('checking...')

  useEffect(() => {
    // Test API connection
    fetch(import.meta.env.VITE_API_URL + '/health')
      .then(res => res.json())
      .then(data => {
        setApiStatus(data.status)
      })
      .catch(() => {
        setApiStatus('disconnected')
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-primary">
          Metric Gain
        </h1>
        <p className="text-gray-400 mb-8">
          Progressive Web App for Workout Tracking
        </p>
        <div className="bg-dark-card p-6 rounded-lg border border-dark-border">
          <p className="text-sm text-gray-500 mb-2">API Status</p>
          <p className={`text-lg font-semibold ${
            apiStatus === 'healthy' ? 'text-primary' : 'text-yellow-500'
          }`}>
            {apiStatus}
          </p>
        </div>
        <p className="text-sm text-gray-600 mt-8">
          Phase 0: Setup Complete ✓
        </p>
      </div>
    </div>
  )
}

export default App
