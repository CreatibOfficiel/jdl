'use client';

import type { Room } from 'colyseus.js';
import { useEffect, useState } from 'react';
import { getColyseusClient } from '@/lib/colyseus';

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

const STORAGE_PREFIX = 'jeu-soiree-session:';

function persistSession(code: string, roomName: string, reconnectionToken: string) {
  if (typeof window === 'undefined') return;
  const data: PersistedSession = { roomName, reconnectionToken, code };
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${code}`, JSON.stringify(data));
  } catch {}
}

function loadSession(code: string): PersistedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${code}`);
    return raw ? (JSON.parse(raw) as PersistedSession) : null;
  } catch {
    return null;
  }
}

function clearSession(code: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(`${STORAGE_PREFIX}${code}`);
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
      return await client.joinOrCreate<T>(roomName, parsedOptions);
    }

    function attachListeners(r: Room<T>) {
      setRoom(r);
      setState(r.state as T);
      setStatus('joined');

      persistSession(code, roomName, r.reconnectionToken);

      r.onStateChange(() => setTick((t) => t + 1));
      r.onError((c, message) => setError(`[${c}] ${message ?? 'unknown error'}`));
      r.onLeave((leaveCode) => {
        if (cancelled) return;
        // 1000-1999 = clean closure, 4000 = consented leave
        if (leaveCode === 4000 || (leaveCode >= 1000 && leaveCode < 2000)) {
          clearSession(code);
          setRoom(null);
          setStatus('idle');
          return;
        }
        setStatus('reconnecting');
        // Colyseus.js will automatically attempt reconnect via the token; if it fails, status stays at reconnecting
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
      joinedRoom?.leave();
    };
  }, [enabled, roomName, optsKey, code]);

  return { room, state, status, error };
}
