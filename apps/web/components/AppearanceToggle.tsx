'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jeu-soiree-appearance';

export interface Appearance {
  colorblind: boolean;
  playerEchoes: boolean;
  dark: boolean;
}

const DEFAULT_APPEARANCE: Appearance = { colorblind: false, playerEchoes: false, dark: false };

export function loadAppearance(): Appearance {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return {
      colorblind: Boolean(parsed.colorblind),
      playerEchoes: Boolean(parsed.playerEchoes),
      dark: Boolean(parsed.dark),
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function load(): Appearance {
  return loadAppearance();
}

function save(a: Appearance): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

function applyToDom(a: Appearance): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('colorblind', a.colorblind);
  document.documentElement.classList.toggle('dark', a.dark);
}

export function AppearanceToggle() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    const a = load();
    setAppearance(a);
    applyToDom(a);
  }, []);

  const toggle = (key: keyof Appearance) => {
    const next: Appearance = { ...appearance, [key]: !appearance[key] };
    setAppearance(next);
    save(next);
    applyToDom(next);
  };

  return (
    <span className="inline-flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => toggle('colorblind')}
        aria-pressed={appearance.colorblind}
        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        title="Mode daltonien : palette + motifs distincts"
      >
        {appearance.colorblind ? '🎨 Daltonien : on' : '🎨 Daltonien'}
      </button>
      <button
        type="button"
        onClick={() => toggle('playerEchoes')}
        aria-pressed={appearance.playerEchoes}
        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        title="Affiche les gros événements aussi sur ton téléphone"
      >
        {appearance.playerEchoes ? '✨ Echoes : on' : '✨ Echoes phone'}
      </button>
      <button
        type="button"
        onClick={() => toggle('dark')}
        aria-pressed={appearance.dark}
        className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
        title="Mode sombre (basique pour cette V1)"
      >
        {appearance.dark ? '🌙 Sombre : on' : '🌙 Sombre'}
      </button>
    </span>
  );
}
