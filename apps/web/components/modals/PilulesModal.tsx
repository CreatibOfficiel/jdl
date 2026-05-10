'use client';

import { AnimatePresence, motion } from 'motion/react';

interface PilulesModalProps {
  open: boolean;
  isMyTurn: boolean;
  activePlayerName: string;
  onChoose: (color: 'red' | 'blue') => void;
}

export function PilulesModal({ open, isMyTurn, activePlayerName, onChoose }: PilulesModalProps) {
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
            <header className="mb-3 text-center">
              <h2 className="text-2xl font-bold">💊 Pilule</h2>
              {isMyTurn ? (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Choisis : rouge ou bleue ?
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {activePlayerName} hésite…
                </p>
              )}
            </header>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!isMyTurn}
                onClick={() => onChoose('red')}
                className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-500 to-red-700 p-5 text-center text-white shadow-md transition hover:from-red-600 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="text-5xl">🔴</div>
                <div className="mt-2 text-base font-bold">ROUGE</div>
                <div className="mt-1 text-xs opacity-90">6 gorgées sûres</div>
              </button>
              <button
                type="button"
                disabled={!isMyTurn}
                onClick={() => onChoose('blue')}
                className="rounded-2xl border-2 border-blue-300 dark:border-blue-800 bg-gradient-to-br from-blue-500 to-blue-700 p-5 text-center text-white shadow-md transition hover:from-blue-600 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="text-5xl">🔵</div>
                <div className="mt-2 text-base font-bold">BLEUE</div>
                <div className="mt-1 text-xs opacity-90">Tente ta chance</div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
