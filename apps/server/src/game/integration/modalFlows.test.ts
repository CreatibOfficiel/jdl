import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectClient } from '../../test-helpers/connectClient';
import { createTestServer } from '../../test-helpers/createTestServer';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function setupGame(code: string, server: Awaited<ReturnType<typeof createTestServer>>) {
  const p1 = await connectClient(server.wsUrl, {
    code,
    name: 'P1',
    suit: 'spades',
    color: '#ff0000',
  });
  const p2 = await connectClient(server.wsUrl, {
    code,
    name: 'P2',
    suit: 'hearts',
    color: '#00ff00',
  });
  p1.room.send('host_ack_checklist');
  await delay(100);

  p1.room.send('toggle_ready');
  p2.room.send('toggle_ready');
  await delay(100);

  p1.room.send('start_game');
  await delay(500);

  if (p1.room.state.phase === 'rolling_order') {
    p1.room.send('roll_order_dice');
    p2.room.send('roll_order_dice');
    await delay(300);

    while (p1.room.state.phase === 'rolling_order') {
      if (!p1.room.state.rollOrderRolls.has(p1.room.sessionId)) {
        p1.room.send('roll_order_dice');
      }
      if (!p2.room.state.rollOrderRolls.has(p2.room.sessionId)) {
        p2.room.send('roll_order_dice');
      }
      await delay(200);
    }
  }

  expect(p1.room.state.phase).toBe('playing');
  return { p1, p2 };
}

describe('Modal guards', () => {
  let server: Awaited<ReturnType<typeof createTestServer>>;

  beforeAll(async () => {
    server = await createTestServer();
  }, 15_000);

  afterAll(async () => {
    await server.cleanup();
  });

  it('non-active player actions are silently ignored during play', async () => {
    const code = `MODL-G01-${Date.now().toString(36)}`;
    const { p1, p2 } = await setupGame(code, server);

    const eventsBefore = p1.room.state.eventLog.length;

    p2.room.send('choose_bromance', { targetPlayerId: p1.sessionId });
    p2.room.send('choose_pill', { color: 'red' });
    p2.room.send('buy_item', { itemType: 'prison_key' });
    p2.room.send('open_treasure');
    p2.room.send('skip_treasure');
    p2.room.send('say_thanks');
    await delay(300);

    const eventsAfter = p1.room.state.eventLog.length;
    expect(eventsAfter).toBe(eventsBefore);

    p1.leave();
    p2.leave();
  });

  it('non-host cannot start game', async () => {
    const code = `MODL-G02-${Date.now().toString(36)}`;
    const p1 = await connectClient(server.wsUrl, {
      code,
      name: 'Host',
      suit: 'spades',
      color: '#ff0000',
    });
    const p2 = await connectClient(server.wsUrl, {
      code,
      name: 'Guest',
      suit: 'hearts',
      color: '#00ff00',
    });

    p2.room.send('start_game');
    await delay(300);
    expect(p2.room.state.phase).toBe('lobby');

    p1.leave();
    p2.leave();
  });

  it('use_item with unknown item type produces no event', async () => {
    const code = `MODL-G03-${Date.now().toString(36)}`;
    const { p1, p2 } = await setupGame(code, server);

    const eventsBefore = p1.room.state.eventLog.length;
    p1.room.send('use_item', { itemType: 'nonexistent_item' });
    await delay(200);

    expect(p1.room.state.eventLog.length).toBe(eventsBefore);

    p1.leave();
    p2.leave();
  });
});
