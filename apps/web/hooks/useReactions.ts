'use client';

import type { Room } from 'colyseus.js';
import { useEffect, useState } from 'react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  from: string;
  ts: number;
  /** Random horizontal offset ([0..1]) for the fountain layout. */
  rx: number;
}

interface ReactionPayload {
  from: string;
  emoji: string;
  ts: number;
}

const TTL_MS = 3500;

/** Subscribes to Colyseus 'reaction' broadcasts and returns the active set
 *  (auto-evicted after TTL_MS). Used by the master TV's ReactionFountain. */
export function useReactions(room: Room | null): ReadonlyArray<FloatingReaction> {
  const [active, setActive] = useState<FloatingReaction[]>([]);

  useEffect(() => {
    if (!room) return;
    const cleanup = room.onMessage('reaction', (msg: ReactionPayload) => {
      const reaction: FloatingReaction = {
        id: `${msg.ts}-${msg.from}`,
        emoji: msg.emoji,
        from: msg.from,
        ts: msg.ts,
        rx: Math.random(),
      };
      setActive((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActive((prev) => prev.filter((r) => r.id !== reaction.id));
      }, TTL_MS);
    });
    return () => cleanup();
  }, [room]);

  return active;
}
