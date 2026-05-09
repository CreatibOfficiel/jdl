import { DIFFICULTY_LEVELS, EQUIVALENCE_KINDS } from '@jeu-soiree/shared';
import { z } from 'zod';

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

const codeField = z
  .string()
  .min(4)
  .max(20)
  .regex(/^[A-Z0-9-]+$/i);

/** Read-only spectator (e.g. master TV view). Skips player profile validation. */
export const SpectatorJoinSchema = z.object({
  code: codeField,
  spectator: z.literal(true),
});

export const JoinOptionsSchema = z.object({
  code: codeField,
  name: z.string().trim().min(1).max(20),
  suit: z.enum(SUITS),
  color: z.string().min(3).max(10),
  emoji: z.string().min(1).max(8),
  equivalencePreference: z.enum(EQUIVALENCE_KINDS as ['drinks', ...string[]]).default('drinks'),
  /** Honoured only when the room is created (passed by the host). Ignored on later joins. */
  difficulty: z.enum(DIFFICULTY_LEVELS as ['soft', ...string[]]).optional(),
});

export type JoinOptions = z.infer<typeof JoinOptionsSchema>;
export type SpectatorJoin = z.infer<typeof SpectatorJoinSchema>;
