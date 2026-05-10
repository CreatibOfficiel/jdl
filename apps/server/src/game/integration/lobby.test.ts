import { Client } from 'colyseus.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestServer } from '../../test-helpers/createTestServer';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Lobby validation', () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    server = await createTestServer();
  }, 15_000);

  afterAll(async () => {
    await server.cleanup();
  });

  it('allows duplicate suit', async () => {
    const code = `LOBB-DUP-${Date.now().toString(36)}`;
    const c1 = new Client(server.wsUrl);
    const r1 = await c1.joinOrCreate('game_room', {
      code,
      name: 'Alice',
      suit: 'spades',
      color: '#ff0000',
      emoji: '🎯',
    });
    try {
      const c2 = new Client(server.wsUrl);
      const r2 = await c2.joinOrCreate('game_room', {
        code,
        name: 'Bob',
        suit: 'spades',
        color: '#00ff00',
        emoji: '🎲',
      });
      await delay(300);
      expect(r2.state.players.size).toBeGreaterThanOrEqual(2);
      r2.leave();
    } finally {
      r1.leave();
    }
  });

  it('accepts duplicate name with auto-suffix (case-insensitive)', async () => {
    const code = `LOBB-NAM-${Date.now().toString(36)}`;
    const c1 = new Client(server.wsUrl);
    const r1 = await c1.joinOrCreate('game_room', {
      code,
      name: 'Alice',
      suit: 'spades',
      color: '#ff0000',
      emoji: '🎯',
    });
    try {
      const c2 = new Client(server.wsUrl);
      const r2 = await c2.joinOrCreate('game_room', {
        code,
        name: 'alice',
        suit: 'hearts',
        color: '#00ff00',
        emoji: '🎲',
      });
      await delay(300);
      expect(r2.state.players.size).toBeGreaterThanOrEqual(2);
      r2.leave();
    } finally {
      r1.leave();
    }
  });

  it('rejects invalid game code format (too short)', async () => {
    const c1 = new Client(server.wsUrl);
    try {
      await expect(
        c1.joinOrCreate('game_room', {
          code: 'AB',
          name: 'Eve',
          suit: 'clubs',
          color: '#0000ff',
          emoji: '🐰',
        }),
      ).rejects.toThrow();
    } finally {
      // no-op: connection rejected
    }
  });

  it('multiple players with unique suits can join', async () => {
    const code = `LOBB-MUL-${Date.now().toString(36)}`;
    const clients: Client[] = [];
    // biome-ignore lint/suspicious/noExplicitAny: colyseus room type
    const rooms: any[] = [];
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff'];

    try {
      for (let i = 0; i < 4; i++) {
        const c = new Client(server.wsUrl);
        clients.push(c);
        const r = await c.joinOrCreate('game_room', {
          code,
          name: `Player${i}`,
          suit: suits[i],
          color: colors[i],
          emoji: '🎯',
        });
        rooms.push(r);
      }
      await delay(500);
      const latestRoom = rooms[rooms.length - 1];
      expect(latestRoom.state.players.size).toBe(4);
    } finally {
      for (const r of rooms) r.leave();
    }
  });
});
