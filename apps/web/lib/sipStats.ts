import type { ClientSipEvent } from '@/types/colyseus';

export interface PairCount {
  from: string;
  to: string;
  count: number;
}

/** Sips received per minute, computed over a rolling window ending at `now`. */
export function sipsPerMinute(
  events: ReadonlyArray<ClientSipEvent>,
  playerId: string,
  now: number = Date.now(),
  windowMs: number = 5 * 60_000,
): number {
  const cutoff = now - windowMs;
  let total = 0;
  for (const e of events) {
    if (e.toId !== playerId) continue;
    if (e.ts < cutoff) continue;
    total += e.count;
  }
  return total / (windowMs / 60_000);
}

/** Total sips by source player (for the "🎁 distribué" column). */
export function sipsGivenSince(
  events: ReadonlyArray<ClientSipEvent>,
  playerId: string,
  sinceTs: number = 0,
): number {
  let total = 0;
  for (const e of events) {
    if (e.fromId !== playerId) continue;
    if (e.ts < sinceTs) continue;
    total += e.count;
  }
  return total;
}

/** Build a from→to→count matrix. Self-drinks (fromId='') and distribute-without-target
 *  (toId='') are filtered out — the heatmap only shows directed pair traffic. */
export function pairMatrix(events: ReadonlyArray<ClientSipEvent>): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const e of events) {
    if (!e.fromId || !e.toId) continue;
    let row = map.get(e.fromId);
    if (!row) {
      row = new Map();
      map.set(e.fromId, row);
    }
    row.set(e.toId, (row.get(e.toId) ?? 0) + e.count);
  }
  return map;
}

/** Bucketize sips/player over the last `bucketCount` buckets of `bucketMs`.
 *  Returns one row per player with the bucketed counts (oldest → newest). */
/** Cumulative sips received by each player over time, suitable for a line chart.
 *  Each series has step-shaped points: when a sip lands, we emit one point right
 *  before (oldTotal) and one right after (newTotal) at the same ts to keep lines
 *  monotonically non-decreasing without diagonal slopes. */
export interface CumulativeSeries {
  playerId: string;
  /** Pairs of [tsMs, totalSipsAt(ts)] sorted ascending. */
  points: ReadonlyArray<[number, number]>;
}

export function cumulativeSeries(
  events: ReadonlyArray<ClientSipEvent>,
  playerIds: ReadonlyArray<string>,
  now: number = Date.now(),
): CumulativeSeries[] {
  const sorted = [...events].sort((a, b) => a.ts - b.ts);
  const startTs = sorted[0]?.ts ?? now;
  return playerIds.map((playerId) => {
    const points: Array<[number, number]> = [[startTs, 0]];
    let total = 0;
    for (const e of sorted) {
      if (e.toId !== playerId) continue;
      total += e.count;
      points.push([e.ts, total]);
    }
    points.push([now, total]);
    return { playerId, points };
  });
}

export function bucketizeSips(
  events: ReadonlyArray<ClientSipEvent>,
  playerIds: ReadonlyArray<string>,
  now: number = Date.now(),
  bucketMs: number = 60_000,
  bucketCount: number = 10,
): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const id of playerIds) result.set(id, new Array(bucketCount).fill(0));
  const oldest = now - bucketMs * bucketCount;
  for (const e of events) {
    if (!e.toId) continue;
    if (e.ts < oldest) continue;
    const idx = Math.min(bucketCount - 1, Math.floor((e.ts - oldest) / bucketMs));
    const row = result.get(e.toId);
    if (row) row[idx] += e.count;
  }
  return result;
}
