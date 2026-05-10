import type { Board, BoardCase, CaseType, DifficultyLevel, ThirstZone } from '@jeu-soiree/shared';
import { BOARD_CONSTRAINTS, BOARD_SIZE, NUMBER_VALUES } from '@jeu-soiree/shared';
import { validateBoard } from './constraints';
import { pickPositionWithMinDistance } from './poissonDisk';
import { SeededRandom } from './seed';

const DEFAULT_MAX_ATTEMPTS = 50;

interface DifficultyBoardProfile {
  /** Bias the thirst zone length (clamps inside the existing min/max range). */
  tzLengthMin: number;
  tzLengthMax: number;
  /** Card cardinality nudge — MUST sum to 0 across reds/greens/neutrals. */
  redExtra: number;
  greenExtra: number;
  neutralExtra: number;
}

const DEFAULT_TZ_MIN = BOARD_CONSTRAINTS.thirstZoneLengthMin;
const DEFAULT_TZ_MAX = BOARD_CONSTRAINTS.thirstZoneLengthMax;

const DIFFICULTY_BOARD_PROFILES: Record<DifficultyLevel, DifficultyBoardProfile> = {
  // Medium = today's behaviour byte-for-byte. DO NOT touch.
  medium: { tzLengthMin: DEFAULT_TZ_MIN, tzLengthMax: DEFAULT_TZ_MAX, redExtra: 0, greenExtra: 0, neutralExtra: 0 },
  // Soft: smaller thirst zone, fewer reds + extra neutrals.
  soft: { tzLengthMin: DEFAULT_TZ_MIN, tzLengthMax: DEFAULT_TZ_MIN, redExtra: -2, greenExtra: 0, neutralExtra: 2 },
  // Hardcore: max thirst zone, more reds at the expense of greens.
  hardcore: { tzLengthMin: DEFAULT_TZ_MAX, tzLengthMax: DEFAULT_TZ_MAX, redExtra: 2, greenExtra: -2, neutralExtra: 0 },
};

const OTHER_SPECIALS: ReadonlyArray<{ type: CaseType; count: number }> = [
  { type: 'formule1', count: 1 },
  { type: 'usain', count: 1 },
  { type: 'hole', count: 2 },
  { type: 'witch', count: 2 },
  { type: 'bromance', count: 2 },
  { type: 'pills', count: 2 },
];

const CARD_TYPES: ReadonlyArray<CaseType> = ['spades', 'hearts', 'diamonds', 'clubs'];

const REMAINING_REDS = 14;
const REMAINING_GREENS = 14;
const REMAINING_NEUTRALS = 12;

export function generateBoard(
  seed: string,
  difficulty: DifficultyLevel = 'medium',
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): Board {
  const profile = DIFFICULTY_BOARD_PROFILES[difficulty];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const baseSeed = attempt === 0 ? seed : `${seed}:retry-${attempt}`;
    // Mix difficulty into the RNG seed for non-medium variants so the same `seed` produces
    // different boards across difficulties — but `medium` keeps the legacy seed exactly so
    // historical seed → board mappings stay byte-stable. (Regression guard.)
    const attemptSeed = difficulty === 'medium' ? baseSeed : `${baseSeed}::${difficulty}`;
    const rng = new SeededRandom(attemptSeed);
    const result = tryGenerate(rng, seed, profile);
    if (result === null) continue;
    if (validateBoard(result).ok) return result;
  }
  throw new Error(
    `Failed to generate a valid board for seed "${seed}" (difficulty=${difficulty}) after ${maxAttempts} attempts`,
  );
}

function tryGenerate(rng: SeededRandom, seed: string, profile: DifficultyBoardProfile): Board | null {
  // -- Step 1: Thirst zone --------------------------------------------------
  // For medium, the bounds equal the canonical BOARD_CONSTRAINTS values, so this draw is
  // identical to the pre-difficulty implementation (regression guard).
  const tzLength = rng.nextInt(profile.tzLengthMin, profile.tzLengthMax);
  const tzStart = rng.nextInt(
    BOARD_CONSTRAINTS.thirstZoneStartMin,
    BOARD_CONSTRAINTS.thirstZoneStartMax,
  );
  const thirstZone: ThirstZone = { start: tzStart, length: tzLength };

  // Placements indexed by board position.
  const placements = new Map<number, BoardCase>();
  const isOccupied = (i: number) => placements.has(i);
  const allPlacedPositions = (): number[] => Array.from(placements.keys());
  const placeAt = (index: number, type: CaseType, extras: Partial<BoardCase> = {}): boolean => {
    if (placements.has(index) || index < 1 || index > BOARD_SIZE) return false;
    placements.set(index, { index, type, ...extras });
    return true;
  };

  const placeSpecialInRange = (
    rangeMin: number,
    rangeMax: number,
    type: CaseType,
  ): number | null => {
    const pos = pickPositionWithMinDistance(
      rng,
      rangeMin,
      rangeMax,
      isOccupied,
      allPlacedPositions(),
      BOARD_CONSTRAINTS.specialMinDistance,
    );
    if (pos === null) return null;
    placeAt(pos, type);
    return pos;
  };

  // -- Step 2: Zoned specials (prison, vacances, shops, rail) ---------------
  if (
    placeSpecialInRange(BOARD_CONSTRAINTS.prisonMin, BOARD_CONSTRAINTS.prisonMax, 'prison') === null
  )
    return null;
  if (
    placeSpecialInRange(
      BOARD_CONSTRAINTS.vacancesMin,
      BOARD_CONSTRAINTS.vacancesMax,
      'vacances',
    ) === null
  )
    return null;
  if (
    placeSpecialInRange(BOARD_CONSTRAINTS.shopEarlyMin, BOARD_CONSTRAINTS.shopEarlyMax, 'shop') ===
    null
  )
    return null;
  if (
    placeSpecialInRange(BOARD_CONSTRAINTS.shopLateMin, BOARD_CONSTRAINTS.shopLateMax, 'shop') ===
    null
  )
    return null;
  if (placeSpecialInRange(BOARD_CONSTRAINTS.railDeBusMin, BOARD_SIZE - 1, 'rail_de_bus') === null)
    return null;

  // -- Step 3: Portal pairs -------------------------------------------------
  for (let pairId = 0; pairId < 2; pairId++) {
    const a = pickPositionWithMinDistance(
      rng,
      1,
      BOARD_SIZE,
      isOccupied,
      allPlacedPositions(),
      BOARD_CONSTRAINTS.specialMinDistance,
    );
    if (a === null) return null;
    placeAt(a, 'portal', { portalPairId: pairId });

    const candidates: number[] = [];
    for (let i = 1; i <= BOARD_SIZE; i++) {
      if (placements.has(i)) continue;
      if (Math.abs(i - a) < BOARD_CONSTRAINTS.portalPairMinDistance) continue;
      let ok = true;
      for (const pos of placements.keys()) {
        if (Math.abs(pos - i) < BOARD_CONSTRAINTS.specialMinDistance) {
          ok = false;
          break;
        }
      }
      if (ok) candidates.push(i);
    }
    if (candidates.length === 0) return null;
    const b = rng.pick(candidates);
    placeAt(b, 'portal', { portalPairId: pairId });
  }

  // -- Step 4: Other specials (Poisson-disk style, min distance 2) ----------
  for (const { type, count } of OTHER_SPECIALS) {
    for (let i = 0; i < count; i++) {
      const pos = pickPositionWithMinDistance(
        rng,
        1,
        BOARD_SIZE,
        isOccupied,
        allPlacedPositions(),
        BOARD_CONSTRAINTS.specialMinDistance,
      );
      if (pos === null) return null;
      placeAt(pos, type);
    }
  }

  // -- Step 5: Cards (♠♥♦♣) — min distance 1 between cards (no overlap) ----
  const cardPositions: number[] = [];
  for (const cardType of rng.shuffle(CARD_TYPES)) {
    const candidates: number[] = [];
    for (let i = 1; i <= BOARD_SIZE; i++) {
      if (placements.has(i)) continue;
      let ok = true;
      for (const cp of cardPositions) {
        if (Math.abs(cp - i) < BOARD_CONSTRAINTS.cardMinDistance) {
          ok = false;
          break;
        }
      }
      if (ok) candidates.push(i);
    }
    if (candidates.length === 0) return null;
    const chosen = rng.pick(candidates);
    placeAt(chosen, cardType);
    cardPositions.push(chosen);
  }

  // -- Step 6: Fill remaining with reds, greens, neutrals -------------------
  const remaining: number[] = [];
  for (let i = 1; i <= BOARD_SIZE; i++) {
    if (!placements.has(i)) remaining.push(i);
  }
  // Cardinality nudges shift between reds/greens/neutrals while preserving total
  // (the three deltas always sum to 0 so remaining.length stays valid).
  const reds = REMAINING_REDS + profile.redExtra;
  const greens = REMAINING_GREENS + profile.greenExtra;
  const neutrals = REMAINING_NEUTRALS + profile.neutralExtra;
  const expectedRemaining = reds + greens + neutrals;
  if (remaining.length !== expectedRemaining) return null;

  const tzEnd = tzStart + tzLength - 1;
  const inThirstZone = remaining.filter((i) => i >= tzStart && i <= tzEnd);
  const outThirstZone = remaining.filter((i) => i < tzStart || i > tzEnd);
  const minRedsInZone = BOARD_CONSTRAINTS.redInThirstZoneMin;
  if (inThirstZone.length < minRedsInZone) return null;

  const shuffledTz = rng.shuffle(inThirstZone);
  const forcedRedTz = shuffledTz.slice(0, minRedsInZone);
  const remainingTz = shuffledTz.slice(minRedsInZone);
  const remainingPool = rng.shuffle([...remainingTz, ...outThirstZone]);

  let redBudget = reds - minRedsInZone;
  let greenBudget = greens;
  let neutralBudget = neutrals;

  const numberValues = [...NUMBER_VALUES];
  for (const idx of forcedRedTz) {
    placeAt(idx, 'red_number', { numberValue: rng.pick(numberValues) });
  }
  for (const idx of remainingPool) {
    if (redBudget > 0) {
      placeAt(idx, 'red_number', { numberValue: rng.pick(numberValues) });
      redBudget--;
    } else if (greenBudget > 0) {
      placeAt(idx, 'green_number', { numberValue: rng.pick(numberValues) });
      greenBudget--;
    } else if (neutralBudget > 0) {
      placeAt(idx, 'neutral');
      neutralBudget--;
    }
  }
  if (redBudget !== 0 || greenBudget !== 0 || neutralBudget !== 0) return null;

  // -- Step 7: Two treasures among neutral or number cases ------------------
  const treasureCandidates: number[] = [];
  for (const c of placements.values()) {
    if (c.type === 'neutral' || c.type === 'red_number' || c.type === 'green_number') {
      treasureCandidates.push(c.index);
    }
  }
  if (treasureCandidates.length < BOARD_CONSTRAINTS.treasureCount) return null;
  const treasureCases = rng.shuffle(treasureCandidates).slice(0, BOARD_CONSTRAINTS.treasureCount);

  const cases = Array.from(placements.values()).sort((a, b) => a.index - b.index);

  return {
    seed,
    cases,
    thirstZone,
    treasureCases,
  };
}
