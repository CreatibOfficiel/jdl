import type { Room } from 'colyseus.js';

export interface PlayResult {
  winnerId: string;
  eventCount: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function playUntilFinished(rooms: Room[], timeoutMs = 60000): Promise<PlayResult> {
  const deadline = Date.now() + timeoutMs;
  const primary = rooms[0];

  while (Date.now() < deadline) {
    // biome-ignore lint/suspicious/noExplicitAny: Colyseus state access
    const state = primary.state as any;

    if (state.phase === 'finished') {
      return {
        winnerId: state.winnerId,
        eventCount: state.eventLog.length,
      };
    }

    if (state.phase === 'lobby') {
      rooms[0].send('host_ack_checklist');
      await delay(100);
      rooms[0].send('start_game');
      await delay(100);
      continue;
    }

    if (state.phase === 'rolling_order') {
      let anyRolled = false;
      for (const room of rooms) {
        const id = room.sessionId;
        if (!state.rollOrderRolls.has(id)) {
          room.send('roll_order_dice');
          anyRolled = true;
          break;
        }
      }
      await delay(anyRolled ? 100 : 300);
      continue;
    }

    if (state.phase === 'playing') {
      if (state.activeModal) {
        await resolveModal(rooms, state);
        await delay(150);
        continue;
      }

      for (const room of rooms) {
        room.send('roll_dice');
      }
      await delay(100);
      continue;
    }

    await delay(200);
  }

  throw new Error(`Game did not finish within ${timeoutMs}ms`);
}

// biome-ignore lint/suspicious/noExplicitAny: Colyseus state access
async function resolveModal(rooms: Room[], state: any): Promise<void> {
  const modal = state.activeModal as string;
  const modalPlayerId = state.activeModalPlayerId as string;
  const player = modalPlayerId ? state.players.get(modalPlayerId) : null;
  const modalRoom = rooms.find((r) => r.sessionId === modalPlayerId) ?? rooms[0];

  switch (modal) {
    case 'shop':
      modalRoom.send('skip_shop');
      break;
    case 'pills':
      modalRoom.send('choose_pill', { color: 'red' });
      break;
    case 'bromance': {
      for (const [id, p] of state.players.entries()) {
        if (id !== modalPlayerId && p.connected) {
          modalRoom.send('choose_bromance', { targetPlayerId: id });
          return;
        }
      }
      break;
    }
    case 'treasure': {
      const hasCrowbar = player?.inventory && Array.from(player.inventory).includes('crowbar');
      if (hasCrowbar) {
        modalRoom.send('open_treasure');
        await delay(200);
        if (state.activeModal === 'treasure_swap') {
          for (const [id, p] of state.players.entries()) {
            if (id !== modalPlayerId && p.connected) {
              modalRoom.send('swap_position', { targetPlayerId: id });
              return;
            }
          }
        }
      } else {
        modalRoom.send('skip_treasure');
      }
      break;
    }
    case 'treasure_swap': {
      for (const [id, p] of state.players.entries()) {
        if (id !== modalPlayerId && p.connected) {
          modalRoom.send('swap_position', { targetPlayerId: id });
          return;
        }
      }
      break;
    }
    case 'witch_potion':
      modalRoom.send('say_thanks');
      break;
    case 'rail_de_bus': {
      const round = state.railRound as number;
      const firstAnswer = round === 1 || round === 4 ? 'red' : round === 2 ? 'higher' : 'inside';
      modalRoom.send('rail_de_bus_answer', { answer: firstAnswer });
      await delay(200);
      break;
    }
    case 'distribute': {
      const expected = (state.distributeExpectedSips ?? 0) as number;
      const targets: { id: string }[] = [];
      for (const [id, p] of state.players.entries()) {
        if (id !== modalPlayerId && p.connected) {
          targets.push({ id });
        }
      }
      if (targets.length === 0 || expected <= 0) break;
      const allOnFirst = targets.length === 1;
      const assignments = allOnFirst
        ? [{ targetPlayerId: targets[0].id, sips: expected }]
        : [
            { targetPlayerId: targets[0].id, sips: 1 },
            { targetPlayerId: targets[1].id, sips: expected - 1 },
          ];
      modalRoom.send('distribute_sips', { assignments });
      await delay(100);
      break;
    }
    case 'distribute_wait': {
      for (const [id, p] of state.players.entries()) {
        if (p.pendingDrinkConfirm > 0) {
          const confirmRoom = rooms.find((r) => r.sessionId === id);
          if (confirmRoom) {
            confirmRoom.send('confirm_drink');
            await delay(50);
          }
        }
      }
      break;
    }
    default:
      await delay(100);
  }
}
