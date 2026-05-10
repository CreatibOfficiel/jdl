'use client';

import type { Room } from 'colyseus.js';
import { useEffect, useState } from 'react';
import { getColyseusClient } from '@/lib/colyseus';
import { loadProfile } from '@/lib/profile';

export type RoomStatus = 'idle' | 'connecting' | 'joined' | 'reconnecting' | 'error';

export interface UseColyseusRoomResult<T> {
  room: Room<T> | null;
  state: T | null;
  status: RoomStatus;
  error: string | null;
}

interface PersistedSession {
  roomName: string;
  reconnectionToken: string;
  code: string;
}

const SESSION_PREFIX = 'jeu-soiree-session:';

function persistSession(code: string, roomName: string, reconnectionToken: string) {
  if (typeof window === 'undefined') return;
  const data: PersistedSession = { roomName, reconnectionToken, code };
  try {
    window.sessionStorage.setItem(`${SESSION_PREFIX}${code}`, JSON.stringify(data));
  } catch {}
}

function loadSession(code: string): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${code}`);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

function clearSession(code: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(`${SESSION_PREFIX}${code}`);
  } catch {}
}

export function useColyseusRoom<T = unknown>(
  roomName: string,
  options: Record<string, unknown>,
  enabled: boolean = true,
): UseColyseusRoomResult<T> {
  const [room, setRoom] = useState<Room<T> | null>(null);
  const [state, setState] = useState<T | null>(null);
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const optsKey = JSON.stringify(options);
  const code = (options.code as string | undefined) ?? '';

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let joinedRoom: Room<T> | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];

    setStatus('connecting');
    setError(null);

    const client = getColyseusClient();
    const parsedOptions = JSON.parse(optsKey) as Record<string, unknown>;

    async function connect(): Promise<Room<T> | null> {
      const persisted = loadSession(code);
      if (persisted && persisted.roomName === roomName) {
        try {
          const r = await client.reconnect<T>(persisted.reconnectionToken);
          return r;
        } catch {
          clearSession(code);
        }
      }

      const profile = loadProfile();
      if (profile) {
        if (profile.emoji) parsedOptions.emoji = profile.emoji;
        if (profile.color) parsedOptions.color = profile.color;
        if (profile.suit) parsedOptions.suit = profile.suit;
        if (profile.equivalencePreference)
          parsedOptions.equivalencePreference = profile.equivalencePreference;
      }

      return await client.joinOrCreate<T>(roomName, parsedOptions);
    }

    function scheduleReconnect() {
      const session = loadSession(code);
      let attempts = 0;
      const maxAttempts = 5;

      function attempt() {
        if (cancelled) return;
        if (!session || session.roomName !== roomName) {
          setStatus('error');
          setError('Session perdue, reconnexion impossible');
          return;
        }

        (async () => {
          try {
            const r = await client.reconnect<T>(session.reconnectionToken);
            if (cancelled) {
              r.leave();
              return;
            }
            joinedRoom = r;
            attachListeners(r);
          } catch {
            attempts++;
            if (attempts >= maxAttempts) {
              if (!cancelled) {
                clearSession(code);
                setStatus('error');
                setError('Reconnexion échouée après plusieurs tentatives');
              }
              return;
            }
            const delay = attempts === 1 ? 2000 : 3000;
            timers.push(setTimeout(attempt, delay));
          }
        })();
      }

      timers.push(setTimeout(attempt, 2000));
    }

    function restoreProfile(r: Room<T>) {
      const profile = loadProfile();
      if (!profile) return;
      if (!profile.emoji && !profile.color && !profile.suit) return;

      const s = r.state as Record<string, unknown>;
      const players = s?.players as Record<string, unknown> | undefined;
      if (!players || typeof players.forEach !== 'function') return;

      let me: Record<string, unknown> | null = null;
      let colorTaken = false;
      let emojiTaken = false;
      (players as unknown as Map<string, Record<string, unknown>>).forEach((p, id) => {
        if (id === r.sessionId) {
          me = p;
          return;
        }
        const connected = p['connected'] !== false;
        if (!connected) return;
        if (profile.color && p['color'] === profile.color) colorTaken = true;
        if (profile.emoji && p['emoji'] === profile.emoji) emojiTaken = true;
      });

      const meEmoji = me ? String(me['emoji'] ?? '') : '';
      const meColor = me ? String(me['color'] ?? '') : '';
      const meSuit = me ? String(me['suit'] ?? '') : '';

      const payload: Record<string, string> = {};
      if (!meEmoji && profile.emoji && !emojiTaken) payload.emoji = profile.emoji;
      if (!meColor && profile.color && !colorTaken) payload.color = profile.color;
      if (!meSuit && profile.suit) payload.suit = profile.suit;
      if (profile.equivalencePreference)
        payload.equivalencePreference = profile.equivalencePreference;

      if (Object.keys(payload).length > 0) {
        r.send('update_profile', payload);
      }
    }

    function attachListeners(r: Room<T>) {
      setRoom(r);
      setState(r.state as T);
      setStatus('joined');

      persistSession(code, roomName, r.reconnectionToken);
      restoreProfile(r);

      r.onStateChange(() => setTick((t) => t + 1));
      r.onError((c, message) => setError(`[${c}] ${message ?? 'unknown error'}`));
      r.onLeave((leaveCode) => {
        if (cancelled) return;
        setRoom(null);
        if (leaveCode === 4000 || (leaveCode >= 1000 && leaveCode < 2000)) {
          clearSession(code);
          setStatus('idle');
          return;
        }
        setStatus('reconnecting');
        scheduleReconnect();
      });
    }

    connect()
      .then((r) => {
        if (cancelled || !r) {
          if (r) r.leave();
          return;
        }
        joinedRoom = r;
        attachListeners(r);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        clearSession(code);
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      if (joinedRoom) {
        try {
          joinedRoom.leave();
        } catch {}
      }
    };
  }, [enabled, roomName, optsKey, code]);

  return { room, state, status, error };
}
