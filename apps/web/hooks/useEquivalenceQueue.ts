'use client';

import { EQUIVALENCE_TABLE, isEquivalenceKind } from '@jeu-soiree/shared';
import { useEffect, useRef, useState } from 'react';
import type { EquivalenceTask } from '@/components/modals/EquivalenceTaskModal';
import type { ClientSipEvent } from '@/types/colyseus';

const STORAGE_PREFIX = 'jeu-soiree-equiv-queue:';

function load(roomId: string): EquivalenceTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${roomId}`);
    return raw ? (JSON.parse(raw) as EquivalenceTask[]) : [];
  } catch {
    return [];
  }
}

function save(roomId: string, queue: EquivalenceTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${roomId}`, JSON.stringify(queue));
  } catch {
    /* ignore */
  }
}

interface UseEquivalenceQueueResult {
  current: EquivalenceTask | null;
  pop: () => void;
}

const TASK_TIMEOUT_MS = 90_000;

/** Watches state.sipEvents and queues up tasks for the local player whose sip events have a
 *  non-empty equivalence tag. Survives page refresh via sessionStorage keyed by roomId. */
export function useEquivalenceQueue(
  sipEvents: ReadonlyArray<ClientSipEvent>,
  myId: string,
  roomId: string,
  phase?: string,
): UseEquivalenceQueueResult {
  const [queue, setQueue] = useState<EquivalenceTask[]>(() => load(roomId));
  const seenRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  useEffect(() => {
    if (phase === 'finished' || phase === 'lobby') {
      setQueue((prev) => {
        if (prev.length === 0) return prev;
        try {
          sessionStorage.removeItem(`${STORAGE_PREFIX}${roomId}`);
        } catch {
          /* ignore */
        }
        return [];
      });
    }
  }, [phase, roomId]);

  useEffect(() => {
    if (!myId) return;
    if (!initRef.current) {
      // On first mount, mark every existing event as seen so we don't replay a long history.
      // The persisted queue (sessionStorage) already covers refresh-mid-task cases.
      for (const e of sipEvents) seenRef.current.add(eventKey(e));
      initRef.current = true;
      return;
    }

    const additions: EquivalenceTask[] = [];
    for (const e of sipEvents) {
      const key = eventKey(e);
      if (seenRef.current.has(key)) continue;
      seenRef.current.add(key);
      if (e.toId !== myId) continue;
      if (!e.equivalence || !isEquivalenceKind(e.equivalence)) continue;
      if (e.equivalence === 'drinks') continue;
      const rule = EQUIVALENCE_TABLE[e.equivalence];
      additions.push({
        taskId: `${e.ts}-${e.toId}-${e.source}`,
        kind: e.equivalence,
        units: e.count * rule.perSip,
        sips: e.count,
      });
    }
    if (additions.length > 0) {
      setQueue((prev) => {
        const next = [...prev, ...additions];
        save(roomId, next);
        return next;
      });
    }
  }, [sipEvents, myId, roomId]);

  const pop = () => {
    setQueue((prev) => {
      const next = prev.slice(1);
      save(roomId, next);
      return next;
    });
  };

  // Auto-skip after 90s — protects against AFK players blocking their own modal queue.
  // The task has already been recorded server-side; auto-skip is purely a UI eviction.
  useEffect(() => {
    if (!queue[0]) return;
    const id = setTimeout(() => pop(), TASK_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [queue]);

  return { current: queue[0] ?? null, pop };
}

function eventKey(e: ClientSipEvent): string {
  return `${e.ts}-${e.toId}-${e.fromId}-${e.source}-${e.count}`;
}
