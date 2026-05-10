import { describe, expect, it } from 'vitest';
import { createInventory, createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import { handleGivePotion, handleSayThanks } from './witch';

function createWitchRoom(opts: { activeModal?: string; captureTimeout?: boolean } = {}) {
  const room = createMockRoom();
  room.state.phase = 'playing';
  let capturedCb: (() => void) | null = null;
  if (opts.captureTimeout) {
    room.clock.setTimeout = ((cb: () => void, _ms: number) => {
      capturedCb = cb;
      return 0 as unknown as ReturnType<typeof createMockRoom>['clock']['setTimeout'];
    }) as unknown as ReturnType<typeof createMockRoom>['clock']['setTimeout'];
  } else {
    room.clock.setTimeout = (() => {
      const noop: ReturnType<typeof createMockRoom>['clock']['setTimeout'] =
        (() => {}) as unknown as ReturnType<typeof createMockRoom>['clock']['setTimeout'];
      return noop;
    })() as ReturnType<typeof createMockRoom>['clock']['setTimeout'];
  }
  if (opts.activeModal !== undefined) room.state.activeModal = opts.activeModal;
  return { room, fireTimeout: () => capturedCb?.() };
}

describe('handleGivePotion', () => {
  it('removes potion from inventory', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 5 });
    expect(player.inventory.includes('potion')).toBe(false);
  });

  it('sets witch_potion modal for target', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 5 });
    expect(room.state.activeModal).toBe('witch_potion');
    expect(room.state.activeModalPlayerId).toBe('p2');
  });

  it('clamps sips to 1-10 (lower)', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: -5 });
    expect(room.state.witchSips).toBe(1);
  });

  it('clamps sips to 1-10 (upper)', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 99 });
    expect(room.state.witchSips).toBe(10);
  });

  it('rejects self-target', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const { room } = createWitchRoom();
    room.state.players.set('p1', player);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p1', sips: 5 });
    expect(player.inventory.includes('potion')).toBe(true);
  });

  it('rejects disconnected target', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2', connected: false });
    const { room } = createWitchRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 5 });
    expect(player.inventory.includes('potion')).toBe(true);
  });

  it('rejects when no potion', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory() });
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 5 });
    expect(room.state.activeModal).toBe('');
  });

  it('rejects when modal already active', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom({ activeModal: 'shop' });
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 5 });
    expect(room.state.activeModal).toBe('shop');
  });
});

describe('handleSayThanks', () => {
  it('closes witch_potion modal', () => {
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.activeModal = 'witch_potion';
    room.state.activeModalPlayerId = 'p2';
    room.state.witchOffererId = 'p1';
    room.state.witchSips = 5;
    room.state.witchDeadline = Date.now() + 10000;
    room.state.players.set('p2', target);
    handleSayThanks(room, createMockClient('p2'));
    expect(room.state.activeModal).toBe('');
    expect(room.state.witchSips).toBe(0);
  });

  it('ignores wrong modal', () => {
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.activeModal = 'shop';
    room.state.activeModalPlayerId = 'p2';
    room.state.players.set('p2', target);
    handleSayThanks(room, createMockClient('p2'));
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores wrong player', () => {
    const target = createMockPlayer({ id: 'p2' });
    const { room } = createWitchRoom();
    room.state.activeModal = 'witch_potion';
    room.state.activeModalPlayerId = 'p2';
    room.state.players.set('p2', target);
    handleSayThanks(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBe(0);
  });
});

describe('witch timeout', () => {
  it('doubles sips when target does not say thanks', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room, fireTimeout } = createWitchRoom({ captureTimeout: true });
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 3 });
    expect(room.state.witchSips).toBe(3);
    fireTimeout();
    expect(room.state.activeModal).toBe('');
    const failEvent = Array.from(room.state.eventLog).find((e) => e.kind === 'witch_no_thanks');
    expect(failEvent?.text).toContain('6');
    expect(target.sipsTaken).toBe(6);
  });

  it('does nothing if thanks was already said', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room, fireTimeout } = createWitchRoom({ captureTimeout: true });
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 3 });
    handleSayThanks(room, createMockClient('p2'));
    expect(room.state.activeModal).toBe('');
    fireTimeout();
    const noThanksEvent = Array.from(room.state.eventLog).find((e) => e.kind === 'witch_no_thanks');
    expect(noThanksEvent).toBeUndefined();
    expect(target.sipsTaken).toBe(0);
  });

  it('uses clamped sips for doubling', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const target = createMockPlayer({ id: 'p2' });
    const { room, fireTimeout } = createWitchRoom({ captureTimeout: true });
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleGivePotion(room, createMockClient('p1'), { targetPlayerId: 'p2', sips: 99 });
    expect(room.state.witchSips).toBe(10);
    fireTimeout();
    expect(target.sipsTaken).toBe(10);
  });
});
