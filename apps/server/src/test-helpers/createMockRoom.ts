import type { Client } from 'colyseus';
import type { GameRoom } from '../rooms/GameRoom';
import { GameState } from '../schemas/GameState';

export type MockGameState = GameState;

export interface MockRoomConfig {
  state?: Partial<GameState>;
  clock?: { setTimeout: ReturnType<typeof globalThis.setTimeout> };
  getTreasureCases?: () => readonly number[];
  persistIfFinished?: () => void;
}

export function createMockRoom(overrides: MockRoomConfig = {}): GameRoom {
  const state = new GameState();
  if (overrides.state) {
    for (const [k, v] of Object.entries(overrides.state)) {
      (state as unknown as Record<string, unknown>)[k] = v;
    }
  }

  return {
    state,
    totalTurnCount: 0,
    allSipEvents: [] as unknown as GameRoom['allSipEvents'],
    clock: {
      setTimeout: ((fn: () => void, _ms: number) => {
        fn();
        return 0 as unknown as ReturnType<typeof globalThis.setTimeout>;
      }) as unknown as GameRoom['clock']['setTimeout'],
    },
    getTreasureCases: () => overrides.getTreasureCases?.() ?? [],
    persistIfFinished: () => {},
    ...overrides,
  } as unknown as GameRoom;
}

export function createMockClient(sessionId = 'player-1'): Client {
  return { sessionId } as unknown as Client;
}
