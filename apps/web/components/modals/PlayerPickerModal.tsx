'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import { AnimatePresence, motion } from 'motion/react';
import type { ClientPlayer } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface PlayerPickerModalProps {
  open: boolean;
  title: string;
  description?: string;
  candidates: ReadonlyArray<ClientPlayer>;
  excludeIds?: ReadonlyArray<string>;
  onPick: (targetId: string) => void;
  onCancel: () => void;
}

export function PlayerPickerModal({
  open,
  title,
  description,
  candidates,
  excludeIds = [],
  onPick,
  onCancel,
}: PlayerPickerModalProps) {
  const exclude = new Set(excludeIds);
  const others = candidates.filter((p) => !exclude.has(p.id) && p.connected);

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
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <header className="mb-3">
              <h2 className="text-xl font-bold">{title}</h2>
              {description && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
              )}
            </header>

            <ul className="space-y-2">
              {others.map((p) => {
                const hex = COLOR_BY_ID.get(p.color) ?? '#999999';
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPick(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-3 text-left transition hover:border-blue-400 hover:bg-blue-50 dark:bg-blue-950/30"
                    >
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full"
                        style={{ background: hex }}
                        aria-hidden="true"
                      >
                        {p.emoji}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {others.length === 0 && (
              <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                Aucun joueur disponible.
              </p>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
            >
              Annuler
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
