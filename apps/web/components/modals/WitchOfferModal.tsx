'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { ClientPlayer } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface WitchOfferModalProps {
  open: boolean;
  meId: string;
  candidates: ReadonlyArray<ClientPlayer>;
  onOffer: (targetId: string, sips: number) => void;
  onCancel: () => void;
}

export function WitchOfferModal({
  open,
  meId,
  candidates,
  onOffer,
  onCancel,
}: WitchOfferModalProps) {
  const [step, setStep] = useState<'pick' | 'sips'>('pick');
  const [target, setTarget] = useState<ClientPlayer | null>(null);
  const [sips, setSips] = useState(5);

  const others = candidates.filter((p) => p.id !== meId && p.connected);

  function reset() {
    setStep('pick');
    setTarget(null);
    setSips(5);
  }

  function handleClose() {
    reset();
    onCancel();
  }

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
            <header className="mb-3">
              <h2 className="text-2xl font-bold">🧪 Offrir une potion</h2>
              <p className="mt-1 text-sm text-zinc-600">
                {step === 'pick'
                  ? 'À qui ? La cible aura 10s pour dire merci, sinon double dose.'
                  : `Combien de gorgées pour ${target?.name} ?`}
              </p>
            </header>

            {step === 'pick' && (
              <ul className="space-y-2">
                {others.map((p) => {
                  const hex = COLOR_BY_ID.get(p.color) ?? '#999999';
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setTarget(p);
                          setStep('sips');
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-purple-400 hover:bg-purple-50"
                      >
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ background: hex }}
                          aria-hidden="true"
                        >
                          {p.emoji}
                        </span>
                        <span className="font-medium text-zinc-900">{p.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {step === 'sips' && target && (
              <div>
                <div className="rounded-xl bg-purple-50 p-4 text-center">
                  <p className="text-5xl">🧪</p>
                  <p className="mt-2 text-3xl font-bold text-purple-900">{sips}</p>
                  <p className="text-sm text-zinc-600">gorgées</p>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={sips}
                  onChange={(e) => setSips(Number(e.target.value))}
                  className="mt-3 w-full accent-purple-600"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('pick')}
                    className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOffer(target.id, sips);
                      reset();
                    }}
                    className="flex-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                  >
                    Empoisonner 🧪
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs text-zinc-500 hover:bg-zinc-50"
            >
              Annuler
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
