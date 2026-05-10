const STORAGE_KEY = 'jeu-soiree-profile';

export interface PlayerProfile {
  name: string;
  emoji?: string;
  color?: string;
  suit?: string;
  equivalencePreference?: string;
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

export function saveProfile(profile: Partial<PlayerProfile>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadProfile() ?? {};
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...profile }));
  } catch {}
}
