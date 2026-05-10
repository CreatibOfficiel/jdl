import { DIFFICULTY_LEVELS, EQUIVALENCE_KINDS } from '@jeu-soiree/shared';
import { z } from 'zod';

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

const codeField = z
  .string()
  .min(4)
  .max(20)
  .regex(/^[A-Z0-9-]+$/i);

const pinField = z
  .string()
  .regex(/^\d{4}$/)
  .optional();

/** Read-only spectator (e.g. master TV view). Skips player profile validation. */
export const SpectatorJoinSchema = z.object({
  code: codeField,
  spectator: z.literal(true),
  pin: pinField,
});

const emptyToUndefined = z.literal('').transform(() => undefined);

export const JoinOptionsSchema = z.object({
  code: codeField,
  name: z.string().trim().min(1).max(20),
  suit: z
    .enum(SUITS)
    .optional()
    .or(emptyToUndefined)
    .default(undefined as unknown as (typeof SUITS)[number]),
  color: z.string().min(3).max(10).optional().or(emptyToUndefined).default(''),
  emoji: z.string().min(1).max(8).optional().or(emptyToUndefined).default(''),
  equivalencePreference: z.enum(EQUIVALENCE_KINDS as ['drinks', ...string[]]).default('drinks'),
  /** JSON-encoded { card?, witch?, rail?, pills?, pt_malus? } map of overrides. Capped at 200 chars. */
  equivalencePerSource: z.string().max(200).optional(),
  /** Honoured only when the room is created (passed by the host). Ignored on later joins. */
  difficulty: z.enum(DIFFICULTY_LEVELS as ['soft', ...string[]]).optional(),
  /** 4-digit PIN if the room is password-protected. */
  pin: pinField,
});

export type JoinOptions = z.infer<typeof JoinOptionsSchema>;
export type SpectatorJoin = z.infer<typeof SpectatorJoinSchema>;

export const UpdateProfileSchema = z.object({
  suit: z.enum(SUITS).optional(),
  color: z.string().min(3).max(10).optional(),
  emoji: z.string().min(1).max(8).optional(),
  equivalencePreference: z.enum(EQUIVALENCE_KINDS as ['drinks', ...string[]]).optional(),
});

export type UpdateProfileOptions = z.infer<typeof UpdateProfileSchema>;
