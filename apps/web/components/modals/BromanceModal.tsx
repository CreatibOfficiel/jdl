'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import { AnimatePresence, motion } from 'motion/react';
import type { ClientPlayer } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface BromanceModalProps {
  open: boolean;
  isMyTurn: boolean;
  meId: string;
  candidates: ReadonlyArray<ClientPlayer>;
  activePlayerName: string;
  onChoose: (targetId: string) => void;
}

export function BromanceModal({
  open,
  isMyTurn,
  meId,
  candidates,
  activePlayerName,
  onChoose,
}: BromanceModalProps) {
  const others = candidates.filter((p) => p.id !== meId && p.connected);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-5 shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <header className="mb-3">
              <h2 className="text-2xl font-bold">💪 Bromance</h2>
              {isMyTurn ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Choisis ton partenaire de bromance. Quand l'un boira, l'autre boira aussi.
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {activePlayerName} choisit son partenaire de bromance…
                </p>
              )}
            </header>

            <ul className="space-y-2">
              {others.map((p) => {
                const hex = COLOR_BY_ID.get(p.color) ?? '#999999';
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={!isMyTurn}
                      onClick={() => onChoose(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-3 text-left transition hover:border-pink-400 hover:bg-pink-50 dark:bg-pink-950/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white dark:bg-zinc-800"
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ background: hex }}
                        aria-hidden="true"
                      >
                        {p.emoji}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                      {p.bromanceWith && (
                        <span className="ml-auto text-xs text-zinc-400">déjà en lien</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {others.length === 0 && (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                Pas d'autres joueurs disponibles.
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
