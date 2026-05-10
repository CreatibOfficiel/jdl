import { describe, expect, it } from 'vitest';
import type { Player } from '../../schemas/Player';
import { createInventory, createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import { handleUseItem } from './useItem';

function addPlayer(room: ReturnType<typeof createMockRoom>, player: Player) {
  room.state.players.set(player.id, player);
}

describe('handleUseItem', () => {
  it('malus_point: removes item and pushes event', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('malus_point'),
      sipsTaken: 0,
    });
    const target = createMockPlayer({ id: 'p2', sipsTaken: 0 });
    const room = createMockRoom();
    addPlayer(room, player);
    addPlayer(room, target);
    handleUseItem(room, createMockClient('p1'), { itemType: 'malus_point', targetPlayerId: 'p2' });
    expect(player.inventory.includes('malus_point')).toBe(false);
    const found = Array.from(room.state.eventLog).some((e) => e.kind === 'use_malus');
    expect(found).toBe(true);
  });

  it('malus_point: rejected without targetPlayerId', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('malus_point') });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'malus_point' });
    expect(player.inventory.includes('malus_point')).toBe(true);
  });

  it('malus_point: rejected when target disconnected', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('malus_point') });
    const target = createMockPlayer({ id: 'p2', connected: false });
    const room = createMockRoom();
    addPlayer(room, player);
    addPlayer(room, target);
    handleUseItem(room, createMockClient('p1'), { itemType: 'malus_point', targetPlayerId: 'p2' });
    expect(player.inventory.includes('malus_point')).toBe(true);
  });

  it('prison_key: frees player when in prison', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('prison_key'),
      prisonTurnsLeft: 3,
    });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'prison_key' });
    expect(player.prisonTurnsLeft).toBe(0);
    expect(player.inventory.includes('prison_key')).toBe(false);
  });

  it('prison_key: logs idle when not in prison', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('prison_key'),
      prisonTurnsLeft: 0,
    });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'prison_key' });
    expect(player.inventory.includes('prison_key')).toBe(true);
    const found = Array.from(room.state.eventLog).some((e) => e.kind === 'use_key_idle');
    expect(found).toBe(true);
  });

  it('loaded_die: sets pendingForcedDice and removes item', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('loaded_die'),
      pendingForcedDice: 0,
    });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'loaded_die', diceValue: 4 });
    expect(player.pendingForcedDice).toBe(4);
    expect(player.inventory.includes('loaded_die')).toBe(false);
  });

  it('loaded_die: rejects diceValue outside 1-6', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('loaded_die'),
      pendingForcedDice: 0,
    });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'loaded_die', diceValue: 0 });
    expect(player.pendingForcedDice).toBe(0);
    expect(player.inventory.includes('loaded_die')).toBe(true);
  });

  it('loaded_die: defaults diceValue to 0 and rejects', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('loaded_die') });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'loaded_die' });
    expect(player.inventory.includes('loaded_die')).toBe(true);
  });

  it('crowbar: logs unsupported flow, keeps item', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('crowbar') });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'crowbar' });
    expect(player.inventory.includes('crowbar')).toBe(true);
    const found = Array.from(room.state.eventLog).some((e) => e.kind === 'use_item_unsupported');
    expect(found).toBe(true);
  });

  it('potion: logs unsupported flow, keeps item', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('potion') });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'potion' });
    expect(player.inventory.includes('potion')).toBe(true);
  });

  it('rejected when player does not have the item', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory() });
    const room = createMockRoom();
    addPlayer(room, player);
    handleUseItem(room, createMockClient('p1'), { itemType: 'prison_key' });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('rejected when player not found', () => {
    const room = createMockRoom();
    handleUseItem(room, createMockClient('nonexistent'), { itemType: 'prison_key' });
    expect(room.state.eventLog.length).toBe(0);
  });
});
