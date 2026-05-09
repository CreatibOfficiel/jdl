import { determineTurnOrder, type RollOrderEntry } from '@jeu-soiree/game-logic';
import type { Client } from 'colyseus';
import type { GameRoom } from '../rooms/GameRoom';
import { pushEvent } from './eventLog';

const DICE_FACES = 6;

export function handleRollOrderDice(room: GameRoom, client: Client): void {
  if (room.state.phase !== 'rolling_order') return;
  if (room.state.rollOrderRolls.has(client.sessionId)) return;

  const value = 1 + Math.floor(Math.random() * DICE_FACES);
  room.state.rollOrderRolls.set(client.sessionId, value);

  const player = room.state.players.get(client.sessionId);
  pushEvent(room.state, {
    playerId: client.sessionId,
    kind: 'roll_order_dice',
    text: `🎲 ${player?.name ?? '?'} fait ${value}`,
    importance: 'normal',
  });

  const connectedCount = countConnectedPlayers(room);
  if (room.state.rollOrderRolls.size >= connectedCount) {
    finalizeRollOrder(room);
  }
}

function countConnectedPlayers(room: GameRoom): number {
  let n = 0;
  room.state.players.forEach((p) => {
    if (p.connected) n += 1;
  });
  return n;
}

function finalizeRollOrder(room: GameRoom): void {
  const rolls: RollOrderEntry[] = [];
  room.state.rollOrderRolls.forEach((value, playerId) => {
    rolls.push({ playerId, roll: value });
  });

  const result = determineTurnOrder(rolls);

  if (result.resolved) {
    room.state.turnOrder.clear();
    for (const id of result.order) {
      room.state.turnOrder.push(id);
    }
    room.state.phase = 'playing';
    room.state.currentTurnIndex = 0;
    const firstId = result.order[0];
    const firstPlayer = firstId ? room.state.players.get(firstId) : undefined;
    pushEvent(room.state, {
      kind: 'phase_change',
      text: `▶️ Partie démarrée. À ${firstPlayer?.name ?? '?'} de jouer !`,
      importance: 'high',
    });
    return;
  }

  // Tiebreak: clear rolls of tied players so they reroll, keep others' rolls.
  for (const id of result.tiebreakIds) {
    room.state.rollOrderRolls.delete(id);
  }
  const tiedNames: string[] = [];
  for (const id of result.tiebreakIds) {
    const p = room.state.players.get(id);
    if (p) tiedNames.push(p.name);
  }
  pushEvent(room.state, {
    kind: 'tiebreak',
    text: `🔁 Égalité — ${tiedNames.join(', ')} relancent`,
    importance: 'normal',
  });
}
