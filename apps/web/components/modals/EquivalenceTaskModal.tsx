'use client';

import { EQUIVALENCE_TABLE, type EquivalenceKind } from '@jeu-soiree/shared';
import { AnimatePresence, motion } from 'motion/react';

export interface EquivalenceTask {
  /** Stable client-side id for queue keys (ts + index, since SipEvent has no id field). */
  taskId: string;
  kind: EquivalenceKind;
  /** Equivalent units (e.g. 30 pompes), already multiplied by perSip. */
  units: number;
  /** Original sip count, for context ("au lieu de N gorgées"). */
  sips: number;
}

interface EquivalenceTaskModalProps {
  task: EquivalenceTask | null;
  onDone: () => void;
  onSkip: () => void;
}

export function EquivalenceTaskModal({ task, onDone, onSkip }: EquivalenceTaskModalProps) {
  return (
    <AnimatePresence>
      {task && (
        <motion.div
          key={task.taskId}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-6 shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Body task={task} />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onSkip}
                className="rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-4 py-3 text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
              >
                Je passe
              </button>
              <button
                type="button"
                onClick={onDone}
                className="rounded-xl bg-amber-500 dark:bg-amber-400 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-amber-600"
              >
                ✅ J'ai fini
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Body({ task }: { task: EquivalenceTask }) {
  const rule = EQUIVALENCE_TABLE[task.kind];
  if (task.kind === 'sit_out') {
    return (
      <div className="text-center">
        <div className="mb-2 text-5xl">{rule.emoji}</div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Tu passes ce coup-ci
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {task.sips} gorgée{task.sips > 1 ? 's' : ''} évitée{task.sips > 1 ? 's' : ''} — pas de
          tâche à faire, profite de la pause.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="mb-2 text-5xl">{rule.emoji}</div>
      <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{task.units}</h2>
      <p className="text-xl font-semibold text-zinc-800 dark:text-zinc-200">{rule.unit}</p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Au lieu de {task.sips} gorgée{task.sips > 1 ? 's' : ''}. Allez, tu peux le faire 💪
      </p>
    </div>
  );
}
