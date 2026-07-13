import { useState } from 'react'
import { AuthProvider, useAuth } from './auth'
import Login from './Login'
import Dashboard from './Dashboard'
import SessionView from './SessionView'

function AppContent() {
  const { session, loading } = useAuth()
  const [currentView, setCurrentView] = useState<
    { type: 'dashboard' } | { type: 'session'; id: string }
  >({ type: 'dashboard' })

  if (loading) return <div className="loading-state">Lädt...</div>
  if (!session) return <Login />

  if (currentView.type === 'session') {
    return <SessionView sessionId={currentView.id} onBack={() => setCurrentView({ type: 'dashboard' })} />
  }

  return <Dashboard onOpenSession={(id) => setCurrentView({ type: 'session', id })} />
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}
