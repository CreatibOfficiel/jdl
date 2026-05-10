'use client';

import { AnimatePresence, motion } from 'motion/react';

interface TreasureModalProps {
  open: boolean;
  isMyTurn: boolean;
  activePlayerName: string;
  hasCrowbar: boolean;
  onOpen: () => void;
  onSkip: () => void;
}

export function TreasureModal({
  open,
  isMyTurn,
  activePlayerName,
  hasCrowbar,
  onOpen,
  onSkip,
}: TreasureModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 p-5 text-center shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              animate={{ rotate: [0, -3, 3, -3, 0] }}
              transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1.5 }}
              className="text-7xl"
            >
              💰
            </motion.div>
            <h2 className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">Trésor !</h2>
            {isMyTurn ? (
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                Tu peux l'ouvrir avec ton pied de biche (consommé) — dé d'effet derrière.
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {activePlayerName} a trouvé un trésor…
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={!isMyTurn || !hasCrowbar}
                onClick={onOpen}
                className="flex-1 rounded-xl bg-amber-600 px-4 py-3 font-semibold text-white shadow-md transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                🪛 Ouvrir
              </button>
              <button
                type="button"
                disabled={!isMyTurn}
                onClick={onSkip}
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Passer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
