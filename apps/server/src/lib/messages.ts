import { z } from 'zod';

export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;

export const JoinOptionsSchema = z.object({
  code: z
    .string()
    .min(4)
    .max(20)
    .regex(/^[A-Z0-9-]+$/i),
  name: z.string().trim().min(1).max(20),
  suit: z.enum(SUITS),
  color: z.string().min(3).max(10),
  emoji: z.string().min(1).max(8),
});

export type JoinOptions = z.infer<typeof JoinOptionsSchema>;
