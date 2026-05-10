'use client';

import { useEffect, useState } from 'react';
import { isMuted, playSound, preloadSounds, type SoundKey, setMuted } from '@/lib/sounds';

interface UseSoundsResult {
  play: (key: SoundKey, volume?: number) => void;
  muted: boolean;
  toggleMuted: () => void;
}

export function useSounds(): UseSoundsResult {
  const [muted, setMutedState] = useState(() => isMuted());

  useEffect(() => {
    preloadSounds();
    const id = setInterval(() => setMutedState(isMuted()), 500);
    return () => clearInterval(id);
  }, []);

  return {
    play: playSound,
    muted,
    toggleMuted: () => {
      const next = !muted;
      setMuted(next);
      setMutedState(next);
    },
  };
}
