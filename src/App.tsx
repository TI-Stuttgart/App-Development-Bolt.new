import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/authContext'
import { AuthForm } from './components/Auth'
import { SessionList } from './components/SessionList'
import { CreateSession } from './components/CreateSession'
import { GameSession } from './components/GameSession'
import type { Session, SessionPlayer } from './lib/supabase'

function AppContent() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<
    | { type: 'list' }
    | { type: 'create' }
    | { type: 'session'; session: Session; players: SessionPlayer[] }
  >({ type: 'list' })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return <AuthForm />

  if (view.type === 'create') {
    return (
      <CreateSession
        onBack={() => setView({ type: 'list' })}
        onSessionCreated={(session, players) => setView({ type: 'session', session, players })}
      />
    )
  }

  if (view.type === 'session') {
    return (
      <GameSession
        session={view.session}
        players={view.players}
        onBack={() => setView({ type: 'list' })}
      />
    )
  }

  return (
    <SessionList
      onSelectSession={(session) => setView({ type: 'session', session, players: [] })}
      onCreateNew={() => setView({ type: 'create' })}
    />
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
