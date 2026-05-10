import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Season {
  id: string;
  name: string;
  createdAt: number;
}

interface Standing {
  playerId: string;
  name: string;
  games: number;
  wins: number;
  sipsTaken: number;
  sipsGiven: number;
  equivalenceUnits: number;
}

interface SeasonDetail {
  season: Season;
  gameIds: string[];
  standings: Standing[];
}

async function fetchSeason(id: string): Promise<SeasonDetail | null> {
  const base = process.env.COLYSEUS_HTTP_URL ?? 'http://localhost:2567';
  try {
    const res = await fetch(`${base}/api/seasons/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as SeasonDetail;
  } catch {
    return null;
  }
}

interface SeasonPageProps {
  params: Promise<{ id: string }>;
}

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { id } = await params;
  const detail = await fetchSeason(id);
  if (!detail) notFound();
  const { season, gameIds, standings } = detail;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <Link href="/seasons" className="text-sm text-blue-600 underline">
          ← Toutes les saisons
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{season.name}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {gameIds.length} parties · {standings.length} joueurs
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="font-semibold text-zinc-700">Classement</h2>
        {standings.length === 0 ? (
          <p className="mt-3 text-sm italic text-zinc-500">
            Aucune partie encore associée à cette saison. Ajoute-en avec{' '}
            <code className="rounded bg-zinc-100 px-1">POST /api/seasons/{id}/games</code>.
          </p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="py-1">#</th>
                <th className="py-1">Joueur</th>
                <th className="py-1">🎲 Parties</th>
                <th className="py-1">🏆 Wins</th>
                <th className="py-1">🍻 Sips</th>
                <th className="py-1">🎁 Donnés</th>
                <th className="py-1">💪 Effort</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.playerId} className="border-t border-zinc-100">
                  <td className="py-2 font-bold text-zinc-400">{i + 1}.</td>
                  <td className="py-2">
                    <Link
                      href={`/profile/${encodeURIComponent(s.playerId)}`}
                      className="text-zinc-900 hover:underline"
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="py-2 font-mono">{s.games}</td>
                  <td className="py-2 font-mono text-amber-700">{s.wins}</td>
                  <td className="py-2 font-mono">{s.sipsTaken}</td>
                  <td className="py-2 font-mono">{s.sipsGiven}</td>
                  <td className="py-2 font-mono">{s.equivalenceUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {gameIds.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold text-zinc-700">Parties incluses</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gameIds.map((gid) => (
              <li key={gid}>
                <Link
                  href={`/stats/${encodeURIComponent(gid)}`}
                  className="block truncate rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-mono text-blue-600 hover:bg-zinc-50"
                  title={gid}
                >
                  {gid}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
