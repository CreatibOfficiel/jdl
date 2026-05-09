'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect } from 'react';
import type { ClientPlayer } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface FinishedViewProps {
  winnerName: string;
  isMe: boolean;
  players: ReadonlyArray<ClientPlayer>;
}

function fireConfetti() {
  const burst = (origin: { x: number; y: number }) => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin,
      colors: ['#FFD60A', '#E63946', '#06A77D', '#4361EE', '#FF006E'],
    });
  };
  burst({ x: 0.2, y: 0.5 });
  burst({ x: 0.8, y: 0.5 });
  setTimeout(() => burst({ x: 0.5, y: 0.3 }), 250);
  setTimeout(() => burst({ x: 0.5, y: 0.6 }), 500);
}

interface Trophy {
  emoji: string;
  label: string;
  player: ClientPlayer | null;
  value: number;
}

function pickWinnerByMax<T>(
  list: ReadonlyArray<T>,
  metric: (item: T) => number,
): { winner: T | null; value: number } {
  let winner: T | null = null;
  let max = -1;
  for (const item of list) {
    const v = metric(item);
    if (v > max) {
      max = v;
      winner = item;
    }
  }
  return { winner, value: max };
}

export function FinishedView({ winnerName, isMe, players }: FinishedViewProps) {
  useEffect(() => {
    fireConfetti();
  }, []);

  const playersArr = [...players];
  const drinker = pickWinnerByMax(playersArr, (p) => p.sipsTaken);
  const giver = pickWinnerByMax(playersArr, (p) => p.sipsGiven);
  const roller = pickWinnerByMax(playersArr, (p) => p.diceRolls);
  const buyer = pickWinnerByMax(playersArr, (p) => p.shopPurchases);

  const trophies: Trophy[] = [
    { emoji: '🍻', label: 'Plus saoul', player: drinker.winner, value: drinker.value },
    { emoji: '🎁', label: 'Plus généreux', player: giver.winner, value: giver.value },
    { emoji: '🎲', label: 'Plus de dés lancés', player: roller.winner, value: roller.value },
    { emoji: '🛒', label: 'Plus dépensier', player: buyer.winner, value: buyer.value },
  ];

  return (
    <section className="mx-auto max-w-2xl">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="rounded-3xl border-2 border-amber-400 bg-gradient-to-b from-amber-50 to-orange-50 p-6 text-center shadow-xl"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1.2 }}
          className="text-7xl"
        >
          🏆
        </motion.div>
        <h1 className="mt-3 text-3xl font-bold text-amber-900">
          {isMe ? 'Tu gagnes !' : `${winnerName} gagne !`}
        </h1>
        <p className="mt-1 text-sm text-amber-800">La partie est terminée. Récap de la soirée :</p>
      </motion.div>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        {trophies.map((t) => (
          <motion.li
            key={t.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + Math.random() * 0.4 }}
            className="rounded-2xl border border-zinc-200 bg-white p-3 text-center"
          >
            <p className="text-3xl">{t.emoji}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{t.label}</p>
            <p className="mt-1 font-bold text-zinc-900">{t.player?.name ?? '—'}</p>
            <p className="text-xs text-zinc-500">{t.value > 0 ? `${t.value}` : ''}</p>
          </motion.li>
        ))}
      </ul>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Récap par joueur
        </h2>
        <ul className="mt-2 divide-y divide-zinc-100">
          {playersArr.map((p) => {
            const hex = COLOR_BY_ID.get(p.color) ?? '#999';
            return (
              <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: hex }}
                  aria-hidden="true"
                >
                  {p.emoji}
                </span>
                <span className="flex-1 font-medium text-zinc-900">{p.name}</span>
                <span className="font-mono text-xs text-zinc-500">
                  🍻 {p.sipsTaken} · 🎁 {p.sipsGiven} · 🎲 {p.diceRolls}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/"
          className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-center font-semibold text-white shadow-md hover:bg-amber-700"
        >
          🔄 Nouvelle partie
        </Link>
        <Link
          href="/stats"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-center font-medium text-zinc-700 hover:bg-zinc-50"
        >
          📊 Voir les stats
        </Link>
      </div>
    </section>
  );
}
