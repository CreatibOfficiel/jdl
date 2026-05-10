import { describe, expect, it, vi } from 'vitest';
import { createInventory, createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import {
  checkTreasure,
  handleOpenTreasure,
  handleSkipTreasure,
  handleSwapPosition,
} from './treasure';

describe('checkTreasure', () => {
  it('opens modal when player has crowbar on treasure position', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('crowbar'),
      position: 10,
    });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.players.set('p1', player);
    checkTreasure(room, player);
    expect(room.state.activeModal).toBe('treasure');
  });

  it('does not open modal when no crowbar', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory(), position: 10 });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.players.set('p1', player);
    checkTreasure(room, player);
    expect(room.state.activeModal).toBe('');
  });

  it('does not open modal when not on treasure position', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('crowbar'),
      position: 5,
    });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.players.set('p1', player);
    checkTreasure(room, player);
    expect(room.state.activeModal).toBe('');
  });

  it('does not open modal when already opened', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('crowbar'),
      position: 10,
    });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.treasuresOpened.push(10);
    room.state.players.set('p1', player);
    checkTreasure(room, player);
    expect(room.state.activeModal).toBe('');
  });

  it('does nothing when another modal is active', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('crowbar'),
      position: 10,
    });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.activeModal = 'shop';
    room.state.players.set('p1', player);
    checkTreasure(room, player);
    expect(room.state.activeModal).toBe('shop');
  });
});

describe('handleOpenTreasure', () => {
  it('removes crowbar from inventory', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('crowbar'),
      position: 10,
    });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.activeModal = 'treasure';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleOpenTreasure(room, createMockClient('p1'));
    expect(player.inventory.includes('crowbar')).toBe(false);
  });

  it('adds position to treasuresOpened', () => {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('crowbar'),
      position: 10,
    });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.activeModal = 'treasure';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleOpenTreasure(room, createMockClient('p1'));
    let found = false;
    for (const p of room.state.treasuresOpened) {
      if (p === 10) found = true;
    }
    expect(found).toBe(true);
  });

  it('ignores wrong modal', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory('crowbar') });
    const room = createMockRoom();
    room.state.activeModal = 'shop';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleOpenTreasure(room, createMockClient('p1'));
    expect(player.inventory.includes('crowbar')).toBe(true);
  });

  it('ignores when no crowbar', () => {
    const player = createMockPlayer({ id: 'p1', inventory: createInventory() });
    const room = createMockRoom();
    room.state.activeModal = 'treasure';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleOpenTreasure(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBe(0);
  });
});

describe('handleSwapPosition', () => {
  it('swaps positions of both players', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const target = createMockPlayer({ id: 'p2', position: 20 });
    const room = createMockRoom();
    room.state.activeModal = 'treasure_swap';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleSwapPosition(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(player.position).toBe(20);
    expect(target.position).toBe(5);
  });

  it('rejects self-swap', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.activeModal = 'treasure_swap';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleSwapPosition(room, createMockClient('p1'), { targetPlayerId: 'p1' });
    expect(player.position).toBe(5);
  });

  it('rejects disconnected target', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const target = createMockPlayer({ id: 'p2', position: 20, connected: false });
    const room = createMockRoom();
    room.state.activeModal = 'treasure_swap';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    room.state.players.set('p2', target);
    handleSwapPosition(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(player.position).toBe(5);
  });
});

describe('handleOpenTreasure dice outcomes', () => {
  function setupRoom() {
    const player = createMockPlayer({
      id: 'p1',
      inventory: createInventory('crowbar'),
      position: 10,
    });
    const room = createMockRoom({ getTreasureCases: () => [10] });
    room.state.activeModal = 'treasure';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    return { room, player };
  }

  it('dice 1: broadcasts drink event and closes modal', () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    const { room } = setupRoom();
    handleOpenTreasure(room, createMockClient('p1'));
    const events = room.state.eventLog;
    const broadcast = events.find((e) => e.kind === 'treasure_broadcast');
    expect(broadcast).toBeDefined();
    expect(broadcast!.text).toContain('3');
    expect(room.state.activeModal).toBe('');
    mathSpy.mockRestore();
  });

  it('dice 2: broadcasts drink event and closes modal', () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const { room } = setupRoom();
    handleOpenTreasure(room, createMockClient('p1'));
    const broadcast = room.state.eventLog.find((e) => e.kind === 'treasure_broadcast');
    expect(broadcast).toBeDefined();
    expect(room.state.activeModal).toBe('');
    mathSpy.mockRestore();
  });

  it('dice 3: gives loaded_die and closes modal', () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const { room, player } = setupRoom();
    handleOpenTreasure(room, createMockClient('p1'));
    expect(player.inventory.includes('loaded_die')).toBe(true);
    expect(room.state.activeModal).toBe('');
    mathSpy.mockRestore();
  });

  it('dice 4: gives loaded_die and closes modal', () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { room, player } = setupRoom();
    handleOpenTreasure(room, createMockClient('p1'));
    expect(player.inventory.includes('loaded_die')).toBe(true);
    expect(room.state.activeModal).toBe('');
    mathSpy.mockRestore();
  });

  it('dice 5: opens treasure_swap modal', () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const { room, player } = setupRoom();
    handleOpenTreasure(room, createMockClient('p1'));
    expect(room.state.activeModal).toBe('treasure_swap');
    expect(player.inventory.includes('crowbar')).toBe(false);
    mathSpy.mockRestore();
  });

  it('dice 6: opens treasure_swap modal', () => {
    const mathSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const { room, player } = setupRoom();
    handleOpenTreasure(room, createMockClient('p1'));
    expect(room.state.activeModal).toBe('treasure_swap');
    expect(player.inventory.includes('crowbar')).toBe(false);
    mathSpy.mockRestore();
  });
});

describe('handleSkipTreasure', () => {
  it('clears modal', () => {
    const player = createMockPlayer({ id: 'p1', position: 10 });
    const room = createMockRoom();
    room.state.activeModal = 'treasure';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleSkipTreasure(room, createMockClient('p1'));
    expect(room.state.activeModal).toBe('');
  });
});
