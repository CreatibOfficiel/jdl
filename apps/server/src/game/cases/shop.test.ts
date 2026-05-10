import { describe, expect, it } from 'vitest';
import { createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import { handleBuyItem, handleSkipShop } from './shop';

function setup(opts: { modal?: string; modalPlayer?: string } = {}) {
  const player = createMockPlayer({ id: 'p1', sipsTaken: 0, shopPurchases: 0 });
  const room = createMockRoom();
  room.state.phase = 'playing';
  room.state.activeModal = opts.modal ?? 'shop';
  room.state.activeModalPlayerId = opts.modalPlayer ?? 'p1';
  room.state.turnOrder.push('p1');
  room.state.players.set('p1', player);
  return { room, player };
}

describe('handleBuyItem', () => {
  it('adds item to inventory and increments sipsTaken', () => {
    const { room, player } = setup();
    handleBuyItem(room, createMockClient('p1'), { itemType: 'prison_key' });
    expect(player.inventory.includes('prison_key')).toBe(true);
    expect(player.sipsTaken).toBe(5);
    expect(player.shopPurchases).toBe(1);
  });

  it('buys crowbar', () => {
    const { room, player } = setup();
    handleBuyItem(room, createMockClient('p1'), { itemType: 'crowbar' });
    expect(player.inventory.includes('crowbar')).toBe(true);
    expect(player.sipsTaken).toBe(4);
  });

  it('rejects unknown item type', () => {
    const { room, player } = setup();
    handleBuyItem(room, createMockClient('p1'), { itemType: 'nonexistent' });
    expect(player.inventory.length).toBe(0);
    expect(player.sipsTaken).toBe(0);
  });

  it('clears modal after buying', () => {
    const { room } = setup();
    handleBuyItem(room, createMockClient('p1'), { itemType: 'prison_key' });
    expect(room.state.activeModal).toBe('');
  });

  it('ignores wrong modal', () => {
    const { room } = setup({ modal: 'pills', modalPlayer: 'p1' });
    handleBuyItem(room, createMockClient('p1'), { itemType: 'prison_key' });
    expect(room.state.eventLog.length).toBe(0);
  });
});

describe('handleSkipShop', () => {
  it('clears modal without buying', () => {
    const { room, player } = setup();
    handleSkipShop(room, createMockClient('p1'));
    expect(room.state.activeModal).toBe('');
    expect(player.inventory.length).toBe(0);
    expect(player.sipsTaken).toBe(0);
  });

  it('ignores wrong modal', () => {
    const { room } = setup({ modal: 'bromance', modalPlayer: 'p1' });
    handleSkipShop(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores wrong player', () => {
    const { room } = setup({ modal: 'shop', modalPlayer: 'p2' });
    handleSkipShop(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBe(0);
  });
});

describe('edge cases', () => {
  it('non-modal player cannot buy', () => {
    const { room, player } = setup({ modal: '', modalPlayer: 'p1' });
    handleBuyItem(room, createMockClient('p1'), { itemType: 'prison_key' });
    expect(player.inventory.length).toBe(0);
    expect(player.sipsTaken).toBe(0);
    expect(player.shopPurchases).toBe(0);
  });

  it('player not found keeps modal open', () => {
    const room = createMockRoom();
    room.state.activeModal = 'shop';
    room.state.activeModalPlayerId = 'ghost';
    handleBuyItem(room, createMockClient('ghost'), { itemType: 'prison_key' });
    expect(room.state.activeModal).toBe('shop');
    expect(room.state.activeModalPlayerId).toBe('ghost');
    expect(room.state.eventLog.length).toBe(0);
  });

  it('buying malus_point adds item and charges correct sips', () => {
    const { room, player } = setup();
    handleBuyItem(room, createMockClient('p1'), { itemType: 'malus_point' });
    expect(player.inventory.includes('malus_point')).toBe(true);
    expect(player.sipsTaken).toBe(6);
    expect(player.shopPurchases).toBe(1);
  });
});
