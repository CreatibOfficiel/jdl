import type { CaseType } from '../types/case';

export const BOARD_SIZE = 63;
export const START_POSITION = 0;
export const FINISH_POSITION = 63;

export const CASE_CASTING: Record<CaseType, number> = {
  red_number: 14,
  green_number: 14,
  spades: 1,
  hearts: 1,
  diamonds: 1,
  clubs: 1,
  shop: 2,
  formule1: 1,
  usain: 1,
  prison: 1,
  hole: 2,
  vacances: 1,
  witch: 2,
  bromance: 2,
  pills: 2,
  rail_de_bus: 1,
  portal: 4,
  neutral: 12,
};

export const BOARD_CONSTRAINTS = {
  thirstZoneLengthMin: 5,
  thirstZoneLengthMax: 7,
  thirstZoneStartMin: 8,
  thirstZoneStartMax: 30,
  prisonMin: 25,
  prisonMax: 50,
  shopEarlyMin: 5,
  shopEarlyMax: 30,
  shopLateMin: 31,
  shopLateMax: 58,
  railDeBusMin: 20,
  vacancesMin: 55,
  vacancesMax: 61,
  specialMinDistance: 2,
  cardMinDistance: 1,
  portalPairMinDistance: 15,
  redInThirstZoneMin: 3,
  treasureCount: 2,
} as const;

export const NUMBER_VALUES = [1, 2, 3, 4, 5] as const;
