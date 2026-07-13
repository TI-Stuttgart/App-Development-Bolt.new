import { useState } from 'react'
import type { GameType, SessionPlayer } from './supabase'
import {
  SUIT_GAME_TYPES,
  NULL_GAME_TYPES,
  RAMSCH_GAME_TYPES,
  getGameLabel,
  calculateGameValue,
  isNullType,
  isRamschType,
} from './scoring'

type Props = {
  players: SessionPlayer[]
  dealerIndex: number
  isBockActive: boolean
  ramschQueueActive: boolean
  onSubmit: (data: GameFormData) => void
  onCancel: () => void
}

export type GameFormData = {
  game_type: GameType
  soloist_id: string | null
  won: boolean
  buben_count: number
  buben_with: boolean
  hand: boolean
  schneider: boolean
  schneider_announced: boolean
  schwarz: boolean
  schwarz_announced: boolean
  ouvert: boolean
  kontra: boolean
  re: boolean
  ramsch_loser_id: string | null
  ramsch_schieben_count: number
  ramsch_jungfrau: boolean
  ramsch_durchmarsch: boolean
  ramsch_augen: number
  is_spaltarsch: boolean
}

export default function GameForm({
  players,
  dealerIndex,
  isBockActive,
  ramschQueueActive,
  onSubmit,
  onCancel,
}: Props) {
  const [gameType, setGameType] = useState<GameType>('kreuz')
  const [soloistId, setSoloistId] = useState<string>('')
  const [won, setWon] = useState(true)
  const [bubenCount, setBubenCount] = useState(0)
  const [bubenWith, setBubenWith] = useState(true)
  const [hand, setHand] = useState(false)
  const [schneider, setSchneider] = useState(false)
  const [schneiderAnnounced, setSchneiderAnnounced] = useState(false)
  const [schwarz, setSchwarz] = useState(false)
  const [schwarzAnnounced, setSchwarzAnnounced] = useState(false)
  const [ouvert, setOuvert] = useState(false)
  const [kontra, setKontra] = useState(false)
  const [re, setRe] = useState(false)
  const [ramschLoserId, setRamschLoserId] = useState<string>('')
  const [ramschSchiebenCount, setRamschSchiebenCount] = useState(0)
  const [ramschJungfrau, setRamschJungfrau] = useState(false)
  const [ramschDurchmarsch, setRamschDurchmarsch] = useState(false)
  const [ramschAugen, setRamschAugen] = useState(0)
  const [isSpaltarsch, setIsSpaltarsch] = useState(false)

  const isRamsch = isRamschType(gameType)
  const isNull = isNullType(gameType)
  const isSuitOrGrand = !isRamsch && !isNull

  const eligibleSoloists = players.filter((_, i) => i !== dealerIndex)

  const previewValue = calculateGameValue({
    game_type: gameType,
    won,
    buben_count: isSuitOrGrand ? bubenCount : null,
    buben_with: bubenWith,
    hand,
    schneider,
    schneider_announced: schneiderAnnounced,
    schwarz,
    schwarz_announced: schwarzAnnounced,
    ouvert,
    kontra,
    re,
    is_bock: isBockActive,
    ramsch_schieben_count: ramschSchiebenCount,
    ramsch_jungfrau: ramschJungfrau,
    ramsch_durchmarsch: ramschDurchmarsch,
    ramsch_augen: isRamsch ? ramschAugen : null,
    is_spaltarsch: isSpaltarsch,
    lost_doubling_count: 0,
  })

  const gameTypeCategories = [
    { label: 'Farbspiel', types: SUIT_GAME_TYPES as GameType[] },
    { label: 'Grand', types: ['grand'] as GameType[] },
    { label: 'Null', types: NULL_GAME_TYPES as GameType[] },
    { label: 'Ramsch', types: RAMSCH_GAME_TYPES as GameType[] },
  ]

  function handleSubmit() {
    if (isRamsch) {
      if (ramschDurchmarsch) {
        const winner = players.find((_, i) => i !== dealerIndex)
        onSubmit({
          game_type: gameType,
          soloist_id: winner?.id || null,
          won: true,
          buben_count: 0,
          buben_with: true,
          hand: false,
          schneider: false,
          schneider_announced: false,
          schwarz: false,
          schwarz_announced: false,
          ouvert: false,
          kontra,
          re,
          ramsch_loser_id: null,
          ramsch_schieben_count: ramschSchiebenCount,
          ramsch_jungfrau: ramschJungfrau,
          ramsch_durchmarsch: true,
          ramsch_augen: ramschAugen,
          is_spaltarsch: false,
        })
      } else {
        if (!ramschLoserId) return
        onSubmit({
          game_type: gameType,
          soloist_id: null,
          won: false,
          buben_count: 0,
          buben_with: true,
          hand,
          schneider: false,
          schneider_announced: false,
          schwarz,
          schwarz_announced: false,
          ouvert: false,
          kontra,
          re,
          ramsch_loser_id: ramschLoserId,
          ramsch_schieben_count: ramschSchiebenCount,
          ramsch_jungfrau: ramschJungfrau,
          ramsch_durchmarsch: false,
          ramsch_augen: ramschAugen,
          is_spaltarsch: isSpaltarsch,
        })
      }
    } else {
      if (!soloistId) return
      onSubmit({
        game_type: gameType,
        soloist_id: soloistId,
        won,
        buben_count: isSuitOrGrand ? bubenCount : 0,
        buben_with: bubenWith,
        hand,
        schneider,
        schneider_announced: schneiderAnnounced,
        schwarz,
        schwarz_announced: schwarzAnnounced,
        ouvert,
        kontra,
        re,
        ramsch_loser_id: null,
        ramsch_schieben_count: 0,
        ramsch_jungfrau: false,
        ramsch_durchmarsch: false,
        ramsch_augen: 0,
        is_spaltarsch: false,
      })
    }
  }

  const canSubmit = isRamsch ? ramschDurchmarsch || ramschLoserId : soloistId

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal game-form-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Neues Spiel</h2>

        {isBockActive && (
          <div className="info-banner info-banner-bock">
            Bock ist aktiv — der Spielwert wird verdoppelt
          </div>
        )}
        {ramschQueueActive && !isRamsch && (
          <div className="info-banner info-banner-ramsch">
            Ramsch-Queue ist aktiv — bei diesem Spiel muss Ramsch gespielt werden
          </div>
        )}

        <div className="form-section">
          <label className="form-section-label">Spielart</label>
          <div className="game-type-categories">
            {gameTypeCategories.map((cat) => (
              <div key={cat.label} className="game-type-category">
                <span className="category-label">{cat.label}</span>
                <div className="category-buttons">
                  {cat.types.map((t) => (
                    <button
                      key={t}
                      className={`game-type-btn ${gameType === t ? 'selected' : ''}`}
                      onClick={() => {
                        setGameType(t)
                        setWon(true)
                        if (isRamschType(t)) {
                          setBubenCount(0)
                          setSchneider(false)
                          setSchneiderAnnounced(false)
                          setSchwarzAnnounced(false)
                          setOuvert(false)
                          setIsSpaltarsch(false)
                        }
                      }}
                    >
                      {getGameLabel(t)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!isRamsch && (
          <div className="form-section">
            <label className="form-section-label">Einzelspieler</label>
            <div className="player-selector">
              {eligibleSoloists.map((p) => (
                <button
                  key={p.id}
                  className={`player-select-btn ${soloistId === p.id ? 'selected' : ''}`}
                  onClick={() => setSoloistId(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isRamsch && !isNull && (
          <div className="form-section">
            <label className="form-section-label">Ergebnis</label>
            <div className="won-toggle">
              <button className={won ? 'selected win' : ''} onClick={() => setWon(true)}>
                Gewonnen
              </button>
              <button className={!won ? 'selected lose' : ''} onClick={() => setWon(false)}>
                Verloren
              </button>
            </div>
          </div>
        )}

        {isRamsch && (
          <>
            <div className="form-section">
              <label className="form-section-label">Ramsch-Ergebnis</label>
              <div className="won-toggle">
                <button
                  className={!ramschDurchmarsch ? 'selected lose' : ''}
                  onClick={() => setRamschDurchmarsch(false)}
                >
                  Verlierer festlegen
                </button>
                <button
                  className={ramschDurchmarsch ? 'selected win' : ''}
                  onClick={() => setRamschDurchmarsch(true)}
                >
                  Durchmarsch
                </button>
              </div>
            </div>

            {!ramschDurchmarsch && (
              <div className="form-section">
                <label className="form-section-label">Verlierer</label>
                <div className="player-selector">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      className={`player-select-btn ${ramschLoserId === p.id ? 'selected' : ''}`}
                      onClick={() => setRamschLoserId(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!ramschDurchmarsch && (
              <div className="form-section">
                <label className="form-section-label">Augen des Verlierers (inkl. Skat)</label>
                <div className="augen-input">
                  <input
                    type="number"
                    value={ramschAugen}
                    onChange={(e) => setRamschAugen(Math.max(0, Math.min(120, Number(e.target.value))))}
                    min={0}
                    max={120}
                    placeholder="z.B. 85"
                  />
                  <span className="augen-hint">Die Augen werden zum Wert addiert</span>
                </div>
                <button
                  className={`btn-spaltarsch ${isSpaltarsch ? 'selected' : ''}`}
                  onClick={() => setIsSpaltarsch(!isSpaltarsch)}
                >
                  Spaltarsch (60:60 — Wert +1)
                </button>
              </div>
            )}

            <div className="form-section">
              <label className="form-section-label">Ramsch-Optionen</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={ramschJungfrau}
                    onChange={(e) => setRamschJungfrau(e.target.checked)}
                    disabled={ramschDurchmarsch}
                  />
                  Jungfrau
                </label>
                <label className="checkbox-label">
                  <span>Schieben (x{ramschSchiebenCount})</span>
                  <div className="counter-buttons">
                    <button
                      onClick={() => setRamschSchiebenCount(Math.max(0, ramschSchiebenCount - 1))}
                      disabled={ramschDurchmarsch}
                    >
                      −
                    </button>
                    <span>{ramschSchiebenCount}</span>
                    <button
                      onClick={() => setRamschSchiebenCount(ramschSchiebenCount + 1)}
                      disabled={ramschDurchmarsch}
                    >
                      +
                    </button>
                  </div>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={hand}
                    onChange={(e) => setHand(e.target.checked)}
                    disabled={ramschDurchmarsch}
                  />
                  Hand
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={schwarz}
                    onChange={(e) => setSchwarz(e.target.checked)}
                    disabled={ramschDurchmarsch}
                  />
                  Schwarz (Gegner)
                </label>
              </div>
            </div>
          </>
        )}

        {isSuitOrGrand && (
          <>
            <div className="form-section">
              <label className="form-section-label">Buben (Spitzen)</label>
              <div className="buben-controls">
                <div className="counter-buttons">
                  <button onClick={() => setBubenCount(Math.max(0, bubenCount - 1))}>−</button>
                  <span className="counter-value">{bubenCount}</span>
                  <button onClick={() => setBubenCount(Math.min(4, bubenCount + 1))}>+</button>
                </div>
                <div className="buben-direction">
                  <button className={bubenWith ? 'selected' : ''} onClick={() => setBubenWith(true)}>
                    Mit
                  </button>
                  <button className={!bubenWith ? 'selected' : ''} onClick={() => setBubenWith(false)}>
                    Ohne
                  </button>
                </div>
              </div>
            </div>

            <div className="form-section">
              <label className="form-section-label">Zusätze</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={hand} onChange={(e) => setHand(e.target.checked)} />
                  Hand
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={schneider} onChange={(e) => setSchneider(e.target.checked)} />
                  Schneider
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={schneiderAnnounced} onChange={(e) => setSchneiderAnnounced(e.target.checked)} />
                  Schneider angesagt
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={schwarz} onChange={(e) => setSchwarz(e.target.checked)} />
                  Schwarz
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={schwarzAnnounced} onChange={(e) => setSchwarzAnnounced(e.target.checked)} />
                  Schwarz angesagt
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={ouvert} onChange={(e) => setOuvert(e.target.checked)} />
                  Ouvert
                </label>
              </div>
            </div>
          </>
        )}

        <div className="form-section">
          <label className="form-section-label">Kontra / Re</label>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" checked={kontra} onChange={(e) => setKontra(e.target.checked)} />
              Kontra
            </label>
            <label className="checkbox-label">
              <input type="checkbox" checked={re} onChange={(e) => setRe(e.target.checked)} disabled={!kontra} />
              Re
            </label>
          </div>
        </div>

        <div className="value-preview">
          <div className="value-preview-label">Berechneter Wert</div>
          <div className="value-preview-amount">{previewValue.value} Punkte</div>
          {isBockActive && <div className="value-preview-detail">Bock aktiv (×2)</div>}
          {isRamsch && ramschAugen > 0 && !ramschDurchmarsch && (
            <div className="value-preview-detail">
              Multiplikator: {previewValue.multiplier} + {ramschAugen} Augen
            </div>
          )}
          {isSpaltarsch && <div className="value-preview-detail">Spaltarsch (+1 Multiplikator)</div>}
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Abbrechen
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
            Spiel speichern
          </button>
        </div>
      </div>
    </div>
  )
}
