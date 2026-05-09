'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import type { ClientMapSchema, ClientPlayer } from '@/types/colyseus';

const SUIT_SYMBOL: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface PlayersListProps {
  players: ClientMapSchema<ClientPlayer>;
  selfId: string | undefined;
}

export function PlayersList({ players, selfId }: PlayersListProps) {
  const list: ClientPlayer[] = [];
  players.forEach((p) => {
    list.push(p);
  });
  list.sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name));

  return (
    <ul className="space-y-2">
      {list.map((p) => {
        const hex = COLOR_BY_ID.get(p.color) ?? '#999999';
        const isSelf = p.id === selfId;
        return (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              isSelf ? 'border-blue-500 bg-blue-50' : 'border-zinc-200 bg-white'
            } ${!p.connected ? 'opacity-50' : ''}`}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl shadow-sm"
              style={{ background: hex }}
              aria-hidden="true"
            >
              {p.emoji}
            </span>
            <div className="flex-1">
              <div className="font-medium text-zinc-900">
                {p.name}
                {isSelf && <span className="ml-2 text-xs text-blue-600">(toi)</span>}
              </div>
              <div className="text-xs text-zinc-500">
                <span aria-hidden="true">{SUIT_SYMBOL[p.suit] ?? '?'}</span>{' '}
                <span>{!p.connected ? 'reconnecte…' : 'en ligne'}</span>
              </div>
            </div>
            {p.isHost && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                host
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
