import { generateBoard } from '@jeu-soiree/game-logic';
import { isDifficultyLevel } from '@jeu-soiree/shared';
import Link from 'next/link';
import { Board } from '@/components/board/Board';

interface PreviewPageProps {
  searchParams: Promise<{ seed?: string; difficulty?: string }>;
}

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const { seed, difficulty: rawDifficulty } = await searchParams;
  const difficulty = isDifficultyLevel(rawDifficulty) ? rawDifficulty : 'medium';

  if (!seed) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold">Preview</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Renseigne un seed via{' '}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">?seed=XXX</code>.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          <li>
            <Link className="text-blue-600 dark:text-blue-400 underline" href="/preview?seed=hello">
              /preview?seed=hello
            </Link>
          </li>
          <li>
            <Link
              className="text-blue-600 dark:text-blue-400 underline"
              href="/preview?seed=THIB-4F2K"
            >
              /preview?seed=THIB-4F2K
            </Link>
          </li>
        </ul>
      </main>
    );
  }

  const board = generateBoard(seed, difficulty);
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
            Plateau <span className="font-mono text-blue-600 dark:text-blue-400">{board.seed}</span>
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            63 cases · 3 anneaux · difficulté <strong>{difficulty}</strong>
          </p>
          <p className="mt-1 flex gap-3 text-sm">
            {(['soft', 'medium', 'hardcore'] as const).map((d) => (
              <Link
                key={d}
                href={`/preview?seed=${encodeURIComponent(seed)}&difficulty=${d}`}
                className={
                  d === difficulty
                    ? 'rounded bg-blue-600 px-2 py-0.5 text-white dark:bg-blue-500'
                    : 'rounded bg-zinc-200 px-2 py-0.5 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                }
              >
                {d}
              </Link>
            ))}
          </p>
        </div>
        <form action="/preview" className="flex gap-2">
          <input
            type="text"
            name="seed"
            defaultValue={seed}
            className="rounded border border-zinc-300 bg-white px-3 py-1 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            placeholder="seed"
          />
          <input type="hidden" name="difficulty" value={difficulty} />
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
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
            <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Zone de la soif 🔥</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              cases {board.thirstZone.start} → {tzEnd}{' '}
              <span className="text-zinc-400">({board.thirstZone.length} cases)</span>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Trésors 💎</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              cases {board.treasureCases.sort((a, b) => a - b).join(', ')}{' '}
              <span className="text-zinc-400">(cachés en jeu réel)</span>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Décompte</h2>
            <ul className="mt-1 grid grid-cols-2 gap-x-4 text-zinc-600 dark:text-zinc-400">
              {Object.entries(counts)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([type, count]) => (
                  <li key={type} className="flex justify-between">
                    <span>{type}</span>
                    <span className="font-mono text-zinc-500 dark:text-zinc-400">{count}</span>
                  </li>
                ))}
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Cases spéciales</h2>
            <ul className="mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400">
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
                    <span className="text-zinc-500 dark:text-zinc-400">
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
