'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'jeu-soiree-appearance';

export interface Appearance {
  colorblind: boolean;
  playerEchoes: boolean;
}

const DEFAULT_APPEARANCE: Appearance = { colorblind: false, playerEchoes: false };

export function loadAppearance(): Appearance {
  if (typeof window === 'undefined') return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    return {
      colorblind: Boolean(parsed.colorblind),
      playerEchoes: Boolean(parsed.playerEchoes),
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function load(): Appearance {
  return loadAppearance();
}

export function save(a: Appearance): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* ignore */
  }
}

export function applyToDom(a: Appearance): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('colorblind', a.colorblind);
}

export function AppearanceToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = load();
    setAppearance(a);
    applyToDom(a);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const isDark = resolvedTheme === 'dark';

  const toggleAppearance = (key: keyof Appearance) => {
    const next: Appearance = { ...appearance, [key]: !appearance[key] };
    setAppearance(next);
    save(next);
    applyToDom(next);
  };

  const toggleDark = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white shadow-lg transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
        aria-label="Paramètres d'affichage"
        title="Paramètres"
      >
        <svg
          className="h-5 w-5 text-zinc-600 dark:text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed top-16 right-4 z-50 w-64 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Affichage
          </p>

          <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">🌙 Mode sombre</span>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={toggleDark}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${isDark ? 'bg-blue-600' : 'bg-zinc-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">🎨 Daltonien</span>
            <button
              type="button"
              role="switch"
              aria-checked={appearance.colorblind}
              onClick={() => toggleAppearance('colorblind')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${appearance.colorblind ? 'bg-blue-600' : 'bg-zinc-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${appearance.colorblind ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </label>

          <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">✨ Echoes phone</span>
            <button
              type="button"
              role="switch"
              aria-checked={appearance.playerEchoes}
              onClick={() => toggleAppearance('playerEchoes')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${appearance.playerEchoes ? 'bg-blue-600' : 'bg-zinc-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${appearance.playerEchoes ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </label>
        </div>
      )}
    </>
  );
}
