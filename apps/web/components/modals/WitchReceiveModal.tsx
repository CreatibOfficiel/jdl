'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface WitchReceiveModalProps {
  open: boolean;
  isMe: boolean;
  offererName: string;
  targetName: string;
  sips: number;
  deadline: number;
  onSayThanks: () => void;
}

export function WitchReceiveModal({
  open,
  isMe,
  offererName,
  targetName,
  sips,
  deadline,
  onSayThanks,
}: WitchReceiveModalProps) {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    };
    update();
    const id = setInterval(update, 100);
    return () => clearInterval(id);
  }, [open, deadline]);

  const seconds = Math.ceil(remainingMs / 1000);
  const progress = deadline > 0 ? Math.max(0, Math.min(1, remainingMs / 10_000)) : 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-5 shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <header className="text-center">
              <p className="text-5xl">🧪</p>
              <h2 className="mt-2 text-xl font-bold">
                {isMe ? `${offererName} t'offre une potion !` : `${offererName} → ${targetName}`}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {sips} gorgée(s){' '}
                {isMe ? '— dis MERCI sinon tu doubles !' : `— ${targetName} a 10s pour dire merci`}
              </p>
            </header>

            {/* Timer ring */}
            <div className="my-4 flex justify-center">
              <div className="relative h-24 w-24">
                <svg
                  className="h-full w-full -rotate-90"
                  viewBox="0 0 36 36"
                  role="img"
                  aria-label={`${seconds} secondes restantes`}
                >
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#E4E4E7" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#7209B7"
                    strokeWidth="3"
                    strokeDasharray={`${progress * 100.53} 100.53`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 100ms linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                    {seconds}
                  </span>
                </div>
              </div>
            </div>

            {isMe && (
              <button
                type="button"
                onClick={onSayThanks}
                className="w-full rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 px-4 py-4 text-lg font-bold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
              >
                MERCI 🙏
              </button>
            )}
            {!isMe && (
              <p className="text-center text-sm italic text-zinc-500 dark:text-zinc-400">
                {targetName} doit décider…
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
