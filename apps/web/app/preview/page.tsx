import { generateBoard } from '@jeu-soiree/game-logic';
import Link from 'next/link';
import { Board } from '@/components/board/Board';

interface PreviewPageProps {
  searchParams: Promise<{ seed?: string }>;
}

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const { seed } = await searchParams;

  if (!seed) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold">Preview</h1>
        <p className="mt-2 text-zinc-600">
          Renseigne un seed via <code className="rounded bg-zinc-200 px-1">?seed=XXX</code>.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          <li>
            <Link className="text-blue-600 underline" href="/preview?seed=hello">
              /preview?seed=hello
            </Link>
          </li>
          <li>
            <Link className="text-blue-600 underline" href="/preview?seed=THIB-4F2K">
              /preview?seed=THIB-4F2K
            </Link>
          </li>
        </ul>
      </main>
    );
  }

  const board = generateBoard(seed);
  const counts = board.cases.reduce<Record<string, number>>((acc, c) => {
    acc[c.type] = (acc[c.type] ?? 0) + 1;
    return acc;
  }, {});
  const tzEnd = board.thirstZone.start + board.thirstZone.length - 1;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Plateau <span className="font-mono text-blue-600">{board.seed}</span>
          </h1>
          <p className="text-sm text-zinc-600">63 cases · 3 anneaux · Phase 1 preview</p>
        </div>
        <form action="/preview" className="flex gap-2">
          <input
            type="text"
            name="seed"
            defaultValue={seed}
            className="rounded border border-zinc-300 px-3 py-1 font-mono text-sm"
            placeholder="seed"
          />
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Régénérer
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="aspect-square w-full max-w-2xl">
          <Board board={board} />
        </div>

        <aside className="space-y-4 text-sm">
          <section>
            <h2 className="font-semibold text-zinc-700">Zone de la soif 🔥</h2>
            <p className="text-zinc-600">
              cases {board.thirstZone.start} → {tzEnd}{' '}
              <span className="text-zinc-400">({board.thirstZone.length} cases)</span>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-700">Trésors 💎</h2>
            <p className="text-zinc-600">
              cases {board.treasureCases.sort((a, b) => a - b).join(', ')}{' '}
              <span className="text-zinc-400">(cachés en jeu réel)</span>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-700">Décompte</h2>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 text-zinc-600">
              {Object.entries(counts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([type, count]) => (
                  <li key={type} className="flex justify-between">
                    <span>{type}</span>
                    <span className="font-mono text-zinc-500">{count}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-700">Cases spéciales</h2>
            <ul className="mt-1 space-y-0.5 text-zinc-600">
              {board.cases
                .filter((c) =>
                  [
                    'shop',
                    'prison',
                    'rail_de_bus',
                    'vacances',
                    'formule1',
                    'usain',
                    'witch',
                    'bromance',
                    'pills',
                    'hole',
                    'portal',
                  ].includes(c.type),
                )
                .sort((a, b) => a.index - b.index)
                .map((c) => (
                  <li key={c.index} className="flex justify-between font-mono text-xs">
                    <span>case {c.index}</span>
                    <span className="text-zinc-500">
                      {c.type}
                      {c.portalPairId !== undefined ? ` (pair ${c.portalPairId})` : ''}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
