'use client';

import { useSounds } from '@/hooks/useSounds';

export function MuteToggle() {
  const { muted, toggleMuted } = useSounds();
  return (
    <button
      type="button"
      onClick={toggleMuted}
      title={muted ? 'Activer le son' : 'Couper le son'}
      aria-label={muted ? 'Activer le son' : 'Couper le son'}
      className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 px-2 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 dark:bg-zinc-900"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
