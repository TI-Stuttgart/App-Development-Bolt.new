import type { GameType } from './supabase'

export const GAME_BASE_VALUES: Record<string, number> = {
  kreuz: 12,
  pik: 11,
  herz: 10,
  karo: 9,
  grand: 24,
  null: 23,
  null_hand: 35,
  null_ouvert: 46,
  null_ouvert_hand: 59,
  ramsch: 0,
  tischramsch: 0,
}

export const GAME_LABELS: Record<string, string> = {
  kreuz: 'Kreuz',
  pik: 'Pik',
  herz: 'Herz',
  karo: 'Karo',
  grand: 'Grand',
  null: 'Null',
  null_hand: 'Null Hand',
  null_ouvert: 'Null Ouvert',
  null_ouvert_hand: 'Null Ouvert Hand',
  ramsch: 'Ramsch',
  tischramsch: 'Tischramsch',
}

export const RAMSCH_GAME_TYPES = ['ramsch', 'tischramsch']
export const NULL_GAME_TYPES = ['null', 'null_hand', 'null_ouvert', 'null_ouvert_hand']
export const SUIT_GAME_TYPES = ['kreuz', 'pik', 'herz', 'karo']

export function isRamschType(type: GameType): boolean {
  return type === 'ramsch' || type === 'tischramsch'
}

export function isNullType(type: GameType): boolean {
  return NULL_GAME_TYPES.includes(type)
}

export function isSuitOrGrand(type: GameType): boolean {
  return SUIT_GAME_TYPES.includes(type) || type === 'grand'
}

export type ScoringInput = {
  game_type: GameType
  won: boolean
  buben_count: number | null
  buben_with: boolean | null
  hand: boolean
  schneider: boolean
  schneider_announced: boolean
  schwarz: boolean
  schwarz_announced: boolean
  ouvert: boolean
  kontra: boolean
  re: boolean
  is_bock: boolean
  ramsch_schieben_count: number
  ramsch_jungfrau: boolean
  ramsch_durchmarsch: boolean
  ramsch_augen: number | null
  is_spaltarsch: boolean
  lost_doubling_count: number
}

export type ScoringResult = {
  value: number
  multiplier: number
}

export function calculateGameValue(input: ScoringInput): ScoringResult {
  const {
    game_type,
    buben_count,
    hand,
    schneider,
    schneider_announced,
    schwarz,
    schwarz_announced,
    ouvert,
    kontra,
    re,
    is_bock,
    ramsch_schieben_count,
    ramsch_jungfrau,
    ramsch_durchmarsch,
    ramsch_augen,
    is_spaltarsch,
  } = input

  if (isNullType(game_type)) {
    const base = GAME_BASE_VALUES[game_type]
    let value = base
    if (is_bock) value *= 2
    return { value, multiplier: 1 }
  }

  if (isRamschType(game_type)) {
    if (ramsch_durchmarsch) {
      let multiplier = 1
      if (kontra) multiplier *= 2
      if (re) multiplier *= 2
      if (is_bock) multiplier *= 2
      return { value: multiplier, multiplier }
    }

    let multiplier = 1

    if (buben_count !== null && buben_count > 0) {
      multiplier += buben_count
    }
    if (ramsch_jungfrau) multiplier += 1
    if (ramsch_schieben_count > 0) multiplier += ramsch_schieben_count
    if (hand) multiplier += 1
    if (schwarz) multiplier += 1
    if (is_spaltarsch) multiplier += 1
    if (kontra) multiplier *= 2
    if (re) multiplier *= 2
    if (is_bock) multiplier *= 2

    let value = multiplier
    if (ramsch_augen !== null && ramsch_augen > 0) {
      value += ramsch_augen
    }

    return { value, multiplier }
  }

  let multiplier = 1

  if (buben_count !== null && buben_count > 0) {
    multiplier += buben_count
  }
  if (hand) multiplier += 1
  if (schneider) multiplier += 1
  if (schneider_announced) multiplier += 1
  if (schwarz) multiplier += 1
  if (schwarz_announced) multiplier += 1
  if (ouvert) multiplier += 1

  if (kontra) multiplier *= 2
  if (re) multiplier *= 2
  if (is_bock) multiplier *= 2

  const baseValue = GAME_BASE_VALUES[game_type] || 0
  const value = baseValue * multiplier

  return { value, multiplier }
}

export function getGameLabel(type: GameType): string {
  return GAME_LABELS[type] || type
}
