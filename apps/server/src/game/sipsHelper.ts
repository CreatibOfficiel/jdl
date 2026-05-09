import type { GameRoom } from '../rooms/GameRoom';
import type { Player } from '../schemas/Player';
import { pushEvent } from './eventLog';

interface ApplyDrinkArgs {
  player: Player;
  sips: number;
  emoji: string;
  /** Distinct event kind for the source (e.g. 'card_mismatch', 'red_drink') */
  kind: string;
  reason?: string;
}

/** Pushes "X boit N gorgées" + bromance ricochet if any. Consumes doubleNextSip. */
export function applyDrink(room: GameRoom, args: ApplyDrinkArgs): void {
  const { player, sips, emoji, kind, reason } = args;

  let effective = sips;
  let doubled = false;
  if (player.doubleNextSip) {
    effective = sips * 2;
    player.doubleNextSip = false;
    doubled = true;
  }

  pushEvent(room.state, {
    playerId: player.id,
    kind,
    text: `${emoji} ${player.name} boit ${effective} gorgée(s)${reason ? ` (${reason})` : ''}${doubled ? ' — DOUBLÉ' : ''}`,
    importance: 'normal',
  });
  player.sipsTaken += effective;

  if (player.bromanceWith) {
    const bro = room.state.players.get(player.bromanceWith);
    if (bro?.connected) {
      pushEvent(room.state, {
        playerId: bro.id,
        kind: 'bromance_drink',
        text: `💪 ${bro.name} boit aussi ${effective} gorgée(s) (bromance avec ${player.name})`,
        importance: 'normal',
      });
      bro.sipsTaken += effective;
    }
  }
}

/** Pushes "X distribue N gorgées" without bromance (giver doesn't drink). */
export function applyDistribute(
  room: GameRoom,
  player: Player,
  sips: number,
  emoji: string,
  kind: string,
  reason?: string,
): void {
  pushEvent(room.state, {
    playerId: player.id,
    kind,
    text: `${emoji} ${player.name} distribue ${sips} gorgée(s)${reason ? ` (${reason})` : ''}`,
    importance: 'normal',
  });
  player.sipsGiven += sips;
}
