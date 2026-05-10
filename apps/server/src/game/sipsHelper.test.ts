import { describe, expect, it } from 'vitest';
import { createMockPlayer } from '../test-helpers/createMockPlayer';
import { createMockRoom } from '../test-helpers/createMockRoom';
import { applyDrink } from './sipsHelper';

describe('applyDrink', () => {
  it('increments sipsTaken by N', () => {
    const player = createMockPlayer();
    const room = createMockRoom();
    applyDrink(room, { player, sips: 3, emoji: '\u{1F37A}', kind: 'test_drink' });
    expect(player.sipsTaken).toBe(3);
  });

  it('doubles sips when doubleNextSip is true and resets flag', () => {
    const player = createMockPlayer({ doubleNextSip: true });
    const room = createMockRoom();
    applyDrink(room, { player, sips: 3, emoji: '\u{1F37A}', kind: 'test_drink' });
    expect(player.sipsTaken).toBe(6);
    expect(player.doubleNextSip).toBe(false);
  });

  it('does not double when doubleNextSip is false', () => {
    const player = createMockPlayer({ doubleNextSip: false, sipsTaken: 2 });
    const room = createMockRoom();
    applyDrink(room, { player, sips: 3, emoji: '\u{1F37A}', kind: 'test_drink' });
    expect(player.sipsTaken).toBe(5);
  });

  it('ricochets sips to bromance partner when connected', () => {
    const player = createMockPlayer({ id: 'p1', bromanceWith: 'p2' });
    const partner = createMockPlayer({ id: 'p2', sipsTaken: 0 });
    const room = createMockRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', partner);
    applyDrink(room, { player, sips: 4, emoji: '\u{1F37A}', kind: 'test_drink' });
    expect(player.sipsTaken).toBe(4);
    expect(partner.sipsTaken).toBe(4);
  });

  it('skips bromance ricochet when partner is disconnected', () => {
    const player = createMockPlayer({ id: 'p1', bromanceWith: 'p2' });
    const partner = createMockPlayer({ id: 'p2', connected: false });
    const room = createMockRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', partner);
    applyDrink(room, { player, sips: 4, emoji: '\u{1F37A}', kind: 'test_drink' });
    expect(player.sipsTaken).toBe(4);
    expect(partner.sipsTaken).toBe(0);
  });

  it('skips bromance ricochet when bromanceWith is empty', () => {
    const player = createMockPlayer({ id: 'p1', bromanceWith: '' });
    const room = createMockRoom();
    room.state.players.set('p1', player);
    applyDrink(room, { player, sips: 4, emoji: '\u{1F37A}', kind: 'test_drink' });
    expect(player.sipsTaken).toBe(4);
  });

  it('pushes an event to eventLog', () => {
    const player = createMockPlayer();
    const room = createMockRoom();
    applyDrink(room, { player, sips: 2, emoji: '\u{1F37A}', kind: 'drink_test' });
    let found = false;
    for (const e of room.state.eventLog) {
      if (e.kind === 'drink_test') found = true;
    }
    expect(found).toBe(true);
  });
});
