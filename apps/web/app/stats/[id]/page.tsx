import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchGameDetail, fetchGameSipEvents } from '@/lib/statsApi';

export const dynamic = 'force-dynamic';

interface GameStatsPageProps {
  params: Promise<{ id: string }>;
}

export default async function GameStatsPage({ params }: GameStatsPageProps) {
  const { id } = await params;
  const [detail, events] = await Promise.all([fetchGameDetail(id), fetchGameSipEvents(id)]);
  if (!detail) notFound();

  const { game, players } = detail;
  const duration = game.endedAt ? Math.round((game.endedAt - game.startedAt) / 60000) : null;
  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts));

  // Build pair matrix from persisted events (fromId / toId are normalized pseudoIds)
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
  for (const e of events) {
    sourceTotals.set(e.source, (sourceTotals.get(e.source) ?? 0) + e.count);
  }
  const topSources = Array.from(sourceTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <Link href="/stats" className="text-sm text-blue-600 underline">
          ← Toutes les parties
        </Link>
        <h1 className="mt-2 text-3xl font-bold">
          Partie <span className="font-mono text-blue-600">{game.seed}</span>
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          {game.playerCount} joueurs · {duration !== null ? `${duration} min · ` : ''}
          {formatDate(game.startedAt)}
          {game.winnerId && <span className="ml-2 text-amber-700">🏆 {game.winnerId}</span>}
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold text-zinc-700">Joueurs</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-1">Joueur</th>
              <th className="py-1">🍺 bues</th>
              <th className="py-1">🎁 distribuées</th>
              <th className="py-1">🎲 dés</th>
              <th className="py-1">🛒 achats</th>
              <th className="py-1">📍 fin</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.playerId} className="border-t border-zinc-100">
                <td className="py-2">
                  {p.name}
                  {p.won === 1 && <span className="ml-2 text-amber-600">🏆</span>}
                </td>
                <td className="py-2 font-mono">{p.sipsTaken}</td>
                <td className="py-2 font-mono">{p.sipsGiven}</td>
                <td className="py-2 font-mono">{p.diceRolls}</td>
                <td className="py-2 font-mono">{p.shopPurchases}</td>
                <td className="py-2 font-mono">{p.finishedPosition ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold text-zinc-700">Qui a distribué à qui</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Lignes = donneur, colonnes = receveur. Plus c'est foncé, plus de gorgées.
        </p>
        {events.length === 0 ? (
          <p className="mt-3 italic text-zinc-400">
            Cette partie a été jouée avant l'arrivée des stats détaillées — pas d'historique disponible.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-zinc-500">↓ donne · reçoit →</th>
                  {players.map((p) => (
                    <th key={p.playerId} className="px-2 py-1 text-zinc-500">
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
                      <td className="whitespace-nowrap px-2 py-1 text-zinc-700">{from.name}</td>
                      {players.map((to) => {
                        const v = from.playerId === to.playerId ? 0 : (row?.get(to.playerId) ?? 0);
                        const intensity = maxPair > 0 ? v / maxPair : 0;
                        const bg =
                          from.playerId === to.playerId
                            ? '#f4f4f5'
                            : `rgba(59, 130, 246, ${0.08 + intensity * 0.7})`;
                        return (
                          <td
                            key={to.playerId}
                            className="px-2 py-1 text-center font-mono text-zinc-800"
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
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold text-zinc-700">Top sources de gorgées</h2>
          <p className="mt-1 text-xs text-zinc-500">{events.length} événements enregistrés.</p>
          <ul className="mt-3 space-y-1 text-sm">
            {topSources.map(([source, count]) => (
              <li key={source} className="flex items-baseline justify-between">
                <span className="text-zinc-700">{labelizeSource(source)}</span>
                <span className="font-mono text-zinc-900">{count} gorgée(s)</span>
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
