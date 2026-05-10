'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface HostChecklistModalProps {
  open: boolean;
  onAck: (ceiling: number) => void;
  onClose: () => void;
}

const ITEMS = [
  { id: 'water', label: '💧 Eau dispo pour tout le monde' },
  { id: 'snacks', label: '🍕 Quelque chose à grignoter' },
  { id: 'age', label: '🆔 Personne sous 18 ans qui boit' },
  { id: 'ride', label: '🚗 Conducteur désigné OU tout le monde reste sur place' },
  { id: 'vibes', label: '✨ Tout le monde est OK pour jouer (personne forcé)' },
];

const CEILING_PRESETS = [
  { value: 0, label: 'Aucun' },
  { value: 20, label: '20 sips' },
  { value: 32, label: '32 sips (NHS binge)' },
  { value: 50, label: '50 sips' },
];

export function HostChecklistModal({ open, onAck, onClose }: HostChecklistModalProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [ceiling, setCeiling] = useState(0);
  const allChecked = ITEMS.every((i) => checked.has(i.id));

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

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
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Avant de lancer la soirée
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Petite checklist anti-galère. C'est ta dernière vérif avant de démarrer.
              </p>
            </header>
            <ul className="space-y-2">
              {ITEMS.map((it) => (
                <li key={it.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900">
                    <input
                      type="checkbox"
                      checked={checked.has(it.id)}
                      onChange={() => toggle(it.id)}
                      className="h-5 w-5 rounded border-zinc-300 dark:border-zinc-600"
                    />
                    <span className="text-sm text-zinc-800 dark:text-zinc-200">{it.label}</span>
                  </label>
                </li>
              ))}
            </ul>

            <fieldset className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3">
              <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Plafond de gorgées par joueur (optionnel)
              </legend>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Au-delà du plafond, les sips passent automatiquement en équivalence sport.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CEILING_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setCeiling(p.value)}
                    aria-pressed={ceiling === p.value}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      ceiling === p.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300"
              >
                Plus tard
              </button>
              <button
                type="button"
                disabled={!allChecked}
                onClick={() => onAck(ceiling)}
                className="flex-1 rounded-xl bg-blue-600 dark:bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-600"
              >
                {allChecked ? 'OK, on peut commencer' : 'Coche tout pour valider'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
