import { describe, expect, it } from 'vitest';
import { GameState } from '../schemas/GameState';
import { pushEvent } from './eventLog';

function createMockState(): GameState {
  return new GameState();
}

describe('pushEvent', () => {
  it('appends event to eventLog', () => {
    const state = createMockState();
    pushEvent(state, { kind: 'test', text: 'hello' });
    expect(state.eventLog.length).toBe(1);
    expect(state.eventLog.at(0)?.kind).toBe('test');
    expect(state.eventLog.at(0)?.text).toBe('hello');
  });

  it('sets playerId from input', () => {
    const state = createMockState();
    pushEvent(state, { playerId: 'p1', kind: 'test', text: '' });
    expect(state.eventLog.at(0)?.playerId).toBe('p1');
  });

  it('defaults playerId to empty string', () => {
    const state = createMockState();
    pushEvent(state, { kind: 'test', text: '' });
    expect(state.eventLog.at(0)?.playerId).toBe('');
  });

  it('defaults importance to normal', () => {
    const state = createMockState();
    pushEvent(state, { kind: 'test', text: '' });
    expect(state.eventLog.at(0)?.importance).toBe('normal');
  });

  it('uses explicit importance when provided', () => {
    const state = createMockState();
    pushEvent(state, { kind: 'test', text: '', importance: 'high' });
    expect(state.eventLog.at(0)?.importance).toBe('high');
  });

  it('generates unique IDs', () => {
    const state = createMockState();
    pushEvent(state, { kind: 'a', text: '' });
    pushEvent(state, { kind: 'b', text: '' });
    pushEvent(state, { kind: 'c', text: '' });
    const ids = new Set<string>();
    for (const e of state.eventLog) ids.add(e.id);
    expect(ids.size).toBe(3);
  });

  it('evicts oldest events when exceeding 50', () => {
    const state = createMockState();
    for (let i = 0; i < 55; i++) {
      pushEvent(state, { kind: `e${i}`, text: `event ${i}` });
    }
    expect(state.eventLog.length).toBe(50);
    expect(state.eventLog.at(0)?.kind).toBe('e5');
    expect(state.eventLog.at(49)?.kind).toBe('e54');
  });

  it('sets timestamp to a number', () => {
    const state = createMockState();
    pushEvent(state, { kind: 'test', text: '' });
    expect(typeof state.eventLog.at(0)?.timestamp).toBe('number');
  });
});
