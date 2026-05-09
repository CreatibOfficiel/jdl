import { BOARD_SIZE, FINISH_POSITION } from '@jeu-soiree/shared';
import type { SeededRandom } from '../boardGenerator/seed';

const DICE_MIN = 1;
const DICE_MAX = 6;

export function rollDice(rng: SeededRandom): number {
  return rng.nextInt(DICE_MIN, DICE_MAX);
}

export interface MoveResult {
  newPosition: number;
  bounced: boolean;
  reachedFinish: boolean;
}

/**
 * Apply a dice move. If overshooting the finish, the pawn bounces back from FINISH.
 * Hitting the finish exactly = victory.
 */
export function applyMove(
  currentPosition: number,
  diceValue: number,
  boardSize: number = BOARD_SIZE,
): MoveResult {
  const target = currentPosition + diceValue;
  if (target === boardSize) {
    return { newPosition: boardSize, bounced: false, reachedFinish: true };
  }
  if (target < boardSize) {
    return { newPosition: target, bounced: false, reachedFinish: false };
  }
  // Overshoot — bounce back from finish
  const surplus = target - boardSize;
  return { newPosition: boardSize - surplus, bounced: true, reachedFinish: false };
}

export function nextTurnIndex(currentIndex: number, totalPlayers: number): number {
  if (totalPlayers <= 0) return 0;
  return (currentIndex + 1) % totalPlayers;
}

export interface RollOrderEntry {
  playerId: string;
  roll: number;
}

export type OrderResult =
  | { resolved: true; order: string[] }
  | { resolved: false; tiebreakIds: string[] };

/**
 * Determine turn order from rolling-order rolls.
 * - All players sorted descending by roll value
 * - If any tier has multiple players (ex-aequo), they must roll again — return them
 * - Returns the smallest unresolved tier first (highest scorers tied first)
 */
export function determineTurnOrder(rolls: ReadonlyArray<RollOrderEntry>): OrderResult {
  if (rolls.length === 0) {
    return { resolved: true, order: [] };
  }

  const sorted = [...rolls].sort((a, b) => b.roll - a.roll);

  // Find the highest tier with a tie
  let i = 0;
  while (i < sorted.length) {
    const value = sorted[i]?.roll;
    let j = i;
    while (j < sorted.length && sorted[j]?.roll === value) j++;
    if (j - i > 1) {
      const tied = sorted.slice(i, j).map((r) => r.playerId);
      return { resolved: false, tiebreakIds: tied };
    }
    i = j;
  }

  return { resolved: true, order: sorted.map((r) => r.playerId) };
}

/** Just a sanity helper exposed for tests / callers. */
export const FINISH = FINISH_POSITION;
