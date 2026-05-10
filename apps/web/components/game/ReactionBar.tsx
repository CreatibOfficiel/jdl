'use client';

import type { Room } from 'colyseus.js';

const EMOJIS = ['👍', '🔥', '😱', '🤣', '😴', '💀', '👏', '🍻'];

interface ReactionBarProps {
  room: Room | null;
}

export function ReactionBar({ room }: ReactionBarProps) {
  if (!room) return null;
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-2">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => room.send('react', { emoji: e })}
          aria-label={`Réaction ${e}`}
          className="rounded-lg px-2 py-1 text-2xl transition hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:bg-zinc-800 active:scale-95"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
