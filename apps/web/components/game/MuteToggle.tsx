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
      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm hover:bg-zinc-50"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
