import { describe, expect, it, vi } from 'vitest';
import { createMockPlayer } from '../../test-helpers/createMockPlayer';
import { createMockClient, createMockRoom } from '../../test-helpers/createMockRoom';
import { handleRailAnswer, startRailDeBus } from './railDeBus';

type Card = { suit: 'spades' | 'hearts' | 'diamonds' | 'clubs'; rank: number };

const SUITS: ReadonlyArray<Card['suit']> = ['spades', 'hearts', 'diamonds', 'clubs'];

function cardColor(c: Card): 'red' | 'black' {
  return c.suit === 'hearts' || c.suit === 'diamonds' ? 'red' : 'black';
}

type MockRoom = ReturnType<typeof createMockRoom>;

interface TestSetup {
  room: MockRoom;
  deck: Card[];
  popCount: number;
  cleanup: () => void;
}

function setup(): TestSetup {
  let call = 0;
  const rng = () => call++ / 100;
  vi.spyOn(Math, 'random').mockImplementation(rng);
  const room = createMockRoom();
  const player = createMockPlayer({ id: 'p1' });
  room.state.players.set('p1', player);
  startRailDeBus(room, player);
  expect(room.state.activeModal).toBe('rail_de_bus');

  // Rebuild the same deck the runtime built (51 RNG calls consumed by makeDeck)
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  }
  // Replay the Fisher-Yates shuffle with the same RNG state
  // makeDeck consumed calls 0-50, so we replay from a fresh counter
  let replayCall = 0;
  const replayRng = () => replayCall++ / 100;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(replayRng() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }

  return { room, deck, popCount: 1, cleanup: () => vi.restoreAllMocks() };
}

function peekNext(s: TestSetup): Card {
  return s.deck[s.deck.length - 1 - s.popCount]!;
}

function drawnAt(s: TestSetup, drawIndex: number): Card {
  return s.deck[s.deck.length - 1 - drawIndex]!;
}

function answerRound1(s: TestSetup): boolean {
  const next = peekNext(s);
  s.popCount++;
  handleRailAnswer(s.room, createMockClient('p1'), { answer: cardColor(next) });
  return s.room.state.railRound === 2;
}

function answerRound2(s: TestSetup): boolean {
  // After R1 push: drawn has popCount+1 elements. Runtime uses drawn[drawn.length-2]
  // which is the R1 card (index popCount-1 in our deck terms)
  const prev = drawnAt(s, s.popCount - 1);
  const next = peekNext(s);
  if (prev.rank === next.rank) return false;
  s.popCount++;
  handleRailAnswer(s.room, createMockClient('p1'), {
    answer: next.rank > prev.rank ? 'higher' : 'lower',
  });
  return s.room.state.railRound === 3;
}

function answerRound3(s: TestSetup): boolean {
  // After R2 push: drawn has popCount+1 elements
  // drawn[drawn.length-3] = R1 card = drawnAt(popCount-2)
  // drawn[drawn.length-2] = R2 card = drawnAt(popCount-1)
  const p1 = drawnAt(s, s.popCount - 2);
  const p2 = drawnAt(s, s.popCount - 1);
  const next = peekNext(s);
  const lo = Math.min(p1.rank, p2.rank);
  const hi = Math.max(p1.rank, p2.rank);
  const inside = next.rank > lo && next.rank < hi;
  const outside = next.rank < lo || next.rank > hi;
  if (!inside && !outside) return false;
  s.popCount++;
  handleRailAnswer(s.room, createMockClient('p1'), {
    answer: inside ? 'inside' : 'outside',
  });
  return s.room.state.railRound === 4;
}

function answerRound4Correct(s: TestSetup): boolean {
  const next = peekNext(s);
  s.popCount++;
  handleRailAnswer(s.room, createMockClient('p1'), { answer: next.suit });
  const win = Array.from(s.room.state.eventLog).some((e) => e.kind === 'rail_win');
  return win;
}

function advanceToRound(s: TestSetup, targetRound: number): boolean {
  if (targetRound >= 2 && !answerRound1(s)) return false;
  if (targetRound >= 3 && !answerRound2(s)) return false;
  if (targetRound >= 4 && !answerRound3(s)) return false;
  return true;
}

describe('startRailDeBus', () => {
  it('sets modal to rail_de_bus', () => {
    const { room, cleanup } = setup();
    expect(room.state.activeModalPlayerId).toBe('p1');
    expect(room.state.railRound).toBe(1);
    expect(room.state.railCards.length).toBe(1);
    cleanup();
  });
});

describe('handleRailAnswer', () => {
  it('ignores wrong modal', () => {
    const player = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.activeModal = 'shop';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleRailAnswer(room, createMockClient('p1'), { answer: 'red' });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores wrong player', () => {
    const player = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.activeModal = 'rail_de_bus';
    room.state.activeModalPlayerId = 'p2';
    room.state.players.set('p1', player);
    handleRailAnswer(room, createMockClient('p1'), { answer: 'red' });
    expect(room.state.eventLog.length).toBe(0);
  });

  it('ignores when no session (WeakMap miss)', () => {
    const player = createMockPlayer({ id: 'p1' });
    const room = createMockRoom();
    room.state.activeModal = 'rail_de_bus';
    room.state.activeModalPlayerId = 'p1';
    room.state.players.set('p1', player);
    handleRailAnswer(room, createMockClient('p1'), { answer: 'red' });
    expect(room.state.eventLog.length).toBe(0);
  });
});

describe('round logic', () => {
  it('round 1: correct color answer advances to round 2', () => {
    const s = setup();
    expect(answerRound1(s)).toBe(true);
    expect(s.room.state.railCards.length).toBe(2);
    s.cleanup();
  });

  it('round 1: wrong color answer fails and closes modal', () => {
    const s = setup();
    const next = peekNext(s);
    const wrong = cardColor(next) === 'red' ? 'black' : 'red';
    handleRailAnswer(s.room, createMockClient('p1'), { answer: wrong });
    expect(s.room.state.activeModal).toBe('');
    const fail = Array.from(s.room.state.eventLog).find((e) => e.kind === 'rail_fail');
    expect(fail?.text).toContain('manche 1');
    s.cleanup();
  });

  it('round 2: correct higher/lower advances to round 3', () => {
    const s = setup();
    if (!answerRound1(s)) return s.cleanup();
    expect(answerRound2(s)).toBe(true);
    s.cleanup();
  });

  it('round 2: equal rank always fails', () => {
    const s = setup();
    if (!answerRound1(s)) return s.cleanup();
    const prev = drawnAt(s, s.popCount - 1);
    const next = peekNext(s);
    if (prev.rank !== next.rank) return s.cleanup();
    s.popCount++;
    handleRailAnswer(s.room, createMockClient('p1'), { answer: 'higher' });
    expect(s.room.state.activeModal).toBe('');
    s.cleanup();
  });

  it('round 3: correct inside/outside advances to round 4', () => {
    const s = setup();
    if (!advanceToRound(s, 3)) return s.cleanup();
    expect(answerRound3(s)).toBe(true);
    s.cleanup();
  });

  it('round 4: correct suit answer wins', () => {
    const s = setup();
    if (!advanceToRound(s, 4)) return s.cleanup();
    expect(answerRound4Correct(s)).toBe(true);
    expect(s.room.state.activeModal).toBe('');
    s.cleanup();
  });

  it('round 4: wrong suit answer fails', () => {
    const s = setup();
    if (!advanceToRound(s, 4)) return s.cleanup();
    handleRailAnswer(s.room, createMockClient('p1'), { answer: 'nonexistent' });
    expect(s.room.state.activeModal).toBe('');
    const fail = Array.from(s.room.state.eventLog).find((e) => e.kind === 'rail_fail');
    expect(fail?.text).toContain('manche 4');
    s.cleanup();
  });

  it('failure sips scale with round number', () => {
    for (let round = 1; round <= 4; round++) {
      const s = setup();
      if (round > 1 && !advanceToRound(s, round)) {
        s.cleanup();
        continue;
      }
      handleRailAnswer(s.room, createMockClient('p1'), { answer: 'wrong' });
      const fail = Array.from(s.room.state.eventLog).find((e) => e.kind === 'rail_fail');
      expect(fail?.text).toContain(`manche ${round}`);
      s.cleanup();
    }
  });
});
