'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jeu-soiree-appearance';

interface Appearance {
  colorblind: boolean;
}

function load(): Appearance {
  if (typeof window === 'undefined') return { colorblind: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { colorblind: false };
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return { colorblind: Boolean(parsed.colorblind) };
  } catch {
    return { colorblind: false };
  }
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
}

export function AppearanceToggle() {
  const [appearance, setAppearance] = useState<Appearance>({ colorblind: false });

  useEffect(() => {
    const a = load();
    setAppearance(a);
    applyToDom(a);
  }, []);

  const toggleColorblind = () => {
    const next: Appearance = { ...appearance, colorblind: !appearance.colorblind };
    setAppearance(next);
    save(next);
    applyToDom(next);
  };

  return (
    <button
      type="button"
      onClick={toggleColorblind}
      aria-pressed={appearance.colorblind}
      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
      title="Mode daltonien : palette + motifs distincts"
    >
      {appearance.colorblind ? '🎨 Mode daltonien : on' : '🎨 Mode daltonien'}
    </button>
  );
}
