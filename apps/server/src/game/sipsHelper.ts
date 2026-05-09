import {
  EQUIVALENCE_TABLE,
  type EquivalenceKind,
  isDifficultyLevel,
  isEquivalenceKind,
  SAFETY_BY_DIFFICULTY,
  SAFETY_WINDOW_MS,
} from '@jeu-soiree/shared';
import type { GameRoom } from '../rooms/GameRoom';
import type { Player } from '../schemas/Player';
import { SipEvent } from '../schemas/SipEvent';
import { pushEvent } from './eventLog';

const SIP_EVENTS_CAP = 200;

/** Tumbling-window decay: if the last window opened > SAFETY_WINDOW_MS ago, reset the counter. */
function decayWindow(player: Player, now: number): void {
  if (now - player.recentWindowStart > SAFETY_WINDOW_MS) {
    player.sipsAbsorbedRecent = 0;
    player.recentWindowStart = now;
  }
}

/** Returns the (possibly reduced) sip count after applying the per-difficulty soft cap.
 *  When the cap fires, the EventLog gets a non-shaming "déjà bu beaucoup" notice and the
 *  Player.capsTriggered counter is bumped. Bromance ricochets and bromance_drink sources are
 *  not capped recursively (the original sip already passed through the cap). */
function applySoftCap(room: GameRoom, player: Player, sips: number, source: string): number {
  if (source === 'bromance_drink') return sips; // already-capped upstream
  const level = isDifficultyLevel(room.state.difficultyLevel) ? room.state.difficultyLevel : 'medium';
  const caps = SAFETY_BY_DIFFICULTY[level];
  const now = Date.now();
  decayWindow(player, now);
  const projected = player.sipsAbsorbedRecent + sips;
  if (projected <= caps.maxSipsPer10Min) {
    return sips;
  }
  // Halve (floor to at least 1). The "absorbed" counter still bumps by the REDUCED amount so
  // a long string of capped sips doesn't ratchet caps to zero.
  const reduced = Math.max(1, Math.floor(sips / 2));
  player.capsTriggered += 1;
  pushEvent(room.state, {
    playerId: player.id,
    kind: 'safety_soft_cap',
    text: `⚠️ ${player.name} a déjà bu beaucoup ces 10 dernières minutes — sip réduit (${sips}→${reduced})`,
    importance: 'high',
  });
  return reduced;
}

interface RecordSipArgs {
  /** Empty if the sip is auto-drink (e.g. landed on a red card). */
  fromId?: string;
  /** Empty for distribute-style events with no specific target. */
  toId: string;
  count: number;
  /** Free-form tag matching the EventLog kind (e.g. 'red_drink', 'bromance_drink', 'witch_potion'). */
  source: string;
  /** Empty when the player drank; else 'pushups' | 'squats' | 'jumping_jacks' | 'sit_out'. */
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

function resolvePref(player: Player): EquivalenceKind {
  return isEquivalenceKind(player.equivalencePreference) ? player.equivalencePreference : 'drinks';
}

/** Apply N sips to a single player, respecting their equivalence preference + GameState toggle.
 *  Pushes the appropriate EventLog (drink / equivalence task / sit-out), records the SipEvent,
 *  and bumps the right counters (sipsTaken / equivalenceUnitsCompleted). */
function applySipToPlayer(
  room: GameRoom,
  player: Player,
  rawSips: number,
  kind: string,
  fallbackEmoji: string,
  note: string,
): void {
  const sips = applySoftCap(room, player, rawSips, kind);
  // Track absorbed sips against the running window AFTER the cap so the next call sees the
  // (possibly reduced) amount. Sit-out players don't bump (no actual consumption).
  const pref = resolvePref(player);
  if (pref !== 'sit_out') {
    const now = Date.now();
    decayWindow(player, now);
    if (player.recentWindowStart === 0) player.recentWindowStart = now;
    player.sipsAbsorbedRecent += sips;
  }
  const rule = EQUIVALENCE_TABLE[pref];
  const countAsSips = room.state.countEquivalenceAsSips;
  const tail = note ? ` (${note})` : '';

  if (pref === 'drinks') {
    pushEvent(room.state, {
      playerId: player.id,
      kind,
      text: `${fallbackEmoji} ${player.name} boit ${sips} gorgée(s)${tail}`,
      importance: 'normal',
    });
    player.sipsTaken += sips;
    recordSip(room, { toId: player.id, count: sips, source: kind });
    return;
  }

  if (pref === 'sit_out') {
    pushEvent(room.state, {
      playerId: player.id,
      kind,
      text: `🪑 ${player.name} passe (skip ${sips} gorgée(s))${tail}`,
      importance: 'normal',
    });
    // sit_out: no counter bumps either way — player neither drinks nor performs a task.
    recordSip(room, { toId: player.id, count: sips, source: kind, equivalence: 'sit_out' });
    return;
  }

  const units = sips * rule.perSip;
  pushEvent(room.state, {
    playerId: player.id,
    kind,
    text: `${rule.emoji} ${player.name} doit ${units} ${rule.unit} (au lieu de ${sips} gorgée(s))${tail}`,
    importance: 'normal',
  });
  player.equivalenceUnitsCompleted += units;
  if (countAsSips) {
    player.sipsTaken += sips;
  }
  recordSip(room, { toId: player.id, count: sips, source: kind, equivalence: pref });
}

interface ApplyDrinkArgs {
  player: Player;
  sips: number;
  emoji: string;
  /** Distinct event kind for the source (e.g. 'card_mismatch', 'red_drink') */
  kind: string;
  reason?: string;
}

/** Pushes "X boit N gorgées" + bromance ricochet if any. Consumes doubleNextSip.
 *  Each affected player's equivalence preference is honoured independently. */
export function applyDrink(room: GameRoom, args: ApplyDrinkArgs): void {
  const { player, sips, emoji, kind, reason } = args;

  let effective = sips;
  let note = reason ?? '';
  if (player.doubleNextSip) {
    effective = sips * 2;
    player.doubleNextSip = false;
    note = note ? `${note} — DOUBLÉ` : 'DOUBLÉ';
  }

  applySipToPlayer(room, player, effective, kind, emoji, note);

  if (player.bromanceWith) {
    const bro = room.state.players.get(player.bromanceWith);
    if (bro?.connected) {
      applySipToPlayer(
        room,
        bro,
        effective,
        'bromance_drink',
        '💪',
        `bromance avec ${player.name}`,
      );
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
