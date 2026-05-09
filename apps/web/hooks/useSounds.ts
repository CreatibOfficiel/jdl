'use client';

import { useEffect, useState } from 'react';
import { isMuted, playSound, preloadSounds, type SoundKey, setMuted } from '@/lib/sounds';

interface UseSoundsResult {
  play: (key: SoundKey, volume?: number) => void;
  muted: boolean;
  toggleMuted: () => void;
}

export function useSounds(): UseSoundsResult {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    preloadSounds();
    setMutedState(isMuted());
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
