import type { EquivalenceKind, Suit } from '@jeu-soiree/shared';

const STORAGE_KEY = 'jeu-soiree-profile';

export interface PlayerProfile {
  name: string;
  suit: Suit;
  color: string;
  emoji: string;
  equivalencePreference: EquivalenceKind;
}

export function loadProfile(): Partial<PlayerProfile> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<PlayerProfile>) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: PlayerProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage may be disabled (private browsing, quota, etc.) — silently ignore
  }
}
