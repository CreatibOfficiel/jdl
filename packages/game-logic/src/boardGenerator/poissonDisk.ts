import type { SeededRandom } from './seed';

/**
 * Picks a single position in [rangeMin, rangeMax] that:
 * - is not flagged as occupied by `isOccupied`
 * - is at least `minDistance` cases away from every entry in `existingPositions`
 *
 * Returns null if no valid candidate exists.
 */
export function pickPositionWithMinDistance(
  rng: SeededRandom,
  rangeMin: number,
  rangeMax: number,
  isOccupied: (i: number) => boolean,
  existingPositions: readonly number[],
  minDistance: number,
): number | null {
  const candidates: number[] = [];
  for (let i = rangeMin; i <= rangeMax; i++) {
    if (isOccupied(i)) continue;
    let ok = true;
    for (const p of existingPositions) {
      if (Math.abs(p - i) < minDistance) {
        ok = false;
        break;
      }
    }
    if (ok) candidates.push(i);
  }
  if (candidates.length === 0) return null;
  return rng.pick(candidates);
}
