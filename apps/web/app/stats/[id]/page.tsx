import Link from 'next/link';
import { notFound } from 'next/navigation';
import { badge, evaluateBadges, fromGamePlayerRecord } from '@/lib/badges';
import { fetchGameDetail, fetchGameSipEvents } from '@/lib/statsApi';

export const dynamic = 'force-dynamic';

interface GameStatsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string }>;
}

export default async function GameStatsPage({ params, searchParams }: GameStatsPageProps) {
  const { id } = await params;
  const { source: sourceFilter } = await searchParams;
  const [detail, allEvents] = await Promise.all([fetchGameDetail(id), fetchGameSipEvents(id)]);
  if (!detail) notFound();
  const events = sourceFilter ? allEvents.filter((e) => e.source === sourceFilter) : allEvents;

  const { game, players } = detail;
  const duration = game.endedAt ? Math.round((game.endedAt - game.startedAt) / 60000) : null;
  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(ts),
    );

  const pairs = new Map<string, Map<string, number>>();
  let maxPair = 0;
  for (const e of events) {
    if (!e.fromId) continue;
    const row = pairs.get(e.fromId) ?? new Map<string, number>();
    const next = (row.get(e.toId) ?? 0) + e.count;
    row.set(e.toId, next);
    pairs.set(e.fromId, row);
    if (next > maxPair) maxPair = next;
  }

  const sourceTotals = new Map<string, number>();
  for (const e of allEvents) {
    sourceTotals.set(e.source, (sourceTotals.get(e.source) ?? 0) + e.count);
  }
  const topSources = Array.from(sourceTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const badgeMap = evaluateBadges(
    players.map((p) => fromGamePlayerRecord(p)),
    allEvents,
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <Link href="/stats" className="text-sm text-blue-600 dark:text-blue-400 underline">
            ← Toutes les parties
          </Link>
          <Link
            href={`/replay/${encodeURIComponent(id)}`}
            className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-sm text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400 dark:hover:bg-blue-950/50"
          >
            ⏯ Replay
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold">
          Partie <span className="font-mono text-blue-600 dark:text-blue-400">{game.seed}</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {game.playerCount} joueurs · {duration !== null ? `${duration} min · ` : ''}
          {formatDate(game.startedAt)}
          {game.winnerId && (
            <span className="ml-2 text-amber-700 dark:text-amber-400">🏆 {game.winnerId}</span>
          )}
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">Joueurs</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="py-1">Joueur</th>
              <th className="py-1">🍺 bues</th>
              <th className="py-1">🎁 distribuées</th>
              <th className="py-1">💪 effort</th>
              <th className="py-1">🎲 dés</th>
              <th className="py-1">🛒 achats</th>
              <th className="py-1">📍 fin</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const codes = badgeMap.get(p.playerId) ?? [];
              return (
                <tr key={p.playerId} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="py-2">
                    {p.name}
                    {codes.length > 0 && (
                      <span className="ml-2 inline-flex gap-1">
                        {codes.map((c) => {
                          const b = badge(c);
                          return b ? (
                            <span key={c} title={`${b.label} — ${b.description}`}>
                              {b.emoji}
                            </span>
                          ) : null;
                        })}
                      </span>
                    )}
                  </td>
                  <td className="py-2 font-mono">{p.sipsTaken}</td>
                  <td className="py-2 font-mono">{p.sipsGiven}</td>
                  <td className="py-2 font-mono">
                    {p.equivalenceUnitsCompleted ?? 0}
                    {p.equivalencePreference && p.equivalencePreference !== 'drinks' && (
                      <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
                        ({p.equivalencePreference})
                      </span>
                    )}
                  </td>
                  <td className="py-2 font-mono">{p.diceRolls}</td>
                  <td className="py-2 font-mono">{p.shopPurchases}</td>
                  <td className="py-2 font-mono">{p.finishedPosition ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Qui a distribué à qui</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Lignes = donneur, colonnes = receveur. Plus c'est foncé, plus de gorgées.
        </p>

        {topSources.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Filtre source :
            </span>
            <Link
              href={`/stats/${encodeURIComponent(id)}`}
              className={`rounded-full border px-3 py-1 text-xs ${
                !sourceFilter
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-700'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              tout
            </Link>
            {topSources.map(([src]) => {
              const active = sourceFilter === src;
              return (
                <Link
                  key={src}
                  href={`/stats/${encodeURIComponent(id)}?source=${encodeURIComponent(src)}`}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-700'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                  }`}
                >
                  {labelizeSource(src)}
                </Link>
              );
            })}
          </div>
        )}
        {events.length === 0 ? (
          <p className="mt-3 italic text-zinc-400 dark:text-zinc-500">
            Cette partie a été jouée avant l'arrivée des stats détaillées — pas d'historique
            disponible.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-zinc-500 dark:text-zinc-400">
                    ↓ donne · reçoit →
                  </th>
                  {players.map((p) => (
                    <th key={p.playerId} className="px-2 py-1 text-zinc-500 dark:text-zinc-400">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((from) => {
                  const row = pairs.get(from.playerId);
                  return (
                    <tr key={from.playerId}>
                      <td className="whitespace-nowrap px-2 py-1 text-zinc-700 dark:text-zinc-300">
                        {from.name}
                      </td>
                      {players.map((to) => {
                        const v = from.playerId === to.playerId ? 0 : (row?.get(to.playerId) ?? 0);
                        const intensity = maxPair > 0 ? v / maxPair : 0;
                        const bg =
                          from.playerId === to.playerId
                            ? 'var(--tw-zinc-700, #f4f4f5)'
                            : `rgba(59, 130, 246, ${0.08 + intensity * 0.7})`;
                        return (
                          <td
                            key={to.playerId}
                            className="px-2 py-1 text-center font-mono text-zinc-800 dark:text-zinc-200"
                            style={{ background: bg }}
                          >
                            {from.playerId === to.playerId ? '·' : v || ''}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {topSources.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Top sources de gorgées</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {events.length} événements enregistrés.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {topSources.map(([source, count]) => (
              <li key={source} className="flex items-baseline justify-between">
                <span className="text-zinc-700 dark:text-zinc-300">{labelizeSource(source)}</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {count} gorgée(s)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function labelizeSource(source: string): string {
  const labels: Record<string, string> = {
    red_drink: '🔴 Carte rouge (zone soif)',
    red_distribute: '🔴 Carte rouge (distribute)',
    green_distribute: '🟢 Carte verte',
    card_match: '♠♥ Carte signe match',
    card_mismatch: '♠♥ Carte signe mismatch',
    bromance_drink: '💪 Bromance ricochet',
    witch_potion: '🧙 Potion sorcière',
    pill_red: '💊 Pilule rouge',
    pill_blue: '💊 Pilule bleue',
    rail_drink: '🚌 Rail de bus',
    treasure_drink: '💎 Trésor',
    pt_malus: '💣 Pt malus',
  };
  return labels[source] ?? source;
}
