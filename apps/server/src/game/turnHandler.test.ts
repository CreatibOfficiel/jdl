import { FINISH } from '@jeu-soiree/game-logic';
import { BOARD_SIZE } from '@jeu-soiree/shared';
import { describe, expect, it, vi } from 'vitest';
import { BoardCaseSchema } from '../schemas/BoardCaseSchema';
import type { Player } from '../schemas/Player';
import { createMockPlayer } from '../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../test-helpers/createMockRoom';
import { endTurn, handleRollDice } from './turnHandler';

function neutralCase(index: number) {
  const bc = new BoardCaseSchema();
  bc.index = index;
  bc.caseType = 'neutral';
  return bc;
}

function setupPlayingRoom(playerOverrides: Record<string, Partial<Player>> = {}) {
  const room = createMockRoom();
  room.state.phase = 'playing';
  room.state.currentTurnIndex = 0;
  const ids = Object.keys(playerOverrides);
  for (const id of ids) {
    room.state.turnOrder.push(id);
    const player = createMockPlayer({ id, connected: true, ...playerOverrides[id] });
    room.state.players.set(id, player);
  }
  for (let i = 1; i <= BOARD_SIZE; i++) room.state.board.push(neutralCase(i));
  return room;
}

describe('handleRollDice', () => {
  it('ignores when phase is not playing', () => {
    const room = createMockRoom();
    handleRollDice(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores when wrong player turn', () => {
    const player = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.phase = 'playing';
    room.state.turnOrder.push('p2');
    room.state.players.set('p1', player);
    handleRollDice(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores when player not found', () => {
    const room = createMockRoom();
    room.state.phase = 'playing';
    room.state.turnOrder.push('p1');
    handleRollDice(room, createMockClient('p1'));
    expect(room.state.eventLog.length).toBe(0);
  });
});

describe('endTurn', () => {
  it('advances turn index', () => {
    const p1 = createMockPlayer({ id: 'p1', connected: true });
    const p2 = createMockPlayer({ id: 'p2', connected: true });
    const p3 = createMockPlayer({ id: 'p3', connected: true });
    const room = createMockRoom();
    room.state.turnOrder.push('p1', 'p2', 'p3');
    room.state.currentTurnIndex = 0;
    room.state.players.set('p1', p1);
    room.state.players.set('p2', p2);
    room.state.players.set('p3', p3);
    endTurn(room);
    expect(room.state.currentTurnIndex).toBe(1);
  });

  it('wraps around to 0', () => {
    const p1 = createMockPlayer({ id: 'p1', connected: true });
    const p2 = createMockPlayer({ id: 'p2', connected: true });
    const room = createMockRoom();
    room.state.turnOrder.push('p1', 'p2');
    room.state.currentTurnIndex = 1;
    room.state.players.set('p1', p1);
    room.state.players.set('p2', p2);
    endTurn(room);
    expect(room.state.currentTurnIndex).toBe(0);
  });

  it('does nothing when turnOrder is empty', () => {
    const room = createMockRoom();
    endTurn(room);
    expect(room.state.currentTurnIndex).toBe(0);
  });

  it('skips disconnected players', () => {
    const p1 = createMockPlayer({ id: 'p1', connected: false });
    const p2 = createMockPlayer({ id: 'p2', connected: true });
    const room = createMockRoom();
    room.state.turnOrder.push('p1', 'p2');
    room.state.currentTurnIndex = 0;
    room.state.players.set('p1', p1);
    room.state.players.set('p2', p2);
    endTurn(room);
    expect(room.state.currentTurnIndex).toBe(1);
  });
});

describe('handleNormalRoll', () => {
  it('rolls dice, moves player, and advances turn', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const room = setupPlayingRoom({ p1: { position: 0 }, p2: {} });
    handleRollDice(room, createMockClient('p1'));
    const player = room.state.players.get('p1')!;
    expect(player.diceRolls).toBe(1);
    expect(player.position).toBe(4);
    expect(room.state.currentTurnIndex).toBe(1);
    vi.restoreAllMocks();
  });

  it('uses pendingForcedDice and decrements it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const room = setupPlayingRoom({ p1: { position: 0, pendingForcedDice: 3 } });
    handleRollDice(room, createMockClient('p1'));
    const player = room.state.players.get('p1')!;
    expect(player.position).toBe(3);
    expect(player.pendingForcedDice).toBe(0);
    const forcedEvent = Array.from(room.state.eventLog).some((e) => e.text?.includes('pipé'));
    expect(forcedEvent).toBe(true);
    vi.restoreAllMocks();
  });

  it('bounces when exceeding FINISH', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const room = setupPlayingRoom({ p1: { position: FINISH - 1 } });
    handleRollDice(room, createMockClient('p1'));
    const bounceEvent = Array.from(room.state.eventLog).some((e) => e.kind === 'bounce');
    expect(bounceEvent).toBe(true);
    expect(room.state.winnerId).toBeFalsy();
    vi.restoreAllMocks();
  });

  it('wins when landing exactly on FINISH', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const room = setupPlayingRoom({ p1: { position: FINISH - 1 } });
    handleRollDice(room, createMockClient('p1'));
    expect(room.state.winnerId).toBe('p1');
    expect(room.state.phase).toBe('finished');
    vi.restoreAllMocks();
  });

  it('does not advance turn when modal is opened by case effect', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const room = createMockRoom();
    room.state.phase = 'playing';
    room.state.currentTurnIndex = 0;
    room.state.turnOrder.push('p1', 'p2');
    const player = createMockPlayer({ id: 'p1', position: 0, connected: true });
    room.state.players.set('p1', player);
    room.state.players.set('p2', createMockPlayer({ id: 'p2', connected: true }));
    const bc = new BoardCaseSchema();
    bc.index = 1;
    bc.caseType = 'rail_de_bus';
    room.state.board.push(bc);
    for (let i = 2; i <= BOARD_SIZE; i++) room.state.board.push(neutralCase(i));
    handleRollDice(room, createMockClient('p1'));
    expect(room.state.activeModal).toBe('rail_de_bus');
    expect(room.state.currentTurnIndex).toBe(0);
    vi.restoreAllMocks();
  });
});

describe('handlePrisonTurn', () => {
  it('auto-releases on last turn (prisonTurnsLeft === 1)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const room = setupPlayingRoom({ p1: { prisonTurnsLeft: 1 }, p2: {} });
    handleRollDice(room, createMockClient('p1'));
    const player = room.state.players.get('p1')!;
    expect(player.prisonTurnsLeft).toBe(0);
    const releaseEvent = Array.from(room.state.eventLog).some(
      (e) => e.kind === 'prison_release_auto',
    );
    expect(releaseEvent).toBe(true);
    expect(player.position).toBeGreaterThan(0);
    vi.restoreAllMocks();
  });

  it('frees on dice 6', () => {
    vi.spyOn(Math, 'random').mockReturnValue(5 / 6);
    const room = setupPlayingRoom({ p1: { prisonTurnsLeft: 3 }, p2: {} });
    handleRollDice(room, createMockClient('p1'));
    const player = room.state.players.get('p1')!;
    expect(player.prisonTurnsLeft).toBe(0);
    const escapeEvent = Array.from(room.state.eventLog).some((e) => e.kind === 'prison_escape');
    expect(escapeEvent).toBe(true);
    expect(player.position).toBe(0);
    vi.restoreAllMocks();
  });

  it('decrements counter and drinks when not rolling 6', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const room = setupPlayingRoom({ p1: { prisonTurnsLeft: 2 }, p2: {} });
    handleRollDice(room, createMockClient('p1'));
    const player = room.state.players.get('p1')!;
    expect(player.prisonTurnsLeft).toBe(1);
    const drinkEvent = Array.from(room.state.eventLog).some((e) => e.kind === 'prison_drink');
    expect(drinkEvent).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('handleHoleTurn', () => {
  it('moves 1 case and decrements counter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const room = setupPlayingRoom({ p1: { position: 5, holeTurnsLeft: 3 }, p2: {} });
    handleRollDice(room, createMockClient('p1'));
    const player = room.state.players.get('p1')!;
    expect(player.position).toBe(6);
    expect(player.holeTurnsLeft).toBe(2);
    const stepEvent = Array.from(room.state.eventLog).some((e) => e.kind === 'hole_step');
    expect(stepEvent).toBe(true);
    vi.restoreAllMocks();
  });

  it('exits hole when counter reaches 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const room = setupPlayingRoom({ p1: { position: 5, holeTurnsLeft: 1 }, p2: {} });
    handleRollDice(room, createMockClient('p1'));
    const player = room.state.players.get('p1')!;
    expect(player.holeTurnsLeft).toBe(0);
    const stepEvent = Array.from(room.state.eventLog).find((e) => e.kind === 'hole_step');
    expect(stepEvent?.text).toContain('sort du trou');
    vi.restoreAllMocks();
  });
});
