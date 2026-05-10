'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';

import { type Appearance, applyToDom, loadAppearance, save } from './AppearanceToggle';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [appearance, setAppearance] = useState<Appearance>(loadAppearance());
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  useEffect(() => {
    const a = loadAppearance();
    setAppearance(a);
    applyToDom(a);
  }, []);

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

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Paramètres</p>

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
  );
}
