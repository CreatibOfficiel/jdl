import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectClient } from '../../test-helpers/connectClient';
import { createTestServer } from '../../test-helpers/createTestServer';
import { playUntilFinished } from '../../test-helpers/playUntilFinished';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Full game lifecycle', () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    server = await createTestServer();
  }, 15_000);

  afterAll(async () => {
    await server.cleanup();
  });

  it('two players join, start, play, and finish a game', async () => {
    const code = `INTG-FULL-${Date.now().toString(36)}`;
    const p1 = await connectClient(server.wsUrl, {
      code,
      name: 'Alice',
      suit: 'spades',
      color: '#ff0000',
    });
    const p2 = await connectClient(server.wsUrl, {
      code,
      name: 'Bob',
      suit: 'hearts',
      color: '#00ff00',
    });

    await delay(300);
    expect(p1.room.state.phase).toBe('lobby');

    p1.room.send('toggle_ready');
    p2.room.send('toggle_ready');
    await delay(100);

    p1.room.send('host_ack_checklist');
    await delay(100);
    p1.room.send('start_game');
    await delay(500);
    expect(['rolling_order', 'playing']).toContain(p1.room.state.phase);

    const result = await playUntilFinished([p1.room, p2.room], 60000);

    expect(p1.room.state.phase).toBe('finished');
    expect(p1.room.state.winnerId).toBeTruthy();
    const playerIds = new Set([p1.sessionId, p2.sessionId]);
    expect(playerIds.has(p1.room.state.winnerId)).toBe(true);
    expect(p2.room.state.winnerId).toBe(p1.room.state.winnerId);
    expect(result.eventCount).toBeGreaterThan(0);

    p1.leave();
    p2.leave();
  }, 90000);

  it('game persists to SQLite after finishing', async () => {
    const gameCode = `INTG-PER-${Date.now().toString(36)}`;
    const p1 = await connectClient(server.wsUrl, {
      code: gameCode,
      name: 'Charlie',
      suit: 'diamonds',
      color: '#ff0000',
    });
    const p2 = await connectClient(server.wsUrl, {
      code: gameCode,
      name: 'Dave',
      suit: 'clubs',
      color: '#00ff00',
    });

    p1.room.send('toggle_ready');
    p2.room.send('toggle_ready');
    await delay(100);

    p1.room.send('host_ack_checklist');
    await delay(100);
    p1.room.send('start_game');
    await delay(500);

    const result = await playUntilFinished([p1.room, p2.room], 60000);
    expect(result.winnerId).toBeTruthy();

    await delay(1000);

    const statsRes = await fetch(`${server.httpUrl}/api/stats/top`);
    const stats = await statsRes.json();
    expect(stats.recent.length).toBeGreaterThanOrEqual(1);

    p1.leave();
    p2.leave();
  }, 90000);

  it('cannot start with only one player', async () => {
    const gameCode = `INTG-SOLO-${Date.now().toString(36)}`;
    const p1 = await connectClient(server.wsUrl, {
      code: gameCode,
      name: 'Solo',
      suit: 'spades',
      color: '#ff0000',
    });

    p1.room.send('start_game');
    await delay(300);

    expect(p1.room.state.phase).toBe('lobby');

    p1.leave();
  });
});
