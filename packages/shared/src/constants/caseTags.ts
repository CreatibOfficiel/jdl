import type { CaseType } from '../types/case';

/** Six-dimensional tag vector per case type, scaled 0..10. Used by the difficulty-aware
 *  board generator to bias placement (RP4) and by future content tools to surface
 *  "case categories" in the rules / preview pages. Values are designer hand-tuned. */
export interface CaseTagVector {
  /** Overall hardness / "loaded-ness" of the case. */
  intensity: number;
  /** Specifically the alcohol burden — 0 for non-drinking cases. */
  alcoholIntensity: number;
  /** Embarrassment / dare / pick-someone-out factor. */
  socialRisk: number;
  /** Falls / fast-drink / motor activity factor. */
  physicalRisk: number;
  /** How long the case slows the game (vacances, prison, hole). */
  timeCost: number;
  /** Whether the case affects others or only the player who landed on it. */
  groupScope: number;
}

const z: CaseTagVector = {
  intensity: 0,
  alcoholIntensity: 0,
  socialRisk: 0,
  physicalRisk: 0,
  timeCost: 0,
  groupScope: 0,
};

export const CASE_TAGS: Record<CaseType, CaseTagVector> = {
  neutral: z,
  vacances: { ...z, timeCost: 2 },
  red_number: { ...z, intensity: 5, alcoholIntensity: 6, groupScope: 5 },
  green_number: { ...z, intensity: 3, alcoholIntensity: 0, groupScope: 6 },
  spades: { ...z, intensity: 4, alcoholIntensity: 5, socialRisk: 2, groupScope: 4 },
  hearts: { ...z, intensity: 4, alcoholIntensity: 5, socialRisk: 2, groupScope: 4 },
  diamonds: { ...z, intensity: 4, alcoholIntensity: 5, socialRisk: 2, groupScope: 4 },
  clubs: { ...z, intensity: 4, alcoholIntensity: 5, socialRisk: 2, groupScope: 4 },
  shop: { ...z, intensity: 3, alcoholIntensity: 4, timeCost: 3, groupScope: 3 },
  formule1: { ...z, intensity: 2, physicalRisk: 1 },
  usain: { ...z, intensity: 2, physicalRisk: 1 },
  prison: { ...z, intensity: 8, alcoholIntensity: 4, timeCost: 8, socialRisk: 4 },
  hole: { ...z, intensity: 6, timeCost: 7 },
  witch: { ...z, intensity: 7, alcoholIntensity: 7, socialRisk: 6, groupScope: 7 },
  bromance: { ...z, intensity: 5, alcoholIntensity: 5, socialRisk: 5, groupScope: 5 },
  pills: { ...z, intensity: 7, alcoholIntensity: 7, socialRisk: 4, groupScope: 4 },
  rail_de_bus: { ...z, intensity: 9, alcoholIntensity: 9, physicalRisk: 3, timeCost: 5, groupScope: 3 },
  portal: { ...z, intensity: 2, timeCost: 1 },
};

/** Mean tag values used as the "target vector" per difficulty. RP4 will use these to
 *  rejection-sample case placements — boards close to the target on each axis are kept. */
export interface DifficultyTargetVector extends CaseTagVector {
  sigma: number;
}

export const DIFFICULTY_TARGETS: Record<'soft' | 'medium' | 'hardcore', DifficultyTargetVector> = {
  soft: {
    intensity: 3,
    alcoholIntensity: 3,
    socialRisk: 2,
    physicalRisk: 2,
    timeCost: 3,
    groupScope: 3,
    sigma: 1.5,
  },
  medium: {
    intensity: 5,
    alcoholIntensity: 5,
    socialRisk: 4,
    physicalRisk: 3,
    timeCost: 4,
    groupScope: 5,
    sigma: 2,
  },
  hardcore: {
    intensity: 7,
    alcoholIntensity: 7,
    socialRisk: 6,
    physicalRisk: 5,
    timeCost: 6,
    groupScope: 6,
    sigma: 2,
  },
};

/** Squared L2 distance between a case tag vector and a difficulty target.
 *  Lower = closer match. Used for RP4 affinity scoring. */
export function tagDistance(tags: CaseTagVector, target: CaseTagVector): number {
  return (
    (tags.intensity - target.intensity) ** 2 +
    (tags.alcoholIntensity - target.alcoholIntensity) ** 2 +
    (tags.socialRisk - target.socialRisk) ** 2 +
    (tags.physicalRisk - target.physicalRisk) ** 2 +
    (tags.timeCost - target.timeCost) ** 2 +
    (tags.groupScope - target.groupScope) ** 2
  );
}
