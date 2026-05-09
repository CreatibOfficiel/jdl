import type { Board, BoardCase, CaseType } from '@jeu-soiree/shared';
import { BOARD_CONSTRAINTS, BOARD_SIZE } from '@jeu-soiree/shared';

const SPECIAL_TYPES: ReadonlySet<CaseType> = new Set<CaseType>([
  'shop',
  'formule1',
  'usain',
  'prison',
  'hole',
  'vacances',
  'witch',
  'bromance',
  'pills',
  'rail_de_bus',
  'portal',
]);

const CARD_TYPES: ReadonlySet<CaseType> = new Set<CaseType>([
  'spades',
  'hearts',
  'diamonds',
  'clubs',
]);

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function indicesOfType(cases: readonly BoardCase[], type: CaseType): number[] {
  return cases.filter((c) => c.type === type).map((c) => c.index);
}

function indicesOfTypes(cases: readonly BoardCase[], types: ReadonlySet<CaseType>): number[] {
  return cases.filter((c) => types.has(c.type)).map((c) => c.index);
}

export function validateBoard(board: Board): ValidationResult {
  const errors: string[] = [];

  // -- Cases array integrity ----------------------------------------------
  if (board.cases.length !== BOARD_SIZE) {
    errors.push(`expected ${BOARD_SIZE} cases, got ${board.cases.length}`);
  }
  const indexSet = new Set<number>();
  for (const c of board.cases) {
    if (c.index < 1 || c.index > BOARD_SIZE) {
      errors.push(`case index ${c.index} out of range [1,${BOARD_SIZE}]`);
    }
    if (indexSet.has(c.index)) {
      errors.push(`duplicate case index ${c.index}`);
    }
    indexSet.add(c.index);
  }
  for (let i = 1; i <= BOARD_SIZE; i++) {
    if (!indexSet.has(i)) errors.push(`missing case at index ${i}`);
  }

  // -- Thirst zone --------------------------------------------------------
  const tz = board.thirstZone;
  if (
    tz.length < BOARD_CONSTRAINTS.thirstZoneLengthMin ||
    tz.length > BOARD_CONSTRAINTS.thirstZoneLengthMax
  ) {
    errors.push(
      `thirstZone.length ${tz.length} not in [${BOARD_CONSTRAINTS.thirstZoneLengthMin},${BOARD_CONSTRAINTS.thirstZoneLengthMax}]`,
    );
  }
  if (
    tz.start < BOARD_CONSTRAINTS.thirstZoneStartMin ||
    tz.start > BOARD_CONSTRAINTS.thirstZoneStartMax
  ) {
    errors.push(
      `thirstZone.start ${tz.start} not in [${BOARD_CONSTRAINTS.thirstZoneStartMin},${BOARD_CONSTRAINTS.thirstZoneStartMax}]`,
    );
  }

  // -- Prison -------------------------------------------------------------
  const prisons = indicesOfType(board.cases, 'prison');
  if (prisons.length !== 1) {
    errors.push(`expected 1 prison, got ${prisons.length}`);
  } else {
    const p = prisons[0] as number;
    if (p < BOARD_CONSTRAINTS.prisonMin || p > BOARD_CONSTRAINTS.prisonMax) {
      errors.push(
        `prison at ${p} not in [${BOARD_CONSTRAINTS.prisonMin},${BOARD_CONSTRAINTS.prisonMax}]`,
      );
    }
  }

  // -- Shops --------------------------------------------------------------
  const shops = indicesOfType(board.cases, 'shop').sort((a, b) => a - b);
  if (shops.length !== 2) {
    errors.push(`expected 2 shops, got ${shops.length}`);
  } else {
    const [early, late] = shops as [number, number];
    if (early < BOARD_CONSTRAINTS.shopEarlyMin || early > BOARD_CONSTRAINTS.shopEarlyMax) {
      errors.push(
        `early shop at ${early} not in [${BOARD_CONSTRAINTS.shopEarlyMin},${BOARD_CONSTRAINTS.shopEarlyMax}]`,
      );
    }
    if (late < BOARD_CONSTRAINTS.shopLateMin || late > BOARD_CONSTRAINTS.shopLateMax) {
      errors.push(
        `late shop at ${late} not in [${BOARD_CONSTRAINTS.shopLateMin},${BOARD_CONSTRAINTS.shopLateMax}]`,
      );
    }
  }

  // -- Rail de bus --------------------------------------------------------
  const rails = indicesOfType(board.cases, 'rail_de_bus');
  if (rails.length !== 1) {
    errors.push(`expected 1 rail_de_bus, got ${rails.length}`);
  } else {
    const r = rails[0] as number;
    if (r < BOARD_CONSTRAINTS.railDeBusMin) {
      errors.push(`rail_de_bus at ${r} below ${BOARD_CONSTRAINTS.railDeBusMin}`);
    }
  }

  // -- Vacances -----------------------------------------------------------
  const vacs = indicesOfType(board.cases, 'vacances');
  if (vacs.length !== 1) {
    errors.push(`expected 1 vacances, got ${vacs.length}`);
  } else {
    const v = vacs[0] as number;
    if (v < BOARD_CONSTRAINTS.vacancesMin || v > BOARD_CONSTRAINTS.vacancesMax) {
      errors.push(
        `vacances at ${v} not in [${BOARD_CONSTRAINTS.vacancesMin},${BOARD_CONSTRAINTS.vacancesMax}]`,
      );
    }
  }

  // -- Min distance between special cases ---------------------------------
  const specials = indicesOfTypes(board.cases, SPECIAL_TYPES).sort((a, b) => a - b);
  for (let i = 1; i < specials.length; i++) {
    const a = specials[i - 1] as number;
    const b = specials[i] as number;
    if (b - a < BOARD_CONSTRAINTS.specialMinDistance) {
      errors.push(
        `adjacent specials at ${a} and ${b} (min distance ${BOARD_CONSTRAINTS.specialMinDistance})`,
      );
    }
  }

  // -- Cards (♠♥♦♣) -------------------------------------------------------
  const cards = indicesOfTypes(board.cases, CARD_TYPES).sort((a, b) => a - b);
  if (cards.length !== 4) {
    errors.push(`expected 4 cards, got ${cards.length}`);
  }
  for (let i = 1; i < cards.length; i++) {
    const a = cards[i - 1] as number;
    const b = cards[i] as number;
    if (b - a < BOARD_CONSTRAINTS.cardMinDistance) {
      errors.push(`overlapping cards at ${a} and ${b}`);
    }
  }
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs'] as const) {
    const count = indicesOfType(board.cases, suit).length;
    if (count !== 1) errors.push(`expected exactly 1 ${suit}, got ${count}`);
  }

  // -- Portals ------------------------------------------------------------
  const portals = board.cases.filter((c) => c.type === 'portal');
  if (portals.length !== 4) {
    errors.push(`expected 4 portals, got ${portals.length}`);
  }
  const pairs = new Map<number, number[]>();
  for (const p of portals) {
    if (p.portalPairId === undefined) {
      errors.push(`portal at ${p.index} missing portalPairId`);
      continue;
    }
    const list = pairs.get(p.portalPairId) ?? [];
    list.push(p.index);
    pairs.set(p.portalPairId, list);
  }
  if (pairs.size !== 2) {
    errors.push(`expected 2 portal pairs, got ${pairs.size}`);
  }
  for (const [pid, indices] of pairs) {
    if (indices.length !== 2) {
      errors.push(`portal pair ${pid} has ${indices.length} entries`);
      continue;
    }
    const [a, b] = indices as [number, number];
    if (Math.abs(b - a) < BOARD_CONSTRAINTS.portalPairMinDistance) {
      errors.push(
        `portal pair ${pid} too close: ${a} ↔ ${b} (min ${BOARD_CONSTRAINTS.portalPairMinDistance})`,
      );
    }
  }

  // -- Red/green numbers --------------------------------------------------
  // Tolerance: the difficulty-aware generator may shift ±2 cards between reds/greens/neutrals.
  // Total reds + greens + neutrals always sums to 40 (63 - 11 specials - 4 cards - 4 portals - 4 = 40).
  const reds = indicesOfType(board.cases, 'red_number');
  const greens = indicesOfType(board.cases, 'green_number');
  if (reds.length < 12 || reds.length > 16) {
    errors.push(`red_number count ${reds.length} not in [12,16]`);
  }
  if (greens.length < 12 || greens.length > 16) {
    errors.push(`green_number count ${greens.length} not in [12,16]`);
  }

  for (const c of board.cases) {
    if (c.type === 'red_number' || c.type === 'green_number') {
      if (c.numberValue === undefined) {
        errors.push(`number case at ${c.index} missing numberValue`);
      }
    }
  }

  // -- At least N reds in the thirst zone ---------------------------------
  const tzEnd = tz.start + tz.length - 1;
  const redsInZone = reds.filter((i) => i >= tz.start && i <= tzEnd).length;
  if (redsInZone < BOARD_CONSTRAINTS.redInThirstZoneMin) {
    errors.push(
      `only ${redsInZone} red_number in thirst zone, need ${BOARD_CONSTRAINTS.redInThirstZoneMin}+`,
    );
  }

  // -- Treasures ----------------------------------------------------------
  if (board.treasureCases.length !== BOARD_CONSTRAINTS.treasureCount) {
    errors.push(
      `expected ${BOARD_CONSTRAINTS.treasureCount} treasures, got ${board.treasureCases.length}`,
    );
  }
  for (const t of board.treasureCases) {
    if (t < 1 || t > BOARD_SIZE) errors.push(`treasure at ${t} out of range`);
  }
  if (new Set(board.treasureCases).size !== board.treasureCases.length) {
    errors.push('duplicate treasure indices');
  }

  return { ok: errors.length === 0, errors };
}
