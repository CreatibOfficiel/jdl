import { describe, expect, it } from 'vitest';
import type { Player } from '../../schemas/Player';
import { createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import { handleChoosePill } from './pills';

function setup(
  opts: { playerOverrides?: Partial<Player>; modal?: string; modalPlayer?: string } = {},
) {
  const player = createMockPlayer({
    id: 'p1',
    sipsTaken: 0,
    doubleNextSip: false,
    ...opts.playerOverrides,
  });
  const room = createMockRoom();
  room.state.activeModal = opts.modal ?? 'pills';
  room.state.activeModalPlayerId = opts.modalPlayer ?? 'p1';
  room.state.players.set('p1', player);
  return { room, player };
}

describe('handleChoosePill', () => {
  it('red pill: increments sipsTaken by 6', () => {
    const { room, player } = setup();
    handleChoosePill(room, createMockClient('p1'), { color: 'red' });
    expect(player.sipsTaken).toBe(6);
  });

  it('red pill: doubles when doubleNextSip is active', () => {
    const { room, player } = setup({ playerOverrides: { doubleNextSip: true } });
    handleChoosePill(room, createMockClient('p1'), { color: 'red' });
    expect(player.sipsTaken).toBe(6);
    expect(player.doubleNextSip).toBe(false);
  });

  it('blue pill: dice 1-2 drinks 8 sips', () => {
    const { room, player } = setup();
    const sipsValues = new Set<number>();
    const eventKinds = new Set<string>();
    for (let i = 0; i < 100; i++) {
      player.sipsTaken = 0;
      player.doubleNextSip = false;
      room.state.activeModal = 'pills';
      room.state.activeModalPlayerId = 'p1';
      room.state.eventLog.clear();
      handleChoosePill(room, createMockClient('p1'), { color: 'blue' });
      sipsValues.add(player.sipsTaken);
      for (const e of room.state.eventLog) {
        if (e.kind.startsWith('pill_blue')) eventKinds.add(e.kind);
      }
    }
    expect(sipsValues.has(8)).toBe(true);
    expect(eventKinds.has('pill_blue_drink')).toBe(true);
    expect(eventKinds.has('pill_blue_roll')).toBe(true);
  });

  it('blue pill: dice 3-4 opens distribute modal', () => {
    const { room, player } = setup();
    let openedModal = false;
    for (let i = 0; i < 200; i++) {
      player.sipsGiven = 0;
      player.doubleNextSip = false;
      room.state.activeModal = 'pills';
      room.state.activeModalPlayerId = 'p1';
      room.state.eventLog.clear();
      handleChoosePill(room, createMockClient('p1'), { color: 'blue' });
      if (room.state.activeModal === 'distribute') {
        openedModal = true;
        expect(room.state.distributeExpectedSips).toBe(10);
        break;
      }
    }
    expect(openedModal).toBe(true);
  });

  it('blue pill: dice 5-6 sets doubleNextSip', () => {
    let doubled = false;
    for (let run = 0; run < 5; run++) {
      const { room, player } = setup();
      for (let i = 0; i < 200; i++) {
        player.doubleNextSip = false;
        room.state.activeModal = 'pills';
        room.state.activeModalPlayerId = 'p1';
        room.state.eventLog.clear();
        handleChoosePill(room, createMockClient('p1'), { color: 'blue' });
        if (player.doubleNextSip) {
          doubled = true;
          break;
        }
      }
      if (doubled) break;
    }
    expect(doubled).toBe(true);
  });

  it('clears modal after choosing', () => {
    const { room } = setup();
    handleChoosePill(room, createMockClient('p1'), { color: 'red' });
    expect(room.state.activeModal).toBe('');
  });

  it('ignores wrong modal', () => {
    const { room } = setup({ modal: 'shop', modalPlayer: 'p1' });
    handleChoosePill(room, createMockClient('p1'), { color: 'red' });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores wrong player', () => {
    const { room } = setup({ modal: 'pills', modalPlayer: 'p2' });
    handleChoosePill(room, createMockClient('p1'), { color: 'red' });
    expect(room.state.eventLog.length).toBe(0);
  });
});
