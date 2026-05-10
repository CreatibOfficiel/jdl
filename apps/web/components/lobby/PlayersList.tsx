'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import type { Room } from 'colyseus.js';
import type { ClientGameState, ClientMapSchema, ClientPlayer } from '@/types/colyseus';

const SUIT_SYMBOL: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

const GHOST_COLOR = '#94a3b8';

interface PlayersListProps {
  players: ClientMapSchema<ClientPlayer>;
  selfId: string | undefined;
  room: Room<ClientGameState> | null;
  isHost: boolean;
}

export function PlayersList({ players, selfId, room, isHost }: PlayersListProps) {
  const list: ClientPlayer[] = [];
  players.forEach((p) => {
    list.push(p);
  });
  list.sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name));

  function handleKick(p: ClientPlayer) {
    if (!window.confirm(`Voulez-vous vraiment expulser ${p.name} ?`)) return;
    room?.send('host_kick', { targetPlayerId: p.id });
  }

  return (
    <ul className="space-y-2">
      {list.map((p) => {
        const isGhost = !p.suit || !p.color || !p.emoji;
        const hex = isGhost ? GHOST_COLOR : (COLOR_BY_ID.get(p.color) ?? '#999999');
        const isSelf = p.id === selfId;
        return (
          <li
            key={p.id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              isSelf
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
            } ${!p.connected ? 'opacity-50' : ''}`}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-xl shadow-sm"
              style={{ background: hex }}
              aria-hidden="true"
            >
              {isGhost ? '?' : p.emoji}
            </span>
            <div className="flex-1">
              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                {p.name}
                {isSelf && <span className="ml-2 text-xs text-blue-600">(toi)</span>}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {!isGhost && <span aria-hidden="true">{SUIT_SYMBOL[p.suit] ?? '?'}</span>}
                {isGhost && (
                  <span className="italic text-amber-600 dark:text-amber-400">
                    Profil incomplet
                  </span>
                )}
                {!isGhost && <span>{!p.connected ? 'reconnecte…' : 'en ligne'}</span>}
              </div>
            </div>
            {p.isHost && (
              <span className="rounded-full bg-amber-100 dark:bg-amber-900 px-2 py-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                host
              </span>
            )}
            {isHost && !isSelf && (
              <button
                type="button"
                onClick={() => handleKick(p)}
                className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-xs text-zinc-400 dark:text-zinc-500 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                aria-label={`Expulser ${p.name}`}
              >
                ✕
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
