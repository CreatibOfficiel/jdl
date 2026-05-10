'use client';

import { EQUIVALENCE_TABLE, type EquivalenceKind, isEquivalenceKind } from '@jeu-soiree/shared';
import { useEffect, useState } from 'react';
import { bucketizeSips, pairMatrix, sipsPerMinute } from '@/lib/sipStats';
import type { ClientGameState, ClientPlayer, ClientSipEvent } from '@/types/colyseus';

interface StatsPanelProps {
  state: ClientGameState;
  open: boolean;
  onClose: () => void;
}

export function StatsPanel({ state, open, onClose }: StatsPanelProps) {
  // Tick every 5s so sips/min decays even when no event lands
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const players: ClientPlayer[] = [];
  state.players.forEach((p) => players.push(p));
  players.sort((a, b) => b.sipsTaken - a.sipsTaken);

  const events: ClientSipEvent[] = [];
  state.sipEvents.forEach((e) => events.push(e));

  const pairs = pairMatrix(events);
  const buckets = bucketizeSips(
    events,
    players.map((p) => p.id),
    now,
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" aria-label="Fermer" onClick={onClose} className="flex-1 bg-black/40" />
      <aside className="flex w-full max-w-md flex-col overflow-y-auto bg-white dark:bg-zinc-800 shadow-2xl">
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-5 py-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">📊 Stats live</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:bg-zinc-800"
          >
            ✕
          </button>
        </header>

        <section className="px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Joueurs · sips/min (5 dernières min)
          </h3>
          <ul className="mt-2 space-y-2">
            {players.map((p) => {
              const rate = sipsPerMinute(events, p.id, now);
              const rateLabel = rate >= 0.1 ? rate.toFixed(1) : '0';
              const pref = isEquivalenceKind(p.equivalencePreference)
                ? p.equivalencePreference
                : 'drinks';
              const prefRule = EQUIVALENCE_TABLE[pref as EquivalenceKind];
              const bucket = buckets.get(p.id) ?? [];
              const max = Math.max(1, ...bucket);
              return (
                <li key={p.id} className="rounded-xl bg-zinc-50 dark:bg-zinc-900 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {p.emoji} {p.name}
                    </span>
                    <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                      {rateLabel}/min
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    🍺 {p.sipsTaken} bues · 🎁 {p.sipsGiven} données
                    {pref !== 'drinks' && (
                      <span className="ml-2 text-amber-700 dark:text-amber-400">
                        {prefRule.emoji} {p.equivalenceUnitsCompleted} {prefRule.unit}
                      </span>
                    )}
                  </div>
                  <Sparkline values={bucket} max={max} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="border-t border-zinc-200 dark:border-zinc-700 px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Qui distribue à qui
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Lignes = donneur, colonnes = receveur. Plus c'est foncé, plus de gorgées.
          </p>
          <PairHeatmap players={players} pairs={pairs} />
        </section>
      </aside>
    </div>
  );
}

function Sparkline({ values, max }: { values: ReadonlyArray<number>; max: number }) {
  return (
    <div className="mt-2 flex h-6 items-end gap-0.5">
      {values.map((v, i) => {
        const h = max > 0 ? Math.round((v / max) * 100) : 0;
        return (
          <div
            key={i}
            className="flex-1 rounded-sm bg-blue-200 dark:bg-blue-800/50"
            style={{ height: `${Math.max(8, h)}%` }}
            title={`${v} il y a ${values.length - i} min`}
          />
        );
      })}
    </div>
  );
}

function PairHeatmap({
  players,
  pairs,
}: {
  players: ReadonlyArray<ClientPlayer>;
  pairs: Map<string, Map<string, number>>;
}) {
  let max = 0;
  for (const row of pairs.values()) {
    for (const v of row.values()) if (v > max) max = v;
  }
  if (players.length === 0) {
    return <p className="mt-2 text-xs italic text-zinc-400">Pas encore de joueurs.</p>;
  }

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 text-left text-zinc-500 dark:text-zinc-400">
              ↓ donne · reçoit →
            </th>
            {players.map((p) => (
              <th key={p.id} className="px-2 py-1 text-zinc-500 dark:text-zinc-400" title={p.name}>
                {p.emoji}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((from) => {
            const row = pairs.get(from.id);
            return (
              <tr key={from.id}>
                <td
                  className="whitespace-nowrap px-2 py-1 text-zinc-700 dark:text-zinc-300"
                  title={from.name}
                >
                  {from.emoji} {from.name}
                </td>
                {players.map((to) => {
                  const v = from.id === to.id ? 0 : (row?.get(to.id) ?? 0);
                  const intensity = max > 0 ? v / max : 0;
                  const bg =
                    from.id === to.id
                      ? 'rgba(161,161,170,0.15)'
                      : `rgba(59, 130, 246, ${0.08 + intensity * 0.7})`;
                  return (
                    <td
                      key={to.id}
                      className="px-2 py-1 text-center font-mono text-zinc-800 dark:text-zinc-200"
                      style={{ background: bg }}
                    >
                      {from.id === to.id ? '·' : v || ''}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
