import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import { pushEvent } from '../eventLog';
import { addItem } from '../inventoryManager';

interface ShopItem {
  itemType: string;
  name: string;
  cost: number;
  emoji: string;
}

export const SHOP_ITEMS: ReadonlyArray<ShopItem> = [
  { itemType: 'prison_key', name: 'Clé de prison', cost: 5, emoji: '🗝️' },
  { itemType: 'crowbar', name: 'Pied de biche', cost: 8, emoji: '🪛' },
  { itemType: 'malus_point', name: 'Pt malus ×6', cost: 6, emoji: '💣' },
];

interface BuyItemMessage {
  itemType: string;
}

export function handleBuyItem(room: GameRoom, client: Client, message: BuyItemMessage): void {
  if (room.state.activeModal !== 'shop') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  const item = SHOP_ITEMS.find((s) => s.itemType === message.itemType);
  if (!item) return;

  const player = room.state.players.get(client.sessionId);
  if (!player) return;

  addItem(player, item.itemType);
  player.shopPurchases += 1;
  player.sipsTaken += item.cost;

  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';

  pushEvent(room.state, {
    playerId: player.id,
    kind: 'shop_buy',
    text: `🛒 ${player.name} achète ${item.emoji} ${item.name} (boit ${item.cost} gorgée(s))`,
    importance: 'normal',
  });
}

export function handleSkipShop(room: GameRoom, client: Client): void {
  if (room.state.activeModal !== 'shop') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';

  const player = room.state.players.get(client.sessionId);
  pushEvent(room.state, {
    playerId: client.sessionId,
    kind: 'shop_skip',
    text: `🛒 ${player?.name ?? '?'} passe le shop`,
    importance: 'low',
  });
}
