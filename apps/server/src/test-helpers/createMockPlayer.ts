import { ArraySchema } from '@colyseus/schema';
import { Player } from '../schemas/Player';

export type MockPlayer = Player;

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  const player = new Player();
  player.id = 'player-1';
  player.name = 'Alice';
  player.suit = 'spades';
  player.color = '#ff0000';
  player.emoji = '\u{1F3AF}';
  player.position = 0;
  player.connected = true;
  player.isHost = false;
  player.bromanceWith = '';
  player.lastTeleport = false;
  player.prisonTurnsLeft = 0;
  player.holeTurnsLeft = 0;
  player.doubleNextSip = false;
  player.pendingForcedDice = 0;
  player.sipsTaken = 0;
  player.sipsGiven = 0;
  player.shopPurchases = 0;
  player.diceRolls = 0;
  Object.assign(player, overrides);
  return player;
}

export function createInventory(...items: string[]): ArraySchema<string> {
  const inv = new ArraySchema<string>();
  for (const item of items) inv.push(item);
  return inv;
}
