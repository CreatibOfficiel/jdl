import { GameEvent } from '../schemas/GameEvent';
import type { GameState } from '../schemas/GameState';

const MAX_EVENTS = 50;
// Shared counter is intentional: event IDs only need to be unique within a single process.
// The Date.now() suffix already guarantees global uniqueness across rooms.
let nextEventId = 0;

export type EventImportance = 'low' | 'normal' | 'high' | 'epic';

export interface PushEventInput {
  playerId?: string;
  kind: string;
  text: string;
  importance?: EventImportance;
}

export function pushEvent(state: GameState, input: PushEventInput): void {
  nextEventId += 1;
  const ev = new GameEvent();
  ev.id = `e${nextEventId}-${Date.now()}`;
  ev.timestamp = Date.now();
  ev.playerId = input.playerId ?? '';
  ev.kind = input.kind;
  ev.text = input.text;
  ev.importance = input.importance ?? 'normal';
  state.eventLog.push(ev);
  while (state.eventLog.length > MAX_EVENTS) {
    state.eventLog.shift();
  }
}
