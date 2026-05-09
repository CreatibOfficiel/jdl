'use client';

import {
  DIFFICULTY_PRESETS,
  EQUIVALENCE_TABLE,
  type EquivalenceKind,
  isDifficultyLevel,
  isEquivalenceKind,
  isValidGameCode,
  normalizeGameCode,
  PAWN_COLORS,
} from '@jeu-soiree/shared';
import Link from 'next/link';
import { useEffect, useMemo, useRef } from 'react';
import { Board } from '@/components/board/Board';
import { ModalEcho } from '@/components/master/ModalEcho';
import { ReactionFountain } from '@/components/master/ReactionFountain';
import { SipChart } from '@/components/master/SipChart';
import { useColyseusRoom } from '@/hooks/useColyseusRoom';
import { useModalEcho } from '@/hooks/useModalEcho';
import { useReactions } from '@/hooks/useReactions';
import { colyseusStateToBoard } from '@/lib/colyseusToBoard';
import { cumulativeSeries } from '@/lib/sipStats';
import type { ClientGameEvent, ClientGameState, ClientPlayer, ClientSipEvent } from '@/types/colyseus';

const COLOR_BY_ID = new Map(PAWN_COLORS.map((c) => [c.id, c.hex]));

interface MasterClientProps {
  code: string;
}

export function MasterClient({ code }: MasterClientProps) {
  const normalized = normalizeGameCode(code);
  const validCode = isValidGameCode(normalized);

  const options = useMemo(
    () => ({ code: normalized, spectator: true }),
    [normalized],
  );

  const { state, status, error, room } = useColyseusRoom<ClientGameState>(
    'game_room',
    options,
    validCode,
  );
  const reactions = useReactions(room);

  // Keep the TV awake while connected
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (status !== 'joined') return;
    let cancelled = false;
    if ('wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) {
            sentinel.release().catch(() => {});
            return;
          }
          wakeLockRef.current = sentinel;
        })
        .catch(() => {
          /* user gesture missing or unsupported — fall through */
        });
    }
    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [status]);

  if (!validCode) {
    return (
      <ScreenShell>
        <div className="text-center text-3xl">
          Code invalide&nbsp;: <span className="font-mono text-amber-400">{code}</span>
          <Link href="/" className="mt-8 block text-base text-zinc-400 underline">
            Retour à l'accueil
          </Link>
        </div>
      </ScreenShell>
    );
  }

  if (status === 'connecting' || status === 'idle') {
    return (
      <ScreenShell>
        <div className="text-3xl text-zinc-300">Connexion à la partie {normalized}…</div>
      </ScreenShell>
    );
  }

  if (status === 'error') {
    return (
      <ScreenShell>
        <div className="space-y-4 text-center text-3xl text-rose-300">
          <div>Erreur&nbsp;: {error}</div>
          <Link href="/" className="block text-base text-zinc-400 underline">
            Retour
          </Link>
        </div>
      </ScreenShell>
    );
  }

  if (!state) {
    return (
      <ScreenShell>
        <div className="text-3xl text-zinc-300">Chargement du state…</div>
      </ScreenShell>
    );
  }

  const board = colyseusStateToBoard(state);
  const players: ClientPlayer[] = [];
  state.players.forEach((p) => {
    players.push(p);
  });
  players.sort((a, b) => b.position - a.position);

  const turnOrderArr = Array.from(state.turnOrder);
  const currentPlayerId = turnOrderArr[state.currentTurnIndex] ?? '';
  const events: ClientGameEvent[] = [];
  state.eventLog.forEach((e) => {
    events.push(e);
  });
  const recentEvents = events.slice(-12).reverse();
  const echo = useModalEcho(events);

  const sipEvents = useMemo(() => {
    const arr: ClientSipEvent[] = [];
    state.sipEvents.forEach((e) => arr.push(e));
    return arr;
  }, [state.sipEvents, state.sipEventsTotalCount]);
  const series = useMemo(
    () => cumulativeSeries(sipEvents, players.map((p) => p.id)),
    [sipEvents, players],
  );
  const colorByPlayerId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) {
      m.set(p.id, COLOR_BY_ID.get(p.color) ?? '#888');
    }
    return m;
  }, [players]);
  const nameByPlayerId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players) m.set(p.id, p.name);
    return m;
  }, [players]);

  const difficultyMeta = isDifficultyLevel(state.difficultyLevel)
    ? DIFFICULTY_PRESETS[state.difficultyLevel]
    : null;

  return (
    <ScreenShell>
      <header className="flex items-center justify-between px-8 pt-6 text-zinc-200">
        <div className="flex items-baseline gap-6">
          <h1 className="text-4xl font-bold tracking-tight">
            Jeu de la soirée <span className="font-mono text-zinc-500">·</span>{' '}
            <span className="font-mono text-blue-400">{state.boardSeed}</span>
          </h1>
          {difficultyMeta && (
            <span className="rounded-full bg-zinc-800 px-4 py-1 text-2xl">
              {difficultyMeta.emoji} {difficultyMeta.label}
            </span>
          )}
        </div>
        <div className="text-right text-2xl text-zinc-400">
          Tour {state.currentTurnIndex + 1}
          {state.lastDiceRoll > 0 && (
            <span className="ml-4 text-amber-400">🎲 {state.lastDiceRoll}</span>
          )}
        </div>
      </header>

      <main className="grid flex-1 grid-cols-[1fr_28rem] gap-6 px-8 pb-8 pt-4">
        <section className="flex items-center justify-center rounded-3xl bg-zinc-900/60 p-4">
          <div className="aspect-square w-full max-w-[80vh]">
            <Board board={board} players={players} activeId={currentPlayerId} />
          </div>
        </section>

        <aside className="flex flex-col gap-4 overflow-hidden">
          <PlayerRoster players={players} currentPlayerId={currentPlayerId} />
          <EventTicker events={recentEvents} />
          <SipChart
            series={series}
            colorByPlayerId={colorByPlayerId}
            nameByPlayerId={nameByPlayerId}
          />
        </aside>
      </main>
      <ModalEcho echo={echo} />
      <ReactionFountain reactions={reactions} />
    </ScreenShell>
  );
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white"
      style={{ cursor: 'none' }}
      data-theme="tv"
    >
      {children}
    </div>
  );
}

function PlayerRoster({
  players,
  currentPlayerId,
}: {
  players: ReadonlyArray<ClientPlayer>;
  currentPlayerId: string;
}) {
  return (
    <section className="rounded-3xl bg-zinc-900/60 p-5">
      <h2 className="mb-3 text-xl font-semibold uppercase tracking-wider text-zinc-400">
        Joueurs ({players.length})
      </h2>
      <ul className="space-y-2">
        {players.map((p) => {
          const hex = COLOR_BY_ID.get(p.color) ?? '#888';
          const isActive = p.id === currentPlayerId;
          const pref = isEquivalenceKind(p.equivalencePreference) ? p.equivalencePreference : 'drinks';
          const equivRule = EQUIVALENCE_TABLE[pref as EquivalenceKind];
          return (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
                isActive ? 'bg-blue-600/30 ring-2 ring-blue-400' : 'bg-zinc-800/60'
              } ${!p.connected ? 'opacity-50' : ''}`}
            >
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl shadow-md"
                style={{ background: hex }}
                aria-hidden="true"
              >
                {p.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-2xl font-semibold">{p.name}</div>
                <div className="text-base text-zinc-400">
                  case {p.position} · 🍺 {p.sipsTaken} · 🎁 {p.sipsGiven}
                  {pref !== 'drinks' && (
                    <span className="ml-2 text-amber-300">
                      {equivRule.emoji} {p.equivalenceUnitsCompleted}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 text-xl">
                {p.prisonTurnsLeft > 0 && <span title="Prison">🔒 {p.prisonTurnsLeft}</span>}
                {p.holeTurnsLeft > 0 && <span title="Hole">🕳️ {p.holeTurnsLeft}</span>}
                {p.doubleNextSip && <span title="Double next sip">×2</span>}
                {p.bromanceWith && <span title="Bromance">💪</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventTicker({ events }: { events: ReadonlyArray<ClientGameEvent> }) {
  return (
    <section className="flex-1 overflow-hidden rounded-3xl bg-zinc-900/60 p-5">
      <h2 className="mb-3 text-xl font-semibold uppercase tracking-wider text-zinc-400">Live</h2>
      {events.length === 0 ? (
        <p className="text-xl text-zinc-500">Aucun événement pour l'instant…</p>
      ) : (
        <ul className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 32rem)' }}>
          {events.map((e) => {
            const emphasis =
              e.importance === 'epic'
                ? 'text-3xl font-bold text-amber-300'
                : e.importance === 'high'
                  ? 'text-2xl text-zinc-100'
                  : 'text-xl text-zinc-300';
            return (
              <li key={e.id} className={emphasis}>
                {e.text}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
