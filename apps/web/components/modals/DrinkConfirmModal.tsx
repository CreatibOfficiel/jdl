'use client';

import { AnimatePresence, motion } from 'motion/react';

interface DrinkConfirmModalProps {
  open: boolean;
  sips: number;
  fromName: string;
  fromEmoji: string;
  onConfirm: () => void;
}

export function DrinkConfirmModal({
  open,
  sips,
  fromName,
  fromEmoji,
  onConfirm,
}: DrinkConfirmModalProps) {
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
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-800 p-5 shadow-xl text-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="text-4xl mb-2" aria-hidden="true">
              {fromEmoji}
            </div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {fromName} t&apos;assigné{' '}
              <span className="text-red-600 dark:text-red-400 font-bold">{sips}</span> gorgée
              {sips > 1 ? 's' : ''}
            </p>
            <button
              type="button"
              onClick={onConfirm}
              className="mt-4 w-full rounded-xl bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 px-4 py-2 font-bold transition"
            >
              J&apos;ai bu 🍺
            </button>
            <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">Auto-confirmé dans 30s</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
