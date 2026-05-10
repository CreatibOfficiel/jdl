import type { Client, Delayed } from 'colyseus';
import type { GameRoom } from '../../rooms/GameRoom';
import { pushEvent } from '../eventLog';
import { applyDrink } from '../sipsHelper';
import { endTurn } from '../turnHandler';

const AUTO_CONFIRM_MS = 30_000;

interface DistributeAssignment {
  targetPlayerId: string;
  sips: number;
}

interface DistributeMessage {
  assignments: DistributeAssignment[];
}

function clearDistributeModal(room: GameRoom): void {
  room.state.activeModal = '';
  room.state.activeModalPlayerId = '';
  room.state.distributeExpectedSips = 0;
  for (const p of room.state.players.values()) {
    p.pendingDrinkConfirm = 0;
  }
  const timer = (room as unknown as Record<string, unknown>)._distributeAutoConfirmTimer as
    | Delayed
    | undefined;
  if (timer !== undefined) {
    timer.clear();
    delete (room as unknown as Record<string, unknown>)._distributeAutoConfirmTimer;
  }
}

export function handleDistributeSips(room: GameRoom, client: Client, rawMessage: unknown): void {
  if (room.state.activeModal !== 'distribute') return;
  if (room.state.activeModalPlayerId !== client.sessionId) return;

  const msg = rawMessage as DistributeMessage;
  if (!Array.isArray(msg.assignments) || msg.assignments.length === 0) return;

  const distributor = room.state.players.get(client.sessionId);
  if (!distributor) return;

  let totalSips = 0;
  const seen = new Set<string>();

  for (const a of msg.assignments) {
    if (typeof a.targetPlayerId !== 'string' || typeof a.sips !== 'number') return;
    if (a.sips < 1) return;
    if (a.targetPlayerId === client.sessionId) return;
    const target = room.state.players.get(a.targetPlayerId);
    if (!target || !target.connected) return;
    if (seen.has(a.targetPlayerId)) return;
    seen.add(a.targetPlayerId);
    totalSips += a.sips;
  }

  if (totalSips !== room.state.distributeExpectedSips) return;

  for (const a of msg.assignments) {
    const target = room.state.players.get(a.targetPlayerId);
    if (!target) continue;
    applyDrink(room, {
      player: target,
      sips: a.sips,
      emoji: '🎁',
      kind: 'distributed',
      reason: `de ${distributor.name}`,
    });
    target.pendingDrinkConfirm = a.sips;
  }

  distributor.sipsGiven += totalSips;

  room.state.activeModal = 'distribute_wait';
  room.state.distributeExpectedSips = 0;

  pushEvent(room.state, {
    playerId: distributor.id,
    kind: 'distribute_sent',
    text: `🎁 ${distributor.name} distribue ${totalSips} gorgée(s)`,
    importance: 'normal',
  });

  (room as unknown as Record<string, unknown>)._distributeAutoConfirmTimer = room.clock.setTimeout(
    () => {
      delete (room as unknown as Record<string, unknown>)._distributeAutoConfirmTimer;
      for (const p of room.state.players.values()) {
        p.pendingDrinkConfirm = 0;
      }
      room.state.activeModal = '';
      room.state.activeModalPlayerId = '';
      pushEvent(room.state, {
        playerId: '',
        kind: 'distribute_auto_confirmed',
        text: `⏰ Distribution auto-confirmée (30s)`,
        importance: 'low',
      });
      endTurn(room);
    },
    AUTO_CONFIRM_MS,
  );
}

export function handleConfirmDrink(room: GameRoom, client: Client): void {
  if (room.state.activeModal !== 'distribute_wait') return;

  const player = room.state.players.get(client.sessionId);
  if (!player || player.pendingDrinkConfirm <= 0) return;

  player.pendingDrinkConfirm = 0;

  let anyPending = false;
  for (const p of room.state.players.values()) {
    if (p.pendingDrinkConfirm > 0) {
      anyPending = true;
      break;
    }
  }

  if (!anyPending) {
    clearDistributeModal(room);
    pushEvent(room.state, {
      playerId: '',
      kind: 'distribute_all_confirmed',
      text: `✅ Tous ont confirmé leur gorgée(s)`,
      importance: 'low',
    });
    endTurn(room);
  }
}

export function clearDistributeStateOnDisconnect(room: GameRoom): void {
  room.state.distributeExpectedSips = 0;
  for (const p of room.state.players.values()) {
    p.pendingDrinkConfirm = 0;
  }
  const timer = (room as unknown as Record<string, unknown>)._distributeAutoConfirmTimer as
    | Delayed
    | undefined;
  if (timer !== undefined) {
    timer.clear();
    delete (room as unknown as Record<string, unknown>)._distributeAutoConfirmTimer;
  }
}
