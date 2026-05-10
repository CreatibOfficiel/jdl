'use client';

import {
  AVATAR_EMOJIS,
  EQUIVALENCE_KINDS,
  EQUIVALENCE_TABLE,
  PAWN_COLORS,
  type Suit,
} from '@jeu-soiree/shared';
import type { Room } from 'colyseus.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveProfile } from '@/lib/profile';
import type { ClientGameState } from '@/types/colyseus';

const SUIT_OPTIONS: ReadonlyArray<{ id: Suit; symbol: string; label: string }> = [
  { id: 'spades', symbol: '♠', label: 'Pique' },
  { id: 'hearts', symbol: '♥', label: 'Cœur' },
  { id: 'diamonds', symbol: '♦', label: 'Carreau' },
  { id: 'clubs', symbol: '♣', label: 'Trèfle' },
];

const DICE_SVG = (
  <svg
    className="inline-block h-4 w-4 -translate-y-px"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 6l3 1m0 0l-3-1m3 1V12a9 9 0 102-18V6l-3-1m18 0l-3 1m0 0l3-1m-3 1V12a9 9 0 019 18V6"
    />
  </svg>
);

function useMultiRollingAnimation() {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout> | null>>(new Map());

  const stop = useCallback((field: string) => {
    const t = timersRef.current.get(field);
    if (t) clearTimeout(t);
    timersRef.current.delete(field);
  }, []);

  const stopAll = useCallback(() => {
    timersRef.current.forEach((t) => {
      if (t) clearTimeout(t);
    });
    timersRef.current.clear();
  }, []);

  const start = useCallback(
    (field: string, onTick: () => void, onDone: () => void, totalMs = 2000) => {
      stop(field);
      const startTime = Date.now();
      function tick() {
        const elapsed = Date.now() - startTime;
        if (elapsed >= totalMs) {
          timersRef.current.delete(field);
          onDone();
          return;
        }
        onTick();
        const p = Math.min(elapsed / totalMs, 1);
        timersRef.current.set(field, setTimeout(tick, 30 + p * p * 300));
      }
      tick();
    },
    [stop],
  );

  useEffect(() => stopAll, [stopAll]);

  return { start, stop, stopAll };
}

interface ProfileEditorProps {
  room: Room<ClientGameState>;
  state: ClientGameState;
  myId: string;
}

export function ProfileEditor({ room, state, myId }: ProfileEditorProps) {
  const me = state.players.get(myId);
  const [rollingField, setRollingField] = useState<string | null>(null);
  const [rollingValue, setRollingValue] = useState('');
  const {
    start: startRolling,
    stop: stopRolling,
    stopAll: stopAllRolling,
  } = useMultiRollingAnimation();

  const takenColors = new Set<string>();
  const takenEmojis = new Set<string>();
  state.players.forEach((p, id) => {
    if (id !== myId) {
      if (p.color) takenColors.add(p.color);
      if (p.emoji) takenEmojis.add(p.emoji);
    }
  });

  const profileComplete = Boolean(me?.suit && me?.color && me?.emoji);

  const send = useCallback(
    (update: Record<string, string>) => {
      room.send('update_profile', update);
      saveProfile(update);
    },
    [room],
  );

  const randomize = useCallback(
    (field: 'suit' | 'color' | 'emoji') => {
      stopRolling(field);
      setRollingField(field);
      const options =
        field === 'suit'
          ? SUIT_OPTIONS.map((s) => s.id)
          : field === 'color'
            ? PAWN_COLORS.filter((c) => !takenColors.has(c.id)).map((c) => c.id)
            : AVATAR_EMOJIS.filter((e) => !takenEmojis.has(e));

      startRolling(
        field,
        () => setRollingValue(options[Math.floor(Math.random() * options.length)]),
        () => {
          const final = options[Math.floor(Math.random() * options.length)];
          send({ [field]: final });
          setRollingField(null);
          setRollingValue('');
        },
      );
    },
    [takenColors, takenEmojis, startRolling, stopRolling, send],
  );

  function randomizeAll() {
    stopAllRolling();
    setRollingField('all');

    const suitOptions = SUIT_OPTIONS.map((s) => s.id);
    const colorOptions = PAWN_COLORS.filter((c) => !takenColors.has(c.id)).map((c) => c.id);
    const emojiOptions = AVATAR_EMOJIS.filter((e) => !takenEmojis.has(e));

    const pending = new Set(['suit', 'color', 'emoji']);
    function tick() {
      setRollingValue(suitOptions[Math.floor(Math.random() * suitOptions.length)]);
    }

    for (const field of ['suit', 'color', 'emoji'] as const) {
      startRolling(field, tick, () => {
        pending.delete(field);
        if (pending.size === 0) {
          send({
            suit: suitOptions[Math.floor(Math.random() * suitOptions.length)],
            color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
            emoji: emojiOptions[Math.floor(Math.random() * emojiOptions.length)],
          });
          setRollingField(null);
          setRollingValue('');
        }
      });
    }
  }

  const rollingDisplayValue =
    rollingField === 'suit'
      ? (SUIT_OPTIONS.find((s) => s.id === rollingValue)?.symbol ?? '')
      : rollingField === 'color'
        ? (PAWN_COLORS.find((c) => c.id === rollingValue)?.label ?? '')
        : rollingValue;

  const suit = me?.suit ?? '';
  const color = me?.color ?? '';
  const emoji = me?.emoji ?? '';
  const eqPref = me?.equivalencePreference ?? 'drinks';

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Mon profil</h2>
        {profileComplete ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
            Profil complet ✓
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            Profil incomplet
          </span>
        )}
      </div>

      <fieldset>
        <legend className="text-sm text-zinc-600 dark:text-zinc-400">Signe</legend>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {SUIT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => send({ suit: opt.id })}
              aria-pressed={suit === opt.id}
              className={`rounded-lg border-2 px-2 py-3 text-2xl transition ${
                suit === opt.id
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-700 dark:hover:border-zinc-500'
              }`}
            >
              <span aria-hidden="true">{opt.symbol}</span>
              <span className="sr-only">{opt.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => randomize('suit')}
            disabled={!!rollingField}
            className="col-span-4 rounded-lg border border-dashed border-zinc-300 px-2 py-2 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
          >
            {rollingField === 'suit' && rollingDisplayValue ? (
              <span className="mr-1 text-lg">{rollingDisplayValue}</span>
            ) : null}
            {DICE_SVG} Aléatoire
          </button>
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm text-zinc-600 dark:text-zinc-400">Couleur du pion</legend>
        <div className="mt-1 grid grid-cols-5 gap-2">
          {PAWN_COLORS.map((c) => {
            const taken = takenColors.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => send({ color: c.id })}
                disabled={taken}
                aria-pressed={color === c.id}
                aria-label={c.label}
                className={`h-10 rounded-lg border-2 transition ${
                  color === c.id
                    ? 'border-zinc-900 ring-2 ring-zinc-300 dark:border-zinc-100 dark:ring-zinc-500'
                    : 'border-zinc-200 dark:border-zinc-600'
                } ${taken ? 'cursor-not-allowed opacity-40' : ''}`}
                style={{ background: c.hex }}
              />
            );
          })}
          <button
            type="button"
            onClick={() => randomize('color')}
            disabled={!!rollingField}
            className="col-span-5 rounded-lg border border-dashed border-zinc-300 px-2 py-2 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
          >
            {rollingField === 'color' && rollingDisplayValue ? (
              <span className="mr-1">{rollingDisplayValue}</span>
            ) : null}
            {DICE_SVG} Aléatoire
          </button>
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm text-zinc-600 dark:text-zinc-400">Avatar</legend>
        <div className="mt-1 grid grid-cols-10 gap-1">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => send({ emoji: e })}
              disabled={takenEmojis.has(e)}
              aria-pressed={emoji === e}
              className={`flex h-9 items-center justify-center rounded-lg border text-xl transition ${
                emoji === e
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30'
                  : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-600 dark:hover:border-zinc-500'
              } ${takenEmojis.has(e) ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {e}
            </button>
          ))}
          <button
            type="button"
            onClick={() => randomize('emoji')}
            disabled={!!rollingField}
            className="col-span-10 rounded-lg border border-dashed border-zinc-300 px-2 py-2 text-sm text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
          >
            {rollingField === 'emoji' && rollingDisplayValue ? (
              <span className="mr-1 text-lg">{rollingDisplayValue}</span>
            ) : null}
            {DICE_SVG} Aléatoire
          </button>
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="text-sm text-zinc-600 dark:text-zinc-400">
          Quand je dois boire, <span className="text-zinc-400 dark:text-zinc-500">je préfère</span>
        </legend>
        <select
          value={eqPref}
          onChange={(e) => send({ equivalencePreference: e.target.value })}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
        >
          {EQUIVALENCE_KINDS.map((k: string) => {
            const rule = EQUIVALENCE_TABLE[k as keyof typeof EQUIVALENCE_TABLE];
            return (
              <option key={k} value={k}>
                {rule.emoji} {rule.label}
              </option>
            );
          })}
        </select>
      </fieldset>

      <button
        type="button"
        onClick={randomizeAll}
        disabled={!!rollingField}
        className="mt-4 w-full rounded-lg border border-dashed border-zinc-300 px-4 py-3 font-semibold text-zinc-600 hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
      >
        🎲 Tout randomiser
      </button>
    </section>
  );
}
