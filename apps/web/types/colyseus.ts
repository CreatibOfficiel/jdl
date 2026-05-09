export interface ClientPlayer {
  id: string;
  name: string;
  suit: string;
  color: string;
  emoji: string;
  position: number;
  connected: boolean;
  isHost: boolean;
  bromanceWith: string;
  lastTeleport: boolean;
  inventory: ClientArraySchema<string>;
  prisonTurnsLeft: number;
  holeTurnsLeft: number;
  pendingForcedDice: number;
  sipsTaken: number;
  sipsGiven: number;
  shopPurchases: number;
  diceRolls: number;
  equivalencePreference: string;
  equivalenceUnitsCompleted: number;
}

export interface ClientSipEvent {
  ts: number;
  fromId: string;
  toId: string;
  count: number;
  source: string;
  equivalence: string;
}

export interface ClientBoardCase {
  index: number;
  caseType: string;
  numberValue: number;
  portalPairId: number;
}

export interface ClientGameEvent {
  id: string;
  timestamp: number;
  playerId: string;
  kind: string;
  text: string;
  importance: string;
}

export interface ClientMapSchema<V> {
  size: number;
  has(key: string): boolean;
  get(key: string): V | undefined;
  forEach(cb: (value: V, key: string) => void): void;
  [Symbol.iterator](): IterableIterator<[string, V]>;
  values(): IterableIterator<V>;
  keys(): IterableIterator<string>;
}

export interface ClientArraySchema<V> extends Iterable<V> {
  length: number;
  forEach(cb: (value: V, index: number) => void): void;
  [Symbol.iterator](): IterableIterator<V>;
}

export interface ClientGameState {
  phase: string;
  hostId: string;
  boardSeed: string;
  thirstZoneStart: number;
  thirstZoneLength: number;
  players: ClientMapSchema<ClientPlayer>;
  turnOrder: ClientArraySchema<string>;
  board: ClientArraySchema<ClientBoardCase>;
  rollOrderRolls: ClientMapSchema<number>;
  currentTurnIndex: number;
  lastDiceRoll: number;
  eventLog: ClientArraySchema<ClientGameEvent>;
  winnerId: string;
  activeModal: string;
  activeModalPlayerId: string;
  witchOffererId: string;
  witchSips: number;
  witchDeadline: number;
  treasuresOpened: ClientArraySchema<number>;
  railRound: number;
  railCards: ClientArraySchema<string>;
  sipEvents: ClientArraySchema<ClientSipEvent>;
  sipEventsTotalCount: number;
  countEquivalenceAsSips: boolean;
  difficultyLevel: string;
  sipsPerCard: number;
  witchPotionSips: number;
  ptMalusSips: number;
}
