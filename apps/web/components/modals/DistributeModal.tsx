'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useState } from 'react';
import type { ClientPlayer } from '@/types/colyseus';

interface DistributeModalProps {
  open: boolean;
  isMyTurn: boolean;
  totalSips: number;
  meId: string;
  candidates: ReadonlyArray<ClientPlayer>;
  onDistribute: (assignments: Array<{ targetPlayerId: string; sips: number }>) => void;
}

export function DistributeModal({
  open,
  isMyTurn,
  totalSips,
  meId,
  candidates,
  onDistribute,
}: DistributeModalProps) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  const eligible = useMemo(
    () => candidates.filter((p) => p.id !== meId && p.connected && !p.exited),
    [candidates, meId],
  );

  const assigned = useMemo(() => {
    let sum = 0;
    for (const n of counts.values()) sum += n;
    return sum;
  }, [counts]);

  const remaining = totalSips - assigned;
  const canConfirm = remaining === 0 && assigned > 0;

  const adjust = useCallback((playerId: string, delta: number) => {
    setCounts((prev) => {
      const next = new Map(prev);
      const cur = next.get(playerId) ?? 0;
      const nextVal = cur + delta;
      if (nextVal <= 0) {
        next.delete(playerId);
      } else {
        next.set(playerId, nextVal);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    const assignments = Array.from(counts.entries()).map(([targetPlayerId, sips]) => ({
      targetPlayerId,
      sips,
    }));
    onDistribute(assignments);
  }, [canConfirm, counts, onDistribute]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-5 shadow-xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <header className="mb-3">
              <h2 className="text-2xl font-bold">🎁 Distribue tes gorgées !</h2>
              <p
                className={`mt-1 text-sm font-semibold ${remaining === 0 ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'}`}
              >
                Reste: {remaining} / {totalSips}
              </p>
            </header>

            <ul className="space-y-2">
              {eligible.map((p) => {
                const c = counts.get(p.id) ?? 0;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-100 dark:bg-zinc-700 px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">
                        {p.emoji}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!isMyTurn || c <= 0}
                        onClick={() => adjust(p.id, -1)}
                        className="rounded-lg bg-zinc-200 dark:bg-zinc-600 px-2 py-1 text-sm font-bold text-zinc-700 dark:text-zinc-200 disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-bold text-zinc-900 dark:text-zinc-100">
                        {c}
                      </span>
                      <button
                        type="button"
                        disabled={!isMyTurn || remaining <= 0}
                        onClick={() => adjust(p.id, 1)}
                        className="rounded-lg bg-zinc-200 dark:bg-zinc-600 px-2 py-1 text-sm font-bold text-zinc-700 dark:text-zinc-200 disabled:opacity-30"
                      >
                        +
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>

            {eligible.length === 0 && (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                Pas d'autres joueurs disponibles.
              </p>
            )}

            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="mt-4 w-full rounded-xl bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 disabled:opacity-30 px-4 py-2 font-bold transition"
            >
              Confirmer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
