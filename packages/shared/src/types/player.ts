import type { Suit } from './case';

export type ItemType = 'prison_key' | 'crowbar' | 'malus_point' | 'potion' | 'loaded_die';

export type PlayerStatus = 'connected' | 'reconnecting' | 'afk' | 'abandoned';

export interface PlayerJoinPayload {
  code: string;
  name: string;
  suit: Suit;
  color: string;
  emoji: string;
}
