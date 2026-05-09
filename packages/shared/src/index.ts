export {
  BOARD_CONSTRAINTS,
  BOARD_SIZE,
  CASE_CASTING,
  FINISH_POSITION,
  NUMBER_VALUES,
  START_POSITION,
} from './constants/board';
export { PAWN_COLOR_IDS, PAWN_COLORS, type PawnColor } from './constants/colors';
export { AVATAR_EMOJIS } from './constants/emojis';
export type { BoardCase, CaseType, Suit } from './types/case';
export {
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  type DifficultyLevel,
  type DifficultyMeta,
  GAME_CONFIG_BY_DIFFICULTY,
  isDifficultyLevel,
  SAFETY_BY_DIFFICULTY,
  type SafetyCaps,
  SAFETY_WINDOW_MS,
} from './types/difficulty';
export {
  EQUIVALENCE_KINDS,
  EQUIVALENCE_TABLE,
  type EquivalenceKind,
  type EquivalenceRule,
  isEquivalenceKind,
} from './types/equivalence';
export type { Board, ThirstZone } from './types/game';
export {
  DEFAULT_GAME_CONFIG,
  type GameConfig,
  type GamePhase,
} from './types/lobby';
export type { ClientToServerMessage, ServerToClientMessage } from './types/messages';
export type { ItemType, PlayerJoinPayload, PlayerStatus } from './types/player';
export { generateGameCode, isValidGameCode, normalizeGameCode } from './utils/codes';
