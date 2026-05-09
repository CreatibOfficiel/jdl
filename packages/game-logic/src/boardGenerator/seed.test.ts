import { describe, expect, it } from 'vitest';
import { SeededRandom } from './seed';

describe('SeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRandom('hello');
    const b = new SeededRandom('hello');
    const seqA = Array.from({ length: 100 }, () => a.nextFloat());
    const seqB = Array.from({ length: 100 }, () => b.nextFloat());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRandom('hello');
    const b = new SeededRandom('world');
    const seqA = Array.from({ length: 50 }, () => a.nextFloat());
    const seqB = Array.from({ length: 50 }, () => b.nextFloat());
    expect(seqA).not.toEqual(seqB);
  });

  it('returns floats in [0, 1)', () => {
    const r = new SeededRandom('test');
    for (let i = 0; i < 1000; i++) {
      const v = r.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns values in [min, max] inclusive', () => {
    const r = new SeededRandom('range');
    for (let i = 0; i < 1000; i++) {
      const v = r.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextInt covers the full inclusive range over many draws', () => {
    const r = new SeededRandom('coverage');
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      seen.add(r.nextInt(1, 6));
    }
    expect(seen.size).toBe(6);
  });

  it('shuffle preserves all elements', () => {
    const r = new SeededRandom('shuffle');
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = r.shuffle(original);
    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
  });

  it('pick returns an element from the array', () => {
    const r = new SeededRandom('pick');
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(r.pick(arr));
    }
  });

  it('pick throws on empty array', () => {
    const r = new SeededRandom('empty');
    expect(() => r.pick([])).toThrow();
  });
});
