'use client';

import { generateGameCode, isValidGameCode, normalizeGameCode } from '@jeu-soiree/shared';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { loadProfile, saveProfile } from '@/lib/profile';

export function JoinForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    if (p?.name) setName(p.name);
  }, []);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Pseudo obligatoire');
      return;
    }
    setError(null);
    saveProfile({ name });
    setNavigating(true);
    const code = generateGameCode();
    const params = new URLSearchParams({ name });
    router.push(`/lobby/${code}?${params.toString()}`);
  }

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    const trimmed = joinCode.trim();
    if (!name.trim()) {
      setError('Pseudo obligatoire');
      return;
    }
    if (!trimmed) {
      setError('Code de partie obligatoire');
      return;
    }
    const normalized = normalizeGameCode(trimmed);
    if (!isValidGameCode(normalized)) {
      setError('Code invalide (format ABCD-1234)');
      return;
    }
    setError(null);
    saveProfile({ name });
    setNavigating(true);
    const params = new URLSearchParams({ name });
    if (pin.length > 0) params.set('pin', pin);
    router.push(`/lobby/${normalized}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {error && (
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30"
          role="alert"
        >
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Ton profil</h2>

        <label className="mt-3 block">
          <span className="text-sm dark:text-zinc-400">Pseudo</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Sarah"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
          />
        </label>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            Créer une partie
          </h2>
          <p className="mt-1 text-sm dark:text-zinc-400">Tu deviens host. Un code est généré.</p>

          <button
            type="submit"
            disabled={navigating}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {navigating ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="text-white" /> Création…
              </span>
            ) : (
              'Créer'
            )}
          </button>
        </form>

        <form
          onSubmit={handleJoin}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            Rejoindre une partie
          </h2>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD-1234"
            maxLength={9}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono text-base focus:border-blue-500 focus:outline-none"
          />
          <label className="mt-2 block">
            <span className="text-sm dark:text-zinc-400">Code PIN (optionnel)</span>
            <input
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              maxLength={4}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 px-3 py-2 font-mono text-base focus:border-blue-500 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={navigating}
            className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {navigating ? (
              <span className="inline-flex items-center gap-2">
                <Spinner className="text-white" /> Connexion…
              </span>
            ) : (
              'Rejoindre'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
