'use client';

import { AnimatePresence, motion } from 'motion/react';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

interface LoadedDieModalProps {
  open: boolean;
  onPlace: (value: number) => void;
  onCancel: () => void;
}

export function LoadedDieModal({ open, onPlace, onCancel }: LoadedDieModalProps) {
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
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <header className="mb-3 text-center">
              <h2 className="text-2xl font-bold">🎲 Dé pipé</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Choisis la valeur de ton prochain dé. L'item sera consommé.
              </p>
            </header>

            <div className="grid grid-cols-3 gap-2">
              {FACES.map((face, i) => (
                <button
                  key={face}
                  type="button"
                  onClick={() => onPlace(i + 1)}
                  className="flex flex-col items-center rounded-xl border-2 border-zinc-200 bg-white p-4 transition hover:border-blue-400 hover:bg-blue-50"
                >
                  <span className="text-5xl leading-none">{face}</span>
                  <span className="mt-1 text-xs font-bold text-zinc-700">{i + 1}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Annuler
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
