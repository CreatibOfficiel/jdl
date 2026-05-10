import { describe, expect, it } from 'vitest';
import { validateBoard } from './constraints';
import { generateBoard } from './index';

const SEEDS = ['hello', 'party', 'THIB-4F2K'];

describe('generateBoard difficulty', () => {
  it("default arg matches explicit 'medium' (regression guard)", () => {
    for (const seed of SEEDS) {
      expect(generateBoard(seed)).toEqual(generateBoard(seed, 'medium'));
    }
  });

  it('medium boards are byte-stable across runs (snapshot)', () => {
    for (const seed of SEEDS) {
      expect(generateBoard(seed, 'medium')).toMatchSnapshot();
    }
  });

  it('soft has thirst zone at the configured min length', () => {
    for (const seed of SEEDS) {
      const board = generateBoard(seed, 'soft');
      expect(board.thirstZone.length).toBe(5);
      expect(validateBoard(board).ok).toBe(true);
    }
  });

  it('hardcore has thirst zone at the configured max length', () => {
    for (const seed of SEEDS) {
      const board = generateBoard(seed, 'hardcore');
      expect(board.thirstZone.length).toBe(7);
      expect(validateBoard(board).ok).toBe(true);
    }
  });

  it('hardcore has more red cards than soft on average', () => {
    let softReds = 0;
    let hardcoreReds = 0;
    const probeSeeds = Array.from({ length: 30 }, (_, i) => `probe-${i}`);
    for (const seed of probeSeeds) {
      softReds += generateBoard(seed, 'soft').cases.filter((c) => c.type === 'red_number').length;
      hardcoreReds += generateBoard(seed, 'hardcore').cases.filter(
        (c) => c.type === 'red_number',
      ).length;
    }
    expect(hardcoreReds).toBeGreaterThan(softReds);
  });

  it('all 3 difficulties produce a valid board for the canonical seeds', () => {
    for (const difficulty of ['soft', 'medium', 'hardcore'] as const) {
      for (const seed of SEEDS) {
        const board = generateBoard(seed, difficulty);
        const v = validateBoard(board);
        expect(v.ok, `seed=${seed} difficulty=${difficulty}: ${v.ok ? '' : v.errors.join(', ')}`).toBe(true);
      }
    }
  });
});
