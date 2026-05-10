import { describe, expect, it } from 'vitest';
import type { Player } from '../../schemas/Player';
import { createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import { handleChooseBromance } from './bromance';

function setup(
  opts: { players?: Record<string, Player>; stateOverrides?: Record<string, unknown> } = {},
) {
  const room = createMockRoom();
  room.state.phase = 'playing';
  room.state.activeModal = (opts.stateOverrides?.activeModal as string) ?? 'bromance';
  room.state.activeModalPlayerId = (opts.stateOverrides?.activeModalPlayerId as string) ?? 'p1';
  room.state.turnOrder.push('p1');
  const p1Key = 'p1' as const;
  const player = opts.players?.[p1Key] ?? createMockPlayer({ id: 'p1' });
  room.state.players.set('p1', player);
  if (opts.players) {
    for (const [id, p] of Object.entries(opts.players)) {
      if (id !== 'p1') room.state.players.set(id, p);
    }
  }
  return { room, player };
}

describe('handleChooseBromance', () => {
  it('links both players bilaterally', () => {
    const target = createMockPlayer({ id: 'p2' });
    const { room, player } = setup({ players: { p1: createMockPlayer({ id: 'p1' }), p2: target } });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(player.bromanceWith).toBe('p2');
    expect(target.bromanceWith).toBe('p1');
  });

  it('clears modal after choosing', () => {
    const target = createMockPlayer({ id: 'p2' });
    const { room } = setup({ players: { p1: createMockPlayer({ id: 'p1' }), p2: target } });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(room.state.activeModal).toBe('');
    expect(room.state.activeModalPlayerId).toBe('');
  });

  it('rejects self-target', () => {
    const player = createMockPlayer({ id: 'p1' });
    const { room } = setup({ players: { p1: player } });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p1' });
    expect(player.bromanceWith).toBe('');
    expect(room.state.activeModal).toBe('bromance');
  });

  it('rejects disconnected target', () => {
    const player = createMockPlayer({ id: 'p1' });
    const target = createMockPlayer({ id: 'p2', connected: false });
    const { room } = setup({ players: { p1: player, p2: target } });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(player.bromanceWith).toBe('');
    expect(room.state.activeModal).toBe('bromance');
  });

  it('rejects non-existent target', () => {
    const { room } = setup();
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'nonexistent' });
    expect(room.state.activeModal).toBe('bromance');
  });

  it('breaks old bromance on player side', () => {
    const old = createMockPlayer({ id: 'old', bromanceWith: 'p1' });
    const player = createMockPlayer({ id: 'p1', bromanceWith: 'old' });
    const target = createMockPlayer({ id: 'p2' });
    const { room } = setup({ players: { p1: player, p2: target, old } });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(old.bromanceWith).toBe('');
    expect(player.bromanceWith).toBe('p2');
  });

  it('breaks old bromance on target side', () => {
    const player = createMockPlayer({ id: 'p1' });
    const old = createMockPlayer({ id: 'old', bromanceWith: 'p2' });
    const target = createMockPlayer({ id: 'p2', bromanceWith: 'old' });
    const { room } = setup({ players: { p1: player, p2: target, old } });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(old.bromanceWith).toBe('');
    expect(target.bromanceWith).toBe('p1');
  });

  it('ignores when wrong modal', () => {
    const { room } = setup({ stateOverrides: { activeModal: 'shop', activeModalPlayerId: 'p1' } });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores when wrong player', () => {
    const { room } = setup({
      stateOverrides: { activeModal: 'bromance', activeModalPlayerId: 'p2' },
    });
    handleChooseBromance(room, createMockClient('p1'), { targetPlayerId: 'p2' });
    expect(room.state.eventLog.length).toBe(0);
  });
});
