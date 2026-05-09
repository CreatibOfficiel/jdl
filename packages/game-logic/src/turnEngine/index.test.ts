import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../boardGenerator/seed';
import { applyMove, determineTurnOrder, nextTurnIndex, rollDice } from './index';

describe('rollDice', () => {
  it('returns values in [1,6]', () => {
    const rng = new SeededRandom('dice-roll');
    for (let i = 0; i < 1000; i++) {
      const v = rollDice(rng);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('covers every face given enough rolls', () => {
    const rng = new SeededRandom('dice-coverage');
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) seen.add(rollDice(rng));
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });
});

describe('applyMove', () => {
  it('moves forward when within bounds', () => {
    expect(applyMove(10, 4)).toEqual({ newPosition: 14, bounced: false, reachedFinish: false });
  });

  it('reaches the finish on exact landing', () => {
    expect(applyMove(60, 3)).toEqual({ newPosition: 63, bounced: false, reachedFinish: true });
  });

  it('bounces back on overshoot', () => {
    expect(applyMove(60, 5)).toEqual({ newPosition: 61, bounced: true, reachedFinish: false });
  });

  it('bounces from 62 with a 6 → ends at 59', () => {
    // 62 + 6 = 68, surplus = 5, newPosition = 63 - 5 = 58
    expect(applyMove(62, 6).newPosition).toBe(58);
  });

  it('treats start (0) movement correctly', () => {
    expect(applyMove(0, 3)).toEqual({ newPosition: 3, bounced: false, reachedFinish: false });
  });
});

describe('nextTurnIndex', () => {
  it('cycles through players', () => {
    expect(nextTurnIndex(0, 3)).toBe(1);
    expect(nextTurnIndex(1, 3)).toBe(2);
    expect(nextTurnIndex(2, 3)).toBe(0);
  });

  it('handles 0 players safely', () => {
    expect(nextTurnIndex(0, 0)).toBe(0);
  });
});

describe('determineTurnOrder', () => {
  it('orders all players descending by roll', () => {
    const result = determineTurnOrder([
      { playerId: 'a', roll: 3 },
      { playerId: 'b', roll: 5 },
      { playerId: 'c', roll: 2 },
    ]);
    expect(result).toEqual({ resolved: true, order: ['b', 'a', 'c'] });
  });

  it('flags top tier ex-aequo for retry', () => {
    const result = determineTurnOrder([
      { playerId: 'a', roll: 5 },
      { playerId: 'b', roll: 5 },
      { playerId: 'c', roll: 3 },
    ]);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.tiebreakIds.sort()).toEqual(['a', 'b']);
    }
  });

  it('flags mid-tier ex-aequo for retry', () => {
    const result = determineTurnOrder([
      { playerId: 'a', roll: 6 },
      { playerId: 'b', roll: 4 },
      { playerId: 'c', roll: 4 },
      { playerId: 'd', roll: 1 },
    ]);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.tiebreakIds.sort()).toEqual(['b', 'c']);
    }
  });

  it('handles empty list', () => {
    expect(determineTurnOrder([])).toEqual({ resolved: true, order: [] });
  });

  it('handles a single player', () => {
    expect(determineTurnOrder([{ playerId: 'solo', roll: 4 }])).toEqual({
      resolved: true,
      order: ['solo'],
    });
  });
});
