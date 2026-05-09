import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface Season {
  id: string;
  name: string;
  createdAt: number;
}

async function fetchSeasons(): Promise<Season[]> {
  const base = process.env.COLYSEUS_HTTP_URL ?? 'http://localhost:2567';
  try {
    const res = await fetch(`${base}/api/seasons`, { cache: 'no-store' });
    if (!res.ok) return [];
    const body = (await res.json()) as { seasons: Season[] };
    return body.seasons ?? [];
  } catch {
    return [];
  }
}

export default async function SeasonsPage() {
  const seasons = await fetchSeasons();
  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ts));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <Link href="/stats" className="text-sm text-blue-600 underline">
          ← Stats globales
        </Link>
        <h1 className="mt-2 text-3xl font-bold">🏅 Saisons</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Regroupe plusieurs parties pour un classement cumulatif.
        </p>
      </header>

      {seasons.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-zinc-600">
          Aucune saison créée pour l'instant. Crée-en une via{' '}
          <code className="rounded bg-zinc-100 px-1">POST /api/seasons</code>.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white">
          {seasons.map((s) => (
            <li key={s.id}>
              <Link
                href={`/seasons/${encodeURIComponent(s.id)}`}
                className="flex items-baseline gap-3 px-4 py-3 text-sm hover:bg-zinc-50"
              >
                <span className="font-semibold text-zinc-900">{s.name}</span>
                <span className="ml-auto text-xs text-zinc-400">{formatDate(s.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
