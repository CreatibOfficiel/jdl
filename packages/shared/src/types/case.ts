export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type CaseType =
  | 'neutral'
  | 'red_number'
  | 'green_number'
  | 'spades'
  | 'hearts'
  | 'diamonds'
  | 'clubs'
  | 'shop'
  | 'formule1'
  | 'usain'
  | 'prison'
  | 'hole'
  | 'vacances'
  | 'witch'
  | 'bromance'
  | 'pills'
  | 'rail_de_bus'
  | 'portal';

export interface BoardCase {
  index: number;
  type: CaseType;
  numberValue?: number;
  portalPairId?: number;
}
