import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import { pushEvent } from '../eventLog';
import { endTurn } from '../turnHandler';

interface BromanceMessage {
  targetPlayerId: string;
}

export function handleChooseBromance(
  room: GameRoom,
  client: Client,
  message: BromanceMessage,
): void {
  if (room.state.activeModal !== 'bromance') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  const player = room.state.players.get(client.sessionId);
  const target = room.state.players.get(message.targetPlayerId);
  if (!player || !target || player.id === target.id) return;
  if (!target.connected) return;

  // Bilateral overwrite — break old links on both sides
  if (player.bromanceWith) {
    const prev = room.state.players.get(player.bromanceWith);
    if (prev) prev.bromanceWith = '';
  }
  if (target.bromanceWith) {
    const prevT = room.state.players.get(target.bromanceWith);
    if (prevT) prevT.bromanceWith = '';
  }

  player.bromanceWith = target.id;
  target.bromanceWith = player.id;

  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';

  pushEvent(room.state, {
    playerId: player.id,
    kind: 'bromance_set',
    text: `💪 ${player.name} et ${target.name} sont maintenant BROMANCE !`,
    importance: 'high',
  });

  endTurn(room);
}
