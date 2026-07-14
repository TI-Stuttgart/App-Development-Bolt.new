import { useEffect, useState, useCallback } from 'react'
import {
  supabase,
  type Session,
  type SessionPlayer,
  type Game,
  type GameScore,
  type QueueItem,
  type GameType,
} from './supabase'
import { calculateGameValue, getGameLabel, isRamschType, isNullType } from './scoring'
import { getGamesPerRound } from './lib/skatLogic'
import GameForm, { type GameFormData } from './GameForm'

type Props = { sessionId: string; onBack: () => void }
type GameWithScores = Game & { scores: GameScore[]; soloist_name?: string; ramsch_loser_name?: string }

export default function SessionView({ sessionId, onBack }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [players, setPlayers] = useState<SessionPlayer[]>([])
  const [games, setGames] = useState<GameWithScores[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [showGameForm, setShowGameForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    setSession(sessionData)

    const { data: playersData } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .order('position')
    setPlayers(playersData || [])

    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .eq('session_id', sessionId)
      .order('game_number')

    const { data: queueData } = await supabase
      .from('queue_items')
      .select('*')
      .eq('session_id', sessionId)
      .order('priority', { ascending: false })
    setQueue(queueData || [])

    if (gamesData) {
      const gamesWithScores: GameWithScores[] = await Promise.all(
        gamesData.map(async (g: Game) => {
          const { data: scores } = await supabase.from('game_scores').select('*').eq('game_id', g.id)
          const soloist = playersData?.find((p) => p.id === g.soloist_id)
          const ramschLoser = playersData?.find((p) => p.id === g.ramsch_loser_id)
          return { ...g, scores: scores || [], soloist_name: soloist?.name, ramsch_loser_name: ramschLoser?.name }
        })
      )
      setGames(gamesWithScores)
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => { loadData() }, [loadData])

  const currentDealer = players[session?.current_dealer_index || 0]
  const isBockActive = queue.some((q) => q.type === 'bock' && q.games_remaining > 0)
  const isRamschQueued = queue.some((q) => q.type === 'ramsch' && q.games_remaining > 0)

  async function handleGameSubmit(data: GameFormData) {
    if (!session) return
    const gameNumber = session.current_game_number + 1
    const isRamsch = isRamschType(data.game_type)
    const isNullGame = isNullType(data.game_type)

    const result = calculateGameValue({
      game_type: data.game_type,
      won: data.won,
      buben_count: isRamsch || isNullGame ? null : data.buben_count,
      buben_with: data.buben_with,
      hand: data.hand,
      schneider: data.schneider,
      schneider_announced: data.schneider_announced,
      schwarz: data.schwarz,
      schwarz_announced: data.schwarz_announced,
      ouvert: data.ouvert,
      kontra: data.kontra,
      re: data.re,
      is_bock: isBockActive,
      ramsch_schieben_count: data.ramsch_schieben_count,
      ramsch_jungfrau: data.ramsch_jungfrau,
      ramsch_durchmarsch: data.ramsch_durchmarsch,
      ramsch_augen: isRamsch ? data.ramsch_augen : null,
      is_spaltarsch: data.is_spaltarsch,
      lost_doubling_count: 0,
    })

    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        session_id: session.id,
        game_number: gameNumber,
        dealer_id: currentDealer?.id,
        soloist_id: data.soloist_id,
        game_type: data.game_type,
        won: data.won,
        buben_count: isRamsch || isNullGame ? null : data.buben_count,
        buben_with: isRamsch || isNullGame ? null : data.buben_with,
        hand: data.hand,
        schneider: data.schneider,
        schneider_announced: data.schneider_announced,
        schwarz: data.schwarz,
        schwarz_announced: data.schwarz_announced,
        ouvert: data.ouvert,
        kontra: data.kontra,
        re: data.re,
        is_bock: isBockActive,
        is_ramsch: isRamsch,
        calculated_value: result.value,
        ramsch_schieben_count: data.ramsch_schieben_count,
        ramsch_jungfrau: data.ramsch_jungfrau,
        ramsch_durchmarsch: data.ramsch_durchmarsch,
        ramsch_loser_id: data.ramsch_loser_id,
        ramsch_augen: isRamsch ? data.ramsch_augen : null,
        is_spaltarsch: data.is_spaltarsch,
        lost_doubling_count: 0,
      })
      .select()
      .single()
    if (gameError || !game) return

    if (isRamsch) {
      if (data.ramsch_durchmarsch) {
        const winner = players.find((p) => p.id === data.soloist_id)
        if (winner) {
          const loserScore = -result.value
          for (const p of players) {
            if (p.id === winner.id) {
              const change = result.value * (players.length - 1)
              await supabase.from('game_scores').insert({ game_id: game.id, player_id: p.id, score_change: change })
              await supabase.from('session_players').update({ total_score: p.total_score + change }).eq('id', p.id)
            } else {
              await supabase.from('game_scores').insert({ game_id: game.id, player_id: p.id, score_change: loserScore })
              await supabase.from('session_players').update({ total_score: p.total_score + loserScore }).eq('id', p.id)
            }
          }
        }
      } else {
        const loser = players.find((p) => p.id === data.ramsch_loser_id)
        if (loser) {
          const winnerShare = Math.floor(result.value / (players.length - 1))
          for (const p of players) {
            if (p.id === loser.id) {
              await supabase.from('game_scores').insert({ game_id: game.id, player_id: p.id, score_change: -result.value })
              await supabase.from('session_players').update({ total_score: p.total_score - result.value }).eq('id', p.id)
            } else {
              await supabase.from('game_scores').insert({ game_id: game.id, player_id: p.id, score_change: winnerShare })
              await supabase.from('session_players').update({ total_score: p.total_score + winnerShare }).eq('id', p.id)
            }
          }
        }
      }
    } else {
      const soloist = players.find((p) => p.id === data.soloist_id)
      if (soloist) {
        const opponents = players.filter((p) => p.id !== data.soloist_id)
        const opponentShare = Math.floor(result.value / opponents.length)
        for (const p of players) {
          if (p.id === soloist.id) {
            const change = data.won ? result.value : -result.value
            await supabase.from('game_scores').insert({ game_id: game.id, player_id: p.id, score_change: change })
            await supabase.from('session_players').update({ total_score: p.total_score + change }).eq('id', p.id)
          } else {
            const change = data.won ? -opponentShare : opponentShare
            await supabase.from('game_scores').insert({ game_id: game.id, player_id: p.id, score_change: change })
            await supabase.from('session_players').update({ total_score: p.total_score + change }).eq('id', p.id)
          }
        }
      }
    }

    if (isBockActive) {
      const bockQueue = queue.find((q) => q.type === 'bock' && q.games_remaining > 0)
      if (bockQueue) {
        const remaining = bockQueue.games_remaining - 1
        if (remaining <= 0) await supabase.from('queue_items').delete().eq('id', bockQueue.id)
        else await supabase.from('queue_items').update({ games_remaining: remaining }).eq('id', bockQueue.id)
      }
    }

    if (isRamschQueued && !isRamsch) {
      const ramschQueue = queue.find((q) => q.type === 'ramsch' && q.games_remaining > 0)
      if (ramschQueue) {
        const remaining = ramschQueue.games_remaining - 1
        if (remaining <= 0) await supabase.from('queue_items').delete().eq('id', ramschQueue.id)
        else await supabase.from('queue_items').update({ games_remaining: remaining }).eq('id', ramschQueue.id)
      }
    }

    const gamesPerRound = getGamesPerRound(session.player_count)
    if (data.game_type === 'ramsch' && data.ramsch_loser_id) {
      await supabase.from('queue_items').insert({ session_id: session.id, type: 'bock', games_remaining: gamesPerRound, priority: 1 })
    }
    if (isNullType(data.game_type) && !data.won) {
      await supabase.from('queue_items').insert({ session_id: session.id, type: 'bock', games_remaining: gamesPerRound, priority: 1 })
    }
    if (!isRamsch && !data.won && !isNullType(data.game_type)) {
      await supabase.from('queue_items').insert({ session_id: session.id, type: 'bock', games_remaining: gamesPerRound, priority: 1 })
    }

    const nextDealerIndex = (session.current_dealer_index + 1) % session.player_count
    await supabase.from('sessions').update({
      current_game_number: gameNumber,
      current_dealer_index: nextDealerIndex,
      total_bock_games: session.total_bock_games + (isBockActive ? 1 : 0),
    }).eq('id', session.id)

    setShowGameForm(false)
    loadData()
  }

  async function deleteGame(game: GameWithScores) {
    if (!confirm(`Spiel ${game.game_number} wirklich löschen?`)) return
    for (const score of game.scores) {
      const player = players.find((p) => p.id === score.player_id)
      if (player) {
        await supabase.from('session_players').update({ total_score: player.total_score - score.score_change }).eq('id', player.id)
      }
    }
    await supabase.from('game_scores').delete().eq('game_id', game.id)
    await supabase.from('games').delete().eq('id', game.id)
    if (session) {
      await supabase.from('sessions').update({
        current_game_number: Math.max(0, session.current_game_number - 1),
        current_dealer_index: (session.current_dealer_index - 1 + session.player_count) % session.player_count,
      }).eq('id', session.id)
    }
    loadData()
  }

  if (loading || !session) {
    return <div className="session-view"><div className="loading-state">Lädt...</div></div>
  }

  const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score)

  return (
    <div className="session-view">
      <header className="session-header">
        <div className="header-left">
          <button className="btn-back" onClick={onBack}>← Zurück</button>
          <div className="session-title">
            <h1>{session.name}</h1>
            <div className="session-meta">
              <span>Geber: {currentDealer?.name}</span>
              <span>•</span>
              <span>Spiel {session.current_game_number + 1}</span>
            </div>
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowGameForm(true)}>+ Spiel eintragen</button>
      </header>

      <div className="status-queue-row">
        <div className="statuszeile">
          <span className={`status-label ${isBockActive ? 'status-bock' : isRamschQueued ? 'status-ramsch' : 'status-normal'}`}>
            {isBockActive ? 'Bock' : isRamschQueued ? 'Ramsch' : 'Normal'}
          </span>
        </div>
        <div className="warteschlange">
          {(() => {
            const pending = queue.filter(q => q.games_remaining > 0)
            const items: { label: string; cls: string }[] = []
            for (const q of pending) {
              const letter = q.type === 'bock' ? 'B' : 'R'
              const cls = q.type === 'bock' ? 'q-bock' : 'q-ramsch'
              items.push({ label: `${letter}×${q.games_remaining}`, cls })
            }
            if (items.length === 0) items.push({ label: 'N', cls: 'q-normal' })
            return items.map((item, i) => (
              <span key={i} className="queue-item-wrap">
                {i > 0 && <span className="queue-arrow">›</span>}
                <span className={`queue-item ${item.cls}`}>{item.label}</span>
              </span>
            ))
          })()}
        </div>
      </div>

      <div className="session-content">
        <div className="scoreboard-section">
          <h2>Stand</h2>
          <div className="scoreboard">
            {sortedPlayers.map((p, idx) => (
              <div key={p.id} className={`scoreboard-row ${idx === 0 ? 'leader' : ''}`}>
                <div className="scoreboard-rank">{idx + 1}</div>
                <div className="scoreboard-name">{p.name}</div>
                <div className={`scoreboard-value ${p.total_score >= 0 ? 'score-positive' : 'score-negative'}`}>
                  {p.total_score >= 0 ? '+' : ''}{p.total_score}
                </div>
              </div>
            ))}
          </div>
          <div className="payout-section">
            <h3>Auszahlung</h3>
            <div className="payout-grid">
              {sortedPlayers.map((p) => (
                <div key={p.id} className="payout-row">
                  <span>{p.name}</span>
                  <span>{p.total_score * session.cent_per_point} Ct</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="game-list-section">
          <h2>Spielverlauf</h2>
          {games.length === 0 ? (
            <div className="empty-state small">
              <p>Noch keine Spiele. Tragen Sie das erste Spiel ein.</p>
            </div>
          ) : (
            <div className="game-list">
              {[...games].reverse().map((g) => (
                <div key={g.id} className="game-card">
                  <div className="game-card-header">
                    <span className="game-number">#{g.game_number}</span>
                    <span className={`game-type-badge ${g.is_ramsch ? 'ramsch' : ''}`}>
                      {getGameLabel(g.game_type as GameType)}
                    </span>
                    {g.is_bock && <span className="badge badge-bock small">Bock</span>}
                    {g.is_spaltarsch && <span className="badge badge-spaltarsch">Spaltarsch</span>}
                    {g.won ? (
                      <span className="badge badge-win">Gewonnen</span>
                    ) : (
                      <span className="badge badge-lost">Verloren</span>
                    )}
                  </div>
                  <div className="game-card-body">
                    {isRamschType(g.game_type as GameType) ? (
                      g.ramsch_durchmarsch ? (
                        <span>Durchmarsch: {g.soloist_name}</span>
                      ) : (
                        <span>
                          Verlierer: {g.ramsch_loser_name}
                          {g.ramsch_augen !== null && g.ramsch_augen > 0 && (
                            <span className="augen-display"> ({g.ramsch_augen} Augen)</span>
                          )}
                        </span>
                      )
                    ) : (
                      <span>Spieler: {g.soloist_name}</span>
                    )}
                    <span className="game-value">{g.calculated_value} Punkte</span>
                  </div>
                  <div className="game-card-scores">
                    {g.scores.map((s) => {
                      const player = players.find((p) => p.id === s.player_id)
                      return (
                        <span key={s.id} className="game-score-chip">
                          {player?.name}: {s.score_change >= 0 ? '+' : ''}{s.score_change}
                        </span>
                      )
                    })}
                  </div>
                  <button className="btn-delete-small" onClick={() => deleteGame(g)}>Löschen</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showGameForm && (
        <GameForm
          players={players}
          dealerIndex={session.current_dealer_index}
          isBockActive={isBockActive}
          ramschQueueActive={isRamschQueued}
          onSubmit={handleGameSubmit}
          onCancel={() => setShowGameForm(false)}
        />
      )}
    </div>
  )
}
