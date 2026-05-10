import { describe, expect, it } from 'vitest';
import { JoinOptionsSchema, SpectatorJoinSchema } from './messages';

describe('JoinOptionsSchema', () => {
  it('accepts valid input', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD-2345',
      name: 'Alice',
      suit: 'spades',
      color: '#ff0000',
      emoji: '\u{1F3AF}',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional fields', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD-2345',
      name: 'Alice',
      suit: 'spades',
      color: '#ff0000',
      emoji: '\u{1F3AF}',
      difficulty: 'hardcore',
      equivalencePreference: 'pushups',
    });
    expect(result.success).toBe(true);
  });

  it('defaults equivalencePreference to drinks', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD-2345',
      name: 'Alice',
      suit: 'spades',
      color: '#ff0000',
      emoji: '\u{1F3AF}',
    });
    expect(result.success && result.data.equivalencePreference).toBe('drinks');
  });

  it('rejects empty code', () => {
    const result = JoinOptionsSchema.safeParse({
      code: '',
      name: 'A',
      suit: 'spades',
      color: '#fff',
      emoji: '\u{1F3AF}',
    });
    expect(result.success).toBe(false);
  });

  it('rejects code with spaces', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD 2345',
      name: 'A',
      suit: 'spades',
      color: '#fff',
      emoji: '\u{1F3AF}',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid suit', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD-2345',
      name: 'A',
      suit: 'joker',
      color: '#fff',
      emoji: '\u{1F3AF}',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD-2345',
      name: '  ',
      suit: 'spades',
      color: '#fff',
      emoji: '\u{1F3AF}',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid difficulty', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD-2345',
      name: 'A',
      suit: 'spades',
      color: '#fff',
      emoji: '\u{1F3AF}',
      difficulty: 'impossible',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid equivalencePreference', () => {
    const result = JoinOptionsSchema.safeParse({
      code: 'ABCD-2345',
      name: 'A',
      suit: 'spades',
      color: '#fff',
      emoji: '\u{1F3AF}',
      equivalencePreference: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('SpectatorJoinSchema', () => {
  it('accepts spectator join', () => {
    const result = SpectatorJoinSchema.safeParse({
      code: 'ABCD-1234',
      spectator: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean spectator', () => {
    const result = SpectatorJoinSchema.safeParse({
      code: 'ABCD-1234',
      spectator: 'true',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing spectator field', () => {
    const result = SpectatorJoinSchema.safeParse({
      code: 'ABCD-1234',
    });
    expect(result.success).toBe(false);
  });

  it('rejects spectator: false', () => {
    const result = SpectatorJoinSchema.safeParse({
      code: 'ABCD-1234',
      spectator: false,
    });
    expect(result.success).toBe(false);
  });
});
