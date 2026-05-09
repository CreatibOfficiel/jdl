import type { GameConfig } from './lobby';

export type DifficultyLevel = 'soft' | 'medium' | 'hardcore';

export const DIFFICULTY_LEVELS: ReadonlyArray<DifficultyLevel> = ['soft', 'medium', 'hardcore'];

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
