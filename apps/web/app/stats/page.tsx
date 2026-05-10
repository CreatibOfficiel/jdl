import Link from 'next/link';
import { fetchTopStats, type PlayerStats } from '@/lib/statsApi';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const stats = await fetchTopStats();

  if (!stats) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="text-3xl font-bold">Stats</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Le serveur de stats ne répond pas. Réessaye dans quelques instants.
        </p>
        <Link href="/" className="mt-4 inline-block text-blue-600 dark:text-blue-400 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(ts));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">📊 Stats</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Classements globaux et historique des dernières parties.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Leaderboard
          title="🍻 Top participants"
          column="totalSipsTaken"
          unit="participation cumulée"
          rows={stats.drinkers}
        />
        <Leaderboard
          title="🎁 Top donneurs"
          column="totalSipsGiven"
          unit="distributions"
          rows={stats.givers}
        />
        <Leaderboard
          title="💪 Top athlètes"
          column="totalEquivalenceUnits"
          unit="unités d'effort"
          rows={stats.athletes}
        />
        <Leaderboard
          title="🏆 Top victoires"
          column="totalWins"
          unit="parties gagnées"
          rows={stats.winners}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Les compteurs incluent les gorgées et les équivalences sport. La compétition est sur la
        participation, pas sur l'alcool.
      </p>

      {stats.pairs && stats.pairs.length > 0 && (
        <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">💞 Duos toxiques</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Plus gros flux de gorgées (donneur → receveur).
          </p>
          <ol className="mt-3 space-y-1 text-sm">
            {stats.pairs.slice(0, 10).map((p, i) => (
              <li key={`${p.fromId}-${p.toId}`} className="flex items-center justify-between">
                <span className="text-zinc-700 dark:text-zinc-300">
                  <span className="mr-2 font-bold text-zinc-400">{i + 1}.</span>
                  {p.fromId} → {p.toId}
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {p.total} gorgée(s)
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Dernières parties</h2>
        <ul className="mt-3 divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-800">
          {stats.recent.length === 0 && (
            <li className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
              Aucune partie pour l'instant.
            </li>
          )}
          {stats.recent.map((g) => {
            const duration = g.endedAt ? Math.round((g.endedAt - g.startedAt) / 60000) : null;
            return (
              <li key={g.id}>
                <Link
                  href={`/stats/${encodeURIComponent(g.id)}`}
                  className="flex flex-wrap items-baseline gap-3 px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  <span className="font-mono text-blue-600 dark:text-blue-400">{g.seed}</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{g.playerCount} joueurs</span>
                  {duration !== null && (
                    <span className="text-zinc-500 dark:text-zinc-400">{duration} min</span>
                  )}
                  {g.winnerId && (
                    <span className="text-amber-700 dark:text-amber-400">🏆 {g.winnerId}</span>
                  )}
                  <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                    {formatDate(g.startedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link href="/" className="text-blue-600 dark:text-blue-400 underline">
          ← Retour à l'accueil
        </Link>
        <Link href="/seasons" className="text-blue-600 dark:text-blue-400 underline">
          🏅 Saisons
        </Link>
        <Link href="/rules" className="text-blue-600 dark:text-blue-400 underline">
          📖 Règles
        </Link>
      </footer>
    </main>
  );
}

interface LeaderboardProps {
  title: string;
  column: keyof Pick<
    PlayerStats,
    'totalSipsTaken' | 'totalSipsGiven' | 'totalWins' | 'totalEquivalenceUnits'
  >;
  unit: string;
  rows: PlayerStats[];
}

function Leaderboard({ title, column, unit, rows }: LeaderboardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">{title}</h2>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{unit}</p>
      <ol className="mt-3 space-y-1 text-sm">
        {rows.length === 0 && (
          <li className="italic text-zinc-400 dark:text-zinc-500">Pas encore de données.</li>
        )}
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center justify-between">
            <Link
              href={`/profile/${encodeURIComponent(r.id)}`}
              className="text-zinc-700 hover:underline dark:text-zinc-300"
            >
              <span className="mr-2 font-bold text-zinc-400">{i + 1}.</span>
              {r.name}
            </Link>
            <span className="font-mono text-zinc-900 dark:text-zinc-100">{r[column] ?? 0}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
