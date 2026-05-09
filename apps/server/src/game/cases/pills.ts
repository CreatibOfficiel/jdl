import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import { pushEvent } from '../eventLog';
import { applyDistribute, applyDrink } from '../sipsHelper';
import { endTurn } from '../turnHandler';

interface ChoosePillMessage {
  color: 'red' | 'blue';
}

const PILL_RED_SIPS = 6;
const PILL_BLUE_LOW_SIPS = 8;
const PILL_BLUE_DISTRIBUTE_SIPS = 10;

export function handleChoosePill(room: GameRoom, client: Client, message: ChoosePillMessage): void {
  if (room.state.activeModal !== 'pills') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  const player = room.state.players.get(client.sessionId);
  if (!player) return;

  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';

  if (message.color === 'red') {
    applyDrink(room, {
      player,
      sips: PILL_RED_SIPS,
      emoji: '💊🔴',
      kind: 'pill_red',
      reason: 'pilule rouge',
    });
  } else {
    const dice = 1 + Math.floor(Math.random() * 6);
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'pill_blue_roll',
      text: `💊🔵 ${player.name} choisit la pilule bleue → dé : ${dice}`,
      importance: 'high',
    });

    if (dice <= 2) {
      applyDrink(room, {
        player,
        sips: PILL_BLUE_LOW_SIPS,
        emoji: '💊🔵',
        kind: 'pill_blue_drink',
        reason: 'bleue 1-2',
      });
    } else if (dice <= 4) {
      applyDistribute(
        room,
        player,
        PILL_BLUE_DISTRIBUTE_SIPS,
        '💊🔵',
        'pill_blue_distribute',
        'bleue 3-4',
      );
    } else {
      player.doubleNextSip = true;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'pill_blue_double',
        text: `💊🔵 ${player.name} doublera sa prochaine gorgée !`,
        importance: 'high',
      });
    }
  }

  endTurn(room);
}
