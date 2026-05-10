'use client';

import { PAWN_COLORS } from '@jeu-soiree/shared';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { badge, evaluateBadges, fromClientPlayer } from '@/lib/badges';
import type { ClientGameState, ClientPlayer } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface FinishedViewProps {
  winnerName: string;
  isMe: boolean;
  players: ReadonlyArray<ClientPlayer>;
  state?: ClientGameState;
}

const COOLDOWN_MS = 30_000;

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

export function FinishedView({ winnerName, isMe, players, state }: FinishedViewProps) {
  const [cooldownLeft, setCooldownLeft] = useState(COOLDOWN_MS);
  useEffect(() => {
    fireConfetti();
    const start = Date.now();
    const id = setInterval(() => {
      const left = Math.max(0, COOLDOWN_MS - (Date.now() - start));
      setCooldownLeft(left);
      if (left === 0) clearInterval(id);
    }, 200);
    return () => clearInterval(id);
  }, []);
  const cooldownActive = cooldownLeft > 0;
  const cooldownSec = Math.ceil(cooldownLeft / 1000);

  const totalCaps = playersArrCapsTotal(players);
  const totalAutoSwaps = playersArrAutoSwapsTotal(players);
  const hydrationPrompts = state?.totalHydrationPrompts ?? 0;

  const playersArr = [...players];
  const winnerId = state?.winnerId ?? '';
  const badgeMap = evaluateBadges(playersArr.map((p) => fromClientPlayer(p, p.id === winnerId)));
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

  const trophyDelays = useMemo(
    () => trophies.map((t) => 0.3 + (t.label.charCodeAt(0) / 255) * 0.4),
    [trophies],
  );

  return (
    <section className="mx-auto max-w-2xl">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="rounded-3xl border-2 border-amber-400 dark:border-amber-600 bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 p-6 text-center shadow-xl"
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, -5, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, repeatDelay: 1.2 }}
          className="text-7xl"
        >
          🏆
        </motion.div>
        <h1 className="mt-3 text-3xl font-bold text-amber-900 dark:text-amber-200">
          {isMe ? 'Tu gagnes !' : `${winnerName} gagne !`}
        </h1>
        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
          La partie est terminée. Récap de la soirée :
        </p>
      </motion.div>

      <ul className="mt-6 grid grid-cols-2 gap-3">
        {trophies.map((t, i) => (
          <motion.li
            key={t.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: trophyDelays[i] }}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-3 text-center"
          >
            <p className="text-3xl">{t.emoji}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t.label}
            </p>
            <p className="mt-1 font-bold text-zinc-900 dark:text-zinc-100">
              {t.player?.name ?? '—'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t.value > 0 ? `${t.value}` : ''}
            </p>
          </motion.li>
        ))}
      </ul>

      <section className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Récap par joueur
        </h2>
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {playersArr.map((p) => {
            const hex = COLOR_BY_ID.get(p.color) ?? '#999';
            const codes = badgeMap.get(p.id) ?? [];
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full"
                  style={{ background: hex }}
                  aria-hidden="true"
                >
                  {p.emoji}
                </span>
                <span className="flex-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {p.name}
                </span>
                <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  🍻 {p.sipsTaken} · 🎁 {p.sipsGiven} · 🎲 {p.diceRolls}
                </span>
                {codes.length > 0 && (
                  <span className="flex gap-1">
                    {codes.map((c) => {
                      const b = badge(c);
                      if (!b) return null;
                      return (
                        <span
                          key={c}
                          title={`${b.label} — ${b.description}`}
                          aria-label={b.label}
                          className="text-base"
                        >
                          {b.emoji}
                        </span>
                      );
                    })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          💧 Sécurité & hydratation
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-2xl">⚠️</p>
            <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{totalCaps}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">caps déclenchés</p>
          </div>
          <div>
            <p className="text-2xl">🛑</p>
            <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{totalAutoSwaps}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">auto-swaps</p>
          </div>
          <div>
            <p className="text-2xl">💧</p>
            <p className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
              {hydrationPrompts}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">pauses hydratation</p>
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-blue-800 dark:text-blue-300">
          Pense à boire de l'eau, à manger un truc et à dire à ton conducteur si t'as besoin.
        </p>
      </section>

      {state?.boardSeed && (
        <ShareGameButton
          roomId={
            typeof window !== 'undefined' ? (window.location.pathname.split('/').pop() ?? '') : ''
          }
          seed={state.boardSeed}
        />
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {cooldownActive ? (
          <div
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-4 py-3 text-center font-semibold text-zinc-500 dark:text-zinc-400"
            aria-disabled="true"
          >
            💧 Pause obligatoire — {cooldownSec}s
          </div>
        ) : (
          <Link
            href="/"
            className="flex-1 rounded-xl bg-amber-600 px-4 py-3 text-center font-semibold text-white shadow-md hover:bg-amber-700"
          >
            🔄 Nouvelle partie
          </Link>
        )}
        <Link
          href="/stats"
          className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
        >
          📊 Voir les stats
        </Link>
      </div>
    </section>
  );
}

function ShareGameButton({ roomId, seed }: { roomId: string; seed: string }) {
  const [copied, setCopied] = useState(false);
  // The OG card is keyed on the persisted gameId == roomId. The room hasn't been persisted
  // yet at finish-screen-render time (persistFinishedGame fires on dispose), so the share
  // link points to /stats/<id> and the OG image will resolve once the user clicks share.
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/stats/${encodeURIComponent(roomId)}`
      : '';

  async function handleShare() {
    const text = `🎲 Soirée jdl ${seed} terminée !`;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: 'Jeu de la soirée', text, url });
        return;
      } catch {
        /* user cancelled or unsupported */
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="mt-4 w-full rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50"
    >
      {copied ? '✅ Lien copié !' : '🔗 Partager la soirée'}
    </button>
  );
}

function playersArrCapsTotal(players: ReadonlyArray<ClientPlayer>): number {
  let n = 0;
  for (const p of players) n += p.capsTriggered ?? 0;
  return n;
}

function playersArrAutoSwapsTotal(players: ReadonlyArray<ClientPlayer>): number {
  let n = 0;
  for (const p of players) n += p.autoSwapsTriggered ?? 0;
  return n;
}
