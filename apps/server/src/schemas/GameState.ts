import { ArraySchema, MapSchema, Schema, type } from '@colyseus/schema';
import { BoardCaseSchema } from './BoardCaseSchema';
import { GameEvent } from './GameEvent';
import { Player } from './Player';

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
}
