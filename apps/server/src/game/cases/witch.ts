import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import { pushEvent } from '../eventLog';
import { hasItem, removeItem } from '../inventoryManager';
import { applyDrink } from '../sipsHelper';

const POTION_TIMEOUT_MS = 10_000;
const POTION_SIPS_MIN = 1;
const POTION_SIPS_MAX = 10;

interface GivePotionMessage {
  targetPlayerId: string;
  sips: number;
}

export function handleGivePotion(room: GameRoom, client: Client, message: GivePotionMessage): void {
  if (room.state.phase !== 'playing') return;
  if (room.state.activeModal !== '') return;

  const player = room.state.players.get(client.sessionId);
  if (!player) return;
  if (!hasItem(player, 'potion')) return;

  const target = room.state.players.get(message.targetPlayerId);
  if (!target?.connected || target.id === player.id) return;

  const sips = Math.max(POTION_SIPS_MIN, Math.min(POTION_SIPS_MAX, Math.floor(message.sips)));

  removeItem(player, 'potion');
  room.state.activeModal = 'witch_potion';
  room.state.activeModalPlayerId = target.id;
  room.state.witchOffererId = player.id;
  room.state.witchSips = sips;
  room.state.witchDeadline = Date.now() + POTION_TIMEOUT_MS;

  pushEvent(room.state, {
    playerId: player.id,
    kind: 'witch_offer',
    text: `🧪 ${player.name} offre une potion à ${target.name} → ${sips} gorgées (10s pour dire merci)`,
    importance: 'high',
  });

  room.clock.setTimeout(() => {
    if (room.state.phase !== 'playing') {
      closeWitchModal(room);
      return;
    }
    // Only fire if the offer is still pending (not consumed by say_thanks)
    if (room.state.activeModal !== 'witch_potion') return;
    if (room.state.witchOffererId !== player.id) return;

    const stillTarget = room.state.players.get(target.id);
    if (stillTarget) {
      applyDrink(room, {
        player: stillTarget,
        sips: sips * 2,
        emoji: '🧪',
        kind: 'witch_no_thanks',
        reason: `pas dit merci → doublé à ${sips * 2}`,
      });
    }

    closeWitchModal(room);
  }, POTION_TIMEOUT_MS);
}

export function handleSayThanks(room: GameRoom, client: Client): void {
  if (room.state.activeModal !== 'witch_potion') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  const target = room.state.players.get(client.sessionId);
  pushEvent(room.state, {
    playerId: client.sessionId,
    kind: 'witch_thanks',
    text: `🙏 ${target?.name ?? '?'} dit merci — sauvé(e) !`,
    importance: 'high',
  });

  closeWitchModal(room);
}

function closeWitchModal(room: GameRoom): void {
  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';
  room.state.witchOffererId = '';
  room.state.witchSips = 0;
  room.state.witchDeadline = 0;
}
