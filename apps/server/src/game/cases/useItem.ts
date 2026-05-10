import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import { pushEvent } from '../eventLog';
import { hasItem, removeItem } from '../inventoryManager';
import { applyDrink } from '../sipsHelper';

interface UseItemMessage {
  itemType: string;
  targetPlayerId?: string;
  diceValue?: number;
}

export function handleUseItem(room: GameRoom, client: Client, message: UseItemMessage): void {
  const player = room.state.players.get(client.sessionId);
  if (!player) return;
  if (!hasItem(player, message.itemType)) return;

  switch (message.itemType) {
    case 'malus_point': {
      if (!message.targetPlayerId) return;
      const target = room.state.players.get(message.targetPlayerId);
      if (!target?.connected) return;
      removeItem(player, 'malus_point');
      const sips = room.state.ptMalusSips;
      applyDrink(room, {
        player: target,
        sips,
        emoji: '💣',
        kind: 'pt_malus',
        reason: `Pt malus de ${player.name}`,
      });
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'use_malus',
        text: `💣 ${player.name} balance un Pt malus à ${target.name} → ${sips} gorgées !`,
        importance: 'high',
      });
      return;
    }

    case 'prison_key': {
      if (player.prisonTurnsLeft <= 0) {
        pushEvent(room.state, {
          playerId: player.id,
          kind: 'use_key_idle',
          text: `🗝️ ${player.name} essaie d'utiliser la clé mais n'est pas en prison`,
          importance: 'low',
        });
        return;
      }
      removeItem(player, 'prison_key');
      player.prisonTurnsLeft = 0;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'use_key',
        text: `🗝️ ${player.name} utilise la Clé de prison et se libère !`,
        importance: 'high',
      });
      return;
    }

    case 'loaded_die': {
      const value = Math.floor(message.diceValue ?? 0);
      if (value < 1 || value > 6) return;
      removeItem(player, 'loaded_die');
      player.pendingForcedDice = value;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'use_loaded_die',
        text: `🎲 ${player.name} place un dé pipé sur ${value} pour son prochain tour !`,
        importance: 'high',
      });
      return;
    }

    case 'crowbar':
    case 'potion':
      // crowbar is consumed automatically when opening a treasure
      // potion is offered via 'give_potion' message, not generic use_item
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'use_item_unsupported',
        text: `${player.name} essaie d'utiliser ${message.itemType} via le mauvais flow`,
        importance: 'low',
      });
      return;
  }
}
