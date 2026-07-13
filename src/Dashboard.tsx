import { useEffect, useState, useCallback } from 'react'
import { supabase, type Session, type SessionPlayer } from './supabase'

type SessionWithPlayers = Session & { players: SessionPlayer[] }

export default function Dashboard({ onOpenSession }: { onOpenSession: (id: string) => void }) {
  const [sessions, setSessions] = useState<SessionWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [playerCount, setPlayerCount] = useState(3)
  const [playerNames, setPlayerNames] = useState(['', '', '', ''])
  const [centPerPoint, setCentPerPoint] = useState(1)

  const loadSessions = useCallback(async () => {
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
    if (!sessionsData) return

    const sessionsWithPlayers = await Promise.all(
      sessionsData.map(async (s: Session) => {
        const { data: players } = await supabase
          .from('session_players')
          .select('*')
          .eq('session_id', s.id)
          .order('position')
        return { ...s, players: players || [] }
      })
    )
    setSessions(sessionsWithPlayers)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  async function createSession() {
    const now = new Date()
    const name = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1)
      .toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes().toString().padStart(2, '0')}`

    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        name,
        cent_per_point: centPerPoint,
        player_count: playerCount,
        current_dealer_index: 0,
        current_game_number: 0,
        total_bock_games: 0,
        is_active: true,
        sitter_index: 0,
      })
      .select()
      .single()

    if (error || !session) return

    const names = playerNames.slice(0, playerCount).filter((n) => n.trim())
    for (let i = 0; i < names.length; i++) {
      await supabase.from('session_players').insert({
        session_id: session.id,
        name: names[i].trim(),
        position: i,
        total_score: 0,
      })
    }

    setShowNew(false)
    setPlayerNames(['', '', '', ''])
    onOpenSession(session.id)
  }

  async function deleteSession(id: string) {
    if (!confirm('Sitzung wirklich löschen? Alle Spiele gehen verloren.')) return
    await supabase.from('sessions').delete().eq('id', id)
    loadSessions()
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Skat Verwaltung</h1>
          <button className="btn-primary" onClick={() => setShowNew(true)}>
            + Neue Sitzung
          </button>
        </div>
        <button className="btn-logout" onClick={() => supabase.auth.signOut()}>
          Abmelden
        </button>
      </header>

      <div className="dashboard-body">
        {loading ? (
          <div className="loading-state">Lädt...</div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <h2>Willkommen!</h2>
            <p>Noch keine Sitzung vorhanden. Erstellen Sie eine neue Skat-Sitzung.</p>
            <button className="btn-primary" onClick={() => setShowNew(true)}>
              + Neue Sitzung
            </button>
          </div>
        ) : (
          <div className="session-grid">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`session-card ${s.is_active ? '' : 'finished'}`}
                onClick={() => onOpenSession(s.id)}
              >
                <div className="session-card-header">
                  <h3>{s.name}</h3>
                  {s.is_active ? (
                    <span className="badge badge-active">Aktiv</span>
                  ) : (
                    <span className="badge badge-finished">Beendet</span>
                  )}
                </div>
                <div className="session-card-body">
                  <div className="session-players">
                    {s.players.map((p) => (
                      <span key={p.id} className="player-chip">{p.name}</span>
                    ))}
                  </div>
                  <div className="session-stats">
                    <span>{s.current_game_number} Spiele</span>
                    <span>{s.cent_per_point} Ct/Punkt</span>
                  </div>
                  <div className="session-scores">
                    {s.players.map((p) => (
                      <div key={p.id} className="session-score-row">
                        <span>{p.name}</span>
                        <span className={p.total_score >= 0 ? 'score-positive' : 'score-negative'}>
                          {p.total_score >= 0 ? '+' : ''}{p.total_score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  className="btn-delete"
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Neue Sitzung</h2>
            <div className="form-field">
              <label>Spieleranzahl</label>
              <div className="player-count-selector">
                {[3, 4].map((n) => (
                  <button key={n} className={playerCount === n ? 'selected' : ''} onClick={() => setPlayerCount(n)}>
                    {n} Spieler
                  </button>
                ))}
              </div>
            </div>
            {playerNames.slice(0, playerCount).map((name, i) => (
              <div className="form-field" key={i}>
                <label>Spieler {i + 1}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const next = [...playerNames]
                    next[i] = e.target.value
                    setPlayerNames(next)
                  }}
                  placeholder={`Name Spieler ${i + 1}`}
                />
              </div>
            ))}
            <div className="form-field">
              <label>Cent pro Punkt</label>
              <input type="number" value={centPerPoint} onChange={(e) => setCentPerPoint(Number(e.target.value))} min={1} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowNew(false)}>Abbrechen</button>
              <button
                className="btn-primary"
                onClick={createSession}
                disabled={playerNames.slice(0, playerCount).some((n) => !n.trim())}
              >
                Sitzung starten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
