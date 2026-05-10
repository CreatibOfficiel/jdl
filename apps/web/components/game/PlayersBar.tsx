'use client';

import { isDifficultyLevel, PAWN_COLORS, SAFETY_BY_DIFFICULTY } from '@jeu-soiree/shared';
import { useEffect, useState } from 'react';
import { sipsPerMinute } from '@/lib/sipStats';
import type { ClientMapSchema, ClientPlayer, ClientSipEvent } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface PlayersBarProps {
  players: ClientMapSchema<ClientPlayer>;
  selfId: string;
  activeId: string | undefined;
  turnOrder: ReadonlyArray<string>;
  difficultyLevel?: string;
  sipEvents?: ReadonlyArray<ClientSipEvent>;
}

/** Returns the safety state badge for a player based on their cap window position.
 *  - 🛑 (red): exited or at/over cap
 *  - ⚠️ (orange): in upper third of cap window
 *  - 💧 (blue): healthy
 *  Returns null when the player has no recent activity (don't badge fresh joiners). */
function safetyBadge(
  p: ClientPlayer,
  difficultyLevel: string | undefined,
): { emoji: string; title: string; color: string } | null {
  if (p.exited) return { emoji: '🪑', title: 'En pause', color: 'text-zinc-400' };
  const level = isDifficultyLevel(difficultyLevel) ? difficultyLevel : 'medium';
  const max = SAFETY_BY_DIFFICULTY[level].maxSipsPer10Min;
  const recent = p.sipsAbsorbedRecent ?? 0;
  if (recent === 0) return null;
  if (recent >= max) return { emoji: '🛑', title: 'Plafond atteint', color: 'text-rose-600' };
  if (recent >= max * 0.7)
    return { emoji: '⚠️', title: 'Approche du plafond', color: 'text-amber-600' };
  return { emoji: '💧', title: 'OK', color: 'text-blue-500' };
}

export function PlayersBar({
  players,
  selfId,
  activeId,
  turnOrder,
  difficultyLevel,
  sipEvents,
}: PlayersBarProps) {
  // Tick every 5s so sips/min decays even when no event lands.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!sipEvents || sipEvents.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [sipEvents]);
  const ordered: ClientPlayer[] = [];
  // Ordered by turnOrder if available, else insertion order
  const seen = new Set<string>();
  for (const id of turnOrder) {
    const p = players.get(id);
    if (p) {
      ordered.push(p);
      seen.add(id);
    }
  }
  players.forEach((p) => {
    if (!seen.has(p.id)) ordered.push(p);
  });

  return (
    <ul className="flex gap-2 overflow-x-auto py-1">
      {ordered.map((p) => {
        const hex = COLOR_BY_ID.get(p.color) ?? '#999';
        const isActive = p.id === activeId;
        const isSelf = p.id === selfId;
        return (
          <li
            key={p.id}
            className={`flex flex-shrink-0 items-center gap-2 rounded-full border-2 px-3 py-1 text-sm transition ${
              isActive
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 shadow-sm'
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
            } ${!p.connected ? 'opacity-40' : ''}`}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: hex }}
              aria-hidden="true"
            >
              {p.emoji}
            </span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {p.name}
              {isSelf && <span className="ml-1 text-xs text-blue-600">(toi)</span>}
            </span>
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              case {p.position}
            </span>
            {sipEvents &&
              (() => {
                const rate = sipsPerMinute(sipEvents, p.id, now);
                if (rate < 0.1) return null;
                return (
                  <span
                    className="font-mono text-xs text-zinc-500 dark:text-zinc-400"
                    title={`${rate.toFixed(1)} gorgées/min sur les 5 dernières min`}
                  >
                    {rate.toFixed(1)}/min
                  </span>
                );
              })()}
            {(() => {
              const b = safetyBadge(p, difficultyLevel);
              return b ? (
                <span className={`text-sm ${b.color}`} title={b.title} aria-label={b.title}>
                  {b.emoji}
                </span>
              ) : null;
            })()}
          </li>
        );
      })}
    </ul>
  );
}
