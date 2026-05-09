'use client';

import {
  DIFFICULTY_PRESETS,
  isDifficultyLevel,
  isValidGameCode,
  normalizeGameCode,
} from '@jeu-soiree/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Board } from '@/components/board/Board';
import { PlayersList } from '@/components/lobby/PlayersList';
import { QRCodeShare } from '@/components/lobby/QRCodeShare';
import { useColyseusRoom } from '@/hooks/useColyseusRoom';
import { colyseusStateToBoard } from '@/lib/colyseusToBoard';
import type { ClientGameState } from '@/types/colyseus';

interface LobbyClientProps {
  code: string;
  initialProfile: {
    name?: string;
    suit?: string;
    color?: string;
    emoji?: string;
    equivalencePreference?: string;
    /** Only honoured when this client is the room creator. */
    difficulty?: string;
  };
}

export function LobbyClient({ code, initialProfile }: LobbyClientProps) {
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShareUrl(window.location.href);
    }
  }, []);

  const normalized = normalizeGameCode(code);
  const validCode = isValidGameCode(normalized);
  const profileComplete = Boolean(
    initialProfile.name && initialProfile.suit && initialProfile.color && initialProfile.emoji,
  );

  const options = useMemo(
    () => {
      const base: Record<string, string> = {
        code: normalized,
        name: initialProfile.name ?? '',
        suit: initialProfile.suit ?? '',
        color: initialProfile.color ?? '',
        emoji: initialProfile.emoji ?? '',
        equivalencePreference: initialProfile.equivalencePreference ?? 'drinks',
      };
      if (initialProfile.difficulty) base.difficulty = initialProfile.difficulty;
      return base;
    },
    [
      normalized,
      initialProfile.name,
      initialProfile.suit,
      initialProfile.color,
      initialProfile.emoji,
      initialProfile.equivalencePreference,
      initialProfile.difficulty,
    ],
  );

  const { state, status, error, room } = useColyseusRoom<ClientGameState>(
    'game_room',
    options,
    validCode && profileComplete,
  );

  // When the phase moves past lobby, redirect to /game/[code]
  useEffect(() => {
    if (state?.phase && state.phase !== 'lobby') {
      const params = new URLSearchParams({
        name: initialProfile.name ?? '',
        suit: initialProfile.suit ?? '',
        color: initialProfile.color ?? '',
        emoji: initialProfile.emoji ?? '',
        equivalencePreference: initialProfile.equivalencePreference ?? 'drinks',
      });
      router.replace(`/game/${normalized}?${params.toString()}`);
    }
  }, [state?.phase, normalized, initialProfile, router]);

  if (!validCode) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Code invalide</h1>
        <p className="mt-2 text-zinc-600">
          Le code <code className="font-mono">{code}</code> n'est pas au format attendu (ex.{' '}
          <code>ABCD-1234</code>).
        </p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  if (!profileComplete) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Profil manquant</h1>
        <p className="mt-2 text-zinc-600">
          Choisis ton pseudo, signe, couleur et avatar avant de rejoindre la partie.
        </p>
        <Link
          href={`/?join=${encodeURIComponent(normalized)}`}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 font-medium text-white"
        >
          Compléter mon profil
        </Link>
      </main>
    );
  }

  if (status === 'connecting' || status === 'idle') {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-zinc-600">Connexion à la partie {normalized}…</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Erreur</h1>
        <p className="mt-2 text-red-700">{error}</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  if (!state || !room) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <p className="text-zinc-600">Chargement du state…</p>
      </main>
    );
  }

  const me = state.players.get(room.sessionId);
  const isHost = me?.isHost ?? false;
  const canStart = isHost && state.players.size >= 2 && state.phase === 'lobby';
  const board = colyseusStateToBoard(state);
  const difficultyMeta = isDifficultyLevel(state.difficultyLevel)
    ? DIFFICULTY_PRESETS[state.difficultyLevel]
    : null;

  function handleStart() {
    room?.send('start_game');
  }

  function handleLeave() {
    room?.leave(true);
    router.push('/');
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Lobby
            {difficultyMeta && (
              <span className="ml-3 rounded-full bg-zinc-100 px-3 py-1 align-middle text-sm font-medium text-zinc-700">
                {difficultyMeta.emoji} {difficultyMeta.label}
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-500">
            En attente que le host démarre la partie. {state.players.size}/10 joueurs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Quitter
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {shareUrl && <QRCodeShare url={shareUrl} code={normalized} />}

          <section className="rounded-2xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700">
              Joueurs ({state.players.size}/10)
            </h2>
            <PlayersList players={state.players} selfId={room.sessionId} />
          </section>

          {isHost ? (
            <button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {state.players.size < 2 ? "En attente d'un 2e joueur…" : 'Démarrer la partie'}
            </button>
          ) : (
            <p className="rounded-lg bg-zinc-100 px-3 py-3 text-center text-sm text-zinc-600">
              Le host démarre la partie quand tout le monde est prêt.
            </p>
          )}

          {state.phase !== 'lobby' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              La partie a démarré (phase: {state.phase}). La page de jeu sera disponible en Phase 3.
            </p>
          )}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">
            Aperçu du plateau <span className="font-mono text-blue-600">{state.boardSeed}</span>
          </h2>
          <div className="aspect-square">
            <Board board={board} />
          </div>
        </section>
      </div>
    </main>
  );
}
