import type { Room } from 'colyseus.js';
import { Client } from 'colyseus.js';

export interface ConnectResult {
  client: Client;
  room: Room;
  sessionId: string;
  leave: () => void;
}

export async function connectClient(
  serverUrl: string,
  opts: {
    code: string;
    name?: string;
    suit?: string;
    color?: string;
    emoji?: string;
  },
): Promise<ConnectResult> {
  const client = new Client(serverUrl);
  const room = await client.joinOrCreate('game_room', {
    code: opts.code,
    name: opts.name ?? 'TestPlayer',
    suit: opts.suit ?? 'spades',
    color: opts.color ?? '#ff0000',
    emoji: opts.emoji ?? '🎯',
  });

  return {
    client,
    room,
    sessionId: room.sessionId,
    leave: () => {
      room.leave();
    },
  };
}
