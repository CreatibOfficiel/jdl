import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchPlayerProfile } from '@/lib/statsApi';

export const dynamic = 'force-dynamic';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await fetchPlayerProfile(id);
  if (!profile) notFound();

  const { player, recent } = profile;
  const winRate =
    player.totalGames > 0 ? Math.round((player.totalWins / player.totalGames) * 100) : 0;
  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <Link href="/stats" className="text-sm text-blue-600 underline">
          ← Toutes les stats
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{player.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Membre depuis le {formatDate(player.createdAt)}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="🎲 Parties" value={player.totalGames} />
        <Stat label="🏆 Victoires" value={`${player.totalWins} (${winRate}%)`} />
        <Stat label="🍻 Sips bus" value={player.totalSipsTaken} />
        <Stat label="🎁 Sips donnés" value={player.totalSipsGiven} />
        <Stat label="💪 Effort" value={player.totalEquivalenceUnits ?? 0} />
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">Dernières parties</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm italic text-zinc-500">Aucune partie pour ce joueur.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
            {recent.map((g) => {
              const duration = g.endedAt ? Math.round((g.endedAt - g.startedAt) / 60000) : null;
              return (
                <li key={g.gameId}>
                  <Link
                    href={`/stats/${encodeURIComponent(g.gameId)}`}
                    className="flex flex-wrap items-baseline gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
                  >
                    <span className="font-mono text-blue-600">{g.seed}</span>
                    <span className="text-zinc-700">{g.playerCount} joueurs</span>
                    {duration !== null && <span className="text-zinc-500">{duration} min</span>}
                    {g.won === 1 && <span className="text-amber-700">🏆</span>}
                    <span className="text-zinc-500">🍻 {g.sipsTaken}</span>
                    {(g.equivalenceUnitsCompleted ?? 0) > 0 && (
                      <span className="text-amber-700">💪 {g.equivalenceUnitsCompleted}</span>
                    )}
                    <span className="ml-auto text-xs text-zinc-400">{formatDate(g.startedAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
