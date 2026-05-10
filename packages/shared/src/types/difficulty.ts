import type { GameConfig } from './lobby';

export type DifficultyLevel = 'soft' | 'medium' | 'hardcore';

export const DIFFICULTY_LEVELS: ReadonlyArray<DifficultyLevel> = ['soft', 'medium', 'hardcore'];

/** Harm-reduction caps grounded in NHS / NIAAA / Drinkaware guidance.
 *  Conversion convention used here: 4 sips ≈ 1 standard drink ≈ 1 unit metabolised per hour. */
export interface SafetyCaps {
  /** When a player would absorb more than this in a 10-min tumbling window, the next sip is halved. */
  maxSipsPer10Min: number;
  /** A 💧 hydration prompt is pushed into the EventLog every N turns (global, not per-player). */
  hydrationEveryNTurns: number;
  /** After this many consecutive cap triggers in the same window, auto-swap drink-pref players to
   *  the equivalence fallback (pushups) for the rest of the window. Reset on window decay. */
  autoSwapAfterCaps: number;
}

/** ~4 sips/10min = ~1 drink/10min = caps "worst-case" pace ≈ 6 drinks/h, well above WHO low-risk
 *  but mirrors the NIAAA "binge" pace at hardcore. Soft halves it; hardcore approaches it. */
export const SAFETY_BY_DIFFICULTY: Record<DifficultyLevel, SafetyCaps> = {
  soft: { maxSipsPer10Min: 4, hydrationEveryNTurns: 4, autoSwapAfterCaps: 2 },
  medium: { maxSipsPer10Min: 6, hydrationEveryNTurns: 6, autoSwapAfterCaps: 2 },
  hardcore: { maxSipsPer10Min: 8, hydrationEveryNTurns: 8, autoSwapAfterCaps: 3 },
};

export const SAFETY_WINDOW_MS = 10 * 60 * 1000;

export interface DifficultyMeta {
  level: DifficultyLevel;
  emoji: string;
  label: string;
  /** Short pitch shown in UI (e.g. "tranquille, pour démarrer doucement"). */
  description: string;
  config: GameConfig;
}

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyMeta> = {
  soft: {
    level: 'soft',
    emoji: '🍃',
    label: 'Soft',
    description: 'Petite soirée tranquille. Cartes valent peu de gorgées.',
    config: { sipsPerCard: 2, witchPotionSips: 3, ptMalusSips: 4 },
  },
  medium: {
    level: 'medium',
    emoji: '🍻',
    label: 'Medium',
    description: 'Équilibré. Le défaut historique du jeu.',
    config: { sipsPerCard: 3, witchPotionSips: 5, ptMalusSips: 6 },
  },
  hardcore: {
    level: 'hardcore',
    emoji: '🔥',
    label: 'Hardcore',
    description: 'Soirée musclée. À jouer avec modération.',
    config: { sipsPerCard: 5, witchPotionSips: 8, ptMalusSips: 10 },
  },
};

export const GAME_CONFIG_BY_DIFFICULTY: Record<DifficultyLevel, GameConfig> = {
  soft: DIFFICULTY_PRESETS.soft.config,
  medium: DIFFICULTY_PRESETS.medium.config,
  hardcore: DIFFICULTY_PRESETS.hardcore.config,
};

export function isDifficultyLevel(value: unknown): value is DifficultyLevel {
  return typeof value === 'string' && (DIFFICULTY_LEVELS as ReadonlyArray<string>).includes(value);
}
