export type EquivalenceKind = 'drinks' | 'pushups' | 'squats' | 'jumping_jacks' | 'sit_out';

export const EQUIVALENCE_KINDS: ReadonlyArray<EquivalenceKind> = [
  'drinks',
  'pushups',
  'squats',
  'jumping_jacks',
  'sit_out',
];

export interface EquivalenceRule {
  /** Plural French name of the unit (e.g. 'pompes', 'gorgées'). */
  unit: string;
  /** How many of `unit` equal one sip. 0 for `sit_out` (no count, just skip). */
  perSip: number;
  emoji: string;
  /** UI label, e.g. '10 pompes / gorgée'. */
  label: string;
}

export const EQUIVALENCE_TABLE: Record<EquivalenceKind, EquivalenceRule> = {
  drinks: { unit: 'gorgées', perSip: 1, emoji: '🍺', label: 'Je bois' },
  pushups: { unit: 'pompes', perSip: 10, emoji: '💪', label: '10 pompes / gorgée' },
  squats: { unit: 'squats', perSip: 10, emoji: '🦵', label: '10 squats / gorgée' },
  jumping_jacks: { unit: 'jumping jacks', perSip: 15, emoji: '🤸', label: '15 jumping jacks / gorgée' },
  sit_out: { unit: 'tour passé', perSip: 0, emoji: '🪑', label: 'Je passe (pas compté)' },
};

export function isEquivalenceKind(value: unknown): value is EquivalenceKind {
  return typeof value === 'string' && (EQUIVALENCE_KINDS as ReadonlyArray<string>).includes(value);
}
