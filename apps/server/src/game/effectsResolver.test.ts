import { describe, expect, it } from 'vitest';
import { BoardCaseSchema } from '../schemas/BoardCaseSchema';
import { createMockPlayer } from '../test-helpers/createMockPlayer';
import { createMockRoom } from '../test-helpers/createMockRoom';
import { resolveCaseEffect } from './effectsResolver';

function boardCase(index: number, caseType: string, overrides: Partial<BoardCaseSchema> = {}) {
  const bc = new BoardCaseSchema();
  bc.index = index;
  bc.caseType = caseType;
  bc.numberValue = overrides.numberValue ?? 0;
  bc.portalPairId = overrides.portalPairId ?? -1;
  return bc;
}

describe('resolveCaseEffect', () => {
  it('position 0: does nothing', () => {
    const player = createMockPlayer({ id: 'p1', position: 0 });
    const room = createMockRoom();
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.eventLog.length).toBe(0);
  });

  it('FINISH (63): sets winner and finished phase', () => {
    const player = createMockPlayer({ id: 'p1', position: 63 });
    const room = createMockRoom();
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.winnerId).toBe('p1');
    expect(room.state.phase).toBe('finished');
  });

  it('neutral: does nothing', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'neutral'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.eventLog.length).toBe(0);
  });

  it('vacances: pushes event', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'vacances'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    const found = Array.from(room.state.eventLog).some((e) => e.kind === 'vacances');
    expect(found).toBe(true);
  });

  it('prison: sets prisonTurnsLeft to 4', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'prison'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(player.prisonTurnsLeft).toBe(4);
  });

  it('hole: sets holeTurnsLeft to 1-6', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'hole'));
    room.state.players.set('p1', player);
    const values = new Set<number>();
    for (let i = 0; i < 100; i++) {
      player.holeTurnsLeft = 0;
      resolveCaseEffect(room, player);
      values.add(player.holeTurnsLeft);
    }
    for (let n = 1; n <= 6; n++) expect(values.has(n)).toBe(true);
  });

  it('witch: adds potion to inventory', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'witch'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(player.inventory.includes('potion')).toBe(true);
  });

  it('portal: teleports to partner', () => {
    const player = createMockPlayer({ id: 'p1', position: 5, lastTeleport: false });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'portal', { portalPairId: 0 }));
    room.state.board.push(boardCase(30, 'portal', { portalPairId: 0 }));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(player.position).toBe(30);
    expect(player.lastTeleport).toBe(true);
  });

  it('portal orphan: does not teleport', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'portal', { portalPairId: 99 }));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(player.position).toBe(5);
  });

  it('bromance: opens modal', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'bromance'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.activeModal).toBe('bromance');
  });

  it('shop: opens modal', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'shop'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.activeModal).toBe('shop');
  });

  it('pills: opens modal', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'pills'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.activeModal).toBe('pills');
  });

  it('unknown case type: pushes phase4_pending event', () => {
    const player = createMockPlayer({ id: 'p1', position: 5 });
    const room = createMockRoom();
    room.state.board.push(boardCase(5, 'new_type'));
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    const found = Array.from(room.state.eventLog).some((e) => e.kind === 'phase4_pending');
    expect(found).toBe(true);
  });

  it('red_number in thirst zone: calls applyDrink', () => {
    const player = createMockPlayer({ id: 'p1', position: 15, sipsTaken: 0 });
    const room = createMockRoom();
    room.state.board.push(boardCase(15, 'red_number', { numberValue: 3 }));
    room.state.thirstZoneStart = 10;
    room.state.thirstZoneLength = 10;
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(player.sipsTaken).toBe(3);
  });

  it('red_number outside thirst zone: opens distribute modal', () => {
    const player = createMockPlayer({ id: 'p1', position: 3, sipsGiven: 0 });
    const room = createMockRoom();
    room.state.board.push(boardCase(3, 'red_number', { numberValue: 3 }));
    room.state.thirstZoneStart = 10;
    room.state.thirstZoneLength = 10;
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.activeModal).toBe('distribute');
    expect(room.state.activeModalPlayerId).toBe('p1');
    expect(room.state.distributeExpectedSips).toBe(3);
  });

  it('green_number: opens distribute modal', () => {
    const player = createMockPlayer({ id: 'p1', position: 3, sipsGiven: 0 });
    const room = createMockRoom();
    room.state.board.push(boardCase(3, 'green_number', { numberValue: 3 }));
    room.state.thirstZoneStart = 10;
    room.state.thirstZoneLength = 10;
    room.state.players.set('p1', player);
    resolveCaseEffect(room, player);
    expect(room.state.activeModal).toBe('distribute');
    expect(room.state.activeModalPlayerId).toBe('p1');
    expect(room.state.distributeExpectedSips).toBe(3);
  });

  describe('card match / mismatch', () => {
    it('match: opens distribute modal (suit=spades, caseType=spades)', () => {
      const player = createMockPlayer({ id: 'p1', position: 7, suit: 'spades', sipsGiven: 0 });
      const room = createMockRoom();
      room.state.board.push(boardCase(7, 'spades'));
      room.state.players.set('p1', player);
      resolveCaseEffect(room, player);
      expect(room.state.activeModal).toBe('distribute');
      expect(room.state.activeModalPlayerId).toBe('p1');
      expect(room.state.distributeExpectedSips).toBe(3);
      const found = Array.from(room.state.eventLog).some((e) => e.kind === 'card_match_open');
      expect(found).toBe(true);
    });

    it('mismatch: drinks sips (suit=spades, caseType=hearts)', () => {
      const player = createMockPlayer({ id: 'p1', position: 8, suit: 'spades', sipsTaken: 0 });
      const room = createMockRoom();
      room.state.board.push(boardCase(8, 'hearts'));
      room.state.players.set('p1', player);
      resolveCaseEffect(room, player);
      expect(player.sipsTaken).toBe(3);
      const found = Array.from(room.state.eventLog).some((e) => e.kind === 'card_mismatch');
      expect(found).toBe(true);
    });
  });

  describe('formule1', () => {
    it('moves player +4 and pushes formule1 event', () => {
      const player = createMockPlayer({ id: 'p1', position: 10 });
      const room = createMockRoom();
      room.state.board.push(boardCase(10, 'formule1'));
      room.state.players.set('p1', player);
      resolveCaseEffect(room, player);
      expect(player.position).toBe(14);
      const found = Array.from(room.state.eventLog).some((e) => e.kind === 'formule1');
      expect(found).toBe(true);
    });

    it('bounce: overshoots 63 and bounces back to neutral', () => {
      const player = createMockPlayer({ id: 'p1', position: 60 });
      const room = createMockRoom();
      room.state.board.push(boardCase(60, 'formule1'));
      room.state.board.push(boardCase(62, 'neutral'));
      room.state.players.set('p1', player);
      resolveCaseEffect(room, player);
      expect(player.position).toBe(62);
      const found = Array.from(room.state.eventLog).some((e) => e.kind === 'bounce');
      expect(found).toBe(true);
    });
  });

  describe('usain', () => {
    it('moves player +2 and pushes usain event', () => {
      const player = createMockPlayer({ id: 'p1', position: 10 });
      const room = createMockRoom();
      room.state.board.push(boardCase(10, 'usain'));
      room.state.players.set('p1', player);
      resolveCaseEffect(room, player);
      expect(player.position).toBe(12);
      const found = Array.from(room.state.eventLog).some((e) => e.kind === 'usain');
      expect(found).toBe(true);
    });
  });

  describe('rail_de_bus', () => {
    it('opens modal and sets railRound to 1', () => {
      const player = createMockPlayer({ id: 'p1', position: 5 });
      const room = createMockRoom();
      room.state.board.push(boardCase(5, 'rail_de_bus'));
      room.state.players.set('p1', player);
      resolveCaseEffect(room, player);
      expect(room.state.activeModal).toBe('rail_de_bus');
      expect(room.state.railRound).toBe(1);
      expect(room.state.activeModalPlayerId).toBe('p1');
    });
  });
});
