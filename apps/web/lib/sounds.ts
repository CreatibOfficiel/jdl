'use client';

import { Howl } from 'howler';

export type SoundKey =
  | 'dice-roll'
  | 'dice-land'
  | 'pawn-step'
  | 'drink'
  | 'victory'
  | 'modal-open'
  | 'error';

const SOUND_FILES: Record<SoundKey, string> = {
  'dice-roll': '/sounds/dice-roll.mp3',
  'dice-land': '/sounds/dice-land.mp3',
  'pawn-step': '/sounds/pawn-step.mp3',
  drink: '/sounds/drink.mp3',
  victory: '/sounds/victory.mp3',
  'modal-open': '/sounds/modal-open.mp3',
  error: '/sounds/error.mp3',
};

const cache = new Map<SoundKey, Howl>();
let mutedRef = false;

const STORAGE_KEY = 'jeu-soiree-muted';

function loadMutedFromStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

function persistMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  if (muted) window.localStorage.setItem(STORAGE_KEY, '1');
  else window.localStorage.removeItem(STORAGE_KEY);
}

function getOrCreate(key: SoundKey): Howl {
  let h = cache.get(key);
  if (!h) {
    h = new Howl({
      src: [SOUND_FILES[key]],
      volume: 0.5,
      preload: true,
      onloaderror: () => {
        // Silently ignore if sound file is missing — user can drop files in /public/sounds later
      },
    });
    cache.set(key, h);
  }
  return h;
}

export function preloadSounds(): void {
  if (typeof window === 'undefined') return;
  mutedRef = loadMutedFromStorage();
  for (const key of Object.keys(SOUND_FILES) as SoundKey[]) {
    getOrCreate(key);
  }
}

export function playSound(key: SoundKey, volume = 0.5): void {
  if (mutedRef) return;
  if (typeof window === 'undefined') return;
  try {
    const h = getOrCreate(key);
    h.volume(volume);
    h.play();
  } catch {
    // ignore
  }
}

export function setMuted(muted: boolean): void {
  mutedRef = muted;
  persistMuted(muted);
}

export function isMuted(): boolean {
  return mutedRef;
}
