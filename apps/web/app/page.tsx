import Link from 'next/link';
import { AppearanceToggle } from '@/components/AppearanceToggle';
import { JoinForm } from '@/components/lobby/JoinForm';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Jeu de l'Oie Soirée</h1>
          <p className="mt-1 text-zinc-600">Multi-device, jusqu'à 10 joueurs.</p>
        </div>
        <Link
          href="/rules"
          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          📖 Règles
        </Link>
      </header>

      <JoinForm />

      <footer className="mt-10 flex flex-wrap items-center gap-4 border-t border-zinc-200 pt-4 text-sm text-zinc-500">
        <Link href="/rules" className="text-blue-600 underline">
          Règles complètes
        </Link>
        <Link href="/stats" className="text-blue-600 underline">
          Stats globales
        </Link>
        <Link href="/preview?seed=hello" className="text-blue-600 underline">
          Aperçu plateau
        </Link>
        <span className="ml-auto">
          <AppearanceToggle />
        </span>
      </footer>
    </main>
  );
}
