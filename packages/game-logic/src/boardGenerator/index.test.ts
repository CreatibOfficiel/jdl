import type { Board } from '@jeu-soiree/shared';
import { describe, expect, it } from 'vitest';
import { validateBoard } from './constraints';
import { generateBoard } from './index';

const SEED_COUNT = 100;
const seeds = Array.from(
  { length: SEED_COUNT },
  (_, i) => `seed-${i}-${(i * 31 + 7).toString(36)}`,
);

describe('generateBoard', () => {
  it(`produces a valid board for ${SEED_COUNT} distinct seeds`, () => {
    const failures: string[] = [];
    for (const seed of seeds) {
      let board: Board;
      try {
        board = generateBoard(seed);
      } catch (e) {
        failures.push(`seed=${seed}: ${(e as Error).message}`);
        continue;
      }
      const v = validateBoard(board);
      if (!v.ok) {
        failures.push(`seed=${seed}: ${v.errors.join(' | ')}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('is deterministic for the same seed', () => {
    const a = generateBoard('determinism');
    const b = generateBoard('determinism');
    expect(a).toEqual(b);
  });

  it('produces different boards for different seeds', () => {
    const a = generateBoard('alpha');
    const b = generateBoard('beta');
    expect(a).not.toEqual(b);
  });

  it('returns 63 cases with indices 1..63', () => {
    const board = generateBoard('index-coverage');
    expect(board.cases).toHaveLength(63);
    const indices = board.cases.map((c) => c.index).sort((a, b) => a - b);
    expect(indices).toEqual(Array.from({ length: 63 }, (_, i) => i + 1));
  });

  it('exposes the seed verbatim on the returned board', () => {
    const board = generateBoard('THIB-4F2K');
    expect(board.seed).toBe('THIB-4F2K');
  });

  it('all number cases have a numberValue', () => {
    const board = generateBoard('number-values');
    for (const c of board.cases) {
      if (c.type === 'red_number' || c.type === 'green_number') {
        expect(c.numberValue).toBeGreaterThanOrEqual(1);
        expect(c.numberValue).toBeLessThanOrEqual(5);
      }
    }
  });

  it('every portal carries a portalPairId, with two pairs', () => {
    const board = generateBoard('portal-check');
    const portals = board.cases.filter((c) => c.type === 'portal');
    expect(portals).toHaveLength(4);
    for (const p of portals) {
      expect(p.portalPairId).toBeDefined();
    }
    const pairIds = new Set(portals.map((p) => p.portalPairId));
    expect(pairIds.size).toBe(2);
  });
});
