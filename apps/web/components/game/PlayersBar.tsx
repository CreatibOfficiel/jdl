'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import type { ClientMapSchema, ClientPlayer } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface PlayersBarProps {
  players: ClientMapSchema<ClientPlayer>;
  selfId: string;
  activeId: string | undefined;
  turnOrder: ReadonlyArray<string>;
}

export function PlayersBar({ players, selfId, activeId, turnOrder }: PlayersBarProps) {
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
              isActive ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-zinc-200 bg-white'
            } ${!p.connected ? 'opacity-40' : ''}`}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: hex }}
              aria-hidden="true"
            >
              {p.emoji}
            </span>
            <span className="font-medium text-zinc-900">
              {p.name}
              {isSelf && <span className="ml-1 text-xs text-blue-600">(toi)</span>}
            </span>
            <span className="font-mono text-xs text-zinc-500">case {p.position}</span>
          </li>
        );
      })}
    </ul>
  );
}
