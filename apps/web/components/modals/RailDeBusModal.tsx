'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ClientArraySchema } from '@/types/colyseus';

interface RailDeBusModalProps {
  open: boolean;
  isMyTurn: boolean;
  activePlayerName: string;
  cards: ClientArraySchema<string>;
  round: number;
  onAnswer: (answer: string) => void;
}

const ROUND_LABEL: Record<number, string> = {
  1: 'Couleur',
  2: 'Plus haut / plus bas',
  3: 'Inter / exter',
  4: 'Signe',
};

export function RailDeBusModal({
  open,
  isMyTurn,
  activePlayerName,
  cards,
  round,
  onAnswer,
}: RailDeBusModalProps) {
  const cardList: string[] = [];
  cards.forEach((c) => {
    cardList.push(c);
  });

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
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-5 shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <header className="mb-3 text-center">
              <h2 className="text-2xl font-bold">🎴 Rail de bus</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Manche {round}/4 — {ROUND_LABEL[round] ?? '?'}
              </p>
              {!isMyTurn && (
                <p className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-400">
                  {activePlayerName} tente sa chance…
                </p>
              )}
            </header>

            {/* Drawn cards */}
            <div className="mb-4 flex justify-center gap-2">
              {cardList.map((c, i) => {
                const isRed = c.includes('♥') || c.includes('♦');
                return (
                  <motion.div
                    // biome-ignore lint/suspicious/noArrayIndexKey: rail draws are append-only and identified by position
                    key={`${c}-${i}`}
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    className={`flex h-20 w-14 items-center justify-center rounded-lg border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-xl font-bold shadow ${
                      isRed ? 'text-red-600' : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {c}
                  </motion.div>
                );
              })}
            </div>

            {/* Answer buttons */}
            {round === 1 && (
              <div className="grid grid-cols-2 gap-2">
                <RailButton onClick={() => onAnswer('red')} disabled={!isMyTurn} variant="red">
                  ❤️♦️ Rouge
                </RailButton>
                <RailButton onClick={() => onAnswer('black')} disabled={!isMyTurn} variant="dark">
                  ♠️♣️ Noir
                </RailButton>
              </div>
            )}
            {round === 2 && (
              <div className="grid grid-cols-2 gap-2">
                <RailButton onClick={() => onAnswer('higher')} disabled={!isMyTurn}>
                  ⬆️ Plus haut
                </RailButton>
                <RailButton onClick={() => onAnswer('lower')} disabled={!isMyTurn}>
                  ⬇️ Plus bas
                </RailButton>
              </div>
            )}
            {round === 3 && (
              <div className="grid grid-cols-2 gap-2">
                <RailButton onClick={() => onAnswer('inside')} disabled={!isMyTurn}>
                  Entre les 2
                </RailButton>
                <RailButton onClick={() => onAnswer('outside')} disabled={!isMyTurn}>
                  En dehors
                </RailButton>
              </div>
            )}
            {round === 4 && (
              <div className="grid grid-cols-4 gap-2">
                <RailButton onClick={() => onAnswer('spades')} disabled={!isMyTurn} variant="dark">
                  ♠
                </RailButton>
                <RailButton onClick={() => onAnswer('hearts')} disabled={!isMyTurn} variant="red">
                  ♥
                </RailButton>
                <RailButton onClick={() => onAnswer('diamonds')} disabled={!isMyTurn} variant="red">
                  ♦
                </RailButton>
                <RailButton onClick={() => onAnswer('clubs')} disabled={!isMyTurn} variant="dark">
                  ♣
                </RailButton>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface RailButtonProps {
  onClick: () => void;
  disabled: boolean;
  variant?: 'default' | 'red' | 'dark';
  children: React.ReactNode;
}

function RailButton({ onClick, disabled, variant = 'default', children }: RailButtonProps) {
  const classes =
    variant === 'red'
      ? 'border-red-300 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30'
      : variant === 'dark'
        ? 'border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'
        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border-2 px-3 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${classes}`}
    >
      {children}
    </button>
  );
}
