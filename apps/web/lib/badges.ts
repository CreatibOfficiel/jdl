import type { GamePlayerRecord, SipEventRecord } from '@/lib/statsApi';
import type { ClientPlayer } from '@/types/colyseus';

export interface Badge {
  code: string;
  emoji: string;
  label: string;
  description: string;
}

export const BADGE_CATALOG: ReadonlyArray<Badge> = [
  { code: 'champion', emoji: '🏆', label: 'Champion', description: 'A gagné la partie.' },
  {
    code: 'soiffard',
    emoji: '🍻',
    label: 'Soiffard',
    description: 'Le plus de gorgées bues de la soirée.',
  },
  {
    code: 'genereux',
    emoji: '🎁',
    label: 'Généreux',
    description: 'Le plus de gorgées distribuées.',
  },
  {
    code: 'athlete',
    emoji: '💪',
    label: 'Athlète',
    description: "Le plus d'unités d'effort en équivalence.",
  },
  { code: 'sage', emoji: '💧', label: 'Sage', description: 'Aucun soft cap déclenché.' },
  {
    code: 'phenix',
    emoji: '🔥',
    label: 'Phénix',
    description: 'Comeback dans le top 3 depuis la dernière place.',
  },
  {
    code: 'bromancien',
    emoji: '💞',
    label: 'Bromancien',
    description: 'A eu une bromance la partie.',
  },
  { code: 'rouleur', emoji: '🎲', label: 'Rouleur', description: 'Le plus de dés lancés.' },
];

const BADGE_BY_CODE = new Map(BADGE_CATALOG.map((b) => [b.code, b]));

/** Lightweight evaluation rules — input agnostic to source (live `ClientPlayer` or persisted
 *  `GamePlayerRecord`). All evaluators deal with the "after-game snapshot" facts. */
interface PlayerSnapshot {
  id: string;
  name: string;
  sipsTaken: number;
  sipsGiven: number;
  equivalenceUnitsCompleted: number;
  diceRolls: number;
  capsTriggered?: number;
  bromanceWith?: string;
  won: boolean;
  finishedPosition: number | null;
}

export function fromClientPlayer(p: ClientPlayer, won: boolean): PlayerSnapshot {
  return {
    id: p.id,
    name: p.name,
    sipsTaken: p.sipsTaken,
    sipsGiven: p.sipsGiven,
    equivalenceUnitsCompleted: p.equivalenceUnitsCompleted,
    diceRolls: p.diceRolls,
    capsTriggered: p.capsTriggered,
    bromanceWith: p.bromanceWith,
    won,
    finishedPosition: p.position,
  };
}

export function fromGamePlayerRecord(r: GamePlayerRecord): PlayerSnapshot {
  return {
    id: r.playerId,
    name: r.name,
    sipsTaken: r.sipsTaken,
    sipsGiven: r.sipsGiven,
    equivalenceUnitsCompleted: r.equivalenceUnitsCompleted ?? 0,
    diceRolls: r.diceRolls,
    bromanceWith: undefined,
    won: r.won === 1,
    finishedPosition: r.finishedPosition,
  };
}

function topBy(
  players: ReadonlyArray<PlayerSnapshot>,
  metric: (p: PlayerSnapshot) => number,
  threshold: number = 1,
): PlayerSnapshot | null {
  let winner: PlayerSnapshot | null = null;
  let max = -1;
  for (const p of players) {
    const v = metric(p);
    if (v > max) {
      max = v;
      winner = p;
    }
  }
  return max >= threshold ? winner : null;
}

/** Evaluate which badges each player earned this game.
 *  Returns a Map<playerId, badgeCodes[]>. Pure function, deterministic. */
export function evaluateBadges(
  players: ReadonlyArray<PlayerSnapshot>,
  _events?: ReadonlyArray<SipEventRecord>,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const award = (id: string, code: string) => {
    const list = out.get(id) ?? [];
    list.push(code);
    out.set(id, list);
  };

  for (const p of players) {
    if (p.won) award(p.id, 'champion');
    if (p.bromanceWith) award(p.id, 'bromancien');
    if ((p.capsTriggered ?? 0) === 0 && p.sipsTaken > 0) award(p.id, 'sage');
  }

  const top = (m: (p: PlayerSnapshot) => number, code: string) => {
    const w = topBy(players, m);
    if (w) award(w.id, code);
  };
  top((p) => p.sipsTaken, 'soiffard');
  top((p) => p.sipsGiven, 'genereux');
  top((p) => p.equivalenceUnitsCompleted, 'athlete');
  top((p) => p.diceRolls, 'rouleur');

  // Phénix: finishedPosition top-3 AND was the lowest position roller (proxy: lowest diceRolls
  // among those who finished). Real comeback detection needs mid-game snapshots — this is a
  // best-effort heuristic from post-game data only.
  const finishedSorted = [...players]
    .filter((p) => p.finishedPosition !== null)
    .sort((a, b) => (b.finishedPosition ?? 0) - (a.finishedPosition ?? 0));
  if (finishedSorted.length >= 3) {
    const top3 = finishedSorted.slice(0, 3);
    const phenix = topBy(top3, (p) => -p.diceRolls); // fewest dice rolls in top 3
    if (phenix && phenix.diceRolls > 0) award(phenix.id, 'phenix');
  }

  return out;
}

export function badge(code: string): Badge | null {
  return BADGE_BY_CODE.get(code) ?? null;
}
