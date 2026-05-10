'use client';

import {
  AVATAR_EMOJIS,
  DIFFICULTY_LEVELS,
  DIFFICULTY_PRESETS,
  type DifficultyLevel,
  EQUIVALENCE_KINDS,
  EQUIVALENCE_TABLE,
  type EquivalenceKind,
  generateGameCode,
  isValidGameCode,
  normalizeGameCode,
  PAWN_COLORS,
  type Suit,
} from '@jeu-soiree/shared';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { loadProfile, saveProfile } from '@/lib/profile';

const SUIT_OPTIONS: ReadonlyArray<{ id: Suit; symbol: string; label: string }> = [
  { id: 'spades', symbol: '♠', label: 'Pique' },
  { id: 'hearts', symbol: '♥', label: 'Cœur' },
  { id: 'diamonds', symbol: '♦', label: 'Carreau' },
  { id: 'clubs', symbol: '♣', label: 'Trèfle' },
];

const FALLBACK_COLOR = PAWN_COLORS[0]?.id ?? 'coral';
const FALLBACK_EMOJI = AVATAR_EMOJIS[0] ?? '🦊';

export function JoinForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [suit, setSuit] = useState<Suit>('hearts');
  const [color, setColor] = useState<string>(FALLBACK_COLOR);
  const [emoji, setEmoji] = useState<string>(FALLBACK_EMOJI);
  const [equivalencePreference, setEquivalencePreference] = useState<EquivalenceKind>('drinks');
  const [perSourceOpen, setPerSourceOpen] = useState(false);
  const [perSource, setPerSource] = useState<Partial<Record<'card' | 'witch' | 'rail', EquivalenceKind>>>({});
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = loadProfile();
    if (!p) return;
    if (p.name) setName(p.name);
    if (p.suit) setSuit(p.suit);
    if (p.color) setColor(p.color);
    if (p.emoji) setEmoji(p.emoji);
    if (p.equivalencePreference) setEquivalencePreference(p.equivalencePreference);
  }, []);

  function go(code: string, includeDifficulty: boolean) {
    saveProfile({ name, suit, color, emoji, equivalencePreference });
    const params = new URLSearchParams({ name, suit, color, emoji, equivalencePreference });
    if (includeDifficulty) params.set('difficulty', difficulty);
    if (Object.keys(perSource).length > 0) {
      params.set('equivalencePerSource', JSON.stringify(perSource));
    }
    router.push(`/lobby/${code}?${params.toString()}`);
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Pseudo obligatoire');
      return;
    }
    setError(null);
    go(generateGameCode(), true);
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
    go(normalized, false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-700">Ton profil</h2>

        <label className="mt-3 block">
          <span className="text-sm text-zinc-600">Pseudo</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Sarah"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base focus:border-blue-500 focus:outline-none"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm text-zinc-600">Signe</legend>
          <div className="mt-1 grid grid-cols-4 gap-2">
            {SUIT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSuit(opt.id)}
                aria-pressed={suit === opt.id}
                className={`rounded-lg border-2 px-2 py-3 text-2xl transition ${
                  suit === opt.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <span aria-hidden="true">{opt.symbol}</span>
                <span className="sr-only">{opt.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-sm text-zinc-600">Couleur du pion</legend>
          <div className="mt-1 grid grid-cols-5 gap-2">
            {PAWN_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                aria-pressed={color === c.id}
                aria-label={c.label}
                className={`h-10 rounded-lg border-2 transition ${
                  color === c.id ? 'border-zinc-900 ring-2 ring-zinc-300' : 'border-zinc-200'
                }`}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-sm text-zinc-600">Avatar</legend>
          <div className="mt-1 grid grid-cols-10 gap-1">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                aria-pressed={emoji === e}
                className={`flex h-9 items-center justify-center rounded-lg border text-xl transition ${
                  emoji === e
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-sm text-zinc-600">
            Quand je dois boire,{' '}
            <span className="text-zinc-400">je préfère</span>
          </legend>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EQUIVALENCE_KINDS.map((k) => {
              const rule = EQUIVALENCE_TABLE[k];
              const active = equivalencePreference === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setEquivalencePreference(k)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left transition ${
                    active
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-zinc-200 bg-white hover:border-zinc-300'
                  }`}
                >
                  <span className="text-xl" aria-hidden="true">
                    {rule.emoji}
                  </span>
                  <span className="text-sm font-medium text-zinc-800">{rule.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-zinc-700">Créer une partie</h2>
          <p className="mt-1 text-sm text-zinc-500">Tu deviens host. Un code est généré.</p>

          <fieldset className="mt-4">
            <legend className="text-sm text-zinc-600">Difficulté</legend>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {DIFFICULTY_LEVELS.map((lvl) => {
                const meta = DIFFICULTY_PRESETS[lvl];
                const active = difficulty === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    aria-pressed={active}
                    title={meta.description}
                    className={`rounded-lg border-2 px-2 py-2 text-center transition ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="text-xl" aria-hidden="true">
                      {meta.emoji}
                    </div>
                    <div className="text-xs font-medium text-zinc-800">{meta.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {DIFFICULTY_PRESETS[difficulty].description} · cartes ={' '}
              {DIFFICULTY_PRESETS[difficulty].config.sipsPerCard} gorgée(s)
            </p>
          </fieldset>

          <details
            className="mt-4 rounded-lg border border-zinc-200 bg-white p-3"
            open={perSourceOpen}
            onToggle={(e) => setPerSourceOpen((e.currentTarget as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-sm font-medium text-zinc-700">
              🎯 Préférences par source (optionnel)
            </summary>
            <p className="mt-2 text-xs text-zinc-500">
              Override par catégorie : ex. je bois sur les cartes mais je fais des pompes
              sur la potion sorcière. Vide = utilise ta pref globale.
            </p>
            <div className="mt-3 space-y-2 text-xs">
              {(['card', 'witch', 'rail'] as const).map((src) => (
                <div key={src} className="flex items-center gap-2">
                  <span className="w-20 text-zinc-700">
                    {src === 'card' ? '♠♥ Cartes' : src === 'witch' ? '🧙 Sorcière' : '🚌 Rail'}
                  </span>
                  <select
                    value={perSource[src] ?? ''}
                    onChange={(e) => {
                      const v = e.target.value as EquivalenceKind | '';
                      setPerSource((prev) => {
                        const next = { ...prev };
                        if (v === '') delete next[src];
                        else next[src] = v;
                        return next;
                      });
                    }}
                    className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs"
                  >
                    <option value="">— pref globale —</option>
                    {EQUIVALENCE_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {EQUIVALENCE_TABLE[k].emoji} {EQUIVALENCE_TABLE[k].label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </details>

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700"
          >
            Créer
          </button>
        </form>

        <form
          onSubmit={handleJoin}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-base font-semibold text-zinc-700">Rejoindre une partie</h2>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD-1234"
            maxLength={9}
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-base focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white transition hover:bg-zinc-800"
          >
            Rejoindre
          </button>
        </form>
      </div>
    </div>
  );
}
