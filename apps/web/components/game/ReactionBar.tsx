'use client';

import type { Room } from 'colyseus.js';

const EMOJIS = ['👍', '🔥', '😱', '🤣', '😴', '💀', '👏', '🍻'];

interface ReactionBarProps {
  room: Room | null;
}

export function ReactionBar({ room }: ReactionBarProps) {
  if (!room) return null;
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl border border-zinc-200 bg-white p-2">
      {EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => room.send('react', { emoji: e })}
          aria-label={`Réaction ${e}`}
          className="rounded-lg px-2 py-1 text-2xl transition hover:bg-zinc-100 active:scale-95"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
