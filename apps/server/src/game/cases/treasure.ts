import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import type { Player } from '../../schemas/Player';
import { pushEvent } from '../eventLog';
import { addItem, hasItem, removeItem } from '../inventoryManager';
import { endTurn } from '../turnHandler';

const BROADCAST_SIPS = 3;

/**
 * Called from turnHandler after a normal/extra move to detect a treasure.
 * Opens the treasure modal if the player has a crowbar and the treasure is unopened.
 */
export function checkTreasure(room: GameRoom, player: Player): void {
  if (room.state.activeModal) return;
  const treasures = room.getTreasureCases();
  if (!treasures.includes(player.position)) return;

  let alreadyOpened = false;
  room.state.treasuresOpened.forEach((p) => {
    if (p === player.position) alreadyOpened = true;
  });
  if (alreadyOpened) return;

  if (!hasItem(player, 'crowbar')) {
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'treasure_locked',
      text: `💰 ${player.name} sent un trésor sous ses pieds, mais n'a pas de pied de biche !`,
      importance: 'normal',
    });
    return;
  }

  room.state.activeModal = 'treasure';
  room.state.activeModalPlayerId = player.id;
  pushEvent(room.state, {
    playerId: player.id,
    kind: 'treasure_found',
    text: `💰 ${player.name} découvre un trésor !`,
    importance: 'epic',
  });
}

export function handleOpenTreasure(room: GameRoom, client: Client): void {
  if (room.state.activeModal !== 'treasure') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  const player = room.state.players.get(client.sessionId);
  if (!player || !hasItem(player, 'crowbar')) return;

  removeItem(player, 'crowbar');
  room.state.treasuresOpened.push(player.position);

  const dice = 1 + Math.floor(Math.random() * 6);
  pushEvent(room.state, {
    playerId: player.id,
    kind: 'treasure_open',
    text: `💰 ${player.name} ouvre le coffre → dé d'effet : ${dice}`,
    importance: 'epic',
  });

  if (dice <= 2) {
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'treasure_broadcast',
      text: `🍻 Cadeau ! Tout le monde boit ${BROADCAST_SIPS} gorgées (gracieuseté de ${player.name})`,
      importance: 'high',
    });
    closeTreasureModal(room);
    endTurn(room);
    return;
  }

  if (dice <= 4) {
    addItem(player, 'loaded_die');
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'treasure_loaded_die',
      text: `🎲 ${player.name} reçoit un dé pipé (utilisable plus tard)`,
      importance: 'high',
    });
    closeTreasureModal(room);
    endTurn(room);
    return;
  }

  // 5-6 → swap position
  room.state.activeModal = 'treasure_swap';
  pushEvent(room.state, {
    playerId: player.id,
    kind: 'treasure_swap_open',
    text: `🔀 ${player.name} doit choisir un joueur pour échanger sa position`,
    importance: 'high',
  });
}

interface SwapMessage {
  targetPlayerId: string;
}

export function handleSwapPosition(room: GameRoom, client: Client, message: SwapMessage): void {
  if (room.state.activeModal !== 'treasure_swap') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  const player = room.state.players.get(client.sessionId);
  const target = room.state.players.get(message.targetPlayerId);
  if (!player || !target?.connected || player.id === target.id) return;

  const oldPos = player.position;
  player.position = target.position;
  target.position = oldPos;

  pushEvent(room.state, {
    playerId: player.id,
    kind: 'treasure_swap',
    text: `🔀 ${player.name} échange sa position (${oldPos}) avec ${target.name} (${player.position}) !`,
    importance: 'high',
  });

  closeTreasureModal(room);
  endTurn(room);
}

export function handleSkipTreasure(room: GameRoom, client: Client): void {
  if (room.state.activeModal !== 'treasure') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;
  const player = room.state.players.get(client.sessionId);
  pushEvent(room.state, {
    playerId: client.sessionId,
    kind: 'treasure_skip',
    text: `${player?.name ?? '?'} laisse le coffre fermé`,
    importance: 'low',
  });
  closeTreasureModal(room);
  endTurn(room);
}

function closeTreasureModal(room: GameRoom): void {
  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';
}
