import type { Client } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import { pushEvent } from '../eventLog';
import { applyDrink } from '../sipsHelper';
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

  if (message.color === 'red') {
    room.state.activeModal = '';
    room.state.activeModalPlayerId = '';
    applyDrink(room, {
      player,
      sips: PILL_RED_SIPS,
      emoji: '💊🔴',
      kind: 'pill_red',
      reason: 'pilule rouge',
    });
    endTurn(room);
  } else {
    const dice = 1 + Math.floor(Math.random() * 6);
    pushEvent(room.state, {
      playerId: player.id,
      kind: 'pill_blue_roll',
      text: `💊🔵 ${player.name} choisit la pilule bleue → dé : ${dice}`,
      importance: 'high',
    });

    if (dice <= 2) {
      room.state.activeModal = '';
      room.state.activeModalPlayerId = '';
      applyDrink(room, {
        player,
        sips: PILL_BLUE_LOW_SIPS,
        emoji: '💊🔵',
        kind: 'pill_blue_drink',
        reason: 'bleue 1-2',
      });
      endTurn(room);
    } else if (dice <= 4) {
      room.state.activeModal = 'distribute';
      room.state.activeModalPlayerId = player.id;
      room.state.distributeExpectedSips = PILL_BLUE_DISTRIBUTE_SIPS;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'pill_blue_distribute_open',
        text: `💊🔵 ${player.name} doit distribuer ${PILL_BLUE_DISTRIBUTE_SIPS} gorgée(s) (bleue 3-4)`,
        importance: 'high',
      });
    } else {
      room.state.activeModal = '';
      room.state.activeModalPlayerId = '';
      player.doubleNextSip = true;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'pill_blue_double',
        text: `💊🔵 ${player.name} doublera sa prochaine gorgée !`,
        importance: 'high',
      });
      endTurn(room);
    }
  }
}
