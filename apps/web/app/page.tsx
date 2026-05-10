import Link from 'next/link';
import { JoinForm } from '@/components/lobby/JoinForm';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Jeu de l'Oie Soirée</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">Multi-device, jusqu'à 10 joueurs.</p>
        </div>
        <Link
          href="/rules"
          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          📖 Règles
        </Link>
      </header>

      <JoinForm />

      <footer className="mt-10 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
        <Link href="/rules" className="text-blue-600 dark:text-blue-400 underline">
          Règles
        </Link>
        <Link href="/stats" className="text-blue-600 dark:text-blue-400 underline">
          Stats
        </Link>
        <Link href="/seasons" className="text-blue-600 dark:text-blue-400 underline">
          Saisons
        </Link>
        <Link href="/preview?seed=hello" className="text-blue-600 dark:text-blue-400 underline">
          Aperçu
        </Link>
      </footer>
    </main>
  );
}
