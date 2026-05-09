'use client';

import { AnimatePresence, motion } from 'motion/react';

interface ShopItem {
  itemType: string;
  name: string;
  cost: number;
  emoji: string;
  description: string;
}

const ITEMS: ReadonlyArray<ShopItem> = [
  {
    itemType: 'prison_key',
    name: 'Clé de prison',
    cost: 5,
    emoji: '🗝️',
    description: 'Sortir immédiatement de prison.',
  },
  {
    itemType: 'crowbar',
    name: 'Pied de biche',
    cost: 8,
    emoji: '🪛',
    description: 'Ouvrir un coffre au trésor.',
  },
  {
    itemType: 'malus_point',
    name: 'Pt malus ×6',
    cost: 6,
    emoji: '💣',
    description: 'Imposer 6 gorgées à un autre joueur (utilisable plus tard).',
  },
];

interface ShopModalProps {
  open: boolean;
  isMyTurn: boolean;
  activePlayerName: string;
  onBuy: (itemType: string) => void;
  onSkip: () => void;
}

export function ShopModal({ open, isMyTurn, activePlayerName, onBuy, onSkip }: ShopModalProps) {
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
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <header className="mb-3">
              <h2 className="text-2xl font-bold">🛒 Shop</h2>
              {isMyTurn ? (
                <p className="mt-1 text-sm text-zinc-600">
                  Tu peux acheter un objet (et boire le coût en gorgées) ou passer.
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-600">{activePlayerName} fait ses courses…</p>
              )}
            </header>

            <ul className="space-y-2">
              {ITEMS.map((item) => (
                <li key={item.itemType}>
                  <button
                    type="button"
                    disabled={!isMyTurn}
                    onClick={() => onBuy(item.itemType)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-3 py-3 text-left transition hover:border-orange-400 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white"
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {item.emoji}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.description}</p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-bold text-orange-800">
                      {item.cost} 🍻
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={!isMyTurn}
              onClick={onSkip}
              className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Passer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
