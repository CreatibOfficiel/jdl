'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { GameDetail, SipEventRecord } from '@/lib/statsApi';

interface ReplayClientProps {
  detail: GameDetail;
  events: ReadonlyArray<SipEventRecord>;
}

const PALETTE = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16',
];

export function ReplayClient({ detail, events }: ReplayClientProps) {
  const { game, players } = detail;
  const totalEvents = events.length;
  const [cursor, setCursor] = useState(totalEvents);

  // Sort once. Server returns asc by ts but we double-check.
  const sorted = useMemo(() => [...events].sort((a, b) => a.ts - b.ts), [events]);
  const visible = sorted.slice(0, cursor);

  const cumulative = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of players) totals.set(p.playerId, 0);
    for (const e of visible) {
      if (!e.toId) continue;
      totals.set(e.toId, (totals.get(e.toId) ?? 0) + e.count);
    }
    return totals;
  }, [visible, players]);

  const colorByPlayerId = useMemo(() => {
    const m = new Map<string, string>();
    players.forEach((p, i) => m.set(p.playerId, PALETTE[i % PALETTE.length] ?? '#888'));
    return m;
  }, [players]);

  const cursorEvent = sorted[cursor - 1];
  const cursorTime = cursorEvent
    ? new Date(cursorEvent.ts).toLocaleTimeString('fr-FR')
    : new Date(game.startedAt).toLocaleTimeString('fr-FR');

  const tail = visible.slice(-10).reverse();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <Link
          href={`/stats/${encodeURIComponent(game.id)}`}
          className="text-sm text-blue-600 dark:text-blue-400 underline"
        >
          ← Stats de la partie
        </Link>
        <h1 className="mt-2 text-3xl font-bold">
          Replay <span className="font-mono text-blue-600 dark:text-blue-400">{game.seed}</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {totalEvents} événements · {players.length} joueurs · démarré le{' '}
          {new Date(game.startedAt).toLocaleString('fr-FR')}
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Position dans le temps
          </h2>
          <p className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
            {cursor}/{totalEvents} · {cursorTime}
          </p>
        </div>
        <input
          type="range"
          min={0}
          max={totalEvents}
          value={cursor}
          onChange={(e) => setCursor(Number(e.target.value))}
          className="mt-3 w-full"
          aria-label="Curseur de timeline"
        />
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setCursor(0)}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
          >
            ⏮ Début
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => Math.max(0, c - 10))}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
          >
            -10
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => Math.min(totalEvents, c + 10))}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
          >
            +10
          </button>
          <button
            type="button"
            onClick={() => setCursor(totalEvents)}
            className="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
          >
            Fin ⏭
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Cumul à ce point
        </h2>
        <ul className="mt-3 space-y-2">
          {players
            .map((p) => ({ p, total: cumulative.get(p.playerId) ?? 0 }))
            .sort((a, b) => b.total - a.total)
            .map(({ p, total }) => {
              const max = Math.max(1, ...Array.from(cumulative.values()));
              const pct = (total / max) * 100;
              const color = colorByPlayerId.get(p.playerId) ?? '#888';
              return (
                <li key={p.playerId}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300">🍻 {total}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className="h-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </li>
              );
            })}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Derniers événements (jusqu'à ce point)
        </h2>
        {tail.length === 0 ? (
          <p className="mt-2 italic text-zinc-400 dark:text-zinc-500">
            Aucun événement à ce point.
          </p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {tail.map((e) => {
              const fromName = players.find((p) => p.playerId === e.fromId)?.name ?? null;
              const toName = players.find((p) => p.playerId === e.toId)?.name ?? '?';
              return (
                <li key={e.id} className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                    {new Date(e.ts).toLocaleTimeString('fr-FR')}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {fromName ? `${fromName} → ${toName}` : `${toName}`}{' '}
                    <span className="font-mono text-zinc-500 dark:text-zinc-400">×{e.count}</span>{' '}
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">({e.source})</span>
                    {e.equivalence && (
                      <span className="ml-1 text-amber-700 dark:text-amber-400">
                        [{e.equivalence}]
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
