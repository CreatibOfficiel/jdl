import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMockPlayer } from '../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../test-helpers/createMockRoom';
import { handleRollOrderDice } from './rollingOrder';

describe('handleRollOrderDice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores when phase is not rolling_order', () => {
    const room = createMockRoom();
    handleRollOrderDice(room, createMockClient('p1'));
    expect(room.state.rollOrderRolls.size).toBe(0);
  });

  it('ignores when player already rolled', () => {
    const player = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.phase = 'rolling_order';
    room.state.rollOrderRolls.set('p1', 6);
    room.state.players.set('p1', player);
    handleRollOrderDice(room, createMockClient('p1'));
    expect(room.state.rollOrderRolls.size).toBe(1);
  });

  it('stores roll value for player', () => {
    const player = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.phase = 'rolling_order';
    room.state.players.set('p1', player);
    handleRollOrderDice(room, createMockClient('p1'));
    expect(room.state.rollOrderRolls.has('p1')).toBe(true);
    const val = room.state.rollOrderRolls.get('p1');
    expect(val).toBeDefined();
    expect(typeof val).toBe('number');
  });

  it('pushes event with roll value', () => {
    const player = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.phase = 'rolling_order';
    room.state.players.set('p1', player);
    handleRollOrderDice(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBeGreaterThanOrEqual(1);
    const found = Array.from(room.state.eventLog).some((e) => e.kind === 'roll_order_dice');
    expect(found).toBe(true);
  });

  it('resolves order when all connected players rolled different values', () => {
    const p1 = createMockPlayer({ id: 'p1' });
    const p2 = createMockPlayer({ id: 'p2' });
    const room = createMockRoom();
    room.state.phase = 'rolling_order';
    room.state.players.set('p1', p1);
    room.state.players.set('p2', p2);

    vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValueOnce(0.5);

    handleRollOrderDice(room, createMockClient('p1'));
    handleRollOrderDice(room, createMockClient('p2'));

    expect(room.state.phase).toBe('playing');
    expect(room.state.turnOrder.length).toBe(2);
    expect(room.state.turnOrder[0]).toBe('p2');
    expect(room.state.turnOrder[1]).toBe('p1');
    expect(room.state.currentTurnIndex).toBe(0);
  });

  it('triggers tiebreak when all connected players rolled the same value', () => {
    const p1 = createMockPlayer({ id: 'p1' });
    const p2 = createMockPlayer({ id: 'p2' });
    const room = createMockRoom();
    room.state.phase = 'rolling_order';
    room.state.players.set('p1', p1);
    room.state.players.set('p2', p2);

    vi.spyOn(Math, 'random').mockReturnValue(0);

    handleRollOrderDice(room, createMockClient('p1'));
    handleRollOrderDice(room, createMockClient('p2'));

    expect(room.state.phase).toBe('rolling_order');
    expect(room.state.rollOrderRolls.size).toBe(0);
    const hasTiebreak = Array.from(room.state.eventLog).some((e) => e.kind === 'tiebreak');
    expect(hasTiebreak).toBe(true);
  });

  it('single player transitions directly to playing', () => {
    const p1 = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.phase = 'rolling_order';
    room.state.players.set('p1', p1);

    vi.spyOn(Math, 'random').mockReturnValue(0);

    handleRollOrderDice(room, createMockClient('p1'));

    expect(room.state.phase).toBe('playing');
    expect(room.state.turnOrder.length).toBe(1);
    expect(room.state.turnOrder[0]).toBe('p1');
    expect(room.state.currentTurnIndex).toBe(0);
  });

  it('skips disconnected players when counting rolls needed', () => {
    const p1 = createMockPlayer({ id: 'p1', connected: true });
    const p2 = createMockPlayer({ id: 'p2', connected: false });
    const room = createMockRoom();
    room.state.phase = 'rolling_order';
    room.state.players.set('p1', p1);
    room.state.players.set('p2', p2);

    vi.spyOn(Math, 'random').mockReturnValue(0);

    handleRollOrderDice(room, createMockClient('p1'));

    expect(room.state.phase).toBe('playing');
    expect(room.state.turnOrder.length).toBe(1);
    expect(room.state.turnOrder[0]).toBe('p1');
    expect(room.state.currentTurnIndex).toBe(0);
  });
});
