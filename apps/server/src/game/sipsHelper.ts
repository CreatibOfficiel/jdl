import type { GameRoom } from '../rooms/GameRoom';
import type { Player } from '../schemas/Player';
import { SipEvent } from '../schemas/SipEvent';
import { pushEvent } from './eventLog';

const SIP_EVENTS_CAP = 200;

interface RecordSipArgs {
  /** Empty if the sip is auto-drink (e.g. landed on a red card). */
  fromId?: string;
  /** Empty for distribute-style events with no specific target. */
  toId: string;
  count: number;
  /** Free-form tag matching the EventLog kind (e.g. 'red_drink', 'bromance_drink', 'witch_potion'). */
  source: string;
  /** Empty when the player drank; else 'pushups' | 'squats' | 'jumping_jacks' | 'sit_out' (Stage C). */
  equivalence?: string;
}

/** Single chokepoint for SipEvent emission. Mutates GameState.sipEvents (ring buffer of last 200)
 *  and GameRoom.allSipEvents (unbounded mirror, used for post-game persistence in Stage A4).
 *  Does NOT mutate Player counters or push a human-readable EventLog — callers handle those. */
export function recordSip(room: GameRoom, args: RecordSipArgs): void {
  const ev = new SipEvent();
  ev.ts = Date.now();
  ev.fromId = args.fromId ?? '';
  ev.toId = args.toId;
  ev.count = args.count;
  ev.source = args.source;
  ev.equivalence = args.equivalence ?? '';

  room.allSipEvents.push(ev);
  room.state.sipEvents.push(ev);
  room.state.sipEventsTotalCount += 1;
  if (room.state.sipEvents.length > SIP_EVENTS_CAP) {
    room.state.sipEvents.shift();
  }
}

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
  recordSip(room, { toId: player.id, count: effective, source: kind });

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
      recordSip(room, { toId: bro.id, count: effective, source: 'bromance_drink' });
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
  recordSip(room, { fromId: player.id, toId: '', count: sips, source: kind });
}
