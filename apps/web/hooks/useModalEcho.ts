'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { EchoPayload } from '@/components/master/ModalEcho';
import type { ClientGameEvent } from '@/types/colyseus';

type Action = { type: 'show'; echo: EchoPayload } | { type: 'hide'; id: string };

function reducer(state: EchoPayload | null, action: Action): EchoPayload | null {
  switch (action.type) {
    case 'show':
      // Replace-on-collision: latest high|epic always wins.
      return action.echo;
    case 'hide':
      // Only hide if the current echo matches; protects against late timers when a newer
      // echo already replaced this one.
      return state?.id === action.id ? null : state;
  }
}

/** Watches the eventLog tail; whenever a new high|epic event lands, fires a 4s overlay.
 *  On reconnect, skips the existing tail (lastSeenId is initialised to the last id at mount). */
export function useModalEcho(
  events: ReadonlyArray<ClientGameEvent>,
  holdMs: number = 4000,
): EchoPayload | null {
  const [echo, dispatch] = useReducer(reducer, null);
  const lastSeenIdRef = useRef<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    const last = events[events.length - 1];
    if (!last) return;
    if (!initRef.current) {
      // First render after spectator joins: don't replay the existing tail.
      lastSeenIdRef.current = last.id;
      initRef.current = true;
      return;
    }
    if (last.id === lastSeenIdRef.current) return;
    lastSeenIdRef.current = last.id;
    if (last.importance !== 'high' && last.importance !== 'epic') return;

    const payload: EchoPayload = {
      id: last.id,
      title: last.text,
      importance: last.importance,
    };
    dispatch({ type: 'show', echo: payload });
    const timer = setTimeout(() => dispatch({ type: 'hide', id: payload.id }), holdMs);
    return () => clearTimeout(timer);
  }, [events, events.length, holdMs]);

  return echo;
}
