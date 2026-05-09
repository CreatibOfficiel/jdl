import { ArraySchema, Schema, type } from '@colyseus/schema';

export class Player extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') suit: string = '';
  @type('string') color: string = '';
  @type('string') emoji: string = '';
  @type('number') position: number = 0;
  @type('boolean') connected: boolean = true;
  @type('boolean') isHost: boolean = false;
  @type('string') bromanceWith: string = '';
  @type('boolean') lastTeleport: boolean = false;
  @type(['string']) inventory = new ArraySchema<string>();
  @type('number') prisonTurnsLeft: number = 0;
  @type('number') holeTurnsLeft: number = 0;
  @type('boolean') doubleNextSip: boolean = false;
  @type('number') pendingForcedDice: number = 0;
  @type('number') sipsTaken: number = 0;
  @type('number') sipsGiven: number = 0;
  @type('number') shopPurchases: number = 0;
  @type('number') diceRolls: number = 0;
  /** EquivalenceKind from @jeu-soiree/shared. Defaults to 'drinks' when unset. */
  @type('string') equivalencePreference: string = 'drinks';
  /** Cumulative equivalence units (e.g. pushups) the player owes — populated when preference != 'drinks'. */
  @type('number') equivalenceUnitsCompleted: number = 0;
  /** Sips absorbed inside the active safety window (tumbling 10 min). Resets on window expiry. */
  @type('number') sipsAbsorbedRecent: number = 0;
  /** Timestamp at which the current safety window opened. */
  @type('number') recentWindowStart: number = 0;
  /** How many times this player triggered the soft cap during the game. */
  @type('number') capsTriggered: number = 0;
}
