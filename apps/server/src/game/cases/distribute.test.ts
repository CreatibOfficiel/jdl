import { describe, expect, it } from 'vitest';
import { createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import { handleConfirmDrink, handleDistributeSips } from './distribute';

function createDistributeRoom(
  opts: {
    modal?: string;
    modalPlayer?: string;
    expectedSips?: number;
    captureTimeout?: boolean;
  } = {},
) {
  const distributor = createMockPlayer({ id: 'p1', name: 'Alice', sipsTaken: 0, sipsGiven: 0 });
  const target = createMockPlayer({ id: 'p2', name: 'Bob', sipsTaken: 0, sipsGiven: 0 });
  const extra = createMockPlayer({ id: 'p3', name: 'Charlie', sipsTaken: 0, sipsGiven: 0 });
  const room = createMockRoom();
  room.state.phase = 'playing';
  room.state.activeModal = opts.modal ?? 'distribute';
  room.state.activeModalPlayerId = opts.modalPlayer ?? 'p1';
  room.state.distributeExpectedSips = opts.expectedSips ?? 3;
  room.state.turnOrder.push('p1', 'p2', 'p3');
  room.state.players.set('p1', distributor);
  room.state.players.set('p2', target);
  room.state.players.set('p3', extra);

  let capturedCb: (() => void) | null = null;
  const mockDelayed = { clear: () => {}, active: true } as unknown as ReturnType<
    typeof createMockRoom
  >['clock']['setTimeout'];
  if (opts.captureTimeout) {
    room.clock.setTimeout = ((cb: () => void, _ms: number) => {
      capturedCb = cb;
      return mockDelayed;
    }) as unknown as ReturnType<typeof createMockRoom>['clock']['setTimeout'];
  } else {
    room.clock.setTimeout = (() => {
      const noop: ReturnType<typeof createMockRoom>['clock']['setTimeout'] =
        (() => {}) as unknown as ReturnType<typeof createMockRoom>['clock']['setTimeout'];
      return noop;
    })() as ReturnType<typeof createMockRoom>['clock']['setTimeout'];
  }

  return {
    room,
    distributor,
    target,
    extra,
    fireTimeout: () => capturedCb?.(),
  };
}

describe('handleDistributeSips', () => {
  it('rejects if wrong modal', () => {
    const { room } = createDistributeRoom({ modal: 'shop' });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    expect(room.state.eventLog.length).toBe(0);
    expect(room.state.activeModal).toBe('shop');
  });

  it('rejects if wrong player', () => {
    const { room } = createDistributeRoom({ modalPlayer: 'p2' });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p1', sips: 3 }],
    });
    expect(room.state.eventLog.length).toBe(0);
    expect(room.state.activeModal).toBe('distribute');
  });

  it('rejects if total does not match expected', () => {
    const { room } = createDistributeRoom({ expectedSips: 5 });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('rejects if target does not exist', () => {
    const { room } = createDistributeRoom();
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'nonexistent', sips: 3 }],
    });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('rejects if target is self', () => {
    const { room } = createDistributeRoom();
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p1', sips: 3 }],
    });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('rejects if sips < 1', () => {
    const { room } = createDistributeRoom({ expectedSips: 0 });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 0 }],
    });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('applies drinks and transitions to distribute_wait', () => {
    const { room, target } = createDistributeRoom({ captureTimeout: true });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    expect(target.sipsTaken).toBe(3);
    expect(room.state.activeModal).toBe('distribute_wait');
    expect(room.state.distributeExpectedSips).toBe(0);
    expect(target.pendingDrinkConfirm).toBe(3);
    const found = Array.from(room.state.eventLog).some((e) => e.kind === 'distribute_sent');
    expect(found).toBe(true);
  });

  it('distributes to multiple targets', () => {
    const { room, target, extra } = createDistributeRoom({
      expectedSips: 5,
      captureTimeout: true,
    });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [
        { targetPlayerId: 'p2', sips: 2 },
        { targetPlayerId: 'p3', sips: 3 },
      ],
    });
    expect(target.sipsTaken).toBe(2);
    expect(extra.sipsTaken).toBe(3);
    expect(target.pendingDrinkConfirm).toBe(2);
    expect(extra.pendingDrinkConfirm).toBe(3);
    expect(room.state.activeModal).toBe('distribute_wait');
  });

  it('bumps sipsGiven', () => {
    const { room, distributor } = createDistributeRoom({ captureTimeout: true });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    expect(distributor.sipsGiven).toBe(3);
  });
});

describe('handleConfirmDrink', () => {
  it('clears pendingDrinkConfirm', () => {
    const { room, target } = createDistributeRoom({ captureTimeout: true });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    expect(target.pendingDrinkConfirm).toBe(3);
    handleConfirmDrink(room, createMockClient('p2'));
    expect(target.pendingDrinkConfirm).toBe(0);
  });

  it('ends turn when all confirmed', () => {
    const { room } = createDistributeRoom({ captureTimeout: true });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    handleConfirmDrink(room, createMockClient('p2'));
    expect(room.state.activeModal).toBe('');
  });

  it('does not end turn if others still pending', () => {
    const { room, extra } = createDistributeRoom({
      expectedSips: 5,
      captureTimeout: true,
    });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [
        { targetPlayerId: 'p2', sips: 2 },
        { targetPlayerId: 'p3', sips: 3 },
      ],
    });
    handleConfirmDrink(room, createMockClient('p2'));
    expect(room.state.activeModal).toBe('distribute_wait');
    expect(extra.pendingDrinkConfirm).toBe(3);
  });

  it('ignores wrong modal', () => {
    const { room, target } = createDistributeRoom({ modal: 'distribute' });
    target.pendingDrinkConfirm = 5;
    handleConfirmDrink(room, createMockClient('p2'));
    expect(target.pendingDrinkConfirm).toBe(5);
  });

  it('ignores player with no pending drinks', () => {
    const { room } = createDistributeRoom({ captureTimeout: true });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    handleConfirmDrink(room, createMockClient('p1'));
    expect(room.state.activeModal).toBe('distribute_wait');
  });
});

describe('auto-confirm timer', () => {
  it('clears pendingDrinkConfirm and ends turn on timeout', () => {
    const { room, target, fireTimeout } = createDistributeRoom({ captureTimeout: true });
    handleDistributeSips(room, createMockClient('p1'), {
      assignments: [{ targetPlayerId: 'p2', sips: 3 }],
    });
    expect(target.pendingDrinkConfirm).toBe(3);
    fireTimeout();
    expect(target.pendingDrinkConfirm).toBe(0);
    expect(room.state.activeModal).toBe('');
  });
});
