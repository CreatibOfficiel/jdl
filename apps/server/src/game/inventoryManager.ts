import type { Player } from '../schemas/Player';

export function addItem(player: Player, item: string): void {
  player.inventory.push(item);
}

export function removeItem(player: Player, item: string): boolean {
  for (let i = 0; i < player.inventory.length; i++) {
    if (player.inventory[i] === item) {
      player.inventory.splice(i, 1);
      return true;
    }
  }
  return false;
}

export function hasItem(player: Player, item: string): boolean {
  for (let i = 0; i < player.inventory.length; i++) {
    if (player.inventory[i] === item) return true;
  }
  return false;
}
