import { ArraySchema, MapSchema, Schema, type } from '@colyseus/schema';
import { BoardCaseSchema } from './BoardCaseSchema';
import { GameEvent } from './GameEvent';
import { Player } from './Player';
import { SipEvent } from './SipEvent';

export class GameState extends Schema {
  @type('string') phase: string = 'lobby';
  @type('string') hostId: string = '';
  @type('string') boardSeed: string = '';
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(['string']) turnOrder = new ArraySchema<string>();
  @type([BoardCaseSchema]) board = new ArraySchema<BoardCaseSchema>();
  @type('number') thirstZoneStart: number = 0;
  @type('number') thirstZoneLength: number = 0;
  @type({ map: 'number' }) rollOrderRolls = new MapSchema<number>();
  @type('number') currentTurnIndex: number = 0;
  @type('number') lastDiceRoll: number = 0;
  @type([GameEvent]) eventLog = new ArraySchema<GameEvent>();
  @type('string') winnerId: string = '';
  @type('string') activeModal: string = '';
  @type('string') activeModalPlayerId: string = '';
  @type('string') witchOffererId: string = '';
  @type('number') witchSips: number = 0;
  @type('number') witchDeadline: number = 0;
  @type(['number']) treasuresOpened = new ArraySchema<number>();
  @type('number') railRound: number = 0;
  @type(['string']) railCards = new ArraySchema<string>();
  @type([SipEvent]) sipEvents = new ArraySchema<SipEvent>();
  @type('number') sipEventsTotalCount: number = 0;
  /** When true (default), equivalence units bump the leaderboard's totalSipsTaken alongside the
   *  player's equivalenceUnitsCompleted. When false, an opt-out player's drink count stays at 0
   *  in /stats — they only show on the "Top athletes" board. */
  @type('boolean') countEquivalenceAsSips: boolean = true;
  /** DifficultyLevel from @jeu-soiree/shared. Picked by the host at create time. */
  @type('string') difficultyLevel: string = 'medium';
  /** Sips per suit card mismatch (or distribute on match). Defaults match the medium preset. */
  @type('number') sipsPerCard: number = 3;
  /** Default sips offered by witch potion (the offerer can override per-call). */
  @type('number') witchPotionSips: number = 5;
  /** Sips dealt by the malus_point item. */
  @type('number') ptMalusSips: number = 6;
  /** Total hydration prompts pushed by the safety throttle this game. */
  @type('number') totalHydrationPrompts: number = 0;
  /** Host-set ceiling: when a player would exceed this many total sips, every further sip is
   *  forced through equivalence. 0 = disabled. */
  @type('number') maxSipsPerPlayerPerGame: number = 0;
  /** Host has acked the pre-game checklist (water / snacks / age / exit). Gates start_game. */
  @type('boolean') checklistAcked: boolean = false;
}
