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
import { HostChecklistModal } from '@/components/lobby/HostChecklistModal';
import { PinControls } from '@/components/lobby/PinControls';
import { PlayersList } from '@/components/lobby/PlayersList';
import { ProfileEditor } from '@/components/lobby/ProfileEditor';
import { QRCodeShare } from '@/components/lobby/QRCodeShare';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Spinner } from '@/components/ui/Spinner';
import { useColyseusRoom } from '@/hooks/useColyseusRoom';
import { colyseusStateToBoard } from '@/lib/colyseusToBoard';
import type { ClientGameState } from '@/types/colyseus';

interface LobbyClientProps {
  code: string;
  name: string;
  pin?: string;
}

export function LobbyClient({ code, name, pin }: LobbyClientProps) {
  const router = useRouter();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const normalized = normalizeGameCode(code);
  const validCode = isValidGameCode(normalized);
  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/lobby/${normalized}` : '';

  const options = useMemo(() => {
    const base: Record<string, string> = {
      code: normalized,
      name,
      suit: '',
      color: '',
      emoji: '',
      equivalencePreference: 'drinks',
    };
    if (pin) base.pin = pin;
    return base;
  }, [normalized, name, pin]);

  const { state, status, error, room } = useColyseusRoom<ClientGameState>(
    'game_room',
    options,
    validCode && Boolean(name.trim()),
  );

  useEffect(() => {
    if (state?.phase && state.phase !== 'lobby') {
      const params = new URLSearchParams({ name });
      router.replace(`/game/${normalized}?${params.toString()}`);
    }
  }, [state?.phase, normalized, name, router]);

  if (!validCode) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Code invalide</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Le code <code className="font-mono">{code}</code> n'est pas au format attendu (ex.{' '}
          <code>ABCD-1234</code>).
        </p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  if (!name.trim()) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Pseudo manquant</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Un pseudo est requis pour rejoindre la partie.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 font-medium text-white"
        >
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  if (status === 'connecting' || status === 'idle') {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Spinner />
          <span>Connexion à la partie {normalized}…</span>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    let errorMessage = error ?? 'Erreur inconnue';
    if (error?.includes('401')) {
      errorMessage = 'Cette partie est protégée par un code';
    } else if (error?.includes('403')) {
      errorMessage = 'Code incorrect';
    }
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-bold">Erreur</h1>
        <p className="mt-2 text-red-700 dark:text-red-400">{errorMessage}</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Retour à l'accueil
        </Link>
      </main>
    );
  }

  if (!state || !room || !state.players) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <Spinner />
          <span>Chargement du state…</span>
        </div>
      </main>
    );
  }

  const me = state.players.get(room.sessionId);
  const isHost = me?.isHost ?? false;
  const checklistAcked = state.checklistAcked ?? false;

  let connectedCount = 0;
  let readyCount = 0;
  state.players.forEach((p) => {
    if (!p.connected || p.exited) return;
    connectedCount++;
    if (p.ready) readyCount++;
  });
  const readyPercent = connectedCount > 0 ? Math.round((readyCount / connectedCount) * 100) : 0;
  const readyThresholdMet = connectedCount >= 2 && readyCount >= Math.ceil(connectedCount * 0.5);

  const canStart =
    isHost && connectedCount >= 2 && state.phase === 'lobby' && checklistAcked && readyThresholdMet;

  const board = colyseusStateToBoard(state);
  const difficultyMeta = isDifficultyLevel(state.difficultyLevel)
    ? DIFFICULTY_PRESETS[state.difficultyLevel]
    : null;

  function handleStart() {
    room?.send('start_game');
  }
  function handleAckChecklist(ceiling: number) {
    if (ceiling > 0) room?.send('host_set_ceiling', { ceiling });
    room?.send('host_ack_checklist');
    setChecklistOpen(false);
  }

  function handleLeave() {
    room?.leave(true);
    router.push('/');
  }

  function startButtonLabel() {
    if (!state || connectedCount < 2) return "En attente d'un 2e joueur…";
    if (!checklistAcked) return "Valide la checklist d'abord";
    if (!readyThresholdMet) {
      return `${readyPercent}% prêt — il faut ≥50%`;
    }
    return 'Démarrer la partie';
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Lobby
            {difficultyMeta && (
              <span className="ml-3 rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 align-middle text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {difficultyMeta.emoji} {difficultyMeta.label}
              </span>
            )}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            En attente que le host démarre la partie. {state.players.size}/10 joueurs.
          </p>
          {state.phase === 'lobby' && connectedCount >= 1 && (
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Prêt : {readyCount}/{connectedCount} ({readyPercent}%)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/rules"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            📖 Règles
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              ⚙️
            </button>
            <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
          </div>
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            Quitter
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          {shareUrl && <QRCodeShare url={shareUrl} code={normalized} />}

          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Joueurs ({state.players.size}/10)
            </h2>
            <PlayersList
              players={state.players}
              selfId={room.sessionId}
              room={room}
              isHost={isHost}
            />
          </section>

          <ProfileEditor room={room} state={state} myId={room.sessionId} />

          {!isHost && (
            <button
              type="button"
              onClick={() => room.send('toggle_ready')}
              disabled={state.phase !== 'lobby'}
              className={`w-full rounded-lg px-4 py-3 font-semibold transition ${
                me?.ready
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'border-2 border-dashed border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {me?.ready ? '✅ Prêt !' : '🆕 Je suis prêt'}
            </button>
          )}

          {isHost && <PinControls room={room} lobbyPin={state.lobbyPin ?? ''} />}

          {isHost ? (
            <div className="space-y-2">
              {!checklistAcked && (
                <button
                  type="button"
                  onClick={() => setChecklistOpen(true)}
                  className="w-full rounded-lg border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 font-semibold text-amber-800 hover:bg-amber-100 dark:bg-amber-900"
                >
                  ⚠️ Checklist soirée à valider
                </button>
              )}
              {state.maxSipsPerPlayerPerGame > 0 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Plafond actif : {state.maxSipsPerPlayerPerGame} sips / joueur
                </p>
              )}
              <button
                type="button"
                onClick={handleStart}
                disabled={!canStart}
                className="w-full rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {startButtonLabel()}
              </button>
            </div>
          ) : (
            <p className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
              Le host démarre la partie quand tout le monde est prêt.
            </p>
          )}

          {state.phase !== 'lobby' && (
            <p className="rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800">
              La partie a démarré (phase: {state.phase}). La page de jeu sera disponible en Phase 3.
            </p>
          )}
        </div>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Aperçu du plateau <span className="font-mono text-blue-600">{state.boardSeed}</span>
          </h2>
          <div className="aspect-square">
            <Board board={board} />
          </div>
        </section>
      </div>

      <HostChecklistModal
        open={checklistOpen && isHost}
        onAck={handleAckChecklist}
        onClose={() => setChecklistOpen(false)}
      />
    </main>
  );
}
