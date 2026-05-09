export type GamePhase = 'lobby' | 'rolling_order' | 'playing' | 'finished';

export interface GameConfig {
  sipsPerCard: number;
  witchPotionSips: number;
  ptMalusSips: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  sipsPerCard: 3,
  witchPotionSips: 5,
  ptMalusSips: 6,
};
