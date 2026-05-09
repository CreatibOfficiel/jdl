import Link from 'next/link';
import { JoinForm } from '@/components/lobby/JoinForm';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Jeu de l'Oie Soirée</h1>
        <p className="mt-1 text-zinc-600">Multi-device, jusqu'à 10 joueurs.</p>
      </header>

      <JoinForm />

      <footer className="mt-10 border-t border-zinc-200 pt-4 text-sm text-zinc-500">
        <Link href="/preview?seed=hello" className="text-blue-600 underline">
          Mode preview du plateau →
        </Link>
      </footer>
    </main>
  );
}
