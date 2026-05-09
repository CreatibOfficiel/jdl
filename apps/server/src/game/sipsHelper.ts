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

/** Per-source cap policy. `halve` reduces by 50% (floor 1); `swap` forces an equivalence
 *  override even for drink-pref players; `skip` bypasses the cap entirely (for already-handled
 *  upstream sources like bromance ricochet). Sources not in this map fall back to 'halve'. */
type CapPolicy = 'halve' | 'swap' | 'skip';

const CAP_POLICY_BY_SOURCE: Record<string, CapPolicy> = {
  bromance_drink: 'skip', // already-capped upstream when the originator drank
  // High-intensity sources auto-swap to equivalence on cap (witch potion, pt malus, rail loss):
  witch_potion: 'swap',
  pt_malus: 'swap',
  rail_drink: 'swap',
  // Routine card sips: halve.
  red_drink: 'halve',
  card_mismatch: 'halve',
  pill_red: 'halve',
  pill_blue: 'halve',
};

/** Default fallback equivalence when an auto-swap fires on a drink-pref player. */
const FALLBACK_EQUIVALENCE: EquivalenceKind = 'pushups';

interface CapResult {
  sips: number;
  /** When true, applySipToPlayer routes through the equivalence path even if pref==='drinks'. */
  forceEquivalence: boolean;
}

/** Tumbling-window decay: if the last window opened > SAFETY_WINDOW_MS ago, reset counter
 *  AND consecutiveCaps so a fresh window starts the auto-swap clock from zero. */
function decayWindow(player: Player, now: number): void {
  if (now - player.recentWindowStart > SAFETY_WINDOW_MS) {
    player.sipsAbsorbedRecent = 0;
    player.recentWindowStart = now;
    player.consecutiveCaps = 0;
  }
}

/** Apply the per-difficulty soft cap with per-source dispatch. Returns the (possibly reduced)
 *  sip count plus a flag forcing equivalence-routing when auto-swap fires.
 *
 *  Auto-swap rule (S2): once a player has triggered the cap `autoSwapAfterCaps` times in the
 *  same window, every further capped sip is forced through equivalence — even if the player
 *  picked 'drinks'. They get a public-health-grade brake without needing host intervention. */
function applySoftCap(room: GameRoom, player: Player, sips: number, source: string): CapResult {
  const policy: CapPolicy = CAP_POLICY_BY_SOURCE[source] ?? 'halve';
  if (policy === 'skip') return { sips, forceEquivalence: false };

  const level = isDifficultyLevel(room.state.difficultyLevel) ? room.state.difficultyLevel : 'medium';
  const caps = SAFETY_BY_DIFFICULTY[level];
  const now = Date.now();
  decayWindow(player, now);
  const projected = player.sipsAbsorbedRecent + sips;
  if (projected <= caps.maxSipsPer10Min) {
    return { sips, forceEquivalence: false };
  }

  // Cap is firing.
  player.capsTriggered += 1;
  player.consecutiveCaps += 1;
  const shouldAutoSwap = player.consecutiveCaps >= caps.autoSwapAfterCaps;

  // Per-source policy + auto-swap escalation:
  // - 'swap' source → always forceEquivalence
  // - other sources → halve normally; if consecutive caps trigger auto-swap, ALSO forceEquivalence
  const forceEquivalence = policy === 'swap' || shouldAutoSwap;

  if (forceEquivalence) {
    // Don't halve when forcing equivalence — the player is doing physical reps anyway.
    if (shouldAutoSwap) {
      player.autoSwapsTriggered += 1;
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'safety_auto_swap',
        text: `🛑 ${player.name} a beaucoup bu — son prochain effort passe en équivalence sport`,
        importance: 'high',
      });
    } else {
      pushEvent(room.state, {
        playerId: player.id,
        kind: 'safety_swap_source',
        text: `⚠️ ${player.name} déjà bien servi — ce ${labelForSource(source)} part en équivalence sport`,
        importance: 'high',
      });
    }
    return { sips, forceEquivalence: true };
  }

  // Plain halve path.
  const reduced = Math.max(1, Math.floor(sips / 2));
  pushEvent(room.state, {
    playerId: player.id,
    kind: 'safety_soft_cap',
    text: `⚠️ ${player.name} a déjà bu beaucoup ces 10 dernières minutes — sip réduit (${sips}→${reduced})`,
    importance: 'high',
  });
  return { sips: reduced, forceEquivalence: false };
}

function labelForSource(source: string): string {
  switch (source) {
    case 'witch_potion':
      return 'potion sorcière';
    case 'pt_malus':
      return 'Pt malus';
    case 'rail_drink':
      return 'rail de bus';
    default:
      return source;
  }
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
 *  When a soft cap fires with `forceEquivalence`, drink-pref players are routed through the
 *  fallback equivalence (pushups) for THIS sip only — their saved preference is unchanged. */
function applySipToPlayer(
  room: GameRoom,
  player: Player,
  rawSips: number,
  kind: string,
  fallbackEmoji: string,
  note: string,
): void {
  const cap = applySoftCap(room, player, rawSips, kind);
  const sips = cap.sips;
  const savedPref = resolvePref(player);
  // Effective pref for THIS sip event. Drink players get force-swapped to FALLBACK_EQUIVALENCE
  // when the cap engine asked for it; non-drink prefs honour their existing pref.
  const pref: EquivalenceKind =
    cap.forceEquivalence && savedPref === 'drinks' ? FALLBACK_EQUIVALENCE : savedPref;

  // Track absorbed sips against the running window AFTER the cap so the next call sees the
  // (possibly reduced) amount. Sit-out players don't bump (no actual consumption).
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
