import type { Board, BoardCase } from '@jeu-soiree/shared';
import { describe, expect, it } from 'vitest';
import { validateBoard } from './constraints';
import { generateBoard } from './index';

function clone(board: Board): Board {
  return {
    seed: board.seed,
    thirstZone: { ...board.thirstZone },
    treasureCases: [...board.treasureCases],
    cases: board.cases.map((c) => ({ ...c })),
  };
}

function findCase(board: Board, index: number): BoardCase {
  const c = board.cases.find((x) => x.index === index);
  if (!c) throw new Error(`No case at index ${index}`);
  return c;
}

const validBoard = generateBoard('constraints-baseline');

describe('validateBoard', () => {
  it('accepts a freshly generated board', () => {
    expect(validateBoard(validBoard)).toEqual({ ok: true, errors: [] });
  });

  it('rejects a thirst zone with length < 5', () => {
    const board = clone(validBoard);
    board.thirstZone = { start: 10, length: 3 };
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('thirstZone.length'))).toBe(true);
  });

  it('rejects a thirst zone starting outside [8, 30]', () => {
    const board = clone(validBoard);
    board.thirstZone = { start: 35, length: 6 };
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('thirstZone.start'))).toBe(true);
  });

  it('rejects a board with two adjacent specials', () => {
    const board = clone(validBoard);
    // Force two specials at adjacent positions by retyping cases.
    findCase(board, 1).type = 'shop';
    findCase(board, 2).type = 'witch';
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('adjacent specials'))).toBe(true);
  });

  it('rejects a board with too few reds in the thirst zone', () => {
    const board = clone(validBoard);
    const tzStart = board.thirstZone.start;
    const tzEnd = tzStart + board.thirstZone.length - 1;
    for (const c of board.cases) {
      if (c.index >= tzStart && c.index <= tzEnd && c.type === 'red_number') {
        c.type = 'neutral';
        c.numberValue = undefined;
      }
    }
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('red_number in thirst zone'))).toBe(true);
  });

  it('rejects a board with portal pair too close', () => {
    const board = clone(validBoard);
    const portals = board.cases.filter((c) => c.type === 'portal');
    // Force the two members of pair 0 to be 5 apart (less than the 15 min)
    const pair0 = portals.filter((p) => p.portalPairId === 0);
    const [first, second] = pair0;
    if (first && second) {
      const target = first.index;
      const nearIndex = target + 5 <= 63 ? target + 5 : target - 5;
      const swapWith = board.cases.find((c) => c.index === nearIndex);
      if (swapWith) {
        const oldType = swapWith.type;
        const oldNumber = swapWith.numberValue;
        swapWith.type = 'portal';
        swapWith.portalPairId = 0;
        swapWith.numberValue = undefined;
        second.type = oldType;
        second.portalPairId = undefined;
        second.numberValue = oldNumber;
      }
    }
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
  });

  it('rejects a board with the wrong number of red_number cases', () => {
    const board = clone(validBoard);
    const firstRed = board.cases.find((c) => c.type === 'red_number');
    if (firstRed) {
      firstRed.type = 'green_number';
    }
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('red_number') || e.includes('green_number'))).toBe(true);
  });

  it('rejects a board missing a treasure', () => {
    const board = clone(validBoard);
    const [first] = board.treasureCases;
    if (first === undefined) throw new Error('expected baseline treasure');
    board.treasureCases = [first];
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('treasures'))).toBe(true);
  });

  it('rejects a board with duplicate treasure indices', () => {
    const board = clone(validBoard);
    const [first] = board.treasureCases;
    if (first === undefined) throw new Error('expected baseline treasure');
    board.treasureCases = [first, first];
    const r = validateBoard(board);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes('duplicate treasure'))).toBe(true);
  });
});
